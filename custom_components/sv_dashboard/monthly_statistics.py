"""Distance-weighted BEV consumption and time-weighted ambient observations.

No weather extrapolation, assumed battery temperature, or new vehicle calls.
All persisted evidence is derived from canonical trip boundaries and HA Recorder.
"""
from __future__ import annotations

from bisect import bisect_right
from datetime import datetime, timedelta, timezone
import math
from typing import Any
from zoneinfo import ZoneInfo

MAX_OBSERVATION_AGE = timedelta(minutes=15)


def number(value: Any) -> float | None:
    try:
        result = float(value)
    except (ValueError, TypeError, OverflowError):
        return None
    return result if math.isfinite(result) and not isinstance(value, bool) else None


def instant(value: Any) -> datetime | None:
    try:
        result = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return result.astimezone(timezone.utc) if result.utcoffset() is not None else None
    except (ValueError, TypeError, OverflowError):
        return None


def celsius(value: Any, unit: Any) -> float | None:
    result = number(value)
    if result is None:
        return None
    if unit == "°F":
        result = (result - 32) * 5 / 9
    elif unit != "°C":
        return None
    return result if -70 <= result <= 70 else None


def trip_interval(trip: dict) -> tuple[datetime, datetime] | None:
    begin, end = instant(trip.get("start_time")), instant(trip.get("end_time"))
    return (begin, end) if begin is not None and end is not None and begin < end else None


def eligible_trip(trip: dict) -> bool:
    distance = number(trip.get("distance_km"))
    return trip.get("valid_for_statistics") is True and distance is not None and distance > 0


def interval_key(interval: tuple[datetime, datetime]) -> str:
    return "|".join(value.isoformat() for value in interval)


def observe_trip_temperatures(trips: list[dict], observations: list[tuple[datetime, float | None]],
                              archived: dict | None = None) -> dict:
    """Preserve exact-boundary summaries if the Recorder has since purged data.

    Each actual observation can cover at most 15 minutes forward, never past
    the next observation (including unknown). Only the trip intersection counts.
    HA observation time is not a claim of upstream measurement freshness.
    """
    archive = dict(archived or {})
    ordered = sorted({t: v for stamp, v in observations if (t := instant(stamp)) is not None}.items())
    times = [time for time, _ in ordered]
    for trip in trips:
        if not eligible_trip(trip) or not (interval := trip_interval(trip)):
            continue
        start, end = interval
        seconds = degree_seconds = 0.0
        index = max(0, bisect_right(times, start) - 1)
        while index < len(ordered):
            time, value = ordered[index]
            if time >= end:
                break
            following = times[index + 1] if index + 1 < len(times) else end
            span = (min(end, following, time + MAX_OBSERVATION_AGE) - max(start, time)).total_seconds()
            if span > 0 and value is not None:
                seconds += span
                degree_seconds += span * value
            index += 1
        key = interval_key(interval)
        previous = archive.get(key, {})
        # A retained fuller historical observation wins over a purged prefix.
        if seconds > 0 and seconds >= (number(previous.get("seconds")) or 0):
            archive[key] = {"seconds": seconds, "degree_seconds": degree_seconds}
    return archive


def monthly_consumption(trips: list[dict], temperatures: dict, timezone_name: str) -> list[dict]:
    tz = ZoneInfo(timezone_name)
    months: dict[str, dict] = {}
    seen = set()
    for trip in trips:
        if not eligible_trip(trip) or not (interval := trip_interval(trip)):
            continue
        identity = trip.get("id") or trip.get("server_id") or interval_key(interval)
        if identity in seen:
            continue
        seen.add(identity)
        start, end = interval
        month = start.astimezone(tz).strftime("%Y-%m")
        bucket = months.setdefault(month, {"month": month, "trip_count": 0, "energy_trip_count": 0,
            "distance_km": 0.0, "energy_distance_km": 0.0, "energy_kwh": 0.0,
            "estimated_energy_kwh": 0.0, "driving_seconds": 0.0,
            "temperature_seconds": 0.0, "degree_seconds": 0.0})
        distance = number(trip.get("distance_km"))
        bucket["trip_count"] += 1
        bucket["distance_km"] += distance
        energy = number(trip.get("energy_kwh"))
        # Zero is not proof of zero physical transfer in the present trip contract.
        if energy is None or energy <= 0:
            continue
        bucket["energy_trip_count"] += 1
        bucket["energy_distance_km"] += distance
        bucket["energy_kwh"] += energy
        if trip.get("energy_estimated") is True:
            bucket["estimated_energy_kwh"] += energy
        duration = (end - start).total_seconds()
        bucket["driving_seconds"] += duration
        sample = temperatures.get(interval_key(interval), {})
        seconds, degrees = number(sample.get("seconds")), number(sample.get("degree_seconds"))
        if seconds is not None and 0 < seconds <= duration and degrees is not None and abs(degrees) <= 70 * seconds:
            bucket["temperature_seconds"] += seconds
            bucket["degree_seconds"] += degrees
    result = []
    for month in sorted(months):
        row = months[month]
        distance, energy = row["energy_distance_km"], row["energy_kwh"]
        seconds, duration = row["temperature_seconds"], row["driving_seconds"]
        row["consumption_kwh_100km"] = round(100 * energy / distance, 2) if distance else None
        row["ambient_temperature_c"] = round(row.pop("degree_seconds") / seconds, 2) if seconds else None
        row.pop("degree_seconds", None)
        row["energy_coverage"] = round(distance / row["distance_km"], 4)
        row["estimated_energy_share"] = round(row["estimated_energy_kwh"] / energy, 4) if energy else None
        row["temperature_coverage"] = round(seconds / duration, 4) if duration else None
        result.append(row)
    return result


def _cold(temp: float) -> float:
    return max(0.0, min(35.0, 15.0 - temp))


def _startup(temp: float, seconds: float) -> float:
    return min(1.0, _cold(temp) / 15.0) * min(1.0, seconds / 900.0)


def _fit(rows: list[tuple]) -> tuple[float, float, float]:
    """Constrained grid regression, distance-weighted rate error.

    Fit net battery energy, not separately measured HVAC or battery heating.
    Fixed startup feature is deliberately capped at 15 min and represents
    all correlated startup effects, not a confirmed heater or threshold.
    """
    best = (float("inf"), 0.0, 0.0, 0.0)
    weight = sum(row[0] for row in rows)
    for step in range(17):
        slope = step * .05
        for k in range(13):
            startup = k * .25
            base = max(6.0, min(40.0, sum(
                100 * energy - distance * slope * _cold(temp)
                - 100 * startup * _startup(temp, seconds)
                for distance, energy, temp, seconds, _ in rows
            ) / weight))
            error = sum(distance * (100 * (energy - startup * _startup(temp, seconds)) / distance
                - base - slope * _cold(temp)) ** 2 for distance, energy, temp, seconds, _ in rows)
            # Small regularizer discourages inventing a large startup term from noise.
            score = error / weight + .15 * startup ** 2 + .4 * slope ** 2
            if score < best[0]:
                best = (score, base, slope, startup)
    return best[1:]


def _rate_error(rows: list[tuple], params: tuple[float, float, float]) -> float:
    base, slope, startup = params
    return sum(abs(energy - distance * (base + slope * _cold(temp)) / 100
        - startup * _startup(temp, seconds)) for distance, energy, temp, seconds, _ in rows) * 100 / sum(row[0] for row in rows)


def _cohort_ready(rows: list[tuple]) -> bool:
    return (len(rows) >= 20 and sum(row[0] for row in rows) >= 300
        and max(row[2] for row in rows) - min(row[2] for row in rows) >= 8
        and sum(row[2] <= 8 and row[0] < 20 for row in rows) >= 3
        and sum(row[2] <= 8 and row[0] >= 30 for row in rows) >= 3
        and sum(row[2] >= 12 for row in rows) >= 5)


def range_calibration(trips: list[dict], temperatures: dict) -> dict:
    """Return compact calibration only; no raw trips or locations in the model.

    Prefer a chronological holdout that beats a distance-only baseline.
    Otherwise expose a historical reference cohort and explicit scenario
    assumptions; never imply a fitted temperature response from sparse data.
    """
    all_rows, matched, seen = [], [], set()
    for trip in trips:
        if not eligible_trip(trip) or not (interval := trip_interval(trip)):
            continue
        identity = trip.get("id") or trip.get("server_id") or interval_key(interval)
        if identity in seen:
            continue
        seen.add(identity)
        distance, energy = number(trip.get("distance_km")), number(trip.get("energy_kwh"))
        seconds = (interval[1] - interval[0]).total_seconds()
        # Very short or implausible rates are unreliable for model fitting.
        if distance is None or distance < 2 or energy is None or energy <= 0 or not 3 <= 100 * energy / distance <= 80:
            continue
        if not 60 <= seconds <= 86400 or distance * 3600 / seconds > 200:
            continue
        sample = temperatures.get(interval_key(interval), {})
        covered, degrees = number(sample.get("seconds")), number(sample.get("degree_seconds"))
        temp = degrees / covered if covered and degrees is not None and .5 * seconds <= covered <= seconds else None
        if temp is not None and not -40 <= temp <= 50:
            temp = None
        row = (distance, energy, temp, seconds, interval[0])
        all_rows.append(row)
        if temp is not None:
            matched.append(row)
    if not all_rows:
        return {"mode": "unavailable", "trip_count": 0, "temperature_trip_count": 0}
    long = [row for row in all_rows if row[0] >= 30]
    cohort = long if len(long) >= 3 and sum(row[0] for row in long) >= 100 else all_rows
    known = [row for row in cohort if row[2] is not None]
    # Use one consistent cohort for the rate and reference temperature.
    if len(known) >= 3 and sum(row[0] for row in known) >= .5 * sum(row[0] for row in cohort):
        cohort = known
    else:
        known = []
    distance = sum(row[0] for row in cohort)
    energy = sum(row[1] for row in cohort)
    ref = sum(row[0] * row[2] for row in cohort) / distance if known else None
    result = {
        "mode": "scenario", "trip_count": len(all_rows), "temperature_trip_count": len(matched),
        "reference_trip_count": len(cohort), "reference_distance_km": round(distance, 2),
        "reference_rate": round(100 * energy / distance, 3),
        "reference_temperature_c": round(ref, 2) if ref is not None else None,
        "reference_mean_distance_km": round(distance / len(cohort), 2),
        "reference_startup_per_100km": round(100 * sum(_startup(row[2], row[3]) for row in cohort) / distance, 4) if known else None,
        "reference_cold_degree": round(sum(row[0] * _cold(row[2]) for row in cohort) / distance, 3) if known else None,
        "long_trip_reference": cohort is long or all(row[0] >= 30 for row in cohort),
        "min_temperature_c": min((row[2] for row in matched), default=None),
        "max_temperature_c": max((row[2] for row in matched), default=None),
    }
    ordered = sorted(matched, key=lambda row: row[4])
    cut = int(len(ordered) * .8)
    train, test = ordered[:cut], ordered[cut:]
    if not _cohort_ready(train) or len(test) < 5 or sum(row[0] for row in test) < 50:
        return result
    params = _fit(train)
    baseline = (100 * sum(row[1] for row in train) / sum(row[0] for row in train), 0.0, 0.0)
    error, base_error = _rate_error(test, params), _rate_error(test, baseline)
    if not error <= .95 * base_error or base_error < .1:
        return result
    base, slope, startup = _fit(ordered)
    result.update({"mode": "fitted", "base_rate": round(base, 3), "cold_slope": round(slope, 3),
                   "startup_kwh": round(startup, 3), "holdout_error_rate": round(error, 3),
                   "holdout_baseline_error_rate": round(base_error, 3), "holdout_count": len(test)})
    return result

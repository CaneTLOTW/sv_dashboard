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

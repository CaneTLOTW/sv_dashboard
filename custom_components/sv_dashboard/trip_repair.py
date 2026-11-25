"""Pure helpers for conservative canonical trip odometer repair.

The Stellantis trip endpoint occasionally returns a zero/stale start odometer
while the accompanying distance field looks like an absolute end odometer.
Raw server rows remain untouched; this module only repairs the canonical copy
when continuity can be demonstrated from adjacent/local evidence.
"""

from __future__ import annotations

from datetime import datetime
import math
from typing import Any

_ODOMETER_TOLERANCE_KM = 0.2
_LOCAL_START_TOLERANCE_KM = 1.0
_LOCAL_TIME_TOLERANCE_SECONDS = 20 * 60
_LOCAL_DISTANCE_TOLERANCE_KM = 2.0
_MAX_TRIP_DISTANCE_KM = 1000.0
_MAX_TRIP_DURATION_SECONDS = 24 * 60 * 60
_MAX_TRIP_SPEED_KMH = 300.0
# Local SV observations are used as corroborating/backfill evidence, not as
# canonical truth. Keep this threshold deliberately conservative so a stale
# odometer composite cannot inject energy into an otherwise valid server trip.
_MAX_LOCAL_BACKFILL_SPEED_KMH = 220.0

_REPAIRABLE_SOURCE_FLAGS = {
    "missing_or_non_positive_distance",
    "distance_outlier",
    "odometer_distance_mismatch",
    "speed_outlier",
    "derived_speed_outlier",
    "zero_start_odometer_sentinel",
}
_BLOCKING_FLAGS = {
    "missing_or_non_positive_distance",
    "distance_outlier",
    "duration_outlier",
    "odometer_distance_mismatch",
    "speed_outlier",
    "derived_speed_outlier",
    "zero_start_odometer_sentinel",
}


def _number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _time(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value).strip()
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _trip_sort_key(trip: dict[str, Any]) -> tuple[str, str]:
    """Sort the already ISO-normalized timestamps without mixing tz awareness."""
    return (
        str(trip.get("start_time") or trip.get("startedAt") or ""),
        str(trip.get("id") or trip.get("server_id") or ""),
    )


def local_trip_backfill_quality(row: dict[str, Any]) -> tuple[bool, list[str]]:
    """Classify local SV trip evidence before it may feed canonical backfill.

    Local rows are assembled from live Home Assistant observations. A stale
    odometer update can therefore create a composite distance that is internally
    impossible even though the record has otherwise useful SOC values. Such a
    row must never be used to backfill canonical server energy.
    """
    flags: list[str] = []
    distance = _number(row.get("distance_km"))
    start_mileage = _number(row.get("start_mileage"))
    end_mileage = _number(row.get("end_mileage"))

    if distance is None or distance <= 0:
        flags.append("local_missing_or_non_positive_distance")
    elif distance > _MAX_TRIP_DISTANCE_KM:
        flags.append("local_distance_outlier")

    if start_mileage is None or start_mileage < 0:
        flags.append("local_missing_start_odometer")
    if (
        start_mileage is not None
        and end_mileage is not None
        and distance is not None
        and abs((end_mileage - start_mileage) - distance) > _LOCAL_DISTANCE_TOLERANCE_KM
    ):
        flags.append("local_odometer_distance_mismatch")

    duration = _number(row.get("duration_seconds"))
    if duration is None:
        start_time, end_time = _time(row.get("start_time")), _time(row.get("end_time"))
        if start_time is not None and end_time is not None:
            try:
                duration = (end_time - start_time).total_seconds()
            except TypeError:
                duration = None
    if duration is not None:
        if duration <= 0 or duration > _MAX_TRIP_DURATION_SECONDS:
            flags.append("local_duration_outlier")
        elif distance is not None and distance > 0:
            speed = distance / (duration / 3600)
            if speed > _MAX_LOCAL_BACKFILL_SPEED_KMH:
                flags.append("local_speed_outlier")

    return not flags, flags


def _validated_local_rows(
    local_trips: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    """Return only physically defensible local rows and annotate all candidates."""
    rows = [row for row in (local_trips or []) if isinstance(row, dict)]
    validated: list[dict[str, Any]] = []
    for row in rows:
        usable, flags = local_trip_backfill_quality(row)
        row["backfill_eligible"] = usable
        if flags:
            existing = list(row.get("quality_flags") or [])
            row["quality_flags"] = list(dict.fromkeys([*existing, *flags]))
        if usable:
            validated.append(row)
    return validated


def _plausible_anchor_end(trip: dict[str, Any]) -> float | None:
    """Return an odometer anchor only from an already plausible canonical row."""
    if trip.get("valid_for_statistics") is False:
        return None
    start = _number(trip.get("start_mileage"))
    end = _number(trip.get("end_mileage"))
    if start is None or end is None or start < 0 or end <= 0:
        return None
    if end < start - _ODOMETER_TOLERANCE_KM:
        return None
    return end


def _local_match(
    trip: dict[str, Any],
    local_trips: list[dict[str, Any]],
    previous_end: float,
) -> dict[str, Any] | None:
    server_start = _time(trip.get("start_time"))
    server_end = _time(trip.get("end_time"))
    candidates: list[tuple[float, dict[str, Any]]] = []
    for local in local_trips:
        local_start_mileage = _number(local.get("start_mileage"))
        local_end_mileage = _number(local.get("end_mileage"))
        if (
            local_start_mileage is None
            or local_end_mileage is None
            or local_end_mileage <= local_start_mileage
            or abs(local_start_mileage - previous_end) > _LOCAL_START_TOLERANCE_KM
        ):
            continue
        local_start = _time(local.get("start_time"))
        local_end = _time(local.get("end_time"))
        deltas: list[float] = []
        for left, right in ((server_start, local_start), (server_end, local_end)):
            if left is None or right is None:
                continue
            try:
                deltas.append(abs((left - right).total_seconds()))
            except TypeError:
                # A malformed naive timestamp must not make canonical rebuild
                # fail; mileage continuity can still provide corroboration.
                continue
        if deltas and min(deltas) > _LOCAL_TIME_TOLERANCE_SECONDS:
            continue
        score = (min(deltas) if deltas else _LOCAL_TIME_TOLERANCE_SECONDS) + (
            abs(local_start_mileage - previous_end) * 60
        )
        candidates.append((score, local))
    return min(candidates, key=lambda item: item[0])[1] if candidates else None


def _next_start_mileage(
    ordered: list[dict[str, Any]], index: int, previous_end: float
) -> float | None:
    """Use only a subsequent plausible row as server continuity evidence."""
    for following in ordered[index + 1 :]:
        if following.get("valid_for_statistics") is False:
            continue
        start = _number(following.get("start_mileage"))
        if start is None or start <= 0:
            continue
        return start if start >= previous_end - _ODOMETER_TOLERANCE_KM else None
    return None


def _plausible_repair(distance: float, duration_seconds: float | None) -> tuple[bool, float | None]:
    if distance <= 0 or distance > _MAX_TRIP_DISTANCE_KM:
        return False, None
    if duration_seconds is not None and (
        duration_seconds <= 0 or duration_seconds > _MAX_TRIP_DURATION_SECONDS
    ):
        return False, None
    speed = (
        distance / (duration_seconds / 3600)
        if duration_seconds is not None and duration_seconds > 0
        else None
    )
    if speed is not None and speed > _MAX_TRIP_SPEED_KMH:
        return False, speed
    return True, speed


def partition_replayed_trips(
    trips: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Quarantine the observed short replay pattern before odometer repair.

    A short, physically implausible row copies both odometer and distance
    from a longer, valid trip and overlaps its end. Do not classify normal
    short drives or merely adjacent rows as replays. Preserve raw payloads
    in the caller's archive; return explicit provenance for the excluded IDs.
    """
    accepted: list[dict[str, Any]] = []
    excluded: list[dict[str, Any]] = []
    for row in sorted(trips, key=_trip_sort_key):
        start, end = _time(row.get("start_time")), _time(row.get("end_time"))
        duration = _number(row.get("duration_seconds"))
        distance = _number(row.get("distance_km"))
        mileage = _number(row.get("start_mileage"))
        match = None
        if (
            start is not None and end is not None
            and start.utcoffset() is not None and end.utcoffset() is not None
            and duration is not None and 0 < duration <= 120
            and distance is not None and distance > 0
            and distance * 3600 / duration > _MAX_TRIP_SPEED_KMH
            and mileage is not None and mileage > 0
            and 0 < (end - start).total_seconds() <= 120
        ):
            for previous in reversed(accepted):
                if previous.get("valid_for_statistics") is not True:
                    continue
                previous_start = _time(previous.get("start_time"))
                previous_end = _time(previous.get("end_time"))
                previous_duration = _number(previous.get("duration_seconds"))
                if (
                    previous_start is None or previous_end is None
                    or previous_start.utcoffset() is None or previous_end.utcoffset() is None
                    or previous_duration is None or previous_duration <= 2 * duration
                ):
                    continue
                if (
                    previous_start < start <= previous_end
                    and 0 <= (previous_end - start).total_seconds() <= 120
                    and end >= previous_end
                    and _number(previous.get("start_mileage")) == mileage
                    and _number(previous.get("distance_km")) == distance
                ):
                    match = previous
                    break
        if match is None:
            accepted.append(row)
        else:
            excluded.append({
                "id": row.get("id"),
                "duplicate_of": match.get("id"),
                "reason": "short_overlapping_odometer_replay",
            })
    return accepted, excluded


def repair_trip_odometer_continuity(
    trips: list[dict[str, Any]], local_trips: list[dict[str, Any]] | None = None
) -> list[dict[str, Any]]:
    """Repair canonical rows whose odometer regresses behind a plausible anchor.

    Evidence priority for the repaired end odometer is:
    1. a same-window locally observed trip whose start matches the prior end;
    2. the next plausible positive server start odometer;
    3. for the explicit zero-start sentinel pattern only, the normalized source
       end (which is start + distance and therefore equals the suspicious raw
       distance when start is zero).

    Invalid/unrepaired rows never become continuity anchors themselves. If none
    of the corroborating sources produce a positive, speed-plausible distance,
    the row is left untouched and remains invalid. Raw server payloads are never
    mutated.

    The supplied ``local_trips`` list is a caller-owned working copy in
    ``server_history._rebuild_canonical``. It is intentionally narrowed in
    place to validated evidence so the immediately following energy-backfill
    step cannot consume a stale/physically impossible composite row.
    """
    ordered = sorted(trips, key=_trip_sort_key)
    local_rows = _validated_local_rows(local_trips)
    if local_trips is not None:
        local_trips[:] = local_rows
    previous_end: float | None = None

    for index, trip in enumerate(ordered):
        start = _number(trip.get("start_mileage"))
        end = _number(trip.get("end_mileage"))
        anchor_end = _plausible_anchor_end(trip)

        if previous_end is None:
            if anchor_end is not None:
                previous_end = anchor_end
            continue

        regression = start is None or start < previous_end - _ODOMETER_TOLERANCE_KM
        if not regression:
            if anchor_end is not None and anchor_end >= previous_end - _ODOMETER_TOLERANCE_KM:
                previous_end = max(previous_end, anchor_end)
            continue

        local = _local_match(trip, local_rows, previous_end)
        candidate_end: float | None = None
        repair_source: str | None = None
        if local is not None:
            candidate_end = _number(local.get("end_mileage"))
            repair_source = "local_trip_match"
        if candidate_end is None:
            candidate_end = _next_start_mileage(ordered, index, previous_end)
            repair_source = "next_server_start" if candidate_end is not None else None
        if (
            candidate_end is None
            and start == 0
            and end is not None
            and end >= previous_end - _ODOMETER_TOLERANCE_KM
        ):
            candidate_end = end
            repair_source = "zero_start_source_end"

        if candidate_end is None:
            continue
        candidate_distance = round(candidate_end - previous_end, 3)
        duration = _number(trip.get("duration_seconds"))
        plausible, derived_speed = _plausible_repair(candidate_distance, duration)
        if not plausible:
            continue

        original_flags = list(trip.get("quality_flags") or [])
        original_start = start
        original_end = end
        original_distance = _number(trip.get("distance_km"))
        raw_speed = _number(trip.get("raw_average_speed_kmh"))
        source_speed_usable = (
            trip.get("speed_source") in ("stellantis_mps", "stellantis_kmh")
            and raw_speed is not None
            and 0 <= raw_speed <= _MAX_TRIP_SPEED_KMH
        )
        repaired_speed = raw_speed if source_speed_usable else derived_speed

        trip["source_start_mileage_km"] = original_start
        trip["source_end_mileage_km"] = original_end
        trip["source_distance_km"] = original_distance
        trip["source_quality_flags"] = original_flags
        trip["start_mileage_km"] = round(previous_end, 3)
        trip["start_mileage"] = round(previous_end, 3)
        trip["end_mileage_km"] = round(candidate_end, 3)
        trip["end_mileage"] = round(candidate_end, 3)
        trip["distance_km"] = candidate_distance
        trip["average_speed_kmh"] = round(repaired_speed, 1) if repaired_speed is not None else None
        trip["average_speed"] = round(repaired_speed, 1) if repaired_speed is not None else None
        trip["speed_source"] = (
            trip.get("speed_source") if source_speed_usable else "odometer_continuity_fallback"
        )

        energy = _number(trip.get("energy_kwh"))
        consumption = round(energy / candidate_distance * 100, 2) if energy is not None else None
        trip["consumption_kwh_100km"] = consumption
        trip["energy_per_100_km"] = consumption

        retained_flags = [flag for flag in original_flags if flag not in _REPAIRABLE_SOURCE_FLAGS]
        if "odometer_continuity_repaired" not in retained_flags:
            retained_flags.append("odometer_continuity_repaired")
        trip["quality_flags"] = retained_flags
        trip["valid_for_statistics"] = not any(flag in _BLOCKING_FLAGS for flag in retained_flags)
        trip["repair_metadata"] = {
            "applied": True,
            "reason": "odometer_regression",
            "source": repair_source,
            "previous_end_mileage_km": round(previous_end, 3),
            "repaired_end_mileage_km": round(candidate_end, 3),
            "repaired_distance_km": candidate_distance,
        }
        if repair_source == "local_trip_match":
            trip["confidence"] = "high"
        else:
            trip["confidence"] = "medium"
        previous_end = candidate_end

    return ordered



def recover_local_odometer_gaps(
    server_trips: list[dict[str, Any]],
    local_trips: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Recover only uniquely corroborated, complete gaps; never split composites.

    The local observation must fit entirely between two positive, valid server
    trips and exactly bridge both odometer boundaries (within rounding noise).
    Retain the local identity/provenance and do not claim a server trip ID.
    """
    positive = [
        row for row in sorted(server_trips, key=_trip_sort_key)
        if (_number(row.get("distance_km")) or 0) > 0
    ]
    anchors = [row for row in positive if row.get("valid_for_statistics") is True]
    recovered: list[dict[str, Any]] = []
    used: set[str] = set()
    for left, right in zip(anchors, anchors[1:]):
        begin, finish = _time(left.get("end_time")), _time(right.get("start_time"))
        lo, hi = _number(left.get("end_mileage")), _number(right.get("start_mileage"))
        if (
            begin is None or finish is None
            or begin.utcoffset() is None or finish.utcoffset() is None
            or finish <= begin or lo is None or hi is None or not 1 < hi - lo <= 1000
        ):
            continue
        candidates = []
        for local in local_trips:
            local_id = str(local.get("id") or "")
            start, end = _time(local.get("start_time")), _time(local.get("end_time"))
            start_km, end_km = _number(local.get("start_mileage")), _number(local.get("end_mileage"))
            duration, distance = _number(local.get("duration_seconds")), _number(local.get("distance_km"))
            if (
                not local_id or local_id in used
                or not local_trip_backfill_quality(local)[0]
                or start is None or end is None
                or start.utcoffset() is None or end.utcoffset() is None
                or not begin <= start < end <= finish
                or start_km is None or end_km is None
                or abs(start_km - lo) > 0.05 or abs(end_km - hi) > 0.05
                or distance is None or abs(distance - (hi - lo)) > 0.1
                or duration is None or duration <= 0
                or abs(duration - (end - start).total_seconds()) > 5
                or distance * 3600 / duration > _MAX_LOCAL_BACKFILL_SPEED_KMH
            ):
                continue
            # Even an invalid non-replay server record can describe a real
            # physical trip. Do not backfill through a conflicting interval.
            overlap = False
            for server in positive:
                s, e = _time(server.get("start_time")), _time(server.get("end_time"))
                if s is not None and e is not None and s.utcoffset() is not None and e.utcoffset() is not None:
                    if s < end and start < e:
                        overlap = True
                        break
            if not overlap:
                candidates.append(local)
        if len(candidates) != 1:
            continue
        local = candidates[0]
        used.add(str(local["id"]))
        distance = round(hi - lo, 3)
        duration = _number(local["duration_seconds"])
        speed = round(distance * 3600 / duration, 1)
        energy = _number(local.get("energy_kwh"))
        if energy is not None and (energy < 0 or energy / distance > 1.5):
            energy = None
        row = {
            **local,
            "id": "local-gap:" + str(local["id"]),
            "server_id": None,
            "status": "complete",
            "source": "sv_local_gap_recovery",
            "sources": ["sv_local_trip", "server_odometer_continuity"],
            "confidence": "medium",
            "start_mileage": lo,
            "start_mileage_km": lo,
            "end_mileage": hi,
            "end_mileage_km": hi,
            "distance_km": distance,
            "average_speed": speed,
            "average_speed_kmh": speed,
            "speed_source": "local_distance_duration",
            "energy_kwh": energy,
            "energy_estimated": energy is not None,
            "energy_source": "sv_local_gap_estimate" if energy is not None else "unknown",
            "energy_per_100_km": round(energy * 100 / distance, 2) if energy is not None else None,
            "consumption_kwh_100km": round(energy * 100 / distance, 2) if energy is not None else None,
            "consumption_estimated": energy is not None,
            "valid_for_statistics": True,
            "quality_flags": ["local_odometer_gap_recovered"],
            "gap_evidence": {"previous_id": left.get("id"), "next_id": right.get("id"), "local_id": local["id"]},
        }
        recovered.append(row)
    return recovered

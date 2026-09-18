"""Pure helpers for the package-owned canonical mileage counter."""

from __future__ import annotations

import math
from typing import Any


def _number(value: Any) -> float | None:
    """Return one finite numeric value or None."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def canonical_server_mileage(trips: Any) -> dict[str, Any] | None:
    """Return the highest trustworthy odometer anchor from canonical trips.

    Only rows that remain valid for statistics may advance the anchor. A
    repaired/missing-trip odometer gap is naturally preserved because the next
    trustworthy trip starts at the higher odometer value; no synthetic trip
    timestamp, duration, energy or consumption is created.
    """
    best: dict[str, Any] | None = None
    for trip in trips if isinstance(trips, list) else []:
        if not isinstance(trip, dict) or trip.get("valid_for_statistics") is False:
            continue

        end_mileage = _number(trip.get("end_mileage_km", trip.get("end_mileage")))
        if end_mileage is None:
            start_mileage = _number(
                trip.get("start_mileage_km", trip.get("start_mileage"))
            )
            distance = _number(trip.get("distance_km", trip.get("distance")))
            if (
                start_mileage is not None
                and distance is not None
                and distance >= 0
            ):
                end_mileage = start_mileage + distance

        if end_mileage is None or end_mileage < 0:
            continue
        if best is None or end_mileage > best["mileage_km"]:
            best = {
                "mileage_km": round(end_mileage, 3),
                "source_time": trip.get("end_time") or trip.get("start_time"),
                "trip_id": trip.get("server_id") or trip.get("id"),
            }
    return best


def monotonic_mileage(
    current: Any,
    candidate: Any,
    *,
    max_forward_jump_km: float | None = None,
) -> float | None:
    """Advance a mileage counter without accepting rollback/unavailable noise."""
    current_value = _number(current)
    candidate_value = _number(candidate)
    if candidate_value is None or candidate_value < 0:
        return current_value
    if current_value is None:
        return round(candidate_value, 3)
    if candidate_value <= current_value:
        return round(current_value, 3)
    if (
        max_forward_jump_km is not None
        and candidate_value - current_value > max_forward_jump_km
    ):
        return round(current_value, 3)
    return round(candidate_value, 3)

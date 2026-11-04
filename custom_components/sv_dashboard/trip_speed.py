"""Resolve mixed-unit Stellantis historical-trip average speed safely.

Real trip payloads may expose kinetic.avgSpeed in m/s or already in km/h.
Use the physical trip's distance and duration to identify a unit. When neither
interpretation agrees, trust the independently derived trip average instead
of guessing a unit or accepting a superficially plausible 3.6x error.
"""

from __future__ import annotations

import math


def resolve_trip_speed(
    raw_average_speed: float | None,
    distance_km: float | None,
    duration_seconds: float | None,
    *,
    max_speed_kmh: float = 300.0,
) -> tuple[float | None, float | None, str, list[str]]:
    """Return (canonical km/h, validated API km/h, provenance, flags)."""

    def valid(speed: float | None) -> bool:
        return speed is not None and math.isfinite(speed) and 0 <= speed <= max_speed_kmh

    duration_ok = (
        duration_seconds is not None
        and math.isfinite(duration_seconds)
        and duration_seconds > 0
    )
    distance_ok = distance_km is not None and math.isfinite(distance_km)
    derived = distance_km * 3600 / duration_seconds if duration_ok and distance_ok else None

    # An impossible distance/time pair must not be masked by a plausible raw
    # value: existing trip-quality logic treats it as a statistics blocker.
    if derived is not None and not valid(derived):
        return None, None, "unavailable", ["derived_speed_outlier"]

    if derived is None:
        # An unanchored raw value has no reliable unit contract.
        return None, None, "unavailable", (
            ["source_speed_unit_unverified"] if raw_average_speed is not None else []
        )

    if raw_average_speed is None or not math.isfinite(raw_average_speed):
        return derived, None, "distance_duration_fallback", []

    candidates = (
        ("stellantis_kmh", raw_average_speed),
        ("stellantis_mps", raw_average_speed * 3.6),
    )
    # Allow rounding and small route/interval discrepancies, but not a 3.6x
    # interpretation error. Avoid an arbitrary unit choice near zero.
    tolerance = max(2.0, derived * 0.15)
    matching = [
        (source, speed)
        for source, speed in candidates
        if valid(speed) and abs(speed - derived) <= tolerance
    ]

    if len(matching) == 1:
        source, speed = matching[0]
        return speed, speed, source, []
    if len(matching) == 2:
        return derived, None, "distance_duration_fallback", ["source_speed_unit_ambiguous"]

    flag = (
        "source_speed_outlier_fallback_used"
        if not any(valid(speed) for _, speed in candidates)
        else "source_speed_disagrees_with_trip"
    )
    return derived, None, "distance_duration_fallback", [flag]

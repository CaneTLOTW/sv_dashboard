"""Powertrain-safe policy for SOC-only reconstructed charge windows."""

from __future__ import annotations

from typing import Any

_FUEL_EVIDENCE_KEYS = (
    "fuel_level_start",
    "fuel_level_end",
    "fuel_range_start_km",
    "fuel_range_end_km",
    "fuel_consumption_l",
    "fuel_consumption_l_100km",
)


def has_fuel_evidence(trip: dict[str, Any] | None) -> bool:
    """Return whether a normalized trip carries dual-energy/fuel evidence."""
    if not isinstance(trip, dict):
        return False
    return any(trip.get(key) is not None for key in _FUEL_EVIDENCE_KEYS)


def allow_soc_only_charge_reconstruction(
    previous: dict[str, Any] | None,
    following: dict[str, Any] | None,
) -> bool:
    """Allow trip-to-trip SOC fallback only when the pair is not dual-energy.

    On a PHEV/Hybrid, SOC can rise between trips without any external charging
    session. Real plugged/charging observations still enter canonical history
    through the observed-session path; only the ambiguous SOC-only fallback is
    suppressed here.
    """
    return not (has_fuel_evidence(previous) or has_fuel_evidence(following))

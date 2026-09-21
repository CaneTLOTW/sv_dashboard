"""Pure helpers for capability-gated energy/fuel derived metrics."""

from __future__ import annotations

from typing import Any, Iterable


def remaining_battery_energy(
    *,
    residual_kwh: float | None,
    soc_percent: float | None,
    capacity_kwh: float | None,
    capacity_source: str | None,
) -> dict[str, Any]:
    """Return remaining battery energy with explicit direct/estimated provenance."""
    if residual_kwh is not None and residual_kwh >= 0:
        return {
            "value": round(residual_kwh, 3),
            "soc_percent": soc_percent,
            "capacity_kwh": None,
            "capacity_source": None,
            "source": "upstream_battery_residual",
            "estimated": False,
        }

    if (
        soc_percent is None
        or not 0 <= soc_percent <= 100
        or capacity_kwh is None
        or capacity_kwh <= 0
    ):
        return {
            "value": None,
            "soc_percent": soc_percent,
            "capacity_kwh": capacity_kwh,
            "capacity_source": capacity_source,
            "source": None,
            "estimated": True,
        }

    return {
        "value": round(capacity_kwh * soc_percent / 100, 3),
        "soc_percent": soc_percent,
        "capacity_kwh": capacity_kwh,
        "capacity_source": capacity_source,
        "source": "soc_x_capacity",
        "estimated": True,
    }


def remaining_fuel_liters(
    *,
    fuel_level_percent: float | None,
    tank_capacity_l: float | None,
) -> dict[str, Any]:
    """Estimate fuel volume from configured nominal capacity and current level."""
    if (
        fuel_level_percent is None
        or not 0 <= fuel_level_percent <= 100
        or tank_capacity_l is None
        or tank_capacity_l <= 0
    ):
        return {
            "value": None,
            "fuel_level_percent": fuel_level_percent,
            "tank_capacity_l": tank_capacity_l,
            "source": None,
            "estimated": True,
        }

    return {
        "value": round(tank_capacity_l * fuel_level_percent / 100, 3),
        "fuel_level_percent": fuel_level_percent,
        "tank_capacity_l": round(tank_capacity_l, 3),
        "source": "fuel_level_x_configured_tank_capacity",
        "estimated": True,
    }


def trailing_fuel_consumption(
    trips: Iterable[dict[str, Any]],
    *,
    window_km: float = 500.0,
) -> dict[str, Any]:
    """Aggregate canonical completed-trip fuel over up to the latest window."""
    remaining = max(0.0, float(window_km))
    distance = 0.0
    fuel_liters = 0.0
    count = 0

    for trip in reversed(list(trips)):
        if trip.get("valid_for_statistics") is False:
            continue
        try:
            trip_distance = float(trip.get("distance_km"))
        except (TypeError, ValueError):
            continue
        raw_fuel = trip.get("fuel_consumption_l")
        if raw_fuel is None:
            continue
        try:
            trip_fuel = float(raw_fuel)
        except (TypeError, ValueError):
            continue
        if trip_distance <= 0 or trip_fuel < 0 or remaining <= 0:
            continue

        used_distance = min(remaining, trip_distance)
        distance += used_distance
        fuel_liters += trip_fuel * used_distance / trip_distance
        count += 1
        remaining -= used_distance
        if remaining <= 0:
            break

    return {
        "value": round(fuel_liters / distance * 100, 2) if distance > 0 else None,
        "distance_km": round(distance, 2),
        "fuel_liters": round(fuel_liters, 3),
        "trip_count": count,
        "complete": distance >= window_km,
    }

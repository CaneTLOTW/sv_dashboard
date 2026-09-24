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

_TRUSTED_ELECTRIC_ENERGY_SOURCES = {"stellantis_trip.energy_consumptions"}


def trailing_electric_consumption(
    trips: Iterable[dict[str, Any]],
    *,
    window_km: float = 500.0,
    strict_direct: bool = False,
    minimum_coverage_ratio: float = 0.8,
    minimum_trusted_distance_km: float = 100.0,
    minimum_trusted_trip_count: int = 3,
) -> dict[str, Any]:
    """Aggregate completed-trip electric consumption with optional strict provenance.

    The legacy/non-strict path intentionally preserves the existing BEV
    behaviour: it walks backwards until up to window_km of trips carrying
    any usable energy_kwh have been accumulated.

    The strict path is intended for Dual-Energy/PHEV vehicles. It first defines
    the latest physical driving window from all valid trips, then only accepts
    direct Stellantis electric-energy telemetry inside that window. A value is
    exposed only when the direct-energy coverage is both broad and substantial;
    otherwise callers receive None instead of a mathematically precise but
    misleading result.
    """
    rows = [trip for trip in trips if isinstance(trip, dict)]
    window_km = max(0.0, float(window_km))

    if not strict_direct:
        remaining = window_km
        distance = 0.0
        energy = 0.0
        count = 0
        for trip in reversed(rows):
            if trip.get("valid_for_statistics") is False:
                continue
            try:
                trip_distance = float(trip.get("distance_km"))
                trip_energy = float(trip.get("energy_kwh"))
            except (TypeError, ValueError):
                continue
            if trip_distance <= 0 or trip_energy < 0 or remaining <= 0:
                continue
            used_distance = min(remaining, trip_distance)
            distance += used_distance
            energy += trip_energy * used_distance / trip_distance
            count += 1
            remaining -= used_distance
            if remaining <= 0:
                break
        return {
            "value": round(energy / distance * 100, 2) if distance > 0 else None,
            "distance_km": round(distance, 2),
            "energy_kwh": round(energy, 3),
            "trip_count": count,
            "complete": distance >= window_km,
            "strict_direct": False,
            "window_distance_km": round(distance, 2),
            "coverage_distance_km": round(distance, 2),
            "coverage_ratio": 1.0 if distance > 0 else 0.0,
            "coverage_sufficient": distance > 0,
        }

    remaining_window = window_km
    window_distance = 0.0
    trusted_distance = 0.0
    trusted_energy = 0.0
    trusted_count = 0

    for trip in reversed(rows):
        if remaining_window <= 0:
            break
        if trip.get("valid_for_statistics") is False:
            continue
        try:
            trip_distance = float(trip.get("distance_km"))
        except (TypeError, ValueError):
            continue
        if trip_distance <= 0:
            continue

        used_distance = min(remaining_window, trip_distance)
        window_distance += used_distance
        remaining_window -= used_distance

        if trip.get("energy_source") not in _TRUSTED_ELECTRIC_ENERGY_SOURCES:
            continue
        if trip.get("energy_estimated") is True:
            continue
        try:
            trip_energy = float(trip.get("energy_kwh"))
        except (TypeError, ValueError):
            continue
        if trip_energy < 0:
            continue

        trusted_distance += used_distance
        trusted_energy += trip_energy * used_distance / trip_distance
        trusted_count += 1

    coverage_ratio = trusted_distance / window_distance if window_distance > 0 else 0.0
    coverage_sufficient = (
        trusted_distance >= max(0.0, float(minimum_trusted_distance_km))
        and trusted_count >= max(1, int(minimum_trusted_trip_count))
        and coverage_ratio >= max(0.0, min(1.0, float(minimum_coverage_ratio)))
    )

    return {
        "value": (
            round(trusted_energy / trusted_distance * 100, 2)
            if coverage_sufficient and trusted_distance > 0
            else None
        ),
        "distance_km": round(trusted_distance, 2),
        "energy_kwh": round(trusted_energy, 3),
        "trip_count": trusted_count,
        "complete": window_distance >= window_km and coverage_sufficient,
        "strict_direct": True,
        "window_distance_km": round(window_distance, 2),
        "coverage_distance_km": round(trusted_distance, 2),
        "coverage_ratio": round(coverage_ratio, 3),
        "coverage_sufficient": coverage_sufficient,
        "minimum_coverage_ratio": round(float(minimum_coverage_ratio), 3),
        "minimum_trusted_distance_km": round(float(minimum_trusted_distance_km), 2),
        "minimum_trusted_trip_count": int(minimum_trusted_trip_count),
        "energy_sources": sorted(_TRUSTED_ELECTRIC_ENERGY_SOURCES),
    }

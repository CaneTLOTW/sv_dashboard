from __future__ import annotations

import importlib.util
from pathlib import Path

MODULE = Path(__file__).parents[1] / "custom_components" / "sv_dashboard" / "consumption.py"
spec = importlib.util.spec_from_file_location("sv_dashboard_consumption", MODULE)
consumption = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(consumption)


def main() -> None:
    direct = consumption.remaining_battery_energy(
        residual_kwh=17.25,
        soc_percent=42,
        capacity_kwh=42.1,
        capacity_source="api",
    )
    assert direct["value"] == 17.25
    assert direct["source"] == "upstream_battery_residual"
    assert direct["estimated"] is False

    fallback = consumption.remaining_battery_energy(
        residual_kwh=None,
        soc_percent=50,
        capacity_kwh=42,
        capacity_source="configured",
    )
    assert fallback["value"] == 21
    assert fallback["source"] == "soc_x_capacity"
    assert fallback["estimated"] is True
    assert fallback["capacity_source"] == "configured"

    assert consumption.remaining_battery_energy(
        residual_kwh=None,
        soc_percent=None,
        capacity_kwh=42,
        capacity_source="configured",
    )["value"] is None

    fuel = consumption.remaining_fuel_liters(
        fuel_level_percent=50,
        tank_capacity_l=42,
    )
    assert fuel["value"] == 21
    assert fuel["source"] == "fuel_level_x_configured_tank_capacity"
    assert fuel["estimated"] is True
    assert consumption.remaining_fuel_liters(
        fuel_level_percent=50,
        tank_capacity_l=None,
    )["value"] is None
    assert consumption.remaining_fuel_liters(
        fuel_level_percent=101,
        tank_capacity_l=42,
    )["value"] is None

    trips = [
        {"distance_km": 300, "fuel_consumption_l": 15, "valid_for_statistics": True},
        {"distance_km": 300, "fuel_consumption_l": 24, "valid_for_statistics": True},
    ]
    rolling = consumption.trailing_fuel_consumption(trips)
    # Latest trip contributes 300 km / 24 L; only 200 km / 10 L from the older one.
    assert rolling["distance_km"] == 500
    assert rolling["fuel_liters"] == 34
    assert rolling["value"] == 6.8
    assert rolling["trip_count"] == 2
    assert rolling["complete"] is True

    filtered = consumption.trailing_fuel_consumption(
        [
            {"distance_km": 100, "fuel_consumption_l": 7, "valid_for_statistics": False},
            {"distance_km": 100, "fuel_consumption_l": None, "valid_for_statistics": True},
            {"distance_km": 100, "fuel_consumption_l": 0, "valid_for_statistics": True},
        ]
    )
    assert filtered["distance_km"] == 100
    assert filtered["fuel_liters"] == 0
    assert filtered["value"] == 0
    assert filtered["trip_count"] == 1
    assert filtered["complete"] is False


    direct_trips = [
        {
            "distance_km": 30,
            "energy_kwh": 6,
            "energy_source": "stellantis_trip.energy_consumptions",
            "energy_estimated": False,
            "valid_for_statistics": True,
        }
        for _ in range(4)
    ]
    strict = consumption.trailing_electric_consumption(
        direct_trips,
        strict_direct=True,
    )
    assert strict["value"] == 20
    assert strict["window_distance_km"] == 120
    assert strict["coverage_distance_km"] == 120
    assert strict["coverage_ratio"] == 1.0
    assert strict["coverage_sufficient"] is True
    assert strict["trip_count"] == 4

    incomplete = [dict(trip) for trip in direct_trips]
    incomplete[-1]["energy_source"] = "derived_from_trip_soc"
    incomplete[-1]["energy_estimated"] = True
    strict_incomplete = consumption.trailing_electric_consumption(
        incomplete,
        strict_direct=True,
    )
    assert strict_incomplete["window_distance_km"] == 120
    assert strict_incomplete["coverage_distance_km"] == 90
    assert strict_incomplete["coverage_ratio"] == 0.75
    assert strict_incomplete["coverage_sufficient"] is False
    assert strict_incomplete["value"] is None

    # BEV/non-strict semantics stay backwards-compatible: any usable
    # canonical energy can contribute, including SOC-derived fallback.
    legacy = consumption.trailing_electric_consumption(
        [
            {
                "distance_km": 25,
                "energy_kwh": 5,
                "energy_source": "derived_from_trip_soc",
                "energy_estimated": True,
                "valid_for_statistics": True,
            }
        ],
        strict_direct=False,
    )
    assert legacy["value"] == 20
    assert legacy["distance_km"] == 25
    assert legacy["strict_direct"] is False


if __name__ == "__main__":
    main()

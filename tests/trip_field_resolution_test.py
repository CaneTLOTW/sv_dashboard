"""Canonical trip field-resolution and rebuild regression tests."""

from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
import importlib.util
import json
import sys
import types
from pathlib import Path

ROOT = Path(__file__).parents[1]
PACKAGE_PATH = ROOT / "custom_components" / "sv_dashboard"
FIXTURE = json.loads((ROOT / "tests/fixtures/trip-field-resolution.json").read_text())


def _install_stubs():
    ha = types.ModuleType("homeassistant")
    ha.__path__ = []
    components = types.ModuleType("homeassistant.components")
    components.__path__ = []
    recorder = types.ModuleType("homeassistant.components.recorder")
    recorder.history = types.ModuleType("homeassistant.components.recorder.history")
    recorder.get_instance = lambda _hass: None
    components.recorder = recorder
    helpers = types.ModuleType("homeassistant.helpers")
    helpers.__path__ = []
    storage = types.ModuleType("homeassistant.helpers.storage")
    storage.Store = object
    core = types.ModuleType("homeassistant.core")
    core.callback = lambda function: function
    util = types.ModuleType("homeassistant.util")
    util.__path__ = []
    dt = types.ModuleType("homeassistant.util.dt")
    dt.utcnow = lambda: datetime(2026, 10, 2, 12, tzinfo=UTC)
    dt.as_utc = lambda value: value.astimezone(UTC)

    def parse_datetime(value):
        text = str(value)
        return datetime.fromisoformat(text[:-1] + "+00:00" if text.endswith("Z") else text)

    dt.parse_datetime = parse_datetime
    util.dt = dt
    sys.modules.update(
        {
            "homeassistant": ha,
            "homeassistant.components": components,
            "homeassistant.components.recorder": recorder,
            "homeassistant.components.recorder.history": recorder.history,
            "homeassistant.helpers": helpers,
            "homeassistant.helpers.storage": storage,
            "homeassistant.core": core,
            "homeassistant.util": util,
            "homeassistant.util.dt": dt,
        }
    )

    package = types.ModuleType("sv_dashboard")
    package.__path__ = [str(PACKAGE_PATH)]
    sys.modules["sv_dashboard"] = package

    const = types.ModuleType("sv_dashboard.const")
    const.CONF_VEHICLE_SLUG = "vehicle_slug"
    const.DEFAULT_OPTIONS = {"history_hours": 2160}
    const.DOMAIN = "sv_dashboard"
    const.OPTION_HISTORY_HOURS = "history_hours"
    const.UPSTREAM_DOMAIN = "stellantis_vehicles"

    def stub(name, **attributes):
        module = types.ModuleType(f"sv_dashboard.{name}")
        for key, value in attributes.items():
            setattr(module, key, value)
        sys.modules[module.__name__] = module

    stub("const", **{key: getattr(const, key) for key in dir(const) if key.isupper()})
    stub("charge_policy", allow_soc_only_charge_reconstruction=lambda *_args: False)
    stub("entity_identity", vehicle_vin=lambda *_args: None)
    stub(
        "history_reconcile",
        AUTO_RECONCILE_DELAYS_SECONDS=(1, 2, 3),
        completion_key=lambda *_args: "",
        completion_represented=lambda *_args, **_kwargs: False,
    )
    class TransportUnavailable(Exception):
        pass

    stub(
        "server_history_transport",
        HistoricalTripsTransportUnavailable=TransportUnavailable,
        async_fetch_historical_trips=lambda *_args, **_kwargs: None,
        historical_transport_available=lambda *_args: False,
        historical_transport_retryable=lambda *_args: False,
        server_history_retry_allowed=lambda *_args: False,
    )
    stub(
        "upstream_compat",
        freshest_upstream_timestamp=lambda *_args: None,
        get_upstream_coordinator_data=lambda *_args: None,
        resolve_loaded_upstream=lambda *_args: None,
    )


_install_stubs()
SPEC = importlib.util.spec_from_file_location(
    "sv_dashboard.server_history", PACKAGE_PATH / "server_history.py"
)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def _scenario():
    item = deepcopy(FIXTURE["duplicated_boundary"])
    return item["server"], item["local"]


def _set_pair(raw, section, energy_type, field, values):
    entries = raw[section]
    target = next(item for item in entries if item["type"] == energy_type)
    target[field] = values[0]
    other = next(item for item in raw["endEnergies"] if item["type"] == energy_type)
    other[field] = values[1]


def _set_local_pair(local, evidence_field, legacy_start, legacy_end, values):
    local[legacy_start], local[legacy_end] = values
    for edge, value in zip(("start", "end"), values):
        observation = local.get("boundary_evidence", {}).get(edge, {}).get(evidence_field)
        if isinstance(observation, dict):
            observation["value"] = value


def _rebuild(raw, local=None, capacity=40):
    manager = object.__new__(MODULE.ServerHistoryManager)
    manager.data = {
        "server_trips_raw": [deepcopy(raw)],
        "recorder_observed_charges_archive": [],
        "recorder_observed_charges": [],
        "recorder_capacity_samples_archive": [],
        "recorder_capacity_samples": [],
        "legacy_live_snapshot": None,
    }
    manager.metrics = types.SimpleNamespace(data={"trips": [deepcopy(local)] if local else [], "charges": []})
    manager._capacity_for_trip = lambda _raw: (capacity, "fixture_capacity") if capacity else (None, None)
    manager._hydrate_observed_sessions = lambda rows: rows
    manager._annotate_legacy_trip_matches = lambda _trips: None
    manager._update_archive_metadata = lambda: None
    manager._rebuild_canonical()
    return manager.data["canonical_trips"][0]


def test_duplicate_server_boundary_uses_matched_local_values_and_keeps_raw_truth():
    raw, local = _scenario()
    raw_before = deepcopy(raw)
    result = _rebuild(raw, local)

    assert (result["soc_start"], result["soc_end"]) == (70, 67)
    assert (result["electric_range_start_km"], result["electric_range_end_km"]) == (50, 44)
    assert result["field_sources"]["soc_start"] == "sv_local_trip_boundary"
    assert result["field_conflicts"]["soc_start"] == {
        "server": 67,
        "local": 70,
        "resolution": "matched_local_boundary",
    }
    assert result["field_sources"]["electric_range_start_km"] == "sv_local_trip_boundary"
    assert result["field_sources"]["fuel_level_start"] == "stellantis_trip.startEnergies.Fuel.level"
    assert result["raw_server"] == raw_before
    assert result["energy_kwh"] == 1.0
    assert result["energy_estimated"] is True
    assert result["energy_source"] == "sv_local_trip_residual_energy_delta"
    assert result["local_evidence_match"]["matched"] is True


def test_legitimate_equal_soc_stays_equal_and_does_not_invent_energy():
    raw, local = _scenario()
    _set_pair(raw, "startEnergies", "Electric", "level", [70, 70])
    _set_local_pair(local, "soc", "start_soc", "end_soc", [70, 70])
    for edge in ("start", "end"):
        local["boundary_evidence"][edge].pop("residual_energy_kwh", None)

    result = _rebuild(raw, local)

    assert (result["soc_start"], result["soc_end"]) == (70, 70)
    assert result["energy_kwh"] is None
    assert result["energy_estimated"] is False


def test_equal_local_soc_does_not_override_server_without_proven_boundary_change():
    raw, local = _scenario()
    _set_pair(raw, "startEnergies", "Electric", "level", [67, 67])
    _set_local_pair(local, "soc", "start_soc", "end_soc", [70, 70])
    for edge in ("start", "end"):
        local["boundary_evidence"][edge].pop("residual_energy_kwh", None)

    result = _rebuild(raw, local)

    assert (result["soc_start"], result["soc_end"]) == (67, 67)
    assert result["field_sources"]["soc_start"] == "stellantis_trip.startEnergies.Electric.level"
    assert result["field_conflicts"]["soc_start"]["resolution"] == "ambiguous_server_retained"
    assert result["energy_kwh"] is None


def test_old_source_timestamp_is_only_fallback_not_proof_of_a_boundary_change():
    raw, local = _scenario()
    local["boundary_evidence"]["start"]["soc"]["source_time"] = "2026-10-01T10:02:00Z"
    local["boundary_evidence"]["start"]["residual_energy_kwh"]["source_time"] = "2026-10-01T10:02:00Z"

    result = _rebuild(raw, local)

    assert (result["soc_start"], result["soc_end"]) == (67, 67)
    assert result["field_conflicts"]["soc_start"]["resolution"] == "ambiguous_server_retained"
    assert result["energy_kwh"] is None


def test_capture_time_without_entity_timestamp_is_not_treated_as_source_time():
    raw, local = _scenario()
    for edge in ("start", "end"):
        local["boundary_evidence"][edge]["soc"]["timestamp_source"] = "received_at"
        local["boundary_evidence"][edge]["residual_energy_kwh"]["timestamp_source"] = "received_at"

    result = _rebuild(raw, local)

    assert (result["soc_start"], result["soc_end"]) == (67, 67)
    assert result["field_conflicts"]["soc_start"]["resolution"] == "ambiguous_server_retained"
    assert result["energy_kwh"] is None


def test_valid_server_soc_delta_agreed_by_local_evidence_remains_server_sourced():
    raw, local = _scenario()
    _set_pair(raw, "startEnergies", "Electric", "level", [80, 74])
    _set_local_pair(local, "soc", "start_soc", "end_soc", [80, 74])

    result = _rebuild(raw, local)

    assert (result["soc_start"], result["soc_end"]) == (80, 74)
    assert result["field_sources"]["soc_start"] == "stellantis_trip.startEnergies.Electric.level"
    assert "soc_start" not in result["field_conflicts"]


def test_impossible_server_soc_increase_yields_to_strong_local_boundary_evidence():
    raw, local = _scenario()
    _set_pair(raw, "startEnergies", "Electric", "level", [0, 78])
    _set_local_pair(local, "soc", "start_soc", "end_soc", [72, 70])

    result = _rebuild(raw, local)

    assert (result["soc_start"], result["soc_end"]) == (72, 70)
    assert all(
        result["field_conflicts"][field]["resolution"] == "matched_local_boundary"
        for field in ("soc_start", "soc_end")
    )


def test_no_strong_match_preserves_server_duplicate_without_local_energy():
    raw, local = _scenario()
    local["start_time"] = "2026-09-30T10:09:18Z"

    result = _rebuild(raw, local, capacity=None)

    assert (result["soc_start"], result["soc_end"]) == (67, 67)
    assert result["energy_kwh"] is None
    assert result["local_evidence_match"] == {"matched": False, "reason": "no_strong_match"}
    assert result["field_sources"]["soc_start"] == "stellantis_trip.startEnergies.Electric.level"


def test_bad_local_composite_cannot_override_server_fields():
    raw, local = _scenario()
    bad = deepcopy(local)
    bad.update(
        {
            "distance_km": 25,
            "end_mileage": 2497.7,
            "duration_seconds": 362,
            "end_time": "2026-10-01T10:15:20Z",
        }
    )

    result = _rebuild(raw, bad, capacity=None)

    assert (result["soc_start"], result["soc_end"]) == (67, 67)
    assert result["local_evidence_match"]["matched"] is False


def test_electric_range_resolves_independently_from_soc_and_fuel():
    raw, local = _scenario()
    _set_pair(raw, "startEnergies", "Electric", "level", [70, 67])

    result = _rebuild(raw, local)

    assert (result["soc_start"], result["soc_end"]) == (70, 67)
    assert result["field_sources"]["soc_start"].startswith("stellantis_trip.")
    assert result["electric_range_start_km"] == 50
    assert result["field_sources"]["electric_range_start_km"] == "sv_local_trip_boundary"
    assert (result["fuel_level_start"], result["fuel_level_end"]) == (100, 100)
    assert (result["fuel_range_start_km"], result["fuel_range_end_km"]) == (700, 700)


def test_direct_server_electric_energy_wins_over_local_estimates():
    raw, local = _scenario()
    raw["energyConsumptions"].append({"type": "Electric", "consumption": 4500})

    result = _rebuild(raw, local)

    assert result["energy_kwh"] == 4.5
    assert result["energy_estimated"] is False
    assert result["energy_source"] == "stellantis_trip.energy_consumptions"


def test_soc_capacity_estimate_is_marked_and_provenanced_when_residual_is_absent():
    raw, local = _scenario()
    _set_pair(raw, "startEnergies", "Electric", "level", [70, 67])
    for edge in ("start", "end"):
        local["boundary_evidence"][edge].pop("residual_energy_kwh", None)

    result = _rebuild(raw, local)

    assert result["energy_kwh"] == 1.2
    assert result["energy_estimated"] is True
    assert result["energy_source"] == "resolved_trip_soc_capacity_estimate"
    assert result["field_sources"]["energy_kwh"] == "resolved_trip_soc_capacity_estimate"


def test_direct_fuel_survives_electric_conflict_and_local_delta_only_fills_missing():
    raw, local = _scenario()
    raw["energyConsumptions"][0].update({"consumption": 200, "avgConsumption": 400})
    result = _rebuild(raw, local)
    assert result["fuel_consumption_l"] == 2
    assert result["fuel_consumption_l_100km"] == 4
    assert result["field_sources"]["fuel_consumption_l"] == "stellantis_trip.energyConsumptions.Fuel.consumption"
    assert (result["fuel_level_start"], result["fuel_level_end"]) == (100, 100)

    raw, local = _scenario()
    raw["energyConsumptions"] = []
    local["end_fuel_total"] = 0.2
    local["boundary_evidence"]["end"]["fuel_consumption_total"]["value"] = 0.2
    filled = _rebuild(raw, local)
    assert filled["fuel_consumption_l"] == 0.2
    assert filled["fuel_consumption_l_100km"] == 9.52
    assert filled["field_sources"]["fuel_consumption_l"] == "sv_local_trip_fuel_total_delta"


def test_measured_zero_fuel_consumption_is_preserved():
    raw, local = _scenario()

    result = _rebuild(raw, local)

    assert result["fuel_consumption_l"] == 0
    assert result["field_sources"]["fuel_consumption_l"] == (
        "stellantis_trip.energyConsumptions.Fuel.consumption"
    )


def test_old_local_store_never_fabricates_missing_electric_range():
    raw, local = _scenario()
    local.pop("boundary_evidence")

    result = _rebuild(raw, local)

    assert (result["soc_start"], result["soc_end"]) == (70, 67)
    assert (result["electric_range_start_km"], result["electric_range_end_km"]) == (44, 44)
    assert result["field_sources"]["electric_range_start_km"].startswith("stellantis_trip.")


def test_server_normalization_and_canonical_rebuild_keep_raw_payload_unchanged():
    raw, local = _scenario()
    before = deepcopy(raw)
    normalized = MODULE.normalize_trip(raw, 40, "fixture_capacity")
    assert raw == before
    result = _rebuild(raw, local)
    assert result["raw_server"] == before
    assert normalized["raw_server"] == before


def test_duplicate_fixture_contains_no_private_identifiers_or_coordinates():
    encoded = json.dumps(FIXTURE)
    for forbidden in ("VIN", "latitude", "longitude", "token", "account_id", "recipient"):
        assert forbidden.lower() not in encoded.lower()


def run():
    tests = [value for name, value in globals().items() if name.startswith("test_")]
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
    print(f"{len(tests)} trip field resolution tests passed")


if __name__ == "__main__":
    run()

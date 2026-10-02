"""Offline behavior tests for the bounded, read-only vehicle diagnostics query."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
import importlib.util
import sys
import types
from pathlib import Path


ROOT = Path(__file__).parents[1]
MODULE_PATH = ROOT / "custom_components" / "sv_dashboard" / "vehicle_diagnostics.py"


def _install_stubs():
    voluptuous = types.ModuleType("voluptuous")
    voluptuous.Required = lambda key, **_kwargs: key
    voluptuous.Optional = lambda key, **_kwargs: key
    voluptuous.In = lambda values: values
    sys.modules["voluptuous"] = voluptuous

    ha = types.ModuleType("homeassistant")
    ha.__path__ = []
    components = types.ModuleType("homeassistant.components")
    components.__path__ = []
    recorder = types.ModuleType("homeassistant.components.recorder")
    history = types.ModuleType("homeassistant.components.recorder.history")
    recorder.get_instance = lambda _hass: None
    websocket_api = types.ModuleType("homeassistant.components.websocket_api")
    websocket_api.websocket_command = lambda _schema: lambda function: function
    websocket_api.async_response = lambda function: function
    websocket_api.async_register_command = lambda *_args: None
    recorder.history = history
    components.recorder = recorder
    components.websocket_api = websocket_api

    core = types.ModuleType("homeassistant.core")
    core.HomeAssistant = object
    util = types.ModuleType("homeassistant.util")
    util.__path__ = []
    dt = types.ModuleType("homeassistant.util.dt")
    dt.utcnow = lambda: datetime(2026, 10, 2, 12, 0, tzinfo=UTC)
    dt.as_utc = lambda value: value.astimezone(UTC)
    dt.parse_datetime = lambda value: datetime.fromisoformat(value.replace("Z", "+00:00"))
    util.dt = dt

    sys.modules.update(
        {
            "homeassistant": ha,
            "homeassistant.components": components,
            "homeassistant.components.recorder": recorder,
            "homeassistant.components.recorder.history": history,
            "homeassistant.components.websocket_api": websocket_api,
            "homeassistant.core": core,
            "homeassistant.util": util,
            "homeassistant.util.dt": dt,
        }
    )

    package = types.ModuleType("sv_dashboard")
    package.__path__ = [str(MODULE_PATH.parent)]
    const = types.ModuleType("sv_dashboard.const")
    const.DOMAIN = "sv_dashboard"
    const.FRONTEND_VERSION = "0.6.0-beta.39"
    sys.modules["sv_dashboard"] = package
    sys.modules["sv_dashboard.const"] = const


_install_stubs()
SPEC = importlib.util.spec_from_file_location("sv_dashboard.vehicle_diagnostics", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)

RECORDED_CALLS: list[tuple[object, ...]] = []
RECORDED_STATES: dict[str, list[object]] = {}


def _get_significant_states(*args):
    RECORDED_CALLS.append(args)
    _hass, start_time, end_time, entity_ids, _filters, include_start_time_state = args[:6]
    result = {}
    for entity_id in entity_ids:
        states = RECORDED_STATES.get(entity_id, [])
        in_window = [
            state
            for state in states
            if start_time <= state.last_updated <= end_time
        ]
        if include_start_time_state:
            before_window = [state for state in states if state.last_updated < start_time]
            if before_window:
                in_window.insert(0, before_window[-1])
        result[entity_id] = in_window
    return result


MODULE.recorder_history.get_significant_states = _get_significant_states


class FakeRecorder:
    async def async_add_executor_job(self, function, *args):
        return function(*args)


MODULE.get_instance = lambda _hass: FakeRecorder()


class FakeStates:
    def __init__(self, values=None):
        self.values = values or {}

    def get(self, entity_id):
        return self.values.get(entity_id)


class FakeHass:
    def __init__(self, entries, states=None):
        self.data = {"sv_dashboard": entries}
        self.states = FakeStates(states)
        self.services = object()


class FakeConnection:
    def __init__(self):
        self.result = None
        self.error = None

    def send_result(self, _message_id, result):
        self.result = result

    def send_error(self, _message_id, code, message):
        self.error = (code, message)


def _state(value, time, attributes=None):
    return types.SimpleNamespace(
        state=value,
        last_updated=datetime.fromisoformat(time),
        last_changed=datetime.fromisoformat(time),
        attributes=attributes or {},
    )


def _coordinator(mapping):
    return types.SimpleNamespace(data={"entity_mapping": mapping})


def _reset(states=None):
    RECORDED_CALLS.clear()
    RECORDED_STATES.clear()
    RECORDED_STATES.update(states or {})


def test_query_is_limited_to_the_selected_entry_and_mapped_entities():
    _reset({"binary_sensor.vehicle_climate": [_state("on", "2026-10-02T11:55:00+00:00")]})
    hass = FakeHass(
        {
            "selected": _coordinator({"preconditioning": "binary_sensor.vehicle_climate"}),
            "other": _coordinator({"preconditioning": "binary_sensor.other_vehicle"}),
        }
    )
    connection = FakeConnection()
    asyncio.run(
        MODULE.websocket_vehicle_diagnostics(
            hass,
            connection,
            {"id": 1, "entry_id": "selected", "duration_seconds": 1800},
        )
    )
    assert connection.error is None
    assert connection.result["available_signals"] == ["preconditioning"]
    assert RECORDED_CALLS[0][3] == ["binary_sensor.vehicle_climate"]
    assert "binary_sensor.other_vehicle" not in str(connection.result)


def test_missing_optional_entities_and_empty_recorder_history_are_safe():
    _reset()
    hass = FakeHass({"entry": _coordinator({})})
    report = asyncio.run(MODULE.async_build_vehicle_diagnostics(hass, hass.data["sv_dashboard"]["entry"], 7200))
    assert report["events"] == []
    assert report["available_signals"] == []
    assert RECORDED_CALLS == []

    _reset({})
    coordinator = _coordinator({"temperature": "sensor.temperature"})
    report = asyncio.run(MODULE.async_build_vehicle_diagnostics(hass, coordinator, 7200))
    assert report["events"] == []
    assert report["recorder_available"] is True


def test_pre_window_baseline_alone_does_not_create_a_timeline_event():
    _reset(
        {
            "sensor.temperature": [
                _state("14", "2026-10-02T08:00:00+00:00"),
            ]
        }
    )
    coordinator = _coordinator({"temperature": "sensor.temperature"})

    report = asyncio.run(
        MODULE.async_build_vehicle_diagnostics(FakeHass({}), coordinator, 7200)
    )

    assert RECORDED_CALLS[0][5] is False
    assert report["events"] == []
    assert report["total_events"] == 0
    assert report["truncated"] is False


def test_pre_window_baseline_is_excluded_but_in_window_change_is_kept():
    _reset(
        {
            "sensor.temperature": [
                _state("14", "2026-10-02T08:00:00+00:00"),
                _state("15", "2026-10-02T11:15:00+00:00"),
            ]
        }
    )
    coordinator = _coordinator({"temperature": "sensor.temperature"})

    report = asyncio.run(
        MODULE.async_build_vehicle_diagnostics(FakeHass({}), coordinator, 7200)
    )

    assert RECORDED_CALLS[0][5] is False
    assert [event["value"] for event in report["events"]] == ["15"]
    assert [event["event_time"] for event in report["events"]] == [
        "2026-10-02T11:15:00Z"
    ]
    assert report["total_events"] == 1


def test_refresh_interval_history_preserves_the_real_recorded_value():
    _reset({"number.refresh": [_state("60", "2026-10-02T11:50:00+00:00", {"unit_of_measurement": "s"})]})
    hass = FakeHass(
        {"entry": _coordinator({"refresh_interval": "number.refresh"})},
        {"number.refresh": _state("60", "2026-10-02T11:59:00+00:00", {"unit_of_measurement": "s"})},
    )
    report = asyncio.run(MODULE.async_build_vehicle_diagnostics(hass, hass.data["sv_dashboard"]["entry"], 7200))
    assert report["events"][0]["value"] == "60"
    assert report["events"][0]["unit"] == "s"
    assert report["current_refresh_interval"] == {"value": "60", "unit": "s"}


def test_preconditioning_states_keep_source_timestamp_provenance():
    _reset(
        {
            "binary_sensor.climate": [
                _state("off", "2026-10-02T11:40:00+00:00", {"createdAt": "2026-10-02T11:39:58Z"}),
                _state("on", "2026-10-02T11:41:00+00:00", {"createdAt": "2026-10-02T11:40:59Z"}),
            ]
        }
    )
    report = asyncio.run(
        MODULE.async_build_vehicle_diagnostics(
            FakeHass({}),
            _coordinator({"preconditioning": "binary_sensor.climate"}),
            7200,
        )
    )
    events = [event for event in report["events"] if event["signal"] == "preconditioning"]
    assert [event["value"] for event in events] == ["off", "on"]
    assert [event["timestamp_source"] for event in events] == ["upstream_attribute", "upstream_attribute"]
    assert events[1]["source_time"] == "2026-10-02T11:40:59Z"


def test_temperature_is_reported_without_inferring_climate_mode():
    _reset({"sensor.temperature": [_state("14.5", "2026-10-02T11:42:00+00:00", {"unit_of_measurement": "°C"})]})
    report = asyncio.run(
        MODULE.async_build_vehicle_diagnostics(
            FakeHass({}), _coordinator({"temperature": "sensor.temperature"}), 7200
        )
    )
    event = report["events"][0]
    assert event["signal"] == "temperature"
    assert event["value"] == "14.5"
    assert "climate_mode" not in event


def test_command_status_transitions_keep_recorded_time_order():
    _reset(
        {
            "sensor.command_status": [
                _state("Wake-up: accepted", "2026-10-02T11:41:00+00:00"),
                _state("Wake-up: forwarded", "2026-10-02T11:42:00+00:00"),
                _state("Wake-up: timeout", "2026-10-02T11:43:00+00:00"),
            ]
        }
    )
    report = asyncio.run(
        MODULE.async_build_vehicle_diagnostics(
            FakeHass({}), _coordinator({"command_status": "sensor.command_status"}), 7200
        )
    )
    assert [event["value"] for event in report["events"]] == [
        "Wake-up: accepted",
        "Wake-up: forwarded",
        "Wake-up: timeout",
    ]
    assert [event["event_time"] for event in report["events"]] == sorted(
        event["event_time"] for event in report["events"]
    )


def test_raw_command_result_code_is_never_inferred_from_numeric_state():
    _reset({"sensor.command_status": [_state("500", "2026-10-02T11:43:00+00:00")]})
    report = asyncio.run(
        MODULE.async_build_vehicle_diagnostics(
            FakeHass({}), _coordinator({"command_status": "sensor.command_status"}), 7200
        )
    )
    assert report["raw_command_result_code"] == "not_recorded"
    assert report["events"][0]["raw_result_code"] == "not_recorded"
    assert report["events"][0]["value"] == "raw result code not recorded"
    assert "500" not in str(report)


def test_later_recorded_vehicle_data_is_separate_from_command_timeout():
    _reset(
        {
            "sensor.command_status": [_state("Wake-up: timeout", "2026-10-02T11:43:00+00:00")],
            "sensor.battery": [_state("71", "2026-10-02T11:44:00+00:00", {"unit_of_measurement": "%"})],
        }
    )
    report = asyncio.run(
        MODULE.async_build_vehicle_diagnostics(
            FakeHass({}),
            _coordinator({"command_status": "sensor.command_status", "battery": "sensor.battery"}),
            7200,
        )
    )
    assert [event["signal"] for event in report["events"]] == ["command_status", "battery"]
    assert report["events"][1]["vehicle_data_evidence"] is True
    assert report["events"][1]["event_time"] > report["events"][0]["event_time"]
    assert "mapped_state_change_is_not_proof_of_vehicle_online_status" in report["limitations"]


def test_response_omits_identifiers_coordinates_urls_and_unselected_attributes():
    _reset(
        {
            "sensor.temperature": [
                _state(
                    "14.5",
                    "2026-10-02T11:42:00+00:00",
                    {
                        "unit_of_measurement": "°C",
                        "vin": "VF7XXXXXXXXXXXXXXX",
                        "latitude": 48.123456,
                        "longitude": 2.123456,
                        "href": "https://private.example/path",
                        "account_id": "private-customer",
                    },
                )
            ]
        }
    )
    report = asyncio.run(
        MODULE.async_build_vehicle_diagnostics(
            FakeHass({}), _coordinator({"temperature": "sensor.temperature"}), 7200
        )
    )
    output = str(report)
    for private in ("VF7XXXXXXXXXXXXXXX", "48.123456", "2.123456", "private.example", "private-customer", "sensor.temperature"):
        assert private not in output


def test_query_uses_only_recorder_and_never_calls_commands_or_external_transport():
    _reset({"sensor.temperature": [_state("14", "2026-10-02T11:42:00+00:00")]})
    hass = FakeHass({})
    report = asyncio.run(
        MODULE.async_build_vehicle_diagnostics(
            hass, _coordinator({"temperature": "sensor.temperature"}), 7200
        )
    )
    assert len(RECORDED_CALLS) == 1
    assert report["events"]
    assert not hasattr(hass.services, "async_call")
    assert "async_authenticated_get" not in MODULE.async_build_vehicle_diagnostics.__code__.co_names


def test_time_window_and_output_are_bounded():
    _reset({"sensor.temperature": [_state("14", "2026-10-02T11:42:00+00:00")]})
    coordinator = _coordinator({"temperature": "sensor.temperature"})
    try:
        asyncio.run(MODULE.async_build_vehicle_diagnostics(FakeHass({}), coordinator, 86401))
    except ValueError as error:
        assert str(error) == "unsupported_time_window"
    else:
        raise AssertionError("unsupported time window was accepted")

    _reset(
        {
            "sensor.temperature": [
                _state("13", "2026-10-01T11:59:00+00:00"),
                *(
                    _state(
                        "14",
                        (datetime(2026, 10, 2, 8, tzinfo=UTC) + timedelta(seconds=index)).isoformat(),
                    )
                    for index in range(MODULE._MAX_EVENTS + 5)
                ),
            ]
        }
    )
    report = asyncio.run(MODULE.async_build_vehicle_diagnostics(FakeHass({}), coordinator, 86400))
    assert len(report["events"]) == MODULE._MAX_EVENTS
    assert report["total_events"] == MODULE._MAX_EVENTS + 5
    assert report["truncated"] is True


def test_unknown_entity_ids_are_never_added_from_client_input():
    _reset({"sensor.temperature": [_state("14", "2026-10-02T11:42:00+00:00")]})
    hass = FakeHass({"entry": _coordinator({"temperature": "sensor.temperature"})})
    connection = FakeConnection()
    asyncio.run(
        MODULE.websocket_vehicle_diagnostics(
            hass,
            connection,
            {
                "id": 3,
                "entry_id": "entry",
                "duration_seconds": 7200,
                "entity_ids": ["sensor.other_vehicle"],
            },
        )
    )
    assert RECORDED_CALLS[0][3] == ["sensor.temperature"]


def test_signal_entity_count_is_bounded():
    mapping = {f"remote_status_{index}": f"sensor.remote_status_{index}" for index in range(30)}
    _reset()
    hass = FakeHass({})
    asyncio.run(MODULE.async_build_vehicle_diagnostics(hass, _coordinator(mapping), 86400))
    assert len(RECORDED_CALLS[0][3]) == MODULE._MAX_ENTITY_IDS
    assert all("remote_availability" in MODULE._mapped_signals(mapping)[0][entity_id] for entity_id in RECORDED_CALLS[0][3])


def test_remote_availability_uses_semantic_mapping_and_safe_values():
    _reset({"sensor.remote_status": [_state("connected", "2026-10-02T11:42:00+00:00")]})
    report = asyncio.run(
        MODULE.async_build_vehicle_diagnostics(
            FakeHass({}), _coordinator({"remote_connection": "sensor.remote_status"}), 7200
        )
    )
    assert report["events"][0]["signal"] == "remote_availability"
    assert report["events"][0]["value"] == "connected"

    _reset({"sensor.remote_status": [_state("home 48.123456, 2.123456", "2026-10-02T11:42:00+00:00")]})
    report = asyncio.run(
        MODULE.async_build_vehicle_diagnostics(
            FakeHass({}), _coordinator({"remote_connection": "sensor.remote_status"}), 7200
        )
    )
    assert report["events"][0]["value"] == "unknown"


def test_websocket_missing_entry_fails_closed():
    connection = FakeConnection()
    asyncio.run(
        MODULE.websocket_vehicle_diagnostics(
            FakeHass({}), connection, {"id": 4, "entry_id": "missing", "duration_seconds": 1800}
        )
    )
    assert connection.result is None
    assert connection.error[0] == "not_found"


def run():
    tests = [value for name, value in globals().items() if name.startswith("test_") and callable(value)]
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
    print(f"{len(tests)} vehicle diagnostics tests passed")


if __name__ == "__main__":
    run()

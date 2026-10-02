"""Read-only, bounded Recorder timeline for one SV Dashboard entry."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import UTC, datetime, timedelta
import math
import re
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.recorder import get_instance
from homeassistant.components.recorder import history as recorder_history
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .const import DOMAIN, FRONTEND_VERSION

_DURATIONS = (1800, 7200, 21600, 86400)
_MAX_EVENTS = 300
_MAX_ENTITY_IDS = 16
_MAX_VALUE_LENGTH = 160
_MAX_TIMESTAMP_LENGTH = 64

# The mapping keys come from the selected upstream device's entity registry.
# No entity ID is guessed, derived from a VIN, or accepted from the client.
_SIGNAL_KEYS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("refresh_interval", ("refresh_interval",)),
    ("preconditioning", ("preconditioning",)),
    ("temperature", ("temperature",)),
    ("command_status", ("command_status",)),
    (
        "remote_availability",
        (
            "remote_availability",
            "remote_command_available",
            "remote_control_available",
            "connectivity",
            "availability",
        ),
    ),
    ("charging", ("battery_charging",)),
    ("battery", ("battery",)),
)
_VEHICLE_DATA_KEYS = (
    "temperature",
    "mileage",
    "battery",
    "autonomy",
    "range",
    "service_battery",
    "fuel",
    "fuel_autonomy",
)
_SOURCE_TIME_KEYS = (
    "Last updated",
    "last_updated",
    "updatedAt",
    "updated_at",
    "createdAt",
    "created_at",
    "source_timestamp",
    "source_time",
)
_SAFE_UNITS = {"s", "°C", "°F", "%", "km", "kW", "kWh"}
_VIN_PATTERN = re.compile(r"\b[A-HJ-NPR-Z0-9]{17}\b", re.IGNORECASE)
_URL_PATTERN = re.compile(r"\b(?:https?://|www\.)\S+", re.IGNORECASE)
_UUID_PATTERN = re.compile(
    r"\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b",
    re.IGNORECASE,
)
_COORDINATE_PATTERN = re.compile(
    r"(?<!\d)-?\d{1,3}\.\d{4,}\s*[,;/ ]\s*-?\d{1,3}\.\d{4,}(?!\d)"
)
_RAW_CODE_PATTERN = re.compile(
    r"(?:raw\s+)?(?:return|process|result)[_ ]?code\s*[:=]\s*\d+",
    re.IGNORECASE,
)
_KNOWN_COMMAND_CODES = re.compile(r"(?<!\w)(?:0|300|500|900|901|903)(?!\w)")
_SAFE_AVAILABILITY_STATES = {
    "on", "off", "true", "false", "enabled", "disabled", "unknown",
    "unavailable", "available", "connected", "disconnected", "online",
    "offline", "reachable", "unreachable", "asleep", "sleeping",
}


def _field(state: Any, name: str, default: Any = None) -> Any:
    if isinstance(state, Mapping):
        return state.get(name, default)
    return getattr(state, name, default)


def _parse_time(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str) and value.strip():
        parsed = dt_util.parse_datetime(value.strip())
    else:
        return None
    if parsed is None:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return dt_util.as_utc(parsed)


def _iso(value: datetime | None) -> str | None:
    return value.isoformat().replace("+00:00", "Z") if value else None


def _safe_text(value: Any, *, command_status: bool = False) -> str | None:
    if value is None:
        return None
    text = " ".join(str(value).split())
    if not text:
        return None
    text = _VIN_PATTERN.sub("[redacted]", text)
    text = _URL_PATTERN.sub("[redacted URL]", text)
    text = _UUID_PATTERN.sub("[redacted ID]", text)
    text = _COORDINATE_PATTERN.sub("[redacted location]", text)
    if command_status:
        text = _RAW_CODE_PATTERN.sub("raw result code not recorded", text)
        text = _KNOWN_COMMAND_CODES.sub("raw result code not recorded", text)
        # A bare numeric command state is not a translated status. Never
        # present it as if it were a persisted Stellantis result code.
        if text.isdecimal():
            return "Command status recorded; details unavailable"
    return text[:_MAX_VALUE_LENGTH]


def _public_value(signal: str, state_value: Any) -> str | None:
    if signal == "vehicle_data":
        return "state change recorded"
    if state_value is None:
        return None
    text = str(state_value).strip()
    if signal == "remote_availability":
        normalized = text.casefold().replace("_", " ")
        return normalized if normalized in _SAFE_AVAILABILITY_STATES else "unknown"
    if signal in {"preconditioning", "charging"}:
        normalized = text.casefold()
        if normalized in {"on", "off", "true", "false", "enabled", "disabled"}:
            return normalized
        if normalized in {"unknown", "unavailable", "none"}:
            return normalized
        return _safe_text(text)
    if signal == "command_status":
        return _safe_text(text, command_status=True)
    if signal == "refresh_interval":
        try:
            numeric = float(text)
        except (TypeError, ValueError):
            return _safe_text(text)
        if not math.isfinite(numeric) or numeric < 0 or numeric > 86400:
            return None
        return str(int(numeric)) if numeric.is_integer() else f"{numeric:g}"
    if signal == "temperature":
        try:
            numeric = float(text)
        except (TypeError, ValueError):
            return _safe_text(text)
        if not math.isfinite(numeric) or not -100 <= numeric <= 100:
            return None
        return f"{numeric:g}"
    if signal == "battery":
        try:
            numeric = float(text)
        except (TypeError, ValueError):
            return _safe_text(text)
        if not math.isfinite(numeric) or not 0 <= numeric <= 100:
            return None
        return f"{numeric:g}"
    return _safe_text(text)


def _source_timestamp(attributes: Any) -> datetime | None:
    if not isinstance(attributes, Mapping):
        return None
    for key in _SOURCE_TIME_KEYS:
        stamp = _parse_time(attributes.get(key))
        if stamp is not None:
            return stamp
    return None


def _mapped_signals(mapping: Mapping[str, Any]) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """Return selected entity-to-signal and signal-to-entity maps."""
    entity_signals: dict[str, list[str]] = {}
    signal_entities: dict[str, list[str]] = {}

    for signal, aliases in _SIGNAL_KEYS:
        entity_id = next(
            (mapping.get(key) for key in aliases if isinstance(mapping.get(key), str)),
            None,
        )
        if entity_id and "." in entity_id:
            entity_signals.setdefault(entity_id, []).append(signal)
            signal_entities.setdefault(signal, []).append(entity_id)

    # Upstream has used several translated keys for remote availability. Map
    # only state entities and only semantic key names; never query command
    # buttons/switches as a reachability signal.
    for key, entity_id in mapping.items():
        normalized_key = str(key).casefold()
        domain = str(entity_id).split(".", 1)[0] if isinstance(entity_id, str) else ""
        availability_key = any(
            token in normalized_key
            for token in ("remote", "availability", "connectivity", "reachable", "online")
        )
        if (
            availability_key
            and domain in {"sensor", "binary_sensor"}
            and isinstance(entity_id, str)
            and "." in entity_id
            and "command_status" not in normalized_key
        ):
            entity_signals.setdefault(entity_id, []).append("remote_availability")
            signal_entities.setdefault("remote_availability", []).append(entity_id)

    vehicle_data_entities: list[str] = []
    for key in _VEHICLE_DATA_KEYS:
        entity_id = mapping.get(key)
        if isinstance(entity_id, str) and "." in entity_id:
            entity_signals.setdefault(entity_id, []).append("vehicle_data")
            vehicle_data_entities.append(entity_id)
    if vehicle_data_entities:
        signal_entities["vehicle_data"] = list(dict.fromkeys(vehicle_data_entities))

    return entity_signals, signal_entities


def _make_event(state: Any, signal: str, *, vehicle_data_evidence: bool) -> dict[str, Any] | None:
    attributes = _field(state, "attributes", {})
    if not isinstance(attributes, Mapping):
        attributes = {}
    event_time = _parse_time(_field(state, "last_updated"))
    if event_time is None:
        event_time = _parse_time(_field(state, "last_changed"))
    if event_time is None:
        return None

    source_time = _source_timestamp(attributes)
    state_value = _field(state, "state")
    value = _public_value(signal, state_value)
    if value is None and signal != "vehicle_data":
        return None
    unit = attributes.get("unit_of_measurement")
    if not isinstance(unit, str) or unit not in _SAFE_UNITS:
        unit = None

    return {
        "event_time": _iso(event_time),
        "signal": signal,
        "value": value,
        "unit": unit,
        "source_time": _iso(source_time),
        "timestamp_source": "upstream_attribute" if source_time else "ha_state_time",
        "vehicle_data_evidence": vehicle_data_evidence,
        "raw_result_code": "not_recorded" if signal == "command_status" else None,
    }


def _current_refresh_interval(hass: HomeAssistant, entity_id: str | None) -> dict[str, str] | None:
    state = hass.states.get(entity_id) if entity_id else None
    if state is None:
        return None
    value = _public_value("refresh_interval", state.state)
    if value is None or state.state in {"unknown", "unavailable", "none"}:
        return None
    unit = state.attributes.get("unit_of_measurement")
    return {"value": value, "unit": unit if unit == "s" else "s"}


async def async_build_vehicle_diagnostics(
    hass: HomeAssistant,
    coordinator: Any,
    duration_seconds: int,
) -> dict[str, Any]:
    """Read and normalize only selected-entry Recorder states in a fixed window."""
    if duration_seconds not in _DURATIONS:
        raise ValueError("unsupported_time_window")

    data = getattr(coordinator, "data", None) or {}
    mapping = data.get("entity_mapping") or {}
    entity_signals, signal_entities = _mapped_signals(mapping)
    entity_ids = list(entity_signals)[:_MAX_ENTITY_IDS]
    end_time = dt_util.utcnow()
    start_time = end_time - timedelta(seconds=duration_seconds)

    states_by_entity: Mapping[str, list[Any]] = {}
    if entity_ids:
        recorder = get_instance(hass)
        states_by_entity = await recorder.async_add_executor_job(
            recorder_history.get_significant_states,
            hass,
            start_time,
            end_time,
            entity_ids,
            None,
            True,
            False,
            False,
            False,
        )
    else:
        recorder = None

    events: list[dict[str, Any]] = []
    for entity_id in entity_ids:
        signals = entity_signals.get(entity_id, [])
        states = states_by_entity.get(entity_id, []) if isinstance(states_by_entity, Mapping) else []
        # Each source entity is returned once even if it has two semantic
        # roles. Prefer its named metric; its row separately carries the
        # recorder-backed vehicle-data evidence flag.
        primary_signal = next((signal for signal in signals if signal != "vehicle_data"), "vehicle_data")
        is_vehicle_data = "vehicle_data" in signals
        for state in states:
            event = _make_event(
                state,
                primary_signal,
                vehicle_data_evidence=is_vehicle_data,
            )
            if event is not None:
                events.append(event)

    events.sort(key=lambda event: (event["event_time"], event["signal"]))
    total_events = len(events)
    truncated = total_events > _MAX_EVENTS
    if truncated:
        events = events[-_MAX_EVENTS:]

    refresh_entity = next(iter(signal_entities.get("refresh_interval", [])), None)
    return {
        "schema_version": 1,
        "generated_at": _iso(end_time),
        "start_time": _iso(start_time),
        "end_time": _iso(end_time),
        "duration_seconds": duration_seconds,
        "package_version": FRONTEND_VERSION,
        "current_refresh_interval": _current_refresh_interval(hass, refresh_entity),
        "available_signals": sorted(signal_entities),
        "events": events,
        "total_events": total_events,
        "truncated": truncated,
        "max_events": _MAX_EVENTS,
        "raw_command_result_code": "not_recorded",
        "limitations": [
            "recorder_state_history_only",
            "raw_command_result_code_not_recorded",
            "mapped_state_change_is_not_proof_of_vehicle_online_status",
        ],
        "recorder_available": recorder is not None,
    }


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/vehicle_diagnostics",
        vol.Required("entry_id"): str,
        vol.Optional("duration_seconds", default=7200): vol.In(_DURATIONS),
    }
)
@websocket_api.async_response
async def websocket_vehicle_diagnostics(hass: HomeAssistant, connection, msg) -> None:
    """Return a bounded, privacy-safe, read-only Recorder timeline."""
    coordinator = hass.data.get(DOMAIN, {}).get(msg["entry_id"])
    if coordinator is None:
        connection.send_error(msg["id"], "not_found", "SV Dashboard entry is unavailable")
        return
    try:
        report = await async_build_vehicle_diagnostics(
            hass,
            coordinator,
            msg.get("duration_seconds", 7200),
        )
    except ValueError:
        connection.send_error(msg["id"], "invalid_format", "Unsupported diagnostics time window")
        return
    except Exception as error:
        connection.send_error(
            msg["id"],
            "diagnostics_failed",
            f"Vehicle diagnostics unavailable ({error.__class__.__name__})",
        )
        return
    connection.send_result(msg["id"], report)


def async_register_vehicle_diagnostics_websocket(hass: HomeAssistant) -> None:
    """Register the opt-in diagnostics query once."""
    websocket_api.async_register_command(hass, websocket_vehicle_diagnostics)

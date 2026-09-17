"""Restart-safe fuel/refill history for vehicles exposing fuel level."""

from __future__ import annotations

from datetime import datetime, timedelta
import logging
from statistics import median
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.recorder import get_instance
from homeassistant.components.recorder import history as recorder_history
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.event import async_call_later, async_track_state_change_event
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    CONF_TANK_CAPACITY_L,
    CONF_VEHICLE_SLUG,
    DEFAULT_OPTIONS,
    DOMAIN,
    OPTION_HISTORY_HOURS,
)

_LOGGER = logging.getLogger(__name__)
_STORE_VERSION = 1
_MIN_REFILL_PERCENT = 5.0
_REBUILD_DELAY = timedelta(seconds=90)
_MAX_EVENTS = 250


def _as_float(value: Any) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed == parsed else None


def _parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if value is None:
        return None
    return dt_util.parse_datetime(str(value))


def _state_value(state: Any) -> Any:
    return state.state if hasattr(state, "state") else state.get("state")


def _state_attributes(state: Any) -> dict[str, Any]:
    attributes = state.attributes if hasattr(state, "attributes") else state.get("attributes", {})
    return attributes if isinstance(attributes, dict) else {}


def _ha_timestamp(state: Any) -> datetime | None:
    value = state.last_updated if hasattr(state, "last_updated") else state.get("last_updated")
    return _parse_datetime(value)


def _source_timestamp(state: Any) -> tuple[datetime | None, str | None]:
    attributes = _state_attributes(state)
    for key in ("Last updated", "last_updated", "updatedAt", "updated_at"):
        value = _parse_datetime(attributes.get(key))
        if value is not None:
            return value, "stellantis"
    return _ha_timestamp(state), "home_assistant"


class FuelHistoryManager:
    """Rebuild and persist canonical refuel events from Recorder evidence."""

    def __init__(self, hass: HomeAssistant, entry, mapping: dict[str, str], metrics) -> None:
        self.hass = hass
        self.entry = entry
        self.mapping = mapping
        self.metrics = metrics
        slug = entry.data[CONF_VEHICLE_SLUG]
        self._store = Store(hass, _STORE_VERSION, f"{DOMAIN}_{slug}_fuel_history")
        self.data: dict[str, Any] = {"events": [], "updated_at": None}
        self._unsub: list[callable] = []
        self._cancel_rebuild: callable | None = None
        self._rebuild_running = False

    async def async_initialize(self) -> None:
        stored = await self._store.async_load()
        if isinstance(stored, dict):
            self.data.update(stored)
        self._normalise_events()
        fuel = self.mapping.get("fuel")
        if fuel:
            self._unsub.append(async_track_state_change_event(self.hass, [fuel], self._handle_fuel_state))
            self.hass.async_create_task(self.async_rebuild())

    async def async_shutdown(self) -> None:
        if self._cancel_rebuild:
            self._cancel_rebuild()
            self._cancel_rebuild = None
        for unsubscribe in self._unsub:
            unsubscribe()
        self._unsub.clear()

    @callback
    def _handle_fuel_state(self, event: Event) -> None:
        old_state = event.data.get("old_state")
        new_state = event.data.get("new_state")
        old_value = _as_float(getattr(old_state, "state", None))
        new_value = _as_float(getattr(new_state, "state", None))
        if old_value is None or new_value is None or new_value - old_value < _MIN_REFILL_PERCENT:
            return
        if self._cancel_rebuild:
            self._cancel_rebuild()
        self._cancel_rebuild = async_call_later(self.hass, _REBUILD_DELAY, self._rebuild_callback)

    @callback
    def _rebuild_callback(self, _now) -> None:
        self._cancel_rebuild = None
        self.hass.async_create_task(self.async_rebuild())

    def tank_capacity(self) -> tuple[float | None, str | None]:
        """Return configured nominal tank capacity until upstream exposes one."""
        configured = _as_float(self.entry.data.get(CONF_TANK_CAPACITY_L))
        if configured is not None and configured > 0:
            return configured, "configured"
        return None, None

    async def async_rebuild(self) -> None:
        """Rebuild the retained Recorder window while preserving older stored events."""
        fuel_entity = self.mapping.get("fuel")
        if not fuel_entity or self._rebuild_running:
            return
        self._rebuild_running = True
        try:
            end = dt_util.utcnow()
            start = end - timedelta(hours=self._history_hours())
            fuel_states = await self._async_get_history(fuel_entity, start, end)
            mileage_states = await self._async_get_history(
                self.mapping.get("mileage"), start, end, significant_changes_only=False
            ) if self.mapping.get("mileage") else []
            refill_entity = self.mapping.get("fuel_refill_amount") or self.mapping.get("refill_amount")
            refill_states = await self._async_get_history(refill_entity, start, end) if refill_entity else []

            rebuilt = self._detect_events(fuel_states, mileage_states, refill_states)
            retained = []
            for event in self.data.get("events", []):
                event_time = _parse_datetime(event.get("source_time")) if isinstance(event, dict) else None
                if event_time is not None and event_time < start:
                    retained.append(event)
            self.data["events"] = retained + rebuilt
            self._normalise_events()
            self.data["updated_at"] = dt_util.utcnow().isoformat()
            await self._store.async_save(self.data)
        except Exception as err:  # Recorder history remains optional enrichment.
            _LOGGER.debug("Could not rebuild SV fuel history: %s", err)
        finally:
            self._rebuild_running = False

    def _detect_events(self, fuel_states, mileage_states, refill_states) -> list[dict[str, Any]]:
        samples = []
        seen = set()
        for state in fuel_states:
            value = _as_float(_state_value(state))
            source_time, timestamp_source = _source_timestamp(state)
            if value is None or source_time is None:
                continue
            key = (source_time.isoformat(), round(value, 3))
            if key in seen:
                continue
            seen.add(key)
            samples.append({
                "value": value,
                "source_time": source_time,
                "timestamp_source": timestamp_source,
                "received_at": _ha_timestamp(state),
            })
        samples.sort(key=lambda item: item["source_time"])
        events: list[dict[str, Any]] = []
        tank_capacity, tank_source = self.tank_capacity()

        for index in range(1, len(samples) - 1):
            after = samples[index]
            confirmation = samples[index + 1]
            prior_values = [item["value"] for item in samples[max(0, index - 3):index]]
            if not prior_values:
                continue
            baseline = median(prior_values)
            increase = after["value"] - baseline
            if increase < _MIN_REFILL_PERCENT:
                continue
            sustained_floor = baseline + max(1.0, _MIN_REFILL_PERCENT * 0.6)
            if confirmation["value"] < sustained_floor:
                continue

            confirmed_after = max(after["value"], confirmation["value"])
            mileage = self._nearest_numeric(mileage_states, after["source_time"], prefer_before=True)
            actual_liters = self._nearest_numeric(refill_states, after["source_time"], max_delta=timedelta(minutes=30))
            if actual_liters is not None and actual_liters > 0:
                liters = round(actual_liters, 2)
                liters_source = "api_refill_amount"
                liters_estimated = False
            elif tank_capacity is not None:
                liters = round(max(0.0, confirmed_after - baseline) * tank_capacity / 100, 2)
                liters_source = "tank_capacity_delta"
                liters_estimated = True
            else:
                liters = None
                liters_source = None
                liters_estimated = False

            candidate = {
                "id": f"refuel-{after['source_time'].isoformat()}-{round(baseline, 1)}-{round(confirmed_after, 1)}",
                "source_time": after["source_time"].isoformat(),
                "detected_at": (after.get("received_at") or after["source_time"]).isoformat(),
                "timestamp_source": after["timestamp_source"],
                "fuel_before_percent": round(baseline, 2),
                "fuel_after_percent": round(confirmed_after, 2),
                "odometer_km": round(mileage, 3) if mileage is not None else None,
                "liters": liters,
                "liters_source": liters_source,
                "liters_estimated": liters_estimated,
                "tank_capacity_l": tank_capacity,
                "tank_capacity_source": tank_source,
                "source": "fuel_level_delta",
            }

            previous = events[-1] if events else None
            if previous and self._same_refuel(previous, candidate):
                # Preserve the earliest source time; a restore/re-publish after
                # restart must never move the real refuel to restart time.
                if candidate["source_time"] < previous["source_time"]:
                    candidate["id"] = previous["id"]
                    events[-1] = candidate
                continue
            events.append(candidate)
        return events

    @staticmethod
    def _same_refuel(first: dict[str, Any], second: dict[str, Any]) -> bool:
        first_time = _parse_datetime(first.get("source_time"))
        second_time = _parse_datetime(second.get("source_time"))
        if first_time is None or second_time is None or abs(second_time - first_time) > timedelta(hours=48):
            return False
        before_close = abs(float(first.get("fuel_before_percent", -999)) - float(second.get("fuel_before_percent", 999))) <= 2
        after_close = abs(float(first.get("fuel_after_percent", -999)) - float(second.get("fuel_after_percent", 999))) <= 2
        first_mileage = _as_float(first.get("odometer_km"))
        second_mileage = _as_float(second.get("odometer_km"))
        mileage_close = first_mileage is None or second_mileage is None or abs(first_mileage - second_mileage) <= 5
        return before_close and after_close and mileage_close

    def snapshot(self) -> dict[str, Any]:
        events = list(reversed(self.data.get("events", [])))
        latest = events[0] if events else None
        return {
            "events": events,
            "summary": self._summary_since(latest),
            "updated_at": self.data.get("updated_at"),
            "tank_capacity_l": self.tank_capacity()[0],
        }

    def _summary_since(self, event: dict[str, Any] | None) -> dict[str, Any] | None:
        if not event:
            return None
        event_time = _parse_datetime(event.get("source_time"))
        if event_time is None:
            return None
        event_mileage = _as_float(event.get("odometer_km"))
        current_mileage = self._current_number("mileage")
        distance_since = (
            round(max(0, current_mileage - event_mileage), 2)
            if current_mileage is not None and event_mileage is not None
            else None
        )

        distance = 0.0
        duration = 0.0
        fuel_liters = 0.0
        fuel_complete = True
        trip_count = 0
        for trip in self.metrics.canonical_trips():
            if not isinstance(trip, dict) or trip.get("valid_for_statistics") is False:
                continue
            end_time = _parse_datetime(trip.get("end_time"))
            if end_time is None or end_time <= event_time:
                continue
            trip_distance = _as_float(trip.get("distance_km"))
            trip_duration = _as_float(trip.get("duration_seconds"))
            if trip_distance is None or trip_distance <= 0 or trip_duration is None or trip_duration <= 0:
                continue
            distance += trip_distance
            duration += trip_duration
            trip_count += 1
            fuel = _as_float(trip.get("fuel_consumption_l"))
            if fuel is not None and fuel >= 0:
                fuel_liters += fuel
            elif trip.get("trip_type") == "ev":
                pass
            else:
                fuel_complete = False

        return {
            "source_time": event.get("source_time"),
            "odometer_km": event_mileage,
            "distance_km": distance_since,
            "driving_time_seconds": round(duration) if duration > 0 else None,
            "average_speed_kmh": round(distance / (duration / 3600), 2) if duration > 0 else None,
            "fuel_consumption_l_100km": round(fuel_liters / distance * 100, 2) if fuel_complete and distance > 0 else None,
            "trip_count": trip_count,
            "fuel_coverage_complete": fuel_complete and trip_count > 0,
        }

    def _current_number(self, mapping_key: str) -> float | None:
        entity_id = self.mapping.get(mapping_key)
        state = self.hass.states.get(entity_id) if entity_id else None
        return _as_float(state.state if state else None)

    @staticmethod
    def _nearest_numeric(states, target: datetime, *, prefer_before: bool = False, max_delta: timedelta = timedelta(hours=6)) -> float | None:
        candidates = []
        for state in states:
            value = _as_float(_state_value(state))
            state_time, _source = _source_timestamp(state)
            if value is None or state_time is None:
                continue
            delta = state_time - target
            if prefer_before and delta.total_seconds() > 0:
                continue
            if abs(delta) <= max_delta:
                candidates.append((abs(delta.total_seconds()), state_time, value))
        if not candidates and prefer_before:
            return FuelHistoryManager._nearest_numeric(states, target, prefer_before=False, max_delta=max_delta)
        if not candidates:
            return None
        candidates.sort(key=lambda item: item[0])
        return candidates[0][2]

    async def _async_get_history(self, entity_id: str, start, end, *, significant_changes_only: bool = True) -> list[Any]:
        history = await get_instance(self.hass).async_add_executor_job(
            recorder_history.get_significant_states,
            self.hass,
            start,
            end,
            [entity_id],
            None,
            True,
            significant_changes_only,
        )
        return history.get(entity_id, [])

    def _history_hours(self) -> int:
        try:
            configured = int(self.entry.options.get(OPTION_HISTORY_HOURS, DEFAULT_OPTIONS[OPTION_HISTORY_HOURS]))
        except (TypeError, ValueError):
            configured = DEFAULT_OPTIONS[OPTION_HISTORY_HOURS]
        return max(24, min(configured, 24 * 90))

    def _normalise_events(self) -> None:
        events = [item for item in self.data.get("events", []) if isinstance(item, dict) and item.get("source_time")]
        events.sort(key=lambda item: str(item.get("source_time")))
        deduped = []
        for event in events:
            if deduped and self._same_refuel(deduped[-1], event):
                continue
            deduped.append(event)
        self.data["events"] = deduped[-_MAX_EVENTS:]


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/fuel_history",
        vol.Required("entry_id"): str,
    }
)
@websocket_api.async_response
async def websocket_fuel_history(hass: HomeAssistant, connection, msg) -> None:
    """Return canonical fuel history for one SV config entry."""
    coordinator = hass.data.get(DOMAIN, {}).get(msg["entry_id"])
    manager = getattr(coordinator, "fuel_history", None) if coordinator else None
    if manager is None:
        connection.send_error(msg["id"], "not_found", "SV fuel history is unavailable")
        return
    connection.send_result(msg["id"], manager.snapshot())


def async_register_fuel_history_websocket(hass: HomeAssistant) -> None:
    """Register the package-owned read-only fuel-history command once."""
    websocket_api.async_register_command(hass, websocket_fuel_history)

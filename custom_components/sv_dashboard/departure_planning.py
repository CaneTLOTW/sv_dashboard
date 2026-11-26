"""Per-vehicle departure planning with opt-in climate dispatch."""
from __future__ import annotations

import asyncio
import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import callback
from homeassistant.helpers.storage import Store
from homeassistant.helpers.event import async_track_time_interval
from datetime import timedelta, datetime
import math
from homeassistant.util import dt as dt_util

from .const import CONF_VEHICLE_SLUG, DOMAIN
from .departure_plan import edit_profiles, normalize_profile, preview, normalize_reminder, reminder_candidate, due_occurrences, climate_gate, climate_state


class DeparturePlanning:
    def __init__(self, hass, entry):
        self.hass = hass
        self.store = Store(hass, 1, f"{DOMAIN}_{entry.data[CONF_VEHICLE_SLUG]}_departure_plans")
        self.lock = asyncio.Lock()
        self.profiles = []
        self.revision = 0
        self.reminder = normalize_reminder({})
        self.last_reminder = None
        self._unsubscribe = None
        self._task = None
        self.execution_enabled_at = None
        self.ledger = {}

    async def async_initialize(self):
        data = await self.store.async_load()
        if data is not None:
            # Invalid persisted data must not be silently overwritten.
            if not isinstance(data, dict) or type(data.get("revision")) is not int or not isinstance(data.get("profiles"), list):
                raise ValueError("invalid_store")
            self.profiles = [normalize_profile(p, p["id"]) for p in data["profiles"]]
            self.revision = data["revision"]
            self.reminder = normalize_reminder(data.get("reminder", {}))
            self.last_reminder = data.get("last_reminder")
            self.execution_enabled_at = dt_util.parse_datetime(data.get("execution_enabled_at") or "")
            self.ledger = data.get("ledger", {})
            if not isinstance(self.ledger, dict):
                raise ValueError("invalid_store")

    def async_start(self, notifications, coordinator):
        self.coordinator = coordinator
        self.notifications = notifications
        self._unsubscribe = async_track_time_interval(self.hass, self._tick, timedelta(minutes=1))

    @callback
    def _tick(self, _now):
        if self._task is None or self._task.done():
            self._task = self.hass.async_create_task(self._async_tick())

    async def async_shutdown(self):
        if self._unsubscribe:
            self._unsubscribe()
            self._unsubscribe = None
        if self._task and not self._task.done():
            self._task.cancel()
            await asyncio.gather(self._task, return_exceptions=True)

    async def _persist(self, rows, revision, reminder, last_reminder):
        await self.store.async_save({"revision": revision, "profiles": rows,
                                     "reminder": reminder, "last_reminder": last_reminder,
                                     "execution_enabled_at": self.execution_enabled_at.isoformat() if self.execution_enabled_at else None,
                                     "ledger": self.ledger})

    async def _async_tick(self):
        await self._async_execute()
        await self._async_reminder()

    def _state(self, key, domain=None):
        mapping = self.coordinator.data.get("entity_mapping", {})
        entity = (mapping.get(f"{key}_{domain}") if domain else None) or mapping.get(key)
        if not entity or (domain and not entity.startswith(domain + ".")):
            return None
        return self.hass.states.get(entity)

    @staticmethod
    def _numeric(state):
        try:
            value = float(state.state)
            return value if math.isfinite(value) else None
        except (AttributeError, ValueError, TypeError):
            return None

    async def _async_execute(self):
        async with self.lock:
            now = dt_util.utcnow()
            # Bounded log, but retain all recent claims beyond any due window.
            cutoff = now - timedelta(days=30)
            old = dict(self.ledger)
            self.ledger = {key: value for key, value in old.items()
                           if (dt_util.parse_datetime(value.get("at", "")) or now) >= cutoff}
            for row in due_occurrences(self.profiles, now, self.hass.config.time_zone,
                                       self.execution_enabled_at, self.ledger):
                profile = next(p for p in self.profiles if p["id"] == row["profile_id"])
                button = self._state("preconditioning_start", "button")
                climate = self._state("preconditioning")
                engine = self._state("engine")
                plug = self._state("battery_plugged")
                battery = self._state("battery")
                temp = self._state("temperature")
                temperature = self._numeric(temp)
                if temperature is not None:
                    unit = temp.attributes.get("unit_of_measurement")
                    temperature = (temperature - 32) * 5 / 9 if unit == "°F" else temperature if unit == "°C" else None
                heartbeat, source = self.notifications._heartbeat()
                fresh = (heartbeat is not None and source == "upstream_payload_timestamp"
                         and timedelta(0) <= now - heartbeat <= timedelta(minutes=15))
                status = climate_gate(profile, self._numeric(battery), getattr(engine, "state", None),
                    getattr(plug, "state", None), temperature, climate_state(getattr(climate, "state", None)),
                    button is not None and button.state != "unavailable", fresh)
                # No second command within 45 minutes, even if profiles overlap.
                recent = any(value.get("status") in ("claimed", "submitted", "confirmed", "unconfirmed", "failed")
                    and timedelta(0) <= now - (dt_util.parse_datetime(value.get("at", "")) or cutoff) < timedelta(minutes=45)
                    for value in self.ledger.values())
                if status == "ready" and recent:
                    status = "overlap"
                item = {"at": now.isoformat(), "name": row["name"], "departure": row["departure"],
                        "status": "claimed" if status == "ready" else status}
                self.ledger[row["key"]] = item
                try:
                    await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)
                except Exception:
                    self.ledger.pop(row["key"], None)
                    raise
                if status != "ready":
                    continue
                # Durable claim precedes the only service call; no blind retry.
                try:
                    await asyncio.wait_for(self.hass.services.async_call(
                        "button", "press", {"entity_id": button.entity_id}, blocking=True), timeout=30)
                    item["status"] = "submitted"
                except Exception:
                    item["status"] = "failed"
                await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)
            # Reconcile a newer actual vehicle climate transition on later ticks.
            changed = False
            climate = self._state("preconditioning")
            for item in self.ledger.values():
                if item.get("status") not in ("claimed", "submitted"):
                    continue
                stamp = dt_util.parse_datetime(item["at"])
                if climate and climate_state(climate.state) is True and climate.last_changed > stamp:
                    item["status"] = "confirmed"
                    changed = True
                elif now - stamp >= timedelta(minutes=3):
                    item["status"] = "unconfirmed"
                    changed = True
            if changed:
                await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)

    async def _async_reminder(self):
        async with self.lock:
            if not self.notifications.departure_reminder_available():
                return
            candidate = reminder_candidate(self.profiles, dt_util.utcnow(), self.hass.config.time_zone,
                self.reminder, (self.last_reminder or {}).get("date"),
                self.notifications.departure_reminder_soc())
            if candidate is None:
                return
            # Persist claim before sending: at most one attempt per local date.
            claim = {"date": candidate["date"], "status": "attempted"}
            await self._persist(self.profiles, self.revision, self.reminder, claim)
            self.last_reminder = claim
            sent = await self.notifications.async_departure_reminder(candidate)
            result = {"date": candidate["date"], "status": "sent" if sent else "not_sent"}
            await self._persist(self.profiles, self.revision, self.reminder, result)
            self.last_reminder = result

    def snapshot(self):
        return {"revision": self.revision, "profiles": self.profiles, "preview_only": self.execution_enabled_at is None, "execution_enabled": self.execution_enabled_at is not None, "execution_log": sorted(self.ledger.values(), key=lambda row: row["at"], reverse=True)[:20], "reminder": self.reminder, "last_reminder": self.last_reminder,
                **preview(self.profiles, dt_util.utcnow(), self.hass.config.time_zone)}

    async def async_apply(self, msg):
        async with self.lock:
            if msg["op"] == "get":
                return self.snapshot()
            if msg.get("revision") != self.revision:
                raise ValueError("revision_conflict")
            if msg["op"] == "execution":
                enabled = msg.get("enabled")
                if type(enabled) is not bool:
                    raise ValueError("invalid_boolean")
                previous = self.execution_enabled_at
                self.execution_enabled_at = (previous or dt_util.utcnow()) if enabled else None
                try:
                    await self._persist(self.profiles, self.revision + 1, self.reminder, self.last_reminder)
                except Exception:
                    self.execution_enabled_at = previous
                    raise
                self.revision += 1
                return self.snapshot()
            reminder = normalize_reminder(msg.get("reminder")) if msg["op"] == "reminder" else self.reminder
            rows = self.profiles if msg["op"] == "reminder" else edit_profiles(self.profiles, msg["op"], msg.get("profile"), msg.get("profile_id"))
            revision = self.revision + 1
            await self._persist(rows, revision, reminder, self.last_reminder)
            self.profiles, self.revision, self.reminder = rows, revision, reminder
            return self.snapshot()


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/departure_plans",
    vol.Required("entry_id"): str,
    vol.Required("op"): vol.In(("get", "save", "delete", "reminder", "execution")),
    vol.Optional("revision"): int,
    vol.Optional("profile_id"): str,
    vol.Optional("profile"): dict,
    vol.Optional("reminder"): dict,
    vol.Optional("enabled"): bool,
})
@websocket_api.async_response
async def websocket_departure_plans(hass, connection, msg):
    if not connection.user.is_admin:
        connection.send_error(msg["id"], "unauthorized", "Administrator required")
        return
    coordinator = hass.data.get(DOMAIN, {}).get(msg["entry_id"])
    manager = getattr(coordinator, "departure_planning", None)
    if manager is None:
        connection.send_error(msg["id"], "not_found", "Departure planning unavailable")
        return
    try:
        result = await manager.async_apply(msg)
    except ValueError as exc:
        connection.send_error(msg["id"], str(exc), "Departure plan rejected")
        return
    except Exception:
        connection.send_error(msg["id"], "storage_error", "Departure plan could not be saved")
        return
    connection.send_result(msg["id"], result)


def async_register_departure_planning_websocket(hass):
    websocket_api.async_register_command(hass, websocket_departure_plans)

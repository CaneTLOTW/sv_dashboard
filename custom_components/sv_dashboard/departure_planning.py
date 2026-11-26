"""Per-vehicle persisted departure planning. Preview only: no commands."""
from __future__ import annotations

import asyncio
import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.helpers.storage import Store
from homeassistant.helpers.event import async_track_time_interval
from datetime import timedelta
from homeassistant.util import dt as dt_util

from .const import CONF_VEHICLE_SLUG, DOMAIN
from .departure_plan import edit_profiles, normalize_profile, preview, normalize_reminder, reminder_candidate


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

    def async_start(self, notifications):
        self.notifications = notifications
        self._unsubscribe = async_track_time_interval(self.hass, self._tick, timedelta(minutes=1))

    def _tick(self, _now):
        if self._task is None or self._task.done():
            self._task = self.hass.async_create_task(self._async_reminder())

    async def async_shutdown(self):
        if self._unsubscribe:
            self._unsubscribe()
            self._unsubscribe = None
        if self._task and not self._task.done():
            self._task.cancel()
            await asyncio.gather(self._task, return_exceptions=True)

    async def _persist(self, rows, revision, reminder, last_reminder):
        await self.store.async_save({"revision": revision, "profiles": rows,
                                     "reminder": reminder, "last_reminder": last_reminder})

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
        return {"revision": self.revision, "profiles": self.profiles, "preview_only": True, "reminder": self.reminder, "last_reminder": self.last_reminder,
                **preview(self.profiles, dt_util.utcnow(), self.hass.config.time_zone)}

    async def async_apply(self, msg):
        async with self.lock:
            if msg["op"] == "get":
                return self.snapshot()
            if msg.get("revision") != self.revision:
                raise ValueError("revision_conflict")
            reminder = normalize_reminder(msg.get("reminder")) if msg["op"] == "reminder" else self.reminder
            rows = self.profiles if msg["op"] == "reminder" else edit_profiles(self.profiles, msg["op"], msg.get("profile"), msg.get("profile_id"))
            revision = self.revision + 1
            await self._persist(rows, revision, reminder, self.last_reminder)
            self.profiles, self.revision, self.reminder = rows, revision, reminder
            return self.snapshot()


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/departure_plans",
    vol.Required("entry_id"): str,
    vol.Required("op"): vol.In(("get", "save", "delete", "reminder")),
    vol.Optional("revision"): int,
    vol.Optional("profile_id"): str,
    vol.Optional("profile"): dict,
    vol.Optional("reminder"): dict,
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

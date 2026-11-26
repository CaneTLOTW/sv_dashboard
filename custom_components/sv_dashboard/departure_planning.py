"""Per-vehicle persisted departure planning. Preview only: no commands."""
from __future__ import annotations

import asyncio
import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import CONF_VEHICLE_SLUG, DOMAIN
from .departure_plan import edit_profiles, normalize_profile, preview


class DeparturePlanning:
    def __init__(self, hass, entry):
        self.hass = hass
        self.store = Store(hass, 1, f"{DOMAIN}_{entry.data[CONF_VEHICLE_SLUG]}_departure_plans")
        self.lock = asyncio.Lock()
        self.profiles = []
        self.revision = 0

    async def async_initialize(self):
        data = await self.store.async_load()
        if data is not None:
            # Invalid persisted data must not be silently overwritten.
            if not isinstance(data, dict) or type(data.get("revision")) is not int or not isinstance(data.get("profiles"), list):
                raise ValueError("invalid_store")
            self.profiles = [normalize_profile(p, p["id"]) for p in data["profiles"]]
            self.revision = data["revision"]

    def snapshot(self):
        return {"revision": self.revision, "profiles": self.profiles, "preview_only": True,
                **preview(self.profiles, dt_util.utcnow(), self.hass.config.time_zone)}

    async def async_apply(self, msg):
        async with self.lock:
            if msg["op"] == "get":
                return self.snapshot()
            if msg.get("revision") != self.revision:
                raise ValueError("revision_conflict")
            rows = edit_profiles(self.profiles, msg["op"], msg.get("profile"), msg.get("profile_id"))
            revision = self.revision + 1
            await self.store.async_save({"revision": revision, "profiles": rows})
            self.profiles, self.revision = rows, revision
            return self.snapshot()


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/departure_plans",
    vol.Required("entry_id"): str,
    vol.Required("op"): vol.In(("get", "save", "delete")),
    vol.Optional("revision"): int,
    vol.Optional("profile_id"): str,
    vol.Optional("profile"): dict,
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

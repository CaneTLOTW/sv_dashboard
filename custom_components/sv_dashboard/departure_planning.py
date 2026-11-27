"""Per-vehicle departure planning with opt-in climate dispatch."""
from __future__ import annotations

import asyncio
import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import callback
from homeassistant.helpers.storage import Store
from homeassistant.helpers.event import async_track_time_interval, async_track_state_change_event
from datetime import timedelta, datetime
import math
import logging

_LOGGER = logging.getLogger(__name__)
from homeassistant.util import dt as dt_util

from .const import CONF_VEHICLE_SLUG, DOMAIN
from .departure_plan import edit_profiles, normalize_profile, preview, normalize_reminder, reminder_candidate, due_occurrences, climate_gate, climate_state, quick_defaults, add_quick_profile, execution_candidates, fresh_heartbeat, expire_one_time_profiles, normalize_climate_min_soc, migrate_climate_min_soc, next_climate_badge, departure_confirmation, departure_result_due, climate_source_time, climate_soc_sample, climate_soc_begin, climate_soc_advance, departure_retry_due


class DeparturePlanning:
    def __init__(self, hass, entry):
        self.hass = hass
        self.store = Store(hass, 1, f"{DOMAIN}_{entry.data[CONF_VEHICLE_SLUG]}_departure_plans")
        self.lock = asyncio.Lock()
        self.profiles = []
        self.revision = 0
        self.reminder = normalize_reminder({})
        self.climate_min_soc = 20
        self.last_reminder = None
        self._unsubscribe = None
        self._task = None
        self.execution_enabled_at = None
        self.ledger = {}
        self.preparation = {}
        self.held_overrides = []
        self._published_badge = None
        self._soc_observed = set()
        self._soc_unsubscribe = None
        self._retry_observed = {}
        self._retry_unsubscribe = None
        self._retry_watch = ()

    async def async_initialize(self):
        data = await self.store.async_load()
        if data is not None:
            # Invalid persisted data must not be silently overwritten.
            if not isinstance(data, dict) or type(data.get("revision")) is not int or not isinstance(data.get("profiles"), list):
                raise ValueError("invalid_store")
            self.profiles = [normalize_profile(p, p["id"]) for p in data["profiles"]]
            self.revision = data["revision"]
            self.climate_min_soc = (normalize_climate_min_soc(data["climate_min_soc"])
                                    if "climate_min_soc" in data else migrate_climate_min_soc(self.profiles))
            self.reminder = normalize_reminder(data.get("reminder", {}))
            self.last_reminder = data.get("last_reminder")
            self.execution_enabled_at = dt_util.parse_datetime(data.get("execution_enabled_at") or "")
            self.ledger = data.get("ledger", {})
            self.preparation = data.get("preparation", {})
            held = data.get("held_overrides", [])
            if not isinstance(self.ledger, dict) or not isinstance(self.preparation, dict) or not isinstance(held, list):
                raise ValueError("invalid_store")
            self.held_overrides = [normalize_profile(p, p["id"]) for p in held]
            if any(p["kind"] != "once" for p in self.held_overrides):
                raise ValueError("invalid_store")
        await self._async_cleanup_locked(dt_util.utcnow())

    def async_start(self, notifications, coordinator):
        self.coordinator = coordinator
        self.notifications = notifications
        self._unsubscribe = async_track_time_interval(self.hass, self._tick, timedelta(minutes=1))
        mapping = coordinator.data.get("entity_mapping", {})
        watched = [mapping[k] for k in ("engine", "battery_plugged", "battery_charging") if mapping.get(k)]
        if watched:
            self._soc_unsubscribe = async_track_state_change_event(self.hass, watched, self._soc_guard_changed)
        climate_id = mapping.get("preconditioning")
        stop_id = mapping.get("preconditioning_stop_button") or mapping.get("preconditioning_stop")
        if climate_id and stop_id and stop_id.startswith("button."):
            self._retry_watch = (climate_id, stop_id)
            self._retry_unsubscribe = async_track_state_change_event(self.hass, list(self._retry_watch), self._retry_state_changed)

    @callback
    def _tick(self, _now):
        if self._task is None or self._task.done():
            self._task = self.hass.async_create_task(self._async_tick())

    async def async_shutdown(self):
        if self._retry_unsubscribe:
            self._retry_unsubscribe()
            self._retry_unsubscribe = None
        self._retry_observed.clear()
        if self._soc_unsubscribe:
            self._soc_unsubscribe()
            self._soc_unsubscribe = None
        if self._unsubscribe:
            self._unsubscribe()
            self._unsubscribe = None
        if self._task and not self._task.done():
            self._task.cancel()
            await asyncio.gather(self._task, return_exceptions=True)

    async def _persist(self, rows, revision, reminder, last_reminder):
        await self.store.async_save({"revision": revision, "profiles": rows,
                                     "reminder": reminder, "last_reminder": last_reminder,
                                     "climate_min_soc": self.climate_min_soc,
                                     "execution_enabled_at": self.execution_enabled_at.isoformat() if self.execution_enabled_at else None,
                                     "ledger": self.ledger, "preparation": self.preparation, "held_overrides": self.held_overrides})

    def _effective_profiles(self):
        # Hidden expired exceptions still suppress the original calendar date.
        return self.profiles + [{**p, "_held_only": True} for p in self.held_overrides]

    async def _async_cleanup_locked(self, now):
        rows, held, expired = expire_one_time_profiles(
            self.profiles, self.held_overrides, now, self.hass.config.time_zone, self.ledger)
        cutoff = now - timedelta(days=30)
        ledger = {key: value for key, value in self.ledger.items()
                  if (dt_util.parse_datetime(value.get("at", "")) or now) >= cutoff}
        preparation = {key: value for key, value in self.preparation.items()
                       if (dt_util.parse_datetime(value.get("at", "")) or now) >= cutoff}
        # A prepared occurrence without a dispatch record must not vanish silently.
        for profile, departure in expired:
            if departure is None:
                continue
            key = profile["id"] + "|" + departure.isoformat()
            armed = getattr(self, "execution_enabled_at", None)
            scheduled = (profile["enabled"] and armed is not None and
                         departure - timedelta(minutes=profile["lead_minutes"]) > armed)
            if key not in ledger and (key in preparation or scheduled):
                ledger[key] = {"at": now.isoformat(), "name": profile["name"],
                               "departure": departure.isoformat(), "status": "missed",
                               "preparation": preparation.get(key)}
                if now <= departure + timedelta(minutes=5) and (scheduled or preparation.get(key, {}).get("notify_result")):
                    ledger[key]["result_notification"] = "pending"
        if (rows, held, ledger, preparation) == (self.profiles, self.held_overrides, self.ledger, self.preparation):
            return
        revision = self.revision + int(rows != self.profiles)
        previous = self.held_overrides, self.ledger, self.preparation
        self.held_overrides, self.ledger, self.preparation = held, ledger, preparation
        try:
            await self._persist(rows, revision, self.reminder, self.last_reminder)
        except Exception:
            self.held_overrides, self.ledger, self.preparation = previous
            raise
        self.profiles, self.revision = rows, revision

    async def _async_tick(self):
        try:
            await self._async_execute()
        except Exception:
            _LOGGER.exception("SV departure climate evaluation failed; no retry requested")
        try:
            await self._async_result_notifications()
            await self._async_reminder()
            await self._async_climate_soc()
        finally:
            self.publish_badge()

    def planned_climate(self):
        return next_climate_badge(self._effective_profiles(), dt_util.utcnow(),
            self.hass.config.time_zone, self.execution_enabled_at, self.ledger)

    def publish_badge(self):
        badge = self.planned_climate()
        if badge != self._published_badge:
            self._published_badge = badge
            self.coordinator.async_update_listeners()

    async def _async_result_notifications(self):
        async with self.lock:
            for item in self.ledger.values():
                if item.get("result_notification") != "pending" or item.get("status") in ("claimed", "submitted"):
                    continue
                if not departure_result_due(item, dt_util.utcnow()):
                    item["result_notification"] = "expired"
                    await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)
                    continue
                # Persist the claim before any send; never retry a claimed event.
                item["result_notification"] = "attempted"
                try:
                    await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)
                except Exception:
                    item["result_notification"] = "pending"
                    raise
                try:
                    sent = await self.notifications.async_departure_result(item)
                except Exception:
                    _LOGGER.exception("SV departure result notification failed")
                    sent = False
                item["result_notification"] = "sent" if sent else "not_sent"
                await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)

    @callback
    def _retry_state_changed(self, event):
        entity = event.data.get("entity_id")
        state = event.data.get("new_state")
        old = event.data.get("old_state")
        if entity == self._retry_watch[0]:
            if state is None or climate_state(state.state) is not False:
                self._retry_observed.clear()
        elif entity == self._retry_watch[1]:
            if state is None or old is None or state.state != old.state:
                self._retry_observed.clear()

    def _retry_button(self, key, item, now):
        # No retry across a restart, unobservable stop button, manual stop,
        # observed active/unknown climate, changed profile or disarmed schedule.
        observed = self._retry_observed.get(key)
        if observed is None or self.execution_enabled_at is None:
            return None
        dispatch = datetime.fromisoformat(item["dispatched_at"])
        if self.execution_enabled_at > dispatch:
            return None
        profile = next((p for p in self.profiles if p["id"] == key.split("|", 1)[0]), None)
        if profile is None or not profile["enabled"] or profile != item.get("profile_snapshot"):
            return None
        if not any(row["profile_id"] + "|" + row["departure"] == key
                   for row in preview(self._effective_profiles(), now, self.hass.config.time_zone, 2)["upcoming"]):
            return None
        climate = self._state("preconditioning")
        stop = self._state("preconditioning_stop", "button")
        if (climate is None or stop is None or (climate.entity_id, stop.entity_id) != self._retry_watch
                or (stop.state, stop.last_changed) != observed or stop.state == "unavailable"):
            return None
        button = self._state("preconditioning_start", "button")
        engine, plug, battery = self._state("engine"), self._state("battery_plugged"), self._state("battery")
        temp = self._state("temperature")
        temperature = self._numeric(temp)
        if temperature is not None:
            unit = temp.attributes.get("unit_of_measurement")
            temperature = (temperature - 32) * 5 / 9 if unit == "°F" else temperature if unit == "°C" else None
        heartbeat, source = self.notifications._heartbeat()
        status = climate_gate(profile, self._numeric(battery), getattr(engine, "state", None),
            getattr(plug, "state", None), temperature, climate_state(climate.state),
            button is not None and button.state != "unavailable",
            fresh_heartbeat(now, heartbeat, source), climate_min_soc=self.climate_min_soc)
        return button if status == "ready" else None

    async def _async_retry_locked(self, key, item):
        now = dt_util.utcnow()
        if not departure_retry_due(item, now) or self._retry_button(key, item, now) is None:
            return
        # Persist a unique retry claim before sending. Never replay a claim.
        item["retry"] = {"at": now.isoformat(), "status": "claimed"}
        try:
            await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)
        except Exception:
            item.pop("retry", None)
            self._retry_observed.pop(key, None)
            raise
        now = dt_util.utcnow()
        before_claim = {k: v for k, v in item.items() if k != "retry"}
        button = self._retry_button(key, item, now) if departure_retry_due(before_claim, now) else None
        self._retry_observed.pop(key, None)
        if button is None:
            item["retry"]["status"] = "skipped"
        else:
            try:
                await asyncio.wait_for(self.hass.services.async_call(
                    "button", "press", {"entity_id": button.entity_id}, blocking=True), timeout=30)
                item["retry"]["status"] = "submitted"
            except Exception:
                item["retry"]["status"] = "error"
        await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)

    def _soc_guards_clean(self, sample=None):
        for key in ("engine", "battery_plugged", "battery_charging"):
            state = self._state(key)
            if state is None or climate_state(state.state) is not False:
                return False
            # Do not use a baseline which predates a known change in any guard.
            if sample is not None and state.last_changed > datetime.fromisoformat(sample["at"]):
                return False
        return True

    @callback
    def _soc_guard_changed(self, event):
        state = event.data.get("new_state")
        if state is None or climate_state(state.state) is not False:
            self._soc_observed.clear()

    async def _async_climate_soc(self):
        async with self.lock:
            now = dt_util.utcnow()
            sample = climate_soc_sample(self._state("battery"))
            climate = self._state("preconditioning")
            for key, item in self.ledger.items():
                measurement = item.get("climate_soc")
                if not measurement or measurement.get("status") != "pending":
                    continue
                # In-memory observation token is deliberately lost on restart.
                # A gap in observation cannot support a climate-only estimate.
                result = climate_soc_advance(item, sample, getattr(climate, "state", None),
                    getattr(climate, "attributes", {}), now,
                    key in self._soc_observed and self._soc_guards_clean())
                if result == measurement:
                    continue
                item["climate_soc"] = result
                try:
                    await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)
                except Exception:
                    item["climate_soc"] = measurement
                    raise
                if result["status"] != "pending":
                    self._soc_observed.discard(key)

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
            await self._async_cleanup_locked(now)
            cutoff = now - timedelta(days=30)
            for row in execution_candidates(self._effective_profiles(), now, self.hass.config.time_zone,
                                            self.execution_enabled_at, self.ledger, self.preparation):
                # Recompute after awaited work on a prior occurrence.
                now = dt_util.utcnow()
                if now >= datetime.fromisoformat(row["departure"]):
                    continue
                if row["phase"] != "prepare" and now >= datetime.fromisoformat(row["deadline"]):
                    row["phase"] = "missed"
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
                fresh = fresh_heartbeat(now, heartbeat, source)
                key = row["key"]
                if row["phase"] == "prepare" or (row["phase"] == "due" and not fresh):
                    if not fresh and key not in self.preparation:
                        wake = self._state("wakeup", "button")
                        # Claim the preparation before sending, including failures.
                        recent_preparation = any(value.get("status") in ("claimed", "submitted", "failed") and
                            timedelta(0) <= now - (dt_util.parse_datetime(value.get("at", "")) or cutoff) < timedelta(minutes=10)
                            for value in self.preparation.values())
                        item = {"at": now.isoformat(), "status": "claimed", "name": row["name"], "departure": row["departure"],
                                "heartbeat": heartbeat.isoformat() if heartbeat else None,
                                "heartbeat_source": source, "notify_result": True}
                        self.preparation[key] = item
                        try:
                            await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)
                        except Exception:
                            self.preparation.pop(key, None)
                            raise
                        if recent_preparation:
                            item["status"] = "recent"
                        elif getattr(engine, "state", None) == "on":
                            item["status"] = "engine"
                        elif wake is None or wake.state == "unavailable":
                            item["status"] = "unavailable"
                        else:
                            try:
                                item["status"] = await asyncio.wait_for(
                                    self.notifications.async_departure_wakeup(), timeout=30)
                            except Exception:
                                item["status"] = "failed"
                        await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)
                    # No climate command before start, or on an unrefreshed sample.
                    continue
                status = climate_gate(profile, self._numeric(battery), getattr(engine, "state", None),
                    getattr(plug, "state", None), temperature, climate_state(getattr(climate, "state", None)),
                    button is not None and button.state != "unavailable", fresh, climate_min_soc=self.climate_min_soc)
                if row["phase"] == "missed":
                    status = "stale" if key in self.preparation and not fresh else "missed"
                # Block overlapping occurrences; only the same occurrence may claim its bounded retry.
                recent = any(value.get("status") in ("claimed", "submitted", "confirmed", "unconfirmed", "failed")
                    and timedelta(0) <= now - (dt_util.parse_datetime(value.get("at", "")) or cutoff) < timedelta(minutes=45)
                    for value in self.ledger.values())
                if status == "ready" and recent:
                    status = "overlap"
                item = {"at": now.isoformat(), "name": row["name"], "departure": row["departure"],
                        "status": "claimed" if status == "ready" else status,
                        "result_notification": "pending",
                        "profile_snapshot": dict(profile),
                        "heartbeat": heartbeat.isoformat() if heartbeat else None,
                        "heartbeat_source": source,
                        "heartbeat_age_seconds": round((now - heartbeat).total_seconds()) if heartbeat and heartbeat.tzinfo else None,
                        "preparation": self.preparation.get(key)}
                self.ledger[row["key"]] = item
                try:
                    await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)
                except Exception:
                    self.ledger.pop(row["key"], None)
                    raise
                if status != "ready":
                    continue
                # Durable claim precedes the first service call.
                attempted = False
                try:
                    if dt_util.utcnow() >= datetime.fromisoformat(row["deadline"]):
                        item["status"] = "missed"
                    else:
                        dispatched = dt_util.utcnow()
                        item["dispatched_at"] = dispatched.isoformat()
                        sample = climate_soc_sample(self._state("battery"))
                        item["climate_soc"] = climate_soc_begin(sample, dispatched, self._soc_guards_clean(sample))
                        if item["climate_soc"]["status"] == "pending":
                            self._soc_observed.add(key)
                        await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)
                        if dt_util.utcnow() >= datetime.fromisoformat(row["deadline"]):
                            item["status"] = "missed"
                            await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)
                            continue
                        stop = self._state("preconditioning_stop", "button")
                        climate_now = self._state("preconditioning")
                        if (stop is not None and stop.state != "unavailable" and climate_now is not None
                                and climate_state(climate_now.state) is False
                                and (climate_now.entity_id, stop.entity_id) == self._retry_watch):
                            self._retry_observed[key] = (stop.state, stop.last_changed)
                        attempted = True
                        await asyncio.wait_for(self.hass.services.async_call(
                            "button", "press", {"entity_id": button.entity_id}, blocking=True), timeout=30)
                        item["status"] = "submitted"
                except Exception:
                    # A transport timeout is not proof that the vehicle rejected the command.
                    item["status"] = "submitted" if attempted else "failed"
                    if attempted:
                        item["dispatch_error"] = True
                await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)
            # A receipt or HA restore timestamp is not vehicle confirmation.
            changed = False
            climate = self._state("preconditioning")
            now = dt_util.utcnow()
            for item in self.ledger.values():
                status = departure_confirmation(item, getattr(climate, "state", None),
                    getattr(climate, "attributes", {}), now)
                if status != item.get("status"):
                    item["status"] = status
                    if status == "confirmed":
                        item["climate_confirmed_at"] = climate_source_time(climate.attributes).isoformat()
                    changed = True
            if changed:
                await self._persist(self.profiles, self.revision, self.reminder, self.last_reminder)
            await self._async_cleanup_locked(now)
            for key, item in self.ledger.items():
                if item.get("status") != "submitted":
                    self._retry_observed.pop(key, None)
                    continue
                await self._async_retry_locked(key, item)

    async def _async_reminder(self):
        async with self.lock:
            if not self.notifications.departure_reminder_available():
                return
            candidate = reminder_candidate(dt_util.utcnow(), self.hass.config.time_zone,
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
        now = dt_util.utcnow()
        return {"quick_defaults": quick_defaults(now, self.hass.config.time_zone), "revision": self.revision, "profiles": self.profiles, "preview_only": self.execution_enabled_at is None, "execution_enabled": self.execution_enabled_at is not None, "execution_log": sorted(self.ledger.values(), key=lambda row: row["at"], reverse=True)[:20], "preparation_log": sorted((value for key, value in self.preparation.items() if key not in self.ledger), key=lambda row: row["at"], reverse=True)[:20], "reminder": self.reminder, "last_reminder": self.last_reminder, "climate_min_soc": self.climate_min_soc,
                **preview(self._effective_profiles(), now, self.hass.config.time_zone)}

    async def async_apply(self, msg):
        async with self.lock:
            await self._async_cleanup_locked(dt_util.utcnow())
            if msg["op"] == "get":
                return self.snapshot()
            if msg.get("revision") != self.revision:
                raise ValueError("revision_conflict")
            if msg["op"] == "climate_settings":
                minimum = normalize_climate_min_soc(msg.get("climate_min_soc"))
                previous = self.climate_min_soc
                self.climate_min_soc = minimum
                try:
                    await self._persist(self.profiles, self.revision + 1, self.reminder, self.last_reminder)
                except Exception:
                    self.climate_min_soc = previous
                    raise
                self.revision += 1
                return self.snapshot()
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
            if msg["op"] == "quick":
                rows = add_quick_profile(self.profiles, msg.get("profile"), dt_util.utcnow(), self.hass.config.time_zone)
            else:
                rows = self.profiles if msg["op"] == "reminder" else edit_profiles(self.profiles, msg["op"], msg.get("profile"), msg.get("profile_id"))
            revision = self.revision + 1
            await self._persist(rows, revision, reminder, self.last_reminder)
            self.profiles, self.revision, self.reminder = rows, revision, reminder
            return self.snapshot()


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/departure_plans",
    vol.Required("entry_id"): str,
    vol.Required("op"): vol.In(("get", "save", "delete", "reminder", "execution", "quick", "climate_settings")),
    vol.Optional("revision"): int,
    vol.Optional("profile_id"): str,
    vol.Optional("profile"): dict,
    vol.Optional("reminder"): dict,
    vol.Optional("enabled"): bool,
    vol.Optional("climate_min_soc"): int,
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
        manager.publish_badge()
    except ValueError as exc:
        connection.send_error(msg["id"], str(exc), "Departure plan rejected")
        return
    except Exception:
        connection.send_error(msg["id"], "storage_error", "Departure plan could not be saved")
        return
    connection.send_result(msg["id"], result)


def async_register_departure_planning_websocket(hass):
    websocket_api.async_register_command(hass, websocket_departure_plans)

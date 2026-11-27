"""Persist observed tracker positions outside Recorder, without vehicle queries."""
from __future__ import annotations

import asyncio
from datetime import timedelta
import logging

from homeassistant.components.recorder import get_instance, history
from homeassistant.core import callback
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN, CONF_VEHICLE_SLUG
from .history_archive import merge_points, position_sample, point_geojson

_LOGGER = logging.getLogger(__name__)


class GpsArchive:
    def __init__(self, hass, entry, coordinator):
        self.hass, self.coordinator = hass, coordinator
        self.store = Store(hass, 1, f"{DOMAIN}_{entry.data[CONF_VEHICLE_SLUG]}_gps_archive")
        self.tracker = coordinator.data.get("vehicle_tracker")
        self.points = []
        self.pending = []
        self.cursor = None
        self.lock = asyncio.Lock()
        self.unsubscribers = []
        self.task = None
        self.loaded = False

    @callback
    def _on_state(self, event):
        sample = position_sample(event.data.get("new_state"))
        if sample:
            self.pending.append(sample)

    async def async_start(self):
        stored = await self.store.async_load()
        if stored is not None:
            if not isinstance(stored, dict) or stored.get("schema") != 1 or not isinstance(stored.get("points"), list):
                raise ValueError("invalid GPS archive; retained")
            self.points = merge_points([], stored["points"])
            self.cursor = dt_util.parse_datetime(stored.get("recorder_cursor") or "")
        self.loaded = True
        if self.tracker:
            self.unsubscribers.append(async_track_state_change_event(self.hass, [self.tracker], self._on_state))
            self.unsubscribers.append(async_track_time_interval(self.hass, self._tick, timedelta(minutes=1)))
            self._tick(None)
        self._publish()

    @callback
    def _tick(self, _now):
        if self.task is None or self.task.done():
            self.task = self.hass.async_create_task(self._async_cycle())

    async def _async_cycle(self):
        try:
            async with self.lock:
                now = dt_util.utcnow()
                # Seed all retained Recorder points, then repeat hourly with overlap.
                if self.cursor is None or now - self.cursor >= timedelta(hours=1):
                    start = max(now - timedelta(days=90, minutes=15), self.cursor - timedelta(minutes=10)) if self.cursor else now - timedelta(days=90, minutes=15)
                    try:
                        result = await get_instance(self.hass).async_add_executor_job(
                            history.get_significant_states, self.hass, start, now,
                            [self.tracker], None, False, False,
                        )
                        for state in result.get(self.tracker, []):
                            sample = position_sample(state)
                            if sample and start <= dt_util.parse_datetime(sample["at"]) <= now:
                                self.pending.append(sample)
                        await self._save(now)
                    except Exception:
                        _LOGGER.exception("SV GPS Recorder archive import failed; will retry")
                await self._save(self.cursor)
        except Exception:
            _LOGGER.exception("SV GPS archive save failed; pending observations retained")

    async def _save(self, cursor):
        count = len(self.pending)
        if not count and cursor == self.cursor:
            return
        points = merge_points(self.points, self.pending[:count])
        await self.store.async_save({"schema": 1, "points": points, "recorder_cursor": cursor.isoformat() if cursor else None})
        self.points, self.cursor = points, cursor
        del self.pending[:count]
        self._publish()

    def _publish(self):
        history_manager = getattr(self.coordinator, "server_history", None)
        if history_manager:
            for entity in history_manager._entities:
                if (getattr(entity, "_attr_translation_key", None) == "server_gps_history"
                        and getattr(entity, "hass", None) is not None
                        and entity.entity_id and self.hass.states.get(entity.entity_id) is not None):
                    entity.async_write_ha_state()

    def geojson(self):
        return point_geojson(self.points)

    async def async_shutdown(self):
        for unsub in self.unsubscribers:
            unsub()
        self.unsubscribers.clear()
        if self.task and not self.task.done():
            await asyncio.gather(self.task, return_exceptions=True)
        if self.loaded:
            async with self.lock:
                await self._save(self.cursor)

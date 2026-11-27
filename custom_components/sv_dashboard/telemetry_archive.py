"""Capture real HA vehicle state observations before Recorder purges them."""
from __future__ import annotations

import asyncio
from datetime import timedelta
import logging
from pathlib import Path

from homeassistant.components.recorder import get_instance, history
from homeassistant.core import callback
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.util import dt as dt_util

from .const import CONF_VEHICLE_SLUG, DOMAIN
from .evidence_archive import signal_mapping, observation, encode, source_records, write_records, read_cursor

_LOGGER = logging.getLogger(__name__)


class TelemetryArchive:
    def __init__(self, hass, entry, mapping):
        self.hass = hass
        self.path = Path(hass.config.path(".storage", f"{DOMAIN}_{entry.data[CONF_VEHICLE_SLUG]}_evidence_archive.sqlite3"))
        self.mapping = signal_mapping(mapping)
        self.pending = set()
        self.cursor = None
        self.count = 0
        self.error = None
        self.last_attempt = None
        self.lock = asyncio.Lock()
        self.task = None
        self.unsubs = []
        self.started = False

    def queue_store(self, suffix, data):
        try:
            for record in source_records(suffix, data):
                self.pending.add(record)
        except (TypeError, ValueError, OverflowError):
            self.error = "invalid_evidence_payload"
            _LOGGER.exception("SV evidence archive could not serialize one store collection")

    def queue_row(self, kind, identity, row):
        try:
            self.pending.add(encode(kind, identity, row))
        except (TypeError, ValueError, OverflowError):
            self.error = "invalid_evidence_payload"
            _LOGGER.exception("SV evidence archive could not serialize one row")

    def _observe(self, state):
        if state is None or state.entity_id not in self.mapping:
            return
        row = observation(self.mapping[state.entity_id], state)
        if row:
            self.queue_row("telemetry", state.entity_id + "|" + row["received_at"], row)

    @callback
    def _on_state(self, event):
        self._observe(event.data.get("new_state"))

    async def async_start(self):
        raw, self.count = await self.hass.async_add_executor_job(read_cursor, self.path)
        self.cursor = dt_util.parse_datetime(raw) if raw else None
        if raw and self.cursor is None:
            raise ValueError("invalid archive cursor")
        if self.mapping:
            self.unsubs.append(async_track_state_change_event(self.hass, list(self.mapping), self._on_state))
            for entity in self.mapping:
                self._observe(self.hass.states.get(entity))
        self.unsubs.append(async_track_time_interval(self.hass, self._tick, timedelta(minutes=1)))
        self.started = True
        self._tick(None)

    @callback
    def _tick(self, _now):
        if self.task is None or self.task.done():
            self.task = self.hass.async_create_task(self._async_cycle())

    async def async_flush(self, cursor=None):
        if not self.started:
            return False
        async with self.lock:
            batch = set(self.pending)
            if not batch and cursor is None:
                return True
            try:
                self.count = await self.hass.async_add_executor_job(write_records, self.path, list(batch), cursor.isoformat() if cursor else None)
            except Exception:
                self.error = "write_failed"
                _LOGGER.exception("SV evidence archive write failed; queued records retained")
                return False
            self.pending.difference_update(batch)
            if cursor:
                self.cursor = cursor
            if self.error == "write_failed":
                self.error = None
            return True

    async def _async_cycle(self):
        await self.async_flush()
        if not self.mapping:
            return
        now = dt_util.utcnow()
        if self.last_attempt and now - self.last_attempt < timedelta(hours=1):
            return
        self.last_attempt = now
        start = max(now - timedelta(days=90, minutes=15), self.cursor - timedelta(minutes=10)) if self.cursor else now - timedelta(days=90, minutes=15)
        try:
            # Query only existing Recorder observations, in bounded seven-day chunks.
            any_rows = False
            while start < now:
                end = min(now, start + timedelta(days=7))
                rows = await get_instance(self.hass).async_add_executor_job(
                    history.get_significant_states, self.hass, start, end,
                    list(self.mapping), None, False, False,
                )
                for entity in self.mapping:
                    for state in rows.get(entity, []):
                        if start <= state.last_updated <= end:
                            any_rows = True
                            self._observe(state)
                if not await self.async_flush():
                    return
                start = end
            if any_rows or self.cursor is not None:
                if await self.async_flush(now) and self.error in ("recorder_empty", "recorder_read_failed"):
                    self.error = None
            else:
                self.error = "recorder_empty"
        except Exception:
            self.error = "recorder_read_failed"
            _LOGGER.exception("SV evidence Recorder backfill failed; cursor retained")

    def status(self):
        return {"records": self.count, "queued": len(self.pending), "error": self.error,
                "recorder_cursor": self.cursor.isoformat() if self.cursor else None,
                "signals": sorted(set(self.mapping.values()))}

    async def async_shutdown(self):
        for unsubscribe in self.unsubs:
            unsubscribe()
        self.unsubs.clear()
        if self.task and not self.task.done():
            await asyncio.gather(self.task, return_exceptions=True)
        await self.async_flush()

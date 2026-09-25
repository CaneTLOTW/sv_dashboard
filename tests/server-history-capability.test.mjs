import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const history = read("custom_components/sv_dashboard/server_history.py");
const metrics = read("custom_components/sv_dashboard/metrics.py");
const sensor = read("custom_components/sv_dashboard/sensor.py");

test("server history is an explicit upstream capability", () => {
  const transport = read("custom_components/sv_dashboard/server_history_transport.py");
  assert.match(history, /historical_transport_available/);
  assert.match(history, /async_fetch_historical_trips/);
  assert.match(transport, /get_vehicle_trips/);
  assert.match(transport, /native_get_vehicle_trips/);
  assert.match(transport, /legacy_private_transport/);
  assert.match(transport, /CAR_API_GET_VEHICLE_TRIPS_URL/);
  assert.match(transport, /make_http_request/);
  assert.doesNotMatch(history, /self\._client\.get_vehicle_trips_history/);
});

test("unsupported history keeps the local fallback and avoids a network history call", () => {
  assert.match(history, /if not self\._history_transport_available\(\):/);
  assert.match(history, /"unsupported_upstream_capability"/);
  assert.match(history, /self\.data\["server_history_ready"\] = False/);
  assert.match(history, /self\.data\["server_history_source"\] = "local_fallback"/);
  assert.match(metrics, /if status\.get\("server_history_ready"\):/);
  assert.match(metrics, /return self\.data\.get\("trips", \[\]\)/);
  assert.match(metrics, /return self\.data\.get\("charges", \[\]\)/);
});

test("full sync never clears archived server rows before capability/sync success", () => {
  const fullSync = history.slice(history.indexOf("    async def async_full_sync"), history.indexOf("    async def async_initialize"));
  assert.match(fullSync, /if not self\._history_transport_available\(\):/);
  assert.match(fullSync, /await self\.async_initialize\(_force_full=True\)/);
  assert.doesNotMatch(fullSync, /self\.data\["server_trips_raw"\] = \[\]/);
  assert.doesNotMatch(fullSync, /self\.data\["canonical_trips"\] = \[\]/);
});

test("callable history keeps incremental/full sync and preserves rows on failure", () => {
  assert.match(history, /if parsed and not _force_full:/);
  assert.match(history, /raw_by_id = \{\} if _force_full else/);
  assert.match(history, /self\._mark_server_history_ready\(\)/);
  assert.match(history, /HistoricalTripsTransportUnavailable/);
  assert.match(history, /Existing canonical data survives API failure/);
});

test("server sensors expose only ready server rows and truth metadata", () => {
  assert.match(sensor, /def _ready_server_history\(metrics\)/);
  assert.match(sensor, /history, status = _ready_server_history/);
  assert.match(sensor, /\*\*status/);
  assert.match(sensor, /server_trips = history\.data\.get\("trips", \[\]\) if status\["server_history_ready"\] else \[\]/);
  assert.match(sensor, /server_charges = history\.data\.get\("charges", \[\]\) if status\["server_history_ready"\] else \[\]/);
  assert.match(sensor, /active = getattr\(self\.metrics, "data", \{\}\)\.get\("active_charge"\)/);
  assert.match(sensor, /package-owned live evidence/);
});

test("local energy and charge history remain the fallback contract", () => {
  assert.match(history, /"energy_source"\] = "sv_local_trip_soc_delta"/);
  assert.match(history, /"consumption_kwh_100km"\] = trip\["energy_per_100_km"\]/);
  assert.match(metrics, /return self\.data\.get\("charges", \[\]\)/);
  assert.match(read("custom_components/sv_dashboard/static/trip-history-card.js"), /server_history_ready/);
  assert.match(read("custom_components/sv_dashboard/static/charge-history-card.js"), /server_history_ready/);
});

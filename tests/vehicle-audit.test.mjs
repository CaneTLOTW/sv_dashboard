import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../custom_components/sv_dashboard/", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

const backend = read("vehicle_audit.py");
const transport = read("server_history_transport.py");
const frontend = read("static/vehicle-audit-card.js");
const strategy = read("static/sv_dashboard.js");
const init = read("__init__.py");

test("vehicle audit is explicit, read-only, and reuses upstream authenticated transport", () => {
  assert.match(backend, /async def async_build_vehicle_audit/);
  assert.match(backend, /"mode": "read_only"/);
  assert.match(backend, /async_authenticated_get/);
  assert.match(backend, /async_authenticated_get_href/);
  assert.match(transport, /async def async_authenticated_get/);
  assert.match(transport, /async def async_authenticated_get_href/);
  assert.match(transport, /return await _request_page/);
  assert.doesNotMatch(backend, /send_(?:command|mqtt|doors|horn|charge|preconditioning)/);
  assert.doesNotMatch(backend, /async_save|Store\(/);
});

test("audit probes the bounded Phase A API surface", () => {
  for (const token of [
    '"vehicles"',
    '"status"',
    '"maintenance"',
    '"onboardCapabilities"',
    '"branding"',
    '"pictures"',
    '"trips_baseline"',
    '"trips_page_size_one"',
    '"trips_index_zero"',
    '"trips_last_index"',
    '"trips_hal_last"',
    '"trips_timestamp_overlap"',
    '"trip_detail"',
    '"telemetry"',
    '"alerts"',
    '"collisions"',
    '"alarms"',
    '"lastPosition"',
  ]) {
    assert.ok(backend.includes(token), `missing Phase A probe token ${token}`);
  }
  assert.match(backend, /"pageSize": 1/);
  assert.match(backend, /"indexRange": "0-0"/);
  assert.match(backend, /"timestamps": f"\{since\}\/"/);
});

test("audit sanitizes private identifiers, locations, URLs, and bounded samples", () => {
  for (const token of [
    '"access_token"',
    '"refresh_token"',
    '"client_secret"',
    '"customer_id"',
    '"vin"',
    '"vehicle_id"',
    '"coordinates"',
    '"latitude"',
    '"longitude"',
    '"href"',
  ]) {
    assert.ok(backend.includes(token), `missing sanitization token ${token}`);
  }
  assert.match(backend, /_VIN_PATTERN/);
  assert.match(backend, /_sanitize_string/);
  assert.match(backend, /"gps_coordinates_exported": False/);
  assert.match(backend, /"raw_vin_exported": False/);
  assert.match(backend, /"raw_vehicle_id_exported": False/);
  assert.match(backend, /"tokens_exported": False/);
  assert.match(backend, /"persistent_report_written": False/);
  assert.match(backend, /_SAMPLE_LIST_LIMIT/);
  assert.match(backend, /_SAMPLE_DICT_LIMIT/);
});

test("audit exports structural capability evidence without model assumptions", () => {
  for (const key of [
    "schema_version",
    "environment",
    "vehicle_summary",
    "advertised_capabilities",
    "upstream_entities",
    "probe_results",
    "status_path_inventory",
    "trip_query_audit",
    "unmapped_candidate_fields",
    "privacy_redaction_summary",
  ]) {
    assert.ok(backend.includes(`"${key}"`), `missing report key ${key}`);
  }
  assert.match(backend, /mapped_upstream/);
  assert.match(backend, /freshest_age_seconds/);
  assert.match(backend, /enum_values/);
  assert.match(backend, /Observed ordering is runtime evidence, not a documented Stellantis ordering guarantee/);
});

test("System card runs on demand and exports JSON plus GitHub Markdown locally", () => {
  assert.match(strategy, /custom:sv-dashboard-vehicle-audit-card/);
  assert.match(strategy, /entry_id: attributes\.entry_id/);
  assert.match(init, /async_register_vehicle_audit_websocket\(hass\)/);
  assert.match(frontend, /callWS\(\{[\s\S]*vehicle_audit/);
  assert.match(frontend, /new Blob\(/);
  assert.match(frontend, /URL\.createObjectURL/);
  assert.match(frontend, /navigator\.clipboard\.writeText/);
  assert.match(frontend, /SV Dashboard vehicle capability audit/);
  assert.doesNotMatch(frontend, /window\.customCards/);
});

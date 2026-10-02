import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../custom_components/sv_dashboard/", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const card = read("static/vehicle-diagnostics-card.js");
const backend = read("vehicle_diagnostics.py");
const strategy = read("static/sv_dashboard.js");
const docs = fs.readFileSync(new URL("../docs/VEHICLE_DIAGNOSTICS.en.md", import.meta.url), "utf8");
const changelog = fs.readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");

test("System diagnostics loads once, then only on explicit reload/window selection", () => {
  assert.match(strategy, /custom:sv-dashboard-vehicle-diagnostics-card/);
  assert.match(card, /_scheduleInitialLoad\(\)/);
  assert.match(card, /queueMicrotask\(\(\) => \{/);
  assert.match(card, /@click=\$\{this\._load\}/);
  assert.match(card, /duration_seconds: this\._duration/);
  assert.doesNotMatch(card, /setInterval|setTimeout\([^)]*_load/);
});

test("responsive timeline expands event timestamp provenance without a wide table", () => {
  assert.match(card, /<details class="event">/);
  assert.match(card, /event\.source_time/);
  assert.match(card, /event\.timestamp_source/);
  assert.match(card, /@media \(max-width:520px\)/);
  assert.match(card, /grid-template-columns:62px minmax\(0,1fr\)/);
  assert.doesNotMatch(card, /<table/);
});

test("copy diagnostics has explicit bounds and states Recorder limitations", () => {
  assert.match(card, /MAX_COPY_EVENTS = 80/);
  assert.match(card, /MAX_COPY_LENGTH = 24000/);
  assert.match(card, /rawCodeNotRecorded/);
  assert.match(card, /telemetryEvidence/);
  assert.match(backend, /raw_command_result_code": "not_recorded"/);
  assert.match(docs, /raw MQTT result code is not stored/);
  assert.match(docs, /does\s+\*\*not\*\* prove that the vehicle was continuously online/);
  assert.match(changelog, /0\.6\.0-beta\.39 recorder-backed vehicle diagnostics candidate/);
});

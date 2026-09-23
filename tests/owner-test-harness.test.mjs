import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const overview = fs.readFileSync("custom_components/sv_dashboard/static/vehicle-overview-card.js", "utf8");
const frontend = fs.readFileSync("custom_components/sv_dashboard/static/frontend.js", "utf8");
const strategy = fs.readFileSync("custom_components/sv_dashboard/static/sv_dashboard.js", "utf8");
const harness = fs.readFileSync("dev/owner_test_harness/owner-test-harness-card.js", "utf8");
const installer = fs.readFileSync("dev/owner_test_harness/install.py", "utf8");

test("normal EV Hero mirrors Dual-Energy 15 minute temperature freshness semantics", () => {
  assert.match(overview, /FRESH_VEHICLE_DATA_MS = 15 \* 60 \* 1000/);
  assert.match(overview, /attributes\["Last updated"\]/);
  assert.match(overview, /attributes\.updatedAt/);
  assert.match(overview, /age <= \$\{FRESH_VEHICLE_DATA_MS\}/);
  assert.match(overview, /"var\(--primary-color\)"/);
});

test("owner fixture stays outside the production frontend and Strategy", () => {
  assert.doesNotMatch(frontend, /owner-test-harness|sv_owner_fixture/);
  assert.doesNotMatch(strategy, /owner-test-harness|sv_owner_fixture/);
});

test("owner harness overlays fuel states while retaining the live vehicle mapping", () => {
  assert.match(harness, /\.\.\.originalMapped/);
  assert.match(harness, /fuel: ids\.fuel/);
  assert.match(harness, /fuel_autonomy: ids\.fuelAutonomy/);
  assert.match(harness, /fuel_consumption_instant: ids\.fuelConsumption/);
  assert.match(harness, /electric_energy: true/);
  assert.match(harness, /fuel: true/);
  assert.match(harness, /if \\(profile === \"phev-idle\" \\|\\| stale\\\)/);
  assert.match(harness, /else if \\(profile === \"phev-driving\"\\\)/);
  assert.match(harness, /else if \\(profile === \"phev-charging\"\\\)/);
  assert.match(harness, /withSourceTimestamp/);
});

test("owner harness exposes deterministic idle, driving, charging and stale profiles", () => {
  for (const profile of ["phev-idle", "phev-driving", "phev-charging", "phev-stale"]) {
    assert.match(harness, new RegExp(profile));
  }
  assert.match(installer, /sv_owner_fixture=phev-driving/);
  assert.match(installer, /ownerFixtureActive/);
});

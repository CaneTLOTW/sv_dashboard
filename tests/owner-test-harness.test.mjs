import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const overview = fs.readFileSync("custom_components/sv_dashboard/static/vehicle-overview-card.js", "utf8");
const frontend = fs.readFileSync("custom_components/sv_dashboard/static/frontend.js", "utf8");
const strategy = fs.readFileSync("custom_components/sv_dashboard/static/sv_dashboard.js", "utf8");
const harness = fs.readFileSync("dev/owner_test_harness/owner-test-harness-card.js", "utf8");
const installer = fs.readFileSync("dev/owner_test_harness/install.py", "utf8");

test("normal EV Hero keeps the production 15 minute temperature freshness contract", () => {
  assert.match(overview, /FRESH_VEHICLE_DATA_MS = 15 \* 60 \* 1000/);
  assert.match(overview, /attributes\["Last updated"\]/);
  assert.match(overview, /attributes\.updatedAt/);
  assert.match(overview, /age <=/);
  assert.match(overview, /color-mix\(in srgb, var\(--primary-color\) 14%/);
});

test("owner fixture stays outside production frontend and Strategy", () => {
  assert.doesNotMatch(frontend, /owner-test-harness|sv_owner_fixture|OwnerHarness/);
  assert.doesNotMatch(strategy, /owner-test-harness|sv_owner_fixture|OwnerHarness/);
});

test("owner fixture provides whole-dashboard Dual-Energy capability and synthetic metrics", () => {
  assert.match(harness, /const CONTEXT_TAG = "sv-dashboard-owner-test-context-card"/);
  assert.match(harness, /function fixtureHass\(/);
  assert.match(harness, /powertrain: "hybrid"/);
  assert.match(harness, /electric_energy: true/);
  assert.match(harness, /electric_trip_metrics: true/);
  assert.match(harness, /fuel: true/);
  assert.match(harness, /fuel_metrics: true/);
  assert.match(harness, /remaining_fuel_liters/);
  assert.match(harness, /trailing_fuel_consumption_500km/);
  assert.match(harness, /owner_test_fixture: profile/);
});

test("owner fixture provides Hybrid Trip History and Fuel History dummy data", () => {
  assert.match(harness, /owner-fixture-mixed/);
  assert.match(harness, /owner-fixture-electric/);
  assert.match(harness, /fuel_consumption_l_100km: 5\.0/);
  assert.match(harness, /energy_per_100_km: 12\.9/);
  assert.match(harness, /trip_columns: tripColumns/);
  assert.match(harness, /trip_rows: trips\.map/);
  assert.match(harness, /fuel_history/);
  assert.match(harness, /fuelHistoryFixture\(\)/);
  assert.match(harness, /fuel_before_percent/);
});

test("owner harness exposes deterministic fresh, stale, idle, driving and charging profiles", () => {
  for (const profile of ["phev-fresh", "phev-idle", "phev-driving", "phev-charging", "phev-stale"]) {
    assert.match(harness, new RegExp(profile));
  }
  assert.match(harness, /forceFresh = profile === "phev-fresh"/);
  assert.match(harness, /stale \? agoIso\(60\) : nowIso\(\)/);
  assert.match(harness, /withSourceTimestamp\(hass\.states\[entityId\], stamp\)/);
  assert.match(installer, /sv_owner_fixture=phev-fresh/);
});

test("whole-dashboard context is injected at Strategy generation and card runtime", () => {
  assert.match(installer, /ownerHarness\.fixtureHass\(hass, strategyConfig\.entry_id, ownerProfile\)/);
  assert.match(installer, /ownerHarness\.decorateDashboard\(dashboard, strategyConfig\.entry_id, ownerProfile\)/);
  assert.match(harness, /view\.cards = view\.cards\.map/);
  assert.match(harness, /section\.cards = section\.cards\.map/);
  assert.match(harness, /helpers\.createCardElement\(this\._config\.card\)/);
  assert.match(harness, /inner\.hass = fixtureHass/);
});

test("standard selector removes fixture parameter and keeps real dashboard context", () => {
  assert.match(harness, /Standard · echtes Fahrzeug/);
  assert.match(harness, /url\.searchParams\.set\(PROFILE_PARAM, profile\)/);
  assert.match(harness, /url\.searchParams\.delete\(PROFILE_PARAM\)/);
  assert.match(harness, /if \(!profile\) return dashboard/);
});

test("owner installer resets canonical product files and refuses mixed versions", () => {
  assert.match(installer, /_reset_product_static/);
  assert.match(installer, /repo_version != installed_version/);
  assert.match(installer, /Install the exact product candidate before applying the owner harness/);
  assert.match(installer, /shutil\.copy2\(source_static \/ name, target \/ name\)/);
});

test("owner harness import is fail-open and outside the critical packageModules gate", () => {
  assert.match(installer, /OWNER-HARNESS-IMPORT-BEGIN/);
  assert.match(installer, /window\.__svDashboardOwnerHarnessReady = import/);
  assert.match(installer, /\.then\(\(\) => true\)/);
  assert.match(installer, /\.catch\(\(error\) =>/);
  assert.match(installer, /return false/);
  assert.match(installer, /local module failed to load/);
});

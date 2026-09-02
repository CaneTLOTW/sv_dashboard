import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../custom_components/sv_dashboard/", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const staticDir = new URL("../custom_components/sv_dashboard/static/", import.meta.url);

test("frontend runtime is self-contained and pinned", () => {
  const files = fs.readdirSync(staticDir).filter((name) => name.endsWith(".js"));
  assert.ok(files.includes("vendor-lit.js"));
  for (const name of files) {
    const source = fs.readFileSync(new URL(name, staticDir), "utf8");
    assert.doesNotMatch(source, /from\s+["']https?:\/\//, `external runtime import in ${name}`);
    assert.doesNotMatch(source, /unpkg\.com/);
  }
  for (const name of ["trip-history-card.js", "charge-history-card.js", "dual-energy-overview-card.js", "fuel-history-card.js"]) {
    assert.match(fs.readFileSync(new URL(name, staticDir), "utf8"), /vendor-lit\.js\?v=0\.6\.0-beta\.5|vendor-lit\.js\?v=0\.6\.0-beta\.5/);
  }
});

test("hybrid hardening contracts are present", () => {
  const config = read("config_flow.py");
  const identity = read("entity_identity.py");
  const coordinator = read("coordinator.py");
  const metrics = read("metrics.py");
  const notifications = read("notifications.py");
  const dual = read("static/dual-energy-overview-card.js");
  assert.match(config, /CONF_POWERTRAIN_OVERRIDE/);
  assert.match(config, /auto_powertrain == POWERTRAIN_UNKNOWN/);
  assert.match(config, /CONF_VEHICLE_VIN/);
  assert.match(identity, /async_repair_vehicle_reference/);
  assert.match(coordinator, /fallback_override/);
  for (const key of ["start_fuel", "end_fuel", "fuel_consumption_l", "fuel_consumption_l_100km", "trip_type"]) assert.match(metrics, new RegExp(key));
  assert.match(metrics, /def current_trip_consumption/);
  assert.match(notifications, /fuel_consumption_l_100km/);
  assert.match(dual, /current_trip_consumption/);
  assert.match(dual, /kWh\/100 km/);
});

test("legacy Ec3 implementation class prefix is gone", () => {
  for (const name of fs.readdirSync(new URL("../custom_components/sv_dashboard/", import.meta.url)).filter((name) => name.endsWith(".py"))) {
    assert.doesNotMatch(read(name), /\bEc3[A-Z]/, name);
  }
});


test("Hybrid/Fuel strings have one canonical frontend source", () => {
  const files = fs.readdirSync(staticDir);
  assert.ok(!files.includes("i18n-hybrid-cards.js"));
  const core = read("static/i18n-core.js");
  assert.match(core, /dualEnergyOverview:/);
  assert.match(core, /fuelHistory:/);
  assert.doesNotMatch(read("static/dual-energy-overview-card.js"), /const TEXT =/);
  assert.doesNotMatch(read("static/fuel-history-card.js"), /const TEXT =/);
});

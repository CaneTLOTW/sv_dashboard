import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const metrics = fs.readFileSync("custom_components/sv_dashboard/metrics.py", "utf8");
const sensor = fs.readFileSync("custom_components/sv_dashboard/sensor.py", "utf8");
const strategy = fs.readFileSync("custom_components/sv_dashboard/static/sv_dashboard.js", "utf8");

test("live charge power samples react to residual-energy updates as well as SOC", () => {
  assert.match(metrics, /entity_id in \{\s*self\.mapping\.get\("battery"\),\s*self\.mapping\.get\("battery_residual"\),\s*\} and self\._is_on\("battery_charging"\)/);
  assert.match(metrics, /residual_state =/);
  assert.match(metrics, /upstream_candidates: list\[datetime\] = \[\]/);
  assert.match(metrics, /ha_candidates: list\[datetime\] = \[\]/);
  assert.match(metrics, /if upstream_candidates:/);
  assert.match(metrics, /source_time = max\(upstream_candidates\)/);
  assert.match(metrics, /elif ha_candidates:/);
  assert.match(metrics, /source_time = max\(ha_candidates\)/);
  assert.match(metrics, /timestamp_source = "stellantis"/);
  assert.match(metrics, /"residual_kwh": self\._as_float\(/);
  assert.match(metrics, /same_source_update = bool\(/);
  assert.match(metrics, /reference = \(\s*samples\[-2\]/);
  assert.match(metrics, /samples\[-1\] = merged/);
});

test("compact charge samples retain provenance needed by Charge Curve V2", () => {
  assert.match(sensor, /def _compact_curve_samples\(samples: Any, limit: int = 24\)/);
  for (const key of ["source_time", "soc", "residual_kwh", "capacity_kwh", "derived_power_kw", "power_source", "timestamp_source"]) {
    assert.match(sensor, new RegExp(`"${key}"`));
  }
});

test("charging UI never labels upstream chargingRate km per hour as kW", () => {
  assert.match(strategy, /const currentChargePower = metric\("current_charge_power"\);/);
  assert.doesNotMatch(strategy, /current_charge_power"\) \|\| entity\("battery_charging_rate"\)/);
  assert.match(metrics, /Upstream battery_charging_rate is km\/h, not kW/);
});

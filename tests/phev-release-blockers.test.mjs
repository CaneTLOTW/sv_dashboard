import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sensor = fs.readFileSync("custom_components/sv_dashboard/sensor.py", "utf8");
const history = fs.readFileSync("custom_components/sv_dashboard/server_history.py", "utf8");
const fuelHistory = fs.readFileSync("custom_components/sv_dashboard/fuel_history.py", "utf8");

test("last charge result bounds oversized canonical IDs before exposing HA state", () => {
  assert.match(sensor, /from \.state_contract import bounded_state_identifier/);
  assert.match(sensor, /bounded_state_identifier\(charge\.get\("id"\), prefix="charge"\)/);
  assert.match(sensor, /data\.update\(charge\)/);
});

test("PHEV dual-energy trip pairs do not use SOC-only reconstructed charging", () => {
  assert.match(history, /from \.charge_policy import allow_soc_only_charge_reconstruction/);
  assert.match(history, /if not allow_soc_only_charge_reconstruction\(previous, following\):\s*continue/);
  assert.match(history, /canonical_charges = merge_charges\(windows, list\(observed_by_id\.values\(\)\)\)/);
});

test("newest refuel can be confirmed by current live fuel state after bounded hold", () => {
  assert.match(fuelHistory, /from \.fuel_policy import tail_refill_confirmation/);
  assert.match(fuelHistory, /for index in range\(1, len\(samples\)\)/);
  assert.match(fuelHistory, /current_fuel_state = self\.hass\.states\.get\(fuel_entity\)/);
  assert.match(fuelHistory, /tail_refill_confirmation\(/);
  assert.match(fuelHistory, /tail_recheck_seconds/);
  assert.match(fuelHistory, /async_call_later\(/);
});

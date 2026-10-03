import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const metrics = fs.readFileSync("custom_components/sv_dashboard/metrics.py", "utf8");
const sensor = fs.readFileSync("custom_components/sv_dashboard/sensor.py", "utf8");
const strategy = fs.readFileSync("custom_components/sv_dashboard/static/sv_dashboard.js", "utf8");
const compactHero = fs.readFileSync("custom_components/sv_dashboard/static/vehicle-overview-card.js", "utf8");
const dualHero = fs.readFileSync("custom_components/sv_dashboard/static/dual-energy-overview-card.js", "utf8");

test("live charge power keeps per-metric timestamp provenance", () => {
  assert.match(metrics, /soc_time, soc_timestamp_source = self\._entity_sample_time/);
  assert.match(metrics, /residual_time, residual_timestamp_source = self\._entity_sample_time/);
  assert.match(metrics, /"soc_source_time": soc_time\.isoformat\(\)/);
  assert.match(metrics, /"residual_source_time": residual_time\.isoformat\(\)/);
  assert.match(metrics, /def _sample_metric_time/);
  assert.match(metrics, /def _metric_delta_timing/);
  assert.match(metrics, /"soc_ha_time": soc_ha_time\.isoformat\(\)/);
  assert.match(metrics, /"residual_ha_time": residual_ha_time\.isoformat\(\)/);
  assert.match(metrics, /self\._metric_delta_timing\(reference, sample, "residual"\)/);
  assert.match(metrics, /self\._metric_delta_timing\([\s\S]*reference, sample, "soc", minimum_seconds=30/);
  assert.match(metrics, /"home_assistant_fallback"/);
});

test("charge sampling separates source time from repeated HA observations", () => {
  assert.match(metrics, /charge_samples_same_payload\(previous, sample\)/);
  assert.match(metrics, /trigger_metric=trigger_metric/);
  assert.match(metrics, /"fanout_metrics"/);
  assert.match(metrics, /current_charge_power_observed_at/);
  assert.match(metrics, /power_observed_at/);
});

test("sample-derived charge boundaries remain explicitly partial evidence", () => {
  assert.match(metrics, /"soc_start_source": "charge_start"/);
  assert.match(metrics, /"first_sample"/);
  assert.match(metrics, /residual_energy_delta_sample_boundary/);
  assert.match(metrics, /soc_delta_sample_boundary/);
  assert.match(metrics, /"energy_partial"/);
});

test("unchanged residual energy cannot suppress the SOC fallback", () => {
  assert.match(metrics, /residual > previous_residual/);
  assert.match(metrics, /if power is None and previous_soc is not None and soc > previous_soc:/);
  const residualBlock = metrics.indexOf('power_source = "residual_energy_delta"');
  const socFallback = metrics.indexOf('if power is None and previous_soc is not None and soc > previous_soc:');
  assert.ok(residualBlock >= 0 && socFallback > residualBlock);
});

test("tiny or implausible derived power is never published as zero", () => {
  assert.match(metrics, /_MIN_CHARGE_POWER_KW = 0\.1/);
  assert.match(metrics, /_MAX_CHARGE_POWER_KW = 250\.0/);
  assert.match(metrics, /_MIN_CHARGE_POWER_KW <= candidate <= _MAX_CHARGE_POWER_KW/);
  assert.match(metrics, /rounded_power >= _MIN_CHARGE_POWER_KW/);
  assert.match(metrics, /No estimate is more honest than fake zero/);
});

test("live charge power expires and exposes provenance diagnostics", () => {
  assert.match(metrics, /_CHARGE_POWER_STALE_AFTER = timedelta\(minutes=30\)/);
  assert.match(metrics, /current_charge_power_source_time/);
  assert.match(metrics, /current_charge_power_timestamp_source/);
  assert.match(metrics, /def _schedule_charge_power_expiry/);
  assert.match(metrics, /age > _CHARGE_POWER_STALE_AFTER\.total_seconds\(\)/);
  assert.match(metrics, /def current_charge_power_provenance/);
  assert.match(sensor, /current_charge_power_provenance\(\)/);
  for (const key of ["estimated", "power_source", "source_time", "observed_at", "timestamp_source", "sample_age_seconds", "fresh"]) {
    assert.match(metrics, new RegExp(`"${key}"`));
  }
});

test("compact charge samples retain provenance needed by Charge Curve V2", () => {
  assert.match(sensor, /def _compact_curve_samples\(samples: Any, limit: int = 24\)/);
  for (const key of ["source_time", "received_at", "power_observed_at", "soc", "residual_kwh", "capacity_kwh", "derived_power_kw", "power_source", "timestamp_source"]) {
    assert.match(sensor, new RegExp(`"${key}"`));
  }
});

test("active charge curve samples do not depend on server-history readiness", () => {
  assert.match(sensor, /active = getattr\(self\.metrics, "data", \{\}\)\.get\("active_charge"\)/);
  assert.doesNotMatch(sensor, /get\("active_charge"\)\s*\n\s*if status\["server_history_ready"\]/);
});

test("charging UI never labels upstream chargingRate km per hour as kW", () => {
  assert.match(strategy, /const currentChargePower = metric\("current_charge_power"\);/);
  assert.doesNotMatch(strategy, /current_charge_power"\) \|\| entity\("battery_charging_rate"\)/);
  assert.match(metrics, /Upstream battery_charging_rate is km\/h, not kW/);
});

test("charging status bubble shows unavailable rather than fake 0 kW", () => {
  assert.doesNotMatch(strategy, /\? '0 kW'/);
  assert.match(strategy, /numericValue <= 0 \? '-' : formatter\.format\(numericValue\)/);
});

test("both Hero variants reject non-positive package charge power", () => {
  assert.match(compactHero, /Number\(power\.state\) > 0/);
  assert.match(dualHero, /_formatPositiveValue\(entityId, digits = 0\)/);
  assert.match(dualHero, /value === null \|\| value <= 0/);
  assert.match(dualHero, /this\._formatPositiveValue\(mode\.chargePower, 1\)/);
});

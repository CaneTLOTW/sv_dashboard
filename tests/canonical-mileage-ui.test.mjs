import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../custom_components/sv_dashboard/", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

const constants = read("const.py");
const metrics = read("metrics.py");
const sensor = read("sensor.py");
const history = read("server_history.py");
const strategy = read("static/sv_dashboard.js");

test("canonical mileage is a package-owned total-increasing distance sensor", () => {
  assert.match(constants, /METRIC_CANONICAL_MILEAGE = "canonical_mileage"/);
  assert.match(sensor, /class SvCanonicalMileageSensor/);
  assert.match(sensor, /_attr_state_class = SensorStateClass\.TOTAL_INCREASING/);
  assert.match(sensor, /_attr_device_class = SensorDeviceClass\.DISTANCE/);
  assert.match(sensor, /_attr_translation_key = "canonical_mileage"/);
});

test("raw odometer updates are filtered and canonical server anchors reconcile the counter", () => {
  assert.match(metrics, /async_capture_canonical_mileage\(/);
  assert.match(metrics, /monotonic_mileage\(/);
  assert.match(metrics, /source="upstream_odometer"/);
  assert.match(metrics, /async_reconcile_canonical_mileage\(/);
  assert.match(history, /await self\.metrics\.async_reconcile_canonical_mileage/);
});

test("driven-distance dashboard never uses raw odometer change statistics", () => {
  assert.match(strategy, /const canonicalMileage = metric\("canonical_mileage"\)/);
  assert.match(
    strategy,
    /title: strings\.drivenDistanceHistory, entities: \[canonicalMileage\].*period: "month".*stat_types: \["change"\]/,
  );
  assert.doesNotMatch(
    strategy,
    /title: strings\.drivenDistanceHistory, entities: \[entity\("mileage"\)\]/,
  );
});

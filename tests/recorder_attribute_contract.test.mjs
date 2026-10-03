import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const sensor = await readFile(
  new URL("../custom_components/sv_dashboard/sensor.py", import.meta.url),
  "utf8",
);

test("large live dashboard/API payloads are excluded from Recorder attributes", () => {
  assert.match(sensor, /from homeassistant\.const import MATCH_ALL,/);
  for (const className of [
    "SvDashboardStatusSensor",
    "SvServerTripHistorySensor",
    "SvServerGpsHistorySensor",
    "SvServerChargeHistorySensor",
  ]) {
    const start = sensor.indexOf(`class ${className}`);
    assert.notEqual(start, -1, `${className} must exist`);
    const nextClass = sensor.indexOf("\nclass ", start + 1);
    const block = sensor.slice(start, nextClass === -1 ? undefined : nextClass);
    assert.match(
      block,
      /_unrecorded_attributes = frozenset\(\{MATCH_ALL\}\)/,
      `${className} must keep its live attributes out of Recorder`,
    );
  }
});

test("ordinary metric sensors are not globally excluded from Recorder attributes", () => {
  const start = sensor.indexOf("class SvMetricSensor");
  const nextClass = sensor.indexOf("\nclass ", start + 1);
  const block = sensor.slice(start, nextClass);
  assert.doesNotMatch(block, /_unrecorded_attributes/);
});

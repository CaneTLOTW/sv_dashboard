import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = path.join(root, "custom_components", "sv_dashboard", "trip_speed.py");
const historyPath = path.join(root, "custom_components", "sv_dashboard", "server_history.py");
const repairPath = path.join(root, "custom_components", "sv_dashboard", "trip_repair.py");

function resolve(rawSpeed, distance, duration) {
  const script = String.raw`
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("trip_speed", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
args = json.loads(sys.argv[2])
print(json.dumps(module.resolve_trip_speed(*args)))
`;
  return JSON.parse(execFileSync("python", ["-c", script, modulePath, JSON.stringify([rawSpeed, distance, duration])], {
    encoding: "utf8",
    cwd: root,
  }));
}

test("Stellantis m/s fixture retains validated m/s conversion", () => {
  // Sanitized DS4 trip fixture: 2.9 km in 929 seconds, API avgSpeed 3.12 m/s.
  const [speed, apiSpeed, provenance, flags] = resolve(3.12, 2.9, 929);
  assert.ok(Math.abs(speed - 11.232) < 0.01);
  assert.equal(apiSpeed, speed);
  assert.equal(provenance, "stellantis_mps");
  assert.deepEqual(flags, []);
});

test("Peugeot e-208 km/h fixture does not get multiplied by 3.6", () => {
  // Public upstream report #703: 21 km / 26:38 => about 47.31 km/h.
  const [speed, apiSpeed, provenance, flags] = resolve(47.31, 21, 1598);
  assert.ok(Math.abs(speed - 47.31) < 0.02);
  assert.equal(apiSpeed, speed);
  assert.equal(provenance, "stellantis_kmh");
  assert.deepEqual(flags, []);
});

test("contradictory source uses physical distance/time rather than inventing unit", () => {
  const [speed, apiSpeed, provenance, flags] = resolve(170.32, 21, 1598);
  assert.ok(Math.abs(speed - 47.309) < 0.02);
  assert.equal(apiSpeed, null);
  assert.equal(provenance, "distance_duration_fallback");
  assert.deepEqual(flags, ["source_speed_disagrees_with_trip"]);
});

test("untrustworthy or impossible speed source cannot mask a trip-speed outlier", () => {
  const [speed, apiSpeed, provenance, flags] = resolve(400, 21, 1598);
  assert.ok(Math.abs(speed - 47.309) < 0.02);
  assert.equal(apiSpeed, null);
  assert.equal(provenance, "distance_duration_fallback");
  assert.deepEqual(flags, ["source_speed_outlier_fallback_used"]);

  const impossible = resolve(47.3, 21, 50); // 1512 km/h
  assert.deepEqual(impossible, [null, null, "unavailable", ["derived_speed_outlier"]]);
});

test("zero-speed ambiguity uses independent derived speed", () => {
  assert.deepEqual(resolve(0, 0, 600), [
    0, null, "distance_duration_fallback", ["source_speed_unit_ambiguous"],
  ]);
});

test("no usable physical trip duration means speed unit remains unverified", () => {
  assert.deepEqual(resolve(47.31, 21, null), [
    null, null, "unavailable", ["source_speed_unit_unverified"],
  ]);
});

test("canonical and odometer-repair code preserve validated speed provenance", () => {
  const history = fs.readFileSync(historyPath, "utf8");
  const repair = fs.readFileSync(repairPath, "utf8");
  assert.match(history, /from \.trip_speed import resolve_trip_speed/);
  assert.match(history, /resolve_trip_speed\(/);
  assert.doesNotMatch(history, /api_speed_kmh = raw_avg_speed \* 3\.6/);
  assert.match(history, /"speed_source": speed_source/);
  assert.match(repair, /trip\.get\("speed_source"\) in \("stellantis_mps", "stellantis_kmh"\)/);
  assert.match(repair, /trip\.get\("speed_source"\) if source_speed_usable/);
});

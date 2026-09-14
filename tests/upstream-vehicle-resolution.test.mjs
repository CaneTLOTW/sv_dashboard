import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("upstream vehicle resolution compatibility scenarios", () => {
  const result = spawnSync(
    "python3",
    ["tests/upstream_vehicle_resolution_test.py"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

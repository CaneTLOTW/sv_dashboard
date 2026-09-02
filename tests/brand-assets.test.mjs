import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const pngSize = (path) => {
  const b = fs.readFileSync(new URL(path, import.meta.url));
  assert.equal(b.subarray(1, 4).toString(), "PNG");
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

test("SV Dashboard ships the complete local Home Assistant brand asset set", () => {
  assert.deepEqual(pngSize("../custom_components/sv_dashboard/brand/icon.png"), [256, 256]);
  assert.deepEqual(pngSize("../custom_components/sv_dashboard/brand/icon@2x.png"), [512, 512]);
  assert.deepEqual(pngSize("../custom_components/sv_dashboard/brand/logo.png"), [512, 192]);
  assert.deepEqual(pngSize("../custom_components/sv_dashboard/brand/logo@2x.png"), [1024, 384]);
  assert.deepEqual(pngSize("../docs/assets/sv-dashboard-master.png"), [1024, 1024]);
});

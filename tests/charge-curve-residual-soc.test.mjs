import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(
    new URL("../custom_components/sv_dashboard/static/charge-history-card.js", import.meta.url),
    "utf8",
);
const frontend = fs.readFileSync(
    new URL("../custom_components/sv_dashboard/static/frontend.js", import.meta.url),
    "utf8",
);
const start = source.indexOf("function storedPowerCurve(");
const end = source.indexOf("function deriveServerChargeDisplay(", start);
assert.ok(start >= 0 && end > start, "stored curve resolver must remain a standalone function");
const storedPowerCurve = vm.runInNewContext(source.slice(start, end) + "\nstoredPowerCurve;");

test("missing residual telemetry never moves an observed 63-67% charge to 0%", () => {
    const points = storedPowerCurve([
        {soc: 63, residual_kwh: null, capacity_kwh: 42.1, derived_power_kw: 5.3},
        {soc: 67, capacity_kwh: 42.1, derived_power_kw: 5.4},
    ]);
    assert.deepEqual(Array.from(points, point => point.soc), [63, 67]);
    assert.deepEqual(Array.from(points, point => point.power_kw), [5.3, 5.4]);
});

test("missing residual telemetry never moves a 61-71% charge to 0%", () => {
    const points = storedPowerCurve([
        {soc: 61, residual_kwh: "", capacity_kwh: 42.1, derived_power_kw: 8.8},
        {soc: 71, residual_kwh: undefined, capacity_kwh: 42.1, derived_power_kw: 8.7},
    ]);
    assert.deepEqual(Array.from(points, point => point.soc), [61, 71]);
});

test("reasonable fractional residual refines SOC without trusting a contradictory zero sentinel", () => {
    const points = storedPowerCurve([
        {soc: 63, residual_kwh: 26.7, capacity_kwh: 42.1, derived_power_kw: 5.0},
        {soc: 67, residual_kwh: 0, capacity_kwh: 42.1, derived_power_kw: 5.2},
    ]);
    assert.ok(Math.abs(points[0].soc - (26.7 / 42.1 * 100)) < 1e-8);
    assert.equal(points[1].soc, 67);
});

test("genuine zero SOC remains valid when samples progress", () => {
    const points = storedPowerCurve([
        {soc: 0, residual_kwh: 0, capacity_kwh: 42.1, derived_power_kw: 4.9},
        {soc: 1, residual_kwh: 0.421, capacity_kwh: 42.1, derived_power_kw: 5.0},
    ]);
    assert.deepEqual(Array.from(points, point => point.soc), [0, 1]);
});

test("null and missing SOC plus residual cannot synthesize a fake 0% curve", () => {
    const points = storedPowerCurve([
        {soc: null, residual_kwh: null, derived_power_kw: 5.0},
        {derived_power_kw: 5.3},
    ]);
    assert.equal(points.length, 0);
});

test("one unchanged SOC cannot be misrepresented as a vertical power-over-SOC curve", () => {
    const points = storedPowerCurve([
        {soc: 63, residual_kwh: null, derived_power_kw: 5.0},
        {soc: 63, residual_kwh: null, derived_power_kw: 5.8},
    ]);
    assert.equal(points.length, 0);
});

test("package entry cache-busts the corrected charge chart module", () => {
    assert.match(frontend, /charge-history-card\.js\?v=0\.6\.0-beta\.40-curve2/);
});

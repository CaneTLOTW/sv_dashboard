import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const constants = read("../custom_components/sv_dashboard/const.py");
const metrics = read("../custom_components/sv_dashboard/metrics.py");
const sensors = read("../custom_components/sv_dashboard/sensor.py");
const strategy = read("../custom_components/sv_dashboard/static/sv_dashboard.js");
const i18n = read("../custom_components/sv_dashboard/static/i18n.js");

test("canonical reserve and fuel rolling metrics are package-owned", () => {
  for (const key of [
    "remaining_battery_energy_kwh",
    "remaining_fuel_liters",
    "trailing_fuel_consumption_500km",
  ]) {
    assert.match(constants, new RegExp(key));
    assert.match(sensors, new RegExp(key));
  }
  assert.match(metrics, /derive_remaining_battery_energy/);
  assert.match(metrics, /derive_remaining_fuel_liters/);
  assert.match(metrics, /derive_trailing_fuel_consumption/);
  assert.match(metrics, /CONF_TANK_CAPACITY_L/);
});

test("remaining energy and fuel provenance is exposed by dedicated sensors", () => {
  assert.match(sensors, /class SvRemainingBatteryEnergySensor/);
  assert.match(sensors, /SensorDeviceClass\.ENERGY/);
  assert.match(sensors, /class SvRemainingFuelLitersSensor/);
  assert.match(sensors, /SensorDeviceClass\.VOLUME/);
  assert.match(sensors, /class SvTrailingFuelConsumptionSensor/);
  assert.match(sensors, /UnitOfVolume\.LITERS/);
  assert.match(sensors, /if fuel:/);
});

test("generated dashboard adds a compact two-column dual-energy reserves block without model checks", () => {
  assert.match(strategy, /supportsDualEnergy && \(remainingBatteryEnergy \|\| remainingFuelLiters \|\| trailingElectricConsumption \|\| trailingFuelConsumption\)/);
  assert.match(strategy, /separator\(strings\.consumptionReserves, "mdi:gauge"\)/);
  assert.match(strategy, /bubble\("remaining_battery_energy_kwh", strings\.remainingBatteryEnergy[\s\S]*\[\], 6, remainingBatteryEnergy\)/);
  assert.match(strategy, /bubble\("trailing_consumption_500km", strings\.trailingElectricConsumption[\s\S]*\[\], 6, trailingElectricConsumption\)/);
  assert.match(strategy, /bubble\("remaining_fuel_liters", strings\.remainingFuel[\s\S]*\[\], 6, remainingFuelLiters\)/);
  assert.match(strategy, /bubble\("trailing_fuel_consumption_500km", strings\.trailingFuelConsumption[\s\S]*\[\], 6, trailingFuelConsumption\)/);
  assert.doesNotMatch(strategy, /reserveCard|metricSubState|reserveLayoutCard|reserve_layout/);
  assert.doesNotMatch(strategy, /strings\.last500km/);
  assert.doesNotMatch(strategy, /DS N°4|DS4|Citroën|ë-C3/);
});

test("dual-energy layout removes duplicate raw fuel and rolling electric cards", () => {
  assert.match(strategy, /supportsElectric && !supportsDualEnergy && trailingElectricConsumption/);
  assert.match(strategy, /supportsFuel && !supportsDualEnergy \? bubble\("fuel"/);
  assert.match(strategy, /supportsFuel && !supportsDualEnergy \? bubble\("fuel_autonomy"/);
  assert.match(strategy, /supportsFuel && !supportsDualEnergy \? bubble\("fuel_consumption_instant"/);
  assert.doesNotMatch(strategy, /current_trip_fuel/);
});

test("fuel rolling statistics use the package metric", () => {
  assert.match(strategy, /supportsFuel && trailingFuelConsumption \? \{ type: "statistics-graph"/);
  assert.match(strategy, /title: strings\.trailingFuelConsumption/);
});

test("all new generated-dashboard labels come from the shared i18n contract", () => {
  assert.match(i18n, /const CONSUMPTION_RESERVES_TEXT/);
  for (const key of [
    "consumptionReserves",
    "remainingBatteryEnergy",
    "trailingElectricConsumption",
    "remainingFuel",
    "trailingFuelConsumption",
  ]) {
    assert.match(i18n, new RegExp(key));
    assert.match(strategy, new RegExp(`strings\\.${key}`));
  }
});


test("German and English reserve labels stay compact enough for half-width cards", () => {
  assert.match(i18n, /remainingBatteryEnergy: "Batteriereserve"/);
  assert.match(i18n, /trailingElectricConsumption: "Ø Strom \(500 km\)"/);
  assert.match(i18n, /remainingFuel: "Tankinhalt"/);
  assert.match(i18n, /trailingFuelConsumption: "Ø Kraftstoff \(500 km\)"/);
  assert.match(i18n, /consumptionReserves: "Reserven & Verbrauch"/);
  assert.match(i18n, /remainingBatteryEnergy: "Battery reserve"/);
  assert.match(i18n, /trailingFuelConsumption: "Avg\. fuel \(500 km\)"/);
});

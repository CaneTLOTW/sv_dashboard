import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { FRONTEND_TEXT as CORE_FRONTEND_TEXT } from "../custom_components/sv_dashboard/static/i18n-core.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const history = read("../custom_components/sv_dashboard/server_history.py");
const sensor = read("../custom_components/sv_dashboard/sensor.py");
const trip = read("../custom_components/sv_dashboard/static/trip-history-card.js");
const chargeHistory = read("../custom_components/sv_dashboard/static/charge-history-card.js");
const fuelHistory = read("../custom_components/sv_dashboard/static/fuel-history-card.js");
const dualHero = read("../custom_components/sv_dashboard/static/dual-energy-overview-card.js");
const frontend = read("../custom_components/sv_dashboard/static/frontend.js");
const strategy = read("../custom_components/sv_dashboard/static/sv_dashboard.js");
const ds4Fixture = JSON.parse(read("./fixtures/ds4-hybrid-get-last-trip-2026-09-05.json"));
const languages = ["de", "en", "fr", "it", "es", "pt", "nl", "da", "nb", "sv", "fi", "pl", "cs", "sk", "hu", "ro", "sl", "hr"];

test("canonical trips preserve independent fuel telemetry", () => {
  assert.match(history, /_energy_entry\(raw\.get\("energyConsumptions"\), "Fuel"\)/);
  for (const key of ["fuel_level_start", "fuel_level_end", "fuel_range_start_km", "fuel_range_end_km", "fuel_consumption_l", "fuel_consumption_l_100km", "trip_type"]) {
    assert.match(history, new RegExp(`"${key}"`));
    assert.match(sensor, new RegExp(`"${key}"`));
  }
  assert.match(history, /raw_fuel_consumption \/ 100/);
  assert.match(history, /raw_fuel_average \/ 100/);
});

test("real DS4 Hybrid fixture covers electric SOC use and fuel-only telemetry without invented electric energy", () => {
  const trips = ds4Fixture?._embedded?.trips ?? [];
  assert.equal(trips.length, 2);
  const first = trips[0];
  const second = trips[1];
  assert.equal(first.startEnergies.find((entry) => entry.type === "Electric")?.level, 75);
  assert.equal(first.endEnergies.find((entry) => entry.type === "Electric")?.level, 71);
  assert.equal(second.startEnergies.find((entry) => entry.type === "Electric")?.level, 68);
  assert.equal(second.endEnergies.find((entry) => entry.type === "Electric")?.level, 68);
  assert.equal(second.energyConsumptions.find((entry) => entry.type === "Fuel")?.consumption, 25.616);
  assert.equal(second.energyConsumptions.find((entry) => entry.type === "Fuel")?.avgConsumption, 826.32263);
  assert.match(history, /end_soc >= start_soc/);
  assert.match(history, /not_reliable_short_or_no_soc_change/);
});

test("hybrid trip history keeps the main table compact and moves extra telemetry into details", () => {
  assert.match(trip, /const hybridLayout = Boolean\(this\._config\.hybrid_layout\)/);
  assert.match(trip, /const columnCount = hybridLayout \? 7/);
  assert.match(trip, /hybridLayout \? html`<th>\$\{text\.consumption\}<\/th><th>l\/100 km<\/th><th>\$\{dashboardText\.powertrain\}<\/th>`/);
  assert.match(trip, /trip\.attributes\?\.energy_kwh/);
  assert.match(trip, /dashboardText\.fuelRange/);
  assert.match(trip, /ev: "EV", hybrid: "Hybrid", ice: "ICE"/);
  assert.match(trip, /text\.startMileage/);
  assert.match(trip, /text\.endMileage/);
});

test("generated dashboard selects the Hero from vehicle capabilities", () => {
  assert.match(strategy, /const supportsDualEnergy = supportsElectric && supportsFuel/);
  assert.match(strategy, /supportsDualEnergy \? \{/);
  assert.match(strategy, /type: "custom:sv-dashboard-dual-energy-overview-card"/);
  assert.match(strategy, /type: "custom:sv-dashboard-vehicle-overview-card"/);
  assert.match(strategy, /hybrid_layout: supportsDualEnergy/);
});

test("dual-energy hero matches the approved two-row responsive layout", () => {
  assert.match(dualHero, /sv-dashboard-dual-energy-overview-card/);
  assert.match(dualHero, /grid-template-areas: "vehicle vehicle" "battery fuel"/);
  assert.match(dualHero, /container-type: inline-size/);
  assert.match(dualHero, /@container \(max-width: 760px\)/);
  assert.match(dualHero, /@container \(max-width: 430px\)/);
  assert.doesNotMatch(dualHero, /@media \(max-width:/);
  assert.match(dualHero, /getGridOptions\(\) \{ return \{ columns: 12, rows: 5, min_columns: 6, min_rows: 4 \}; \}/);
  assert.match(dualHero, /transform: translateX\(18px\) scale\(1\.8\)/);
  assert.match(dualHero, /class="top-control climate-control/);
  assert.doesNotMatch(dualHero, /<span>AC<\/span>/);
  assert.match(dualHero, /class="top-control temperature-badge"/);
  assert.match(dualHero, /mapped\.fuel_autonomy/);
  assert.match(dualHero, /class="energy fuel"/);
  assert.match(dualHero, /fuelPercent === null \? "unavailable"/);
  assert.doesNotMatch(dualHero, /Parkt|aktualisiert vor/);
});

test("dual-energy hero exposes native HA interactions without nested custom cards", () => {
  assert.match(dualHero, /const dashboardPath =/);
  assert.match(dualHero, /attributes\?\.dashboard_url_path/);
  assert.match(dualHero, /class="picture-button"/);
  assert.match(dualHero, /window\.history\.pushState/);
  assert.match(dualHero, /location-changed/);
  assert.match(dualHero, /class="metric-button level"/);
  assert.match(dualHero, /class="metric-button detail-value"/);
  assert.match(dualHero, /this\._showMore\(batteryDetailEntity\)/);
  assert.match(dualHero, /this\._showMore\(fuelDetailEntity\)/);
  assert.doesNotMatch(dualHero, /custom:button-card/);
});

test("dual-energy hero state machine uses trip kWh and charge kW without inventing EV efficiency", () => {
  assert.match(dualHero, /metricEntity\(this\._hass, attributes, "current_trip_energy"\)/);
  assert.match(dualHero, /metricEntity\(this\._hass, attributes, "current_charge_power"\)/);
  assert.doesNotMatch(dualHero, /current_trip_consumption/);
  assert.match(dualHero, /batteryDetailUnit = batteryDetailValue === "—" \? "" : " kWh"/);
  assert.match(dualHero, /batteryDetailUnit = batteryDetailValue === "—" \? "" : " kW"/);
  assert.match(dualHero, /battery\.charging \.fill-value/);
  assert.match(dualHero, /svHeroChargePulse/);
});

test("driving fuel consumption is only shown from a current-drive upstream update", () => {
  assert.match(dualHero, /mapped\.fuel_consumption_instant/);
  assert.match(dualHero, /updated < started/);
  assert.match(dualHero, /30 \* 60 \* 1000/);
  assert.match(dualHero, /fuelConsumptionEntity \? text\.fuelConsumption : text\.fuelRange/);
  assert.match(dualHero, /" l\/100 km"/);
});

test("Hero preconditioning is a guarded START action while STOP stays in full-dashboard Quick Actions", () => {
  assert.match(dualHero, /const CLIMATE_COMMAND_GUARD_MS = 90 \* 1000/);
  assert.match(dualHero, /_startClimate\(mapped\)/);
  assert.match(dualHero, /const start = mapped\.preconditioning_start/);
  assert.match(dualHero, /Date\.now\(\) < this\._climatePendingUntil/);
  assert.match(dualHero, /class="top-control climate-control \$\{climateActive \? "active" : ""\} \$\{climatePending \? "pending" : ""\}"/);
  assert.match(dualHero, /\?disabled=\$\{climateActive \|\| climatePending\}/);
  assert.doesNotMatch(dualHero, /mapped\.preconditioning_stop/);
  assert.match(strategy, /press\("preconditioning_start"/);
  assert.match(strategy, /press\("preconditioning_stop"/);
  assert.doesNotMatch(dualHero, /citroen|ec3|ds4/i);
});

test("charge history details expose canonical mileage and avoid duplicate unavailable placeholders", () => {
  assert.match(chargeHistory, /session\.start_mileage_km \?\? session\.parking_mileage_km/);
  assert.match(chargeHistory, /dashboardText\.mileage/);
  assert.match(chargeHistory, /text\.standstill/);
  assert.doesNotMatch(chargeHistory, /<strong>\$\{text\.chargingDuration\}:<\/strong> —/);
  assert.doesNotMatch(chargeHistory, /<strong>\$\{text\.type\}:<\/strong> —/);
});

test("fuel history does not invent refill liters", () => {
  assert.match(fuelHistory, /increase < minimum/);
  assert.match(fuelHistory, /fuel_refill_amount/);
  assert.doesNotMatch(fuelHistory, /fuel_consumption_total/);
  assert.match(fuelHistory, /event\.liters === null \? "—"/);
});

test("new card strings cover 18 languages", () => {
  for (const language of languages) {
    const text = CORE_FRONTEND_TEXT.dualEnergyOverview[language];
    assert.ok(text);
    for (const key of ["tripEnergy", "chargePower", "fuelConsumption"]) {
      assert.equal(typeof text[key], "string", `${language}.${key}`);
      assert.ok(text[key].length > 0, `${language}.${key}`);
    }
    assert.ok(CORE_FRONTEND_TEXT.fuelHistory[language]);
  }
});

test("frontend loads beta.12 changed cards and fuel history remains capability gated", () => {
  assert.match(frontend, /trip-history-card\.js\?v=0\.6\.0-beta\.12/);
  assert.match(frontend, /charge-history-card\.js\?v=0\.6\.0-beta\.12/);
  assert.match(frontend, /dual-energy-overview-card\.js\?v=0\.6\.0-beta\.12/);
  assert.match(frontend, /sv_dashboard\.js\?v=0\.6\.0-beta\.12/);
  assert.match(frontend, /fuel-history-card\.js\?v=0\.6\.0-beta\.10/);
  assert.match(strategy, /modules\.trips && supportsFuel \? \{ type: "custom:sv-dashboard-fuel-history-card"/);
});

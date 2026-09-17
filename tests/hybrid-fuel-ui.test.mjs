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
const fuelHistoryBackend = read("../custom_components/sv_dashboard/fuel_history.py");
const dualHero = read("../custom_components/sv_dashboard/static/dual-energy-overview-card.js");
const frontend = read("../custom_components/sv_dashboard/static/frontend.js");
const strategy = read("../custom_components/sv_dashboard/static/sv_dashboard.js");
const ds4Fixture = JSON.parse(read("./fixtures/ds4-hybrid-get-last-trip-2026-09-05.json"));
const languages = ["de", "en", "fr", "it", "es", "pt", "nl", "da", "nb", "sv", "fi", "pl", "cs", "sk", "hu", "ro", "sl", "hr"];

test("canonical trips preserve independent fuel telemetry", () => {
  assert.match(history, /_energy_entry\(raw\.get\("energyConsumptions"\), "Fuel"\)/);
  for (const key of ["electric_range_start_km", "electric_range_end_km", "fuel_level_start", "fuel_level_end", "fuel_range_start_km", "fuel_range_end_km", "fuel_consumption_l", "fuel_consumption_l_100km", "trip_type"]) {
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

test("hybrid trip history uses the compact six-column table and non-redundant paired details", () => {
  assert.match(trip, /const hybridLayout = Boolean\(this\._config\.hybrid_layout\)/);
  assert.match(trip, /const columnCount = hybridLayout \? 6/);
  assert.match(trip, /hybridLayout \? html`<th>\$\{text\.consumption\}<\/th><th>l\/100 km<\/th>`/);
  assert.doesNotMatch(trip, /dashboardText\.powertrain/);
  assert.doesNotMatch(trip, /trip\.attributes\?\.trip_type/);
  assert.match(trip, /<strong>\$\{dashboardText\.mileage\}:<\/strong> \$\{this\._formatMileage\(trip\.attributes\?\.start_mileage\)\} → \$\{this\._formatMileage\(this\._endMileage\(trip\)\)\}/);
  assert.match(trip, /<strong>\$\{text\.energy\}:<\/strong> \$\{this\._value\(trip\.attributes\?\.energy_kwh\)\} kWh<\/span>/);
  assert.match(trip, /<strong>\$\{dashboardText\.fuelConsumption\}:<\/strong> \$\{this\._value\(trip\.attributes\?\.fuel_consumption_l\)\} l<\/span>/);
  assert.doesNotMatch(trip, /energy_kwh\)\} kWh ·/);
  assert.doesNotMatch(trip, /fuel_consumption_l\)\} l ·/);
  assert.match(trip, /dualEnergyText\.electricRange/);
  assert.match(trip, /electric_range_start_km/);
  assert.match(trip, /electric_range_end_km/);
  assert.match(trip, /dashboardText\.fuelRange/);
});

test("generated dashboard selects the Hero from vehicle capabilities", () => {
  assert.match(strategy, /const supportsDualEnergy = supportsElectric && supportsFuel/);
  assert.match(strategy, /supportsDualEnergy \? \{/);
  assert.match(strategy, /type: "custom:sv-dashboard-dual-energy-overview-card"/);
  assert.match(strategy, /type: "custom:sv-dashboard-vehicle-overview-card"/);
  assert.match(strategy, /hybrid_layout: supportsDualEnergy/);
});

test("dual-energy hero uses one stacked information hierarchy at every width", () => {
  assert.match(dualHero, /sv-dashboard-dual-energy-overview-card/);
  assert.match(dualHero, /grid-template-columns: 1fr/);
  assert.match(dualHero, /grid-template-areas: "vehicle" "battery" "fuel"/);
  assert.match(dualHero, /container-type: inline-size/);
  assert.match(dualHero, /@container \(max-width: 760px\)/);
  assert.match(dualHero, /@container \(max-width: 430px\)/);
  assert.doesNotMatch(dualHero, /grid-template-areas: "vehicle vehicle" "battery fuel"/);
  assert.doesNotMatch(dualHero, /@media \(max-width:/);
  assert.match(dualHero, /getGridOptions\(\) \{ return \{ columns: 12, rows: 5, min_columns: 6, min_rows: 4 \}; \}/);
  assert.match(dualHero, /class="top-control climate-control/);
  assert.match(dualHero, /class="top-control temperature-badge \$\{temperatureFresh \? "fresh" : ""\}"/);
  assert.match(dualHero, /mapped\.fuel_autonomy/);
  assert.match(dualHero, /class="energy fuel"/);
  assert.match(dualHero, /fuelPercent === null \? "unavailable"/);
});

test("dual-energy hero keeps both ranges visible and only adds trustworthy secondary live values", () => {
  assert.match(dualHero, /<div class="detail-label">\$\{text\.electricRange\}<\/div>/);
  assert.match(dualHero, /this\._showMore\(mapped\.autonomy\)/);
  assert.match(dualHero, /<div class="detail-label">\$\{text\.fuelRange\}<\/div>/);
  assert.match(dualHero, /this\._showMore\(mapped\.fuel_autonomy\)/);
  assert.match(dualHero, /mode\.charging && chargePower !== "—"/);
  assert.match(dualHero, /fuelConsumptionEntity && fuelConsumption !== "—"/);
  assert.doesNotMatch(dualHero, /current_trip_energy/);
  assert.doesNotMatch(dualHero, /current_trip_consumption/);
});

test("driving fuel consumption is only shown from a current-drive upstream update", () => {
  assert.match(dualHero, /mapped\.fuel_consumption_instant/);
  assert.match(dualHero, /updated < started/);
  assert.match(dualHero, /30 \* 60 \* 1000/);
  assert.match(dualHero, /fuelConsumptionEntity && fuelConsumption !== "—"/);
  assert.match(dualHero, /l\/100 km/);
});

test("Hero preconditioning waits for confirmed state before allowing the opposite command", () => {
  assert.match(dualHero, /const CLIMATE_COMMAND_GUARD_MS = 90 \* 1000/);
  assert.match(dualHero, /_climatePendingAction/);
  assert.match(dualHero, /_sendClimate\(mapped\)/);
  assert.match(dualHero, /active \? mapped\.preconditioning_stop : mapped\.preconditioning_start/);
  assert.match(dualHero, /this\._climatePendingAction === "start" && active/);
  assert.match(dualHero, /this\._climatePendingAction === "stop" && !active/);
  assert.match(dualHero, /pending-start/);
  assert.match(dualHero, /pending-stop/);
  assert.match(dualHero, /var\(--error-color\)/);
  assert.match(dualHero, /\?disabled=\$\{climatePending \|\| !climateActionEntity\}/);
  assert.match(strategy, /press\("preconditioning_start"/);
  assert.match(strategy, /press\("preconditioning_stop"/);
  assert.doesNotMatch(dualHero, /citroen|ec3|ds4/i);
});

test("temperature badge indicates recent upstream vehicle payload without claiming connectivity", () => {
  assert.match(dualHero, /const FRESH_VEHICLE_DATA_MS = 15 \* 60 \* 1000/);
  assert.match(dualHero, /attributes\["Last updated"\]/);
  assert.match(dualHero, /attributes\.updatedAt/);
  assert.match(dualHero, /temperature-badge\.fresh/);
  assert.match(dualHero, /var\(--primary-color\)/);
  assert.doesNotMatch(dualHero, /dashboardText\.(connected|disconnected)|text\.(connected|disconnected)/i);
});

test("charging state does not redundantly append plugged-in status", () => {
  assert.match(dualHero, /if \(mode\.charging\) return \{ icon: "mdi:battery-charging", label: text\.charging \}/);
  assert.doesNotMatch(dualHero, /text\.charging\} · \$\{text\.plugged/);
});

test("dual-energy hero exposes native HA interactions without nested custom cards", () => {
  assert.match(dualHero, /const dashboardPath =/);
  assert.match(dualHero, /attributes\?\.dashboard_url_path/);
  assert.match(dualHero, /class="picture-button"/);
  assert.match(dualHero, /window\.history\.pushState/);
  assert.match(dualHero, /location-changed/);
  assert.match(dualHero, /class="metric-button level"/);
  assert.doesNotMatch(dualHero, /custom:button-card/);
});

test("charge history details expose canonical mileage and avoid duplicate unavailable placeholders", () => {
  assert.match(chargeHistory, /session\.start_mileage_km \?\? session\.parking_mileage_km/);
  assert.match(chargeHistory, /dashboardText\.mileage/);
  assert.match(chargeHistory, /text\.standstill/);
  assert.doesNotMatch(chargeHistory, /<strong>\$\{text\.chargingDuration\}:<\/strong> —/);
  assert.doesNotMatch(chargeHistory, /<strong>\$\{text\.type\}:<\/strong> —/);
});

test("fuel history renders canonical restart-safe backend events with explicit estimate provenance", () => {
  assert.match(fuelHistory, /callWS\(\{ type: `\$\{STATUS_DOMAIN\}\/fuel_history`/);
  assert.match(fuelHistory, /event\.liters_estimated \? "≈ " : ""/);
  assert.match(fuelHistory, /event\.odometer_km/);
  assert.doesNotMatch(fuelHistory, /history\/history_during_period/);
  assert.match(fuelHistoryBackend, /class FuelHistoryManager/);
  assert.match(fuelHistoryBackend, /"liters_source": liters_source/);
  assert.match(fuelHistoryBackend, /"odometer_km": round\(mileage/);
  assert.match(fuelHistoryBackend, /_same_refuel/);
  assert.match(fuelHistoryBackend, /"driving_time_seconds": round\(duration\)/);
  assert.match(fuelHistory, /summary\.driving_time_seconds/);
  assert.match(fuelHistory, /tripText\.duration/);
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

test("frontend cache-busts changed modules", () => {
  assert.match(frontend, /trip-history-card\.js\?v=0\.6\.0-beta\.13/);
  assert.match(frontend, /charge-history-card\.js\?v=/);
  assert.match(frontend, /dual-energy-overview-card\.js\?v=/);
  assert.match(frontend, /sv_dashboard\.js\?v=0\.6\.0-beta\.12/);
  assert.match(frontend, /fuel-history-card\.js\?v=0\.6\.0-beta\.10/);
  assert.match(strategy, /modules\.trips && supportsFuel \? \{ type: "custom:sv-dashboard-fuel-history-card"/);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL("../custom_components/sv_dashboard/static/vehicle-overview-card.js", import.meta.url),
  "utf8",
);

test("vehicle overview ports the existing button-card layout", () => {
  assert.match(source, /type: "vertical-stack"/);
  assert.match(source, /heading: config\.heading \|\| strings\.heading/);
  assert.match(source, /type: "custom:button-card"/);
  assert.match(source, /height: "270px"/);
  assert.match(source, /"background-position": "center 54%"/);
  assert.match(source, /top: "115px"/);
  assert.match(source, /width: "220px"/);
  assert.match(source, /kfzBatteryChargePulse/);
  assert.match(source, /kfzBatteryDrivePulse/);
});

test("range and right status use nested native button-card more-info pills", () => {
  assert.match(source, /range: \{\s*card: \{[\s\S]*type: "custom:button-card"/);
  assert.match(source, /entity: rangeEntity/);
  assert.match(source, /icon: "mdi:map-marker-distance"/);
  assert.match(source, /tap_action: \{ action: "more-info" \}/);
  assert.match(source, /right_status: \{\s*card: \{/);
  assert.match(source, /entity: rightStatusEntity/);
  assert.match(source, /const rightStatusEntity/);
  assert.match(source, /states\[.*rightStatusEntity/);
  assert.match(source, /states\[.*rangeEntity/);
  assert.match(source, /height: "26px"/);
  assert.match(source, /"min-height": "26px"/);
  assert.match(source, /padding: "0 9px"/);
});

test("hero creates a local stacking context without changing picture lifecycle", () => {
  assert.match(source, /isolation: "isolate"/);
  assert.match(source, /\{ "z-index": 0 \}/);
  assert.match(source, /vehiclePicture \? `url/);
});

test("vehicle overview resolves every household value through the config-entry mapping", () => {
  for (const key of [
    "battery",
    "battery_residual",
    "autonomy",
    "temperature",
    "battery_charging",
    "battery_charging_end",
    "battery_plugged",
    "engine",
    "preconditioning",
    "preconditioning_start",
    "preconditioning_stop",
  ]) {
    assert.match(source, new RegExp(`mapped\\.${key}`));
  }
  assert.match(source, /metricEntity\(hass, attributes, "current_charge_power"\)/);
  assert.match(source, /metricEntity\(hass, attributes, "current_trip_energy"\)/);
  assert.match(source, /metricEntity\(hass, attributes, "current_trip_consumption"\)/);
  assert.match(source, /metricEntity\(hass, attributes, "vehicle_info"\)/);
  assert.match(source, /attributes\.vehicle_tracker/);
  assert.match(source, /attributes\.vehicle_slug/);
});

test("battery bar keeps EV energy semantics without injecting fuel into the EV branch", () => {
  assert.match(source, /const batteryResidual = mapped\.battery_residual/);
  assert.match(source, /if \(isCharging\)[\s\S]*literal\(strings\.charging\)/);
  assert.match(source, /if \(isDriving\)[\s\S]*literal\(strings\.driving\)/);
  assert.match(source, /const residual = states\[/);
  assert.match(source, /literal\(strings\.battery\)/);
  assert.match(source, /const energy = states\[\$\{literal\(tripEnergy\)\}\]/);
  assert.match(source, /Number\(energy\.state\).*\+ ' kWh'/);
  assert.match(source, /const consumption = states\[\$\{literal\(tripConsumption\)\}\]/);
  assert.match(source, /kWh\/100 km/);
  assert.match(source, /if \(\$\{supportsElectric \? "true" : "false"\}\)[\s\S]*return \$\{literal\(strings\.driving\)\};[\s\S]*const fuelNow/);
  assert.match(source, /l\/100 km/);
  assert.match(source, /triggers_update: \[primaryLevel, battery, batteryResidual, fuel, fuelConsumptionEntity, charging, engine, chargePower, tripEnergy, tripConsumption\]/);
});

test("EV Hero preconditioning uses one-tap start/stop with a 90 second pending guard", () => {
  assert.match(source, /const CLIMATE_COMMAND_GUARD_MS = 90 \* 1000/);
  assert.match(source, /const isOn = \(value\) => \['on','true','inprogress','running'\]/);
  assert.match(source, /const latestAction = startAt > stopAt \? 'start' : stopAt > startAt \? 'stop' : null/);
  assert.match(source, /Date\.now\(\) - latestAt <= \$\{CLIMATE_COMMAND_GUARD_MS\}/);
  assert.match(source, /const pendingAction = pending \? latestAction : null/);
  assert.match(source, /return liveActive \? \$\{literal\(preconditioningStop\)\} : \$\{literal\(preconditioningStart\)\}/);
  assert.match(source, /"pointer-events": climateRuntimeTemplate\("return pending \? 'none' : 'auto';"\)/);
  assert.match(source, /pendingAction === 'stop'/);
  assert.match(source, /pendingAction === 'start'/);
  assert.match(source, /perform_action: "button\.press"/);
  assert.match(source, /hold_action: \{ action: "none" \}/);
  assert.match(source, /kfzClimatePending/);
  assert.match(source, /triggers_update: \[preconditioning, preconditioningStart, preconditioningStop, temperature\]/);
});

test("vehicle overview contains no legacy household route, VIN or fixed vehicle entity", () => {
  assert.doesNotMatch(source, /dashboard-kfz\/ec3/);
  assert.doesNotMatch(source, /VR7CBZYA7TZ814720/i);
  assert.doesNotMatch(source, /AC-ACNT200015617082/i);
  assert.doesNotMatch(source, /sensor\.vr7/i);
  assert.doesNotMatch(source, /binary_sensor\.vr7/i);
  assert.doesNotMatch(source, /button\.vr7/i);
  assert.match(source, /attributes\?\.dashboard_url_path/);
  assert.match(source, /`\/\$\{path\}\/vehicle`/);
  assert.doesNotMatch(source, /`\/sv-\$\{/);
});

test("late tracker picture rebuilds the wrapper instead of freezing the URL", () => {
  assert.match(source, /attributes\?\.entity_picture/);
  assert.match(source, /picture \|\| ""/);
  assert.match(source, /nextSignature !== this\._signature/);
  assert.match(source, /this\._rebuild\(\)/);
});

test("live variant reuses the same hero while removing heading and self-navigation", () => {
  assert.match(source, /const liveVariant = config\.variant === "live"/);
  assert.match(source, /const showHeading = !liveVariant/);
  assert.match(source, /const navigationPath = liveVariant \? undefined/);
  assert.match(source, /if \(!showHeading\) return heroCard/);
  assert.match(source, /showInfo = liveVariant && Boolean\(vehicleInfo\)/);
  assert.match(source, /navigation_path: "#sv-vehicle-info"/);
});

test("single vehicle stays zero-config while multiple vehicles require an entry selection", () => {
  assert.match(source, /statusCandidates\(this\._hass, this\._config\.entry_id\)/);
  assert.match(source, /candidates\.length === 1 \? candidates\[0\] : undefined/);
  assert.match(source, /strings\.multipleVehicles/);
  assert.match(source, /strings\.configuredUnavailable/);
  assert.match(source, /strings\.noUniqueVehicle/);
});

test("card editor persists the selected config entry instead of a VIN", () => {
  assert.match(source, /static getConfigElement\(\)/);
  assert.match(source, /document\.createElement\(EDITOR_TAG\)/);
  assert.match(source, /next\.entry_id = entryId/);
  assert.match(source, /delete next\.entry_id/);
  assert.match(source, /config-changed/);
  assert.match(source, /strings\.selectVehicle/);
  assert.doesNotMatch(source, /config\.vin/i);
});


test("vehicle overview localizes runtime and editor text through the shared catalog", () => {
  assert.match(source, /import \{ languageFor, textFor \} from "\.\/i18n\.js\?v=0\.6\.0-beta\.28"/);
  assert.match(source, /textFor\(hass, "vehicleOverview"\)/);
  assert.match(source, /languageFor\(this\._hass\)/);
  assert.match(source, /registrationStrings\.cardName/);
  assert.doesNotMatch(source, /Wird geladen|In Fahrt|mehrere Fahrzeuge gefunden|Fahrzeug auswählen/);
});

test("EV Hero current charge power never treats upstream km/h chargingRate as kW", () => {
  assert.match(source, /const chargePower = metricEntity\(hass, attributes, "current_charge_power"\);/);
  assert.doesNotMatch(source, /current_charge_power"\) \|\| mapped\.battery_charging_rate/);
});

test("EV Hero freshness badge remains a recent-source cue", () => {
  assert.match(source, /FRESH_VEHICLE_DATA_MS = 15 \* 60 \* 1000/);
  assert.match(source, /color-mix\(in srgb, var\(--primary-color\) 14%/);
  assert.match(source, /color-mix\(in srgb, var\(--primary-color\) 45%/);
});

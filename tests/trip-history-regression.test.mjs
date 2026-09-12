import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const trip = read("../custom_components/sv_dashboard/static/trip-history-card.js");
const history = read("../custom_components/sv_dashboard/server_history.py");

test("single-energy trip history omits redundant powertrain column", () => {
  assert.match(trip, /const showTripType = hybridLayout/);
  assert.match(trip, /const columnCount = hybridLayout \? 7 : 4 \+ \(hasEnergy \? 2 : 0\) \+ \(hasFuel \? 1 : 0\) \+ \(hasMaxSpeed \? 1 : 0\)/);
  assert.doesNotMatch(trip, /hasTripType/);
});

test("dual-energy trip history keeps per-trip powertrain classification", () => {
  assert.match(trip, /hybridLayout \? html`<th>\$\{text\.consumption\}<\/th><th>l\/100 km<\/th><th>\$\{dashboardText\.powertrain\}<\/th>`/);
  assert.match(trip, /ev: "EV", hybrid: "Hybrid", ice: "ICE"/);
});

test("canonical server trips recover only missing positive local electric energy", () => {
  assert.match(history, /def enrich_trips_with_local_energy\(/);
  assert.match(history, /if _number\(trip\.get\("energy_kwh"\)\) is not None:/);
  assert.match(history, /local_energy <= 0/);
  assert.match(history, /mileage_delta > 0\.25/);
  assert.match(history, /distance_delta > 2\.0/);
  assert.match(history, /"energy_source"\] = "sv_local_trip_soc_delta"/);
  assert.match(history, /trips = enrich_trips_with_local_energy\(trips, local_trips\)/);
});

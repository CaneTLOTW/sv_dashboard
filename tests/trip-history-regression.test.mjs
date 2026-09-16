import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const trip = read("../custom_components/sv_dashboard/static/trip-history-card.js");
const history = read("../custom_components/sv_dashboard/server_history.py");
const repair = read("../custom_components/sv_dashboard/trip_repair.py");

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
  assert.match(repair, /local_trips\[:\] = local_rows/);
  assert.match(repair, /local_speed_outlier/);
});

test("trip history inserts provenance-only odometer gaps and uses semantic trip time", () => {
  assert.match(trip, /insertOdometerGapRows\(serverTrips\)/);
  assert.match(trip, /tripFilterTime\(trip\)/);
  assert.match(trip, /semanticTripTime\(trip\)/);
  assert.match(trip, /text\.reconstructedGap/);
  assert.doesNotMatch(trip, /_formatDate\(trip\.last_updated \?\? trip\.last_changed\)/);
});

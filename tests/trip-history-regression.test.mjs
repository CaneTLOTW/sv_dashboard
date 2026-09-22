import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const trip = read("../custom_components/sv_dashboard/static/trip-history-card.js");
const history = read("../custom_components/sv_dashboard/server_history.py");
const repair = read("../custom_components/sv_dashboard/trip_repair.py");

test("single-energy trip history omits redundant powertrain column", () => {
  assert.match(trip, /const columnCount = hybridLayout \? 6 : 4 \+ \(hasEnergy \? 2 : 0\) \+ \(hasFuel \? 1 : 0\) \+ \(hasMaxSpeed \? 1 : 0\)/);
  assert.doesNotMatch(trip, /hasTripType|showTripType/);
});

test("dual-energy trip history keeps the compact six-column primary row", () => {
  assert.match(trip, /hybridLayout \? html`<th>\$\{text\.consumption\}<\/th><th>l\/100 km<\/th>`/);
  assert.doesNotMatch(trip, /dashboardText\.powertrain/);
  assert.doesNotMatch(trip, /trip\.attributes\?\.trip_type/);
});

test("canonical server trips recover only missing positive local electric energy", () => {
  assert.match(history, /def enrich_trips_with_local_energy\(/);
  assert.match(history, /if _number\(trip\.get\("energy_kwh"\)\) is not None:/);
  assert.match(history, /server_soc_end >= server_soc_start/);
  assert.match(history, /Local enrichment remains allowed when the server SOC boundary is/);
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


test("canonical trip does not show positive local electric energy against unchanged server SOC", () => {
  const enrichmentStart = history.indexOf("def enrich_trips_with_local_energy");
  const enrichmentEnd = history.indexOf("class ServerHistoryManager", enrichmentStart);
  const enrichment = history.slice(enrichmentStart, enrichmentEnd);
  assert.match(enrichment, /server_soc_start = _number\(trip\.get\("soc_start"\)\)/);
  assert.match(enrichment, /server_soc_end = _number\(trip\.get\("soc_end"\)\)/);
  assert.match(enrichment, /server_soc_end >= server_soc_start[\s\S]{0,100}continue/);
  assert.ok(
    enrichment.indexOf("server_soc_end >= server_soc_start")
      < enrichment.indexOf('trip["energy_kwh"] = round(local_energy, 3)'),
    "server SOC conflict gate must run before local energy injection",
  );
});

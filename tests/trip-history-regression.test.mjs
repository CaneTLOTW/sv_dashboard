import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const trip = read("../custom_components/sv_dashboard/static/trip-history-card.js");
const history = read("../custom_components/sv_dashboard/server_history.py");
const repair = read("../custom_components/sv_dashboard/trip_repair.py");
const resolver = read("../custom_components/sv_dashboard/trip_field_resolution.py");

test("single-energy trip history omits redundant powertrain column", () => {
  assert.match(trip, /const columnCount = hybridLayout \? 6 : 4 \+ \(hasEnergy \? 2 : 0\) \+ \(hasFuel \? 1 : 0\) \+ \(hasMaxSpeed \? 1 : 0\)/);
  assert.doesNotMatch(trip, /hasTripType|showTripType/);
});

test("dual-energy trip history keeps the compact six-column primary row", () => {
  assert.match(trip, /hybridLayout \? html`<th>\$\{text\.consumption\}<\/th><th>l\/100 km<\/th>`/);
  assert.doesNotMatch(trip, /dashboardText\.powertrain/);
  assert.doesNotMatch(trip, /trip\.attributes\?\.trip_type/);
});

test("canonical rebuild resolves trip telemetry per field after physical matching", () => {
  assert.match(history, /resolve_canonical_trip_fields\(trips, local_trips\)/);
  assert.match(resolver, /def resolve_trip_fields\(/);
  assert.match(resolver, /def _matched_local_trips\(/);
  assert.match(resolver, /time_mileage_distance_duration/);
  assert.match(resolver, /field_sources/);
  assert.match(resolver, /field_conflicts/);
  assert.doesNotMatch(history, /def enrich_trips_with_local_energy\(/);
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


test("trip popup consumes canonical row fields and never reads raw server telemetry", () => {
  assert.match(trip, /trip\.attributes\?\.soc_start/);
  assert.match(trip, /trip\.attributes\?\.electric_range_start_km/);
  assert.match(trip, /trip\.attributes\?\.fuel_consumption_l/);
  assert.doesNotMatch(trip, /raw_server|startEnergies|energyConsumptions/);
  assert.match(history, /resolve_canonical_trip_fields\(trips, local_trips\)/);
});

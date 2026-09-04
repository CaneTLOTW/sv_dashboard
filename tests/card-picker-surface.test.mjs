import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../custom_components/sv_dashboard/", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

const frontend = read("static/frontend.js");
const trip = read("static/trip-history-card.js");
const charge = read("static/charge-history-card.js");
const gps = read("static/gps-history-card.js");

const internalTypes = [
  "sv-dashboard-trip-history-card",
  "sv-dashboard-charge-history-card",
  "sv-dashboard-charge-curve-card",
  "sv-dashboard-charge-curve-browser-card",
  "sv-dashboard-gps-date-card",
  "sv-dashboard-gps-map-card",
];

const publicTypes = [
  "sv-dashboard-vehicle-overview-card",
  "sv-dashboard-dual-energy-overview-card",
  "sv-dashboard-fuel-history-card",
];

test("internal dashboard components are removed from Home Assistant's Add-card picker", () => {
  assert.match(frontend, /const INTERNAL_CARD_TYPES = new Set\(\[/);
  assert.match(frontend, /window\.customCards = \(window\.customCards \|\| \[\]\)\.filter/);
  assert.match(frontend, /!INTERNAL_CARD_TYPES\.has\(card\?\.type\)/);
  for (const type of internalTypes) {
    assert.ok(frontend.includes(`\"${type}\"`), `${type} missing from picker deny-list`);
  }
  for (const type of publicTypes) {
    assert.ok(!frontend.includes(`\"${type}\"`), `${type} must remain public`);
  }
});

test("internal elements remain registered for generated dashboard use", () => {
  assert.match(trip, /customElements\.define\("sv-dashboard-trip-history-card"/);
  assert.match(charge, /customElements\.define\("sv-dashboard-charge-history-card"/);
  assert.match(charge, /customElements\.define\("sv-dashboard-charge-curve-card"/);
  assert.match(charge, /customElements\.define\("sv-dashboard-charge-curve-browser-card"/);
  assert.match(gps, /customElements\.define\(DATE_CARD_TAG/);
  assert.match(gps, /customElements\.define\(MAP_CARD_TAG/);
});

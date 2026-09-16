import assert from "node:assert/strict";
import test from "node:test";
import {
  insertOdometerGapRows,
  semanticTripTime,
  tripFilterTime,
} from "../custom_components/sv_dashboard/static/trip-gap-core.js";

test("reconstructs only the proven odometer distance between adjacent canonical trips", () => {
  const rows = insertOdometerGapRows([
    {
      id: "before",
      server_id: "before",
      start_time: "2026-09-14T18:00:00Z",
      end_time: "2026-09-14T18:20:00Z",
      start_mileage: 1832,
      distance_km: 19,
      valid_for_statistics: true,
    },
    {
      id: "after",
      server_id: "after",
      start_time: "2026-09-15T10:33:10Z",
      end_time: "2026-09-15T10:38:40Z",
      start_mileage: 1872,
      distance_km: 4,
      valid_for_statistics: true,
    },
  ]);

  assert.equal(rows.length, 3);
  const gap = rows[1];
  assert.equal(gap.reconstructed_gap, true);
  assert.equal(gap.source, "reconstructed_odometer_gap");
  assert.equal(gap.distance_km, 21);
  assert.equal(gap.start_mileage, 1851);
  assert.equal(gap.end_mileage, 1872);
  assert.equal(gap.start_time, null);
  assert.equal(gap.end_time, null);
  assert.equal(gap.duration_seconds, null);
  assert.equal(gap.energy_kwh, null);
  assert.equal(gap.valid_for_statistics, false);
  assert.deepEqual(gap.quality_flags, ["reconstructed_odometer_gap"]);
  assert.equal(gap.gap_after_time, "2026-09-14T18:20:00Z");
  assert.equal(gap.gap_before_time, "2026-09-15T10:33:10Z");
});

test("does not create a row for odometer rounding noise or invalid anchors", () => {
  const noise = insertOdometerGapRows([
    { id: "a", start_mileage: 1000, distance_km: 10, valid_for_statistics: true },
    { id: "b", start_mileage: 1010.6, distance_km: 5, valid_for_statistics: true },
  ]);
  assert.equal(noise.length, 2);

  const invalid = insertOdometerGapRows([
    { id: "a", start_mileage: 1000, distance_km: 10, valid_for_statistics: false },
    { id: "b", start_mileage: 1040, distance_km: 5, valid_for_statistics: true },
  ]);
  assert.equal(invalid.length, 2);
});

test("semantic trip time prefers trip timestamps over HA state publication time", () => {
  const trip = {
    last_updated: "2026-09-14T15:03:00Z",
    attributes: {
      start_time: "2026-09-14T08:00:00Z",
      end_time: "2026-09-14T08:25:00Z",
    },
  };
  assert.equal(semanticTripTime(trip), "2026-09-14T08:25:00Z");
});

test("gap filtering uses an adjacent real-trip boundary without inventing an event timestamp", () => {
  const gap = {
    reconstructed_gap: true,
    start_time: null,
    end_time: null,
    gap_after_time: "2026-09-14T18:20:00Z",
    gap_before_time: "2026-09-15T10:33:10Z",
  };
  assert.equal(tripFilterTime(gap), "2026-09-15T10:33:10Z");
  assert.equal(semanticTripTime(gap), null);
});

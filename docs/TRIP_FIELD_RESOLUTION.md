# Canonical trip field resolution

Completed Stellantis trip rows remain the source of trip identity, time and
distance. Telemetry boundaries are resolved independently after matching at
most one local trip to each server trip. A match requires physically valid
local evidence, start and end within 5 minutes, start mileage within 0.5 km,
distance within the greater of 0.5 km or 15%, and duration within the greater
of 120 seconds or 20%. When both end mileages exist they must also be within
1 km. Near-equal competing local matches are treated as ambiguous and not
used.

For SOC, electric autonomy, fuel level and fuel autonomy, a direct server
value remains preferred when it agrees with local evidence. Missing values
can be filled from a matched local boundary. A conflicting non-null server
pair is replaced only when fresh matched local start/end evidence proves a
material change that the server pair contradicts. Otherwise the server value
is retained and the conflict is recorded as ambiguous; equality by itself is
never evidence of an error.

Canonical trip rows expose:

- `field_sources`: the source selected for each resolved field;
- `field_conflicts`: server/local values and the resolution when they disagree;
- `local_evidence_match`: whether strong matching succeeded and the observed
  start/end time deltas;
- `energy_estimated` and `energy_source`: whether electric kWh are measured or
  derived;
- `raw_server`: the unmodified server payload for audit.

The telemetry source timestamp must be within 2 minutes of the trip edge to
prove an exact local boundary change. A sample no older than 10 minutes may
still fill a missing server field, but is explicitly labeled
`sv_local_trip_boundary_fallback`; it cannot override a conflicting server
value or support residual/SOC/fuel-total delta calculations. Older or
observations timestamped only as receipt time are not treated as exact, and
older or untimestamped new observations are ignored. Earlier Store rows that already
persisted values directly at the trip transition remain compatible as legacy
transition evidence.

Electric energy priority is direct Stellantis trip energy (including a real
zero), then a positive mapped residual-energy boundary decrease, then a
resolved SOC decrease multiplied by a positive capacity. The SOC/capacity path
requires a trip longer than 1 km. Derived kWh and consumption remain marked as
estimated. Existing strict dual-energy rolling-consumption logic continues to
exclude estimated trip energy.

Fuel consumption uses direct server litres when present, including zero. If
missing, a matched, monotonic cumulative fuel-total delta may fill it only
when non-negative, distance is positive, and the delta is no more than
0.5 l/km. Coarse fuel-level changes are not converted to litres. Fuel range
and level are independently resolved from electric fields.

At trip transitions, local metric storage captures mapped SOC, electric
autonomy, fuel level/range, cumulative fuel consumption, residual battery
energy and capacity where available. Each numeric telemetry observation keeps
its source timestamp, timestamp source, Home Assistant update time and local
capture time. The existing Store format remains backward-compatible: older
rows without these additions remain readable, legacy transition-captured
SOC/fuel fields remain usable, and missing historical electric autonomy or
residual-energy values are not fabricated.

This does not alter #79's bounded reconciliation schedule. A missing upstream
trip row remains a publication-delay case; retries do not repair stale or
duplicated telemetry in a row that has already been published. No vehicle
commands or direct Stellantis network calls are part of resolution.

The sanitized regression fixture and resolver tests are in
`tests/fixtures/trip-field-resolution.json` and
`tests/trip_field_resolution_test.py`; the real-vehicle evidence is tracked in
[#118](https://github.com/CaneTLOTW/sv_dashboard/issues/118).

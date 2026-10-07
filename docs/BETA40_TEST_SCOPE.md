# beta.40 owner + DS N°4 acceptance scope

This document defines the focused runtime acceptance scope for the exact
`0.6.0-beta.40` candidate after source/CI validation.

> **Status — 2026-10-07:** owner backend/runtime, browser UI and natural trip/charge use are accepted. The immutable GitHub/HACS prerelease `v0.6.0-beta.40` is published from product SHA `8926df0b439989a99d29e60c71d75c0f7590478a`, and the accepted repository state has been fast-forwarded to `main`. External DS N°4 beta.40 confirmation remains pending. The acceptance criteria below are retained as the tester/runbook contract, not as a statement that publication is still pending.

The candidate must be an immutable exact `develop` SHA. Runtime acceptance
must record that SHA and version. Do not test against a moving branch checkout.

## 1. Owner runtime gate

Deploy the exact beta.40 candidate to the designated owner Home Assistant
instance before publishing the external prerelease.

Verify after the required restart/reload:

- manifest/package version is `0.6.0-beta.40`;
- Home Assistant has exactly one package-owned Lovelace resource for SV
  Dashboard and its resource version is beta.40 (or the owner-harness
  beta.40-derived local cache version when that harness is explicitly
  installed);
- the generated dashboard Strategy loads without setup/bootstrap exceptions;
- the normal naked vehicle dashboard URL does **not** show the owner test-mode
  selector;
- `?sv_owner_harness=1` explicitly shows the selector while retaining real
  vehicle data;
- a valid `sv_owner_fixture` profile explicitly enables the fixture context;
- System → Vehicle diagnostics opens, uses the existing bounded Recorder
  windows and can copy its privacy-safe summary;
- existing Trip and Charge History stores load without state-length/setup
  errors.

### Owner Trip History checks

Using already-recorded owner history where possible:

- a server trip with a known boundary is not overwritten merely by an HA
  timestamp or untimestamped legacy boundary;
- fallback local values may fill a missing server field but retain fallback
  provenance;
- no new duplicate physical trips appear after canonical rebuild.

Do not manufacture driving events to satisfy this check.

### Owner charging checks

For an existing or naturally occurring charging session:

- changing SOC/residual observations remain multiple session samples even if
  the Stellantis source timestamp is unchanged;
- the package-owned current charge power is shown only when a defensible recent
  delta exists;
- current-power provenance exposes source measurement time and observation time
  separately;
- a completed physical session appears only once;
- surviving Recorder/curve evidence can enrich a sparse completed summary
  instead of being erased by it;
- transient `No`/Unknown charge type does not remain final if later same-session
  AC/DC evidence is known;
- a retrospective average value is not presented as instantaneous current
  power;
- estimated maximum power is omitted if it would be lower than the same
  session average;
- a completed session with at least two useful points keeps one charge curve.

For charge-start notifications:

- an upstream charging-end ETA is described as upstream/Stellantis ETA
  evidence, not as SOC-derived;
- a locally calculated ETA is described as an observed-power estimate;
- the no-ETA path remains valid;
- `No` is not rendered as the user-facing charge type.

For charging wake-up:

- recent HA-observed charging telemetry suppresses a redundant scheduled
  five-minute wake-up;
- when relevant telemetry is actually stale, the existing charging wake-up
  recovery remains available;
- do not send extra wake-up commands solely to manufacture acceptance evidence.

## 2. External DS N°4 gate

Publication is complete: the exact owner-validated product SHA is available as the immutable GitHub/HACS
prerelease `v0.6.0-beta.40`.

The external tester should update directly from beta.36 to beta.40, restart
Home Assistant and confirm the displayed package version before testing.

### Trip History

Use one natural completed trip.

Expected:

- automatic bounded reconciliation completes without manual Sync;
- one physical trip remains one row;
- SOC and electric-range start/end are no longer forced to duplicated final
  values when strong matched upstream-boundary evidence proves the real change;
- fuel level/range/consumption remain independently resolved;
- a fallback/ambiguous field does not overwrite a known server field merely
  because it has an HA update timestamp.

### Charge History

Use one natural completed charge and do not press manual history Sync during
the observation.

Expected:

- exactly one row for one physical charging interval;
- the known DS N°4 pattern with an intermediate end around 96% followed by
  later REST `Finished` around 99% does not produce two rows;
- start/end SOC are plausible and provenance-resolved;
- known kWh, average power and AC/DC type survive canonical merge;
- no estimated maximum power lower than the average is displayed;
- one physical session keeps one curve;
- the previous oversized `last_charge_result` state error does not return.

### Presentation

Perform a quick French wording/layout check on:

- Trip History table and expanded details;
- Charge History row/detail;
- charge-start notification wording if naturally observed.

Report slow dashboard load/refresh separately if still reproducible; do not
mix it into Trip/Charge data correctness unless evidence shows the same cause.

## 3. Non-goals for beta.40 acceptance

Do not block beta.40 on unrelated backlog features:

- advanced notification-routing matrix / semantic EventEntity;
- consumption matrix by temperature/speed;
- DC charging curve comparison;
- wallbox/grid-energy or charging-cost integration.

Do not infer wallbox/grid energy from battery-side SOC estimates. They are
different measurement points.

## 4. Pass/fail rule

PASS requires the exact candidate SHA to pass repository CI and owner runtime
acceptance. External DS N°4 acceptance then validates the published prerelease
for the tester vehicle.

Any source defect found during deployment is returned to ChatGPT/source
development. The deployment executor must not patch source at runtime.

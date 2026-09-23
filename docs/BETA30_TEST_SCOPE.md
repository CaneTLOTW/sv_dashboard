# beta.30 owner/runtime test scope

`0.6.0-beta.30` is the next owner validation candidate after beta.29. It combines the accepted native upstream trip-history transport work with the EV-Hero freshness parity correction.

The owner-only PHEV fixture is development infrastructure and must remain outside the production runtime package.

## Candidate contents

- prefer Stellantis Vehicles 2026.9.4+ public `get_vehicle_trips(...)` transport with the legacy private adapter retained as compatibility fallback;
- preserve the beta.29 automatic Trip/Charge History reconciliation behavior;
- make the compact/EV Hero use the same 15-minute source-freshness semantics as the Dual-Energy Hero;
- cache-bust the changed compact/EV Hero module;
- keep the local PHEV Hero harness under `dev/owner_test_harness/`, never imported by production `frontend.js` or `sv_dashboard.js`.

## Owner runtime checks

### Normal package

1. Install the exact beta.30 candidate without the harness first.
2. Restart Home Assistant and hard-refresh the frontend.
3. Confirm System/package version reports `0.6.0-beta.30`.
4. Confirm the normal ë-C3 generated Vehicle view still uses the compact/EV Hero.
5. With a source temperature update not older than 15 minutes, confirm the thermometer **and the temperature badge treatment** are highlighted.
6. Once the source timestamp is older than 15 minutes, confirm the badge returns to the neutral state.
7. Confirm the highlight is not treated as a generic online/connectivity indicator.
8. Confirm Trip History still initializes/synchronizes successfully with Stellantis Vehicles 2026.9.4+.

### Owner-only PHEV Hero harness

Only after the normal package smoke passes, run the documented local installer in `dev/owner_test_harness/README.md` against the installed static directory. Then perform a **full Home Assistant restart** so the newly copied owner-only JavaScript file receives a registered static route, and hard-refresh the browser.

Test these URLs:

- `/citroen-dashboard/vehicle?sv_owner_fixture=phev`
- `/citroen-dashboard/vehicle?sv_owner_fixture=phev-idle`
- `/citroen-dashboard/vehicle?sv_owner_fixture=phev-driving`
- `/citroen-dashboard/vehicle?sv_owner_fixture=phev-charging`
- `/citroen-dashboard/vehicle?sv_owner_fixture=phev-stale`

Expected behavior:

- `phev`: real ë-C3 EV-side values remain live; only fuel level/range/consumption capability is synthetic;
- `phev-idle`: deterministic engine/charging/plugged OFF;
- `phev-driving`: engine ON, charging/plugged OFF and 5.4 l/100 km synthetic fuel consumption;
- `phev-charging`: engine OFF and plugged/charging ON;
- `phev-stale`: deterministic idle plus one-hour-old source timestamps so the temperature freshness cue is neutral.

The fixture is intentionally scoped to the real production **Dual-Energy Hero**. Other generated dashboard sections remain the normal owner EV dashboard and are not evidence for a synthetic full-PHEV backend.

## Regression / safety gates

- repository validation workflow green;
- production `frontend.js` contains no owner-harness import or `sv_owner_fixture` handling;
- production `sv_dashboard.js` contains no owner-harness import or `sv_owner_fixture` handling;
- manifest and top-level frontend resource generation both report beta.30;
- changed `vehicle-overview-card.js` uses a beta.30 content key;
- unchanged strategy/i18n modules retain their existing content keys;
- no product-code changes are made by Codex during local installation.

## Promotion gate

Do **not** publish/tag `v0.6.0-beta.30` merely because CI is green. First complete the owner runtime smoke above. After that exact candidate passes, it may be frozen/published as the beta.30 prerelease.

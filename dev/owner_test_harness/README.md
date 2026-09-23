# Owner Test Harness

This directory is **development infrastructure**, not part of the HACS runtime
package. The production integration under `custom_components/sv_dashboard/`
does not import or reference this harness.

## Purpose

The harness lets the owner test the real Dual-Energy/PHEV Hero using the live
EV data of the installed vehicle plus synthetic fuel-side states. This keeps
vehicle picture, battery/SOC, electric range, temperature and climate controls
live while adding deterministic fuel/ICE data.

Synthetic defaults:

- fuel: 63 %
- fuel range: 410 km
- driving fuel consumption: 5.4 l/100 km

Profiles:

- `?sv_owner_fixture=phev` — live EV values + synthetic fuel side
- `?sv_owner_fixture=phev-idle` — deterministic idle
- `?sv_owner_fixture=phev-driving` — synthetic engine ON + 5.4 l/100 km
- `?sv_owner_fixture=phev-charging` — synthetic plugged/charging ON
- `?sv_owner_fixture=phev-stale` — synthetic source timestamps one hour old

Append the parameter to the normal generated vehicle view, for example:
`/citroen-dashboard/vehicle?sv_owner_fixture=phev-driving`.

## Local install contract

After Codex installs or updates the normal candidate into Home Assistant, run:

`python dev/owner_test_harness/install.py --target /config/custom_components/sv_dashboard/static`

Then restart/reload Home Assistant/frontend as required by the normal install
procedure and hard-refresh the browser.

The installer:

1. copies `owner-test-harness-card.js` into the local installed static folder;
2. locally imports it from `frontend.js`;
3. locally patches the generated dashboard Strategy so the query parameter uses
   the harness card;
4. leaves the repository's production `custom_components/` package untouched.

Re-run the installer after every normal SV Dashboard install/update because the
normal package intentionally overwrites the local overlay.

## Safety / release rule

Do not move the harness into `custom_components/sv_dashboard/`, do not add its
import to the committed production `frontend.js`, and do not add fixture
branches to the production dashboard Strategy. Releases must remain fixture-free.

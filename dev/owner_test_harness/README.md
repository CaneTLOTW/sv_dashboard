# Owner Test Harness

This directory is **development infrastructure**, not part of the HACS runtime
package. The production integration under `custom_components/sv_dashboard/`
does not import or reference this harness.

## Purpose

The harness lets the owner test the generated dashboard in a browser-local
Dual-Energy/PHEV context using the live EV data of the installed vehicle plus
synthetic fuel-side states. The fixture context is applied to the Hybrid-relevant
Vehicle, Charging, Statistics and Trips views while GPS, Wake-up, Notifications,
Help and System continue to use the real Home Assistant context.

Synthetic defaults:

- fuel: 63 %
- fuel range: 410 km
- driving fuel consumption: 5.4 l/100 km

After installation the generated LIVE view also shows a local-only **Owner-Testmodus**
selector. It changes the same URL parameter and reloads the view, so the URL
remains the single source of truth and profiles can still be bookmarked/shared
locally.

Selector choices:

- **Standard · echter Fahrzeug-Hero** — removes the fixture parameter completely
- **PHEV · Live EV + Fuel-Dummy** — `?sv_owner_fixture=phev`
- **PHEV · Freshness aktuell** — `?sv_owner_fixture=phev-fresh`
- **PHEV · Idle** — `?sv_owner_fixture=phev-idle`
- **PHEV · Fahrt** — `?sv_owner_fixture=phev-driving`
- **PHEV · Laden** — `?sv_owner_fixture=phev-charging`
- **PHEV · Stale/Freshness-Test** — `?sv_owner_fixture=phev-stale`

Profiles:

- `?sv_owner_fixture=phev` — live EV values + synthetic fuel side across the Hybrid visual views
- `?sv_owner_fixture=phev-fresh` — deterministic fresh temperature source timestamp
- `?sv_owner_fixture=phev-idle` — deterministic engine/charging/plugged OFF
- `?sv_owner_fixture=phev-driving` — engine ON, charging OFF + 5.4 l/100 km
- `?sv_owner_fixture=phev-charging` — engine OFF, plugged/charging ON
- `?sv_owner_fixture=phev-stale` — deterministic idle plus EV/fuel source timestamps one hour old

Append the parameter to the normal generated vehicle view, for example:
`/citroen-dashboard/vehicle?sv_owner_fixture=phev-driving`.

The local patch does **not** mutate real Home Assistant states. It supplies a
browser-local fixture context to Strategy generation and wraps rendered cards in
the Hybrid visual views so the same synthetic context reaches the real
production cards. Real Owner charging/history data is retained where the
fixture intentionally does not replace it.

## Local install contract

After Codex installs or updates the normal candidate into Home Assistant, run:

`python dev/owner_test_harness/install.py --target /config/custom_components/sv_dashboard/static`

Then perform a **full Home Assistant restart** and hard-refresh the browser.
The restart is always required for the owner harness because the installer gives
the top-level SV Dashboard Lovelace resource an owner-specific cache key. This
forces Home Assistant and the browser to load the patched `frontend.js` and
patched Strategy instead of reusing previously loaded product modules.

The installer:

1. copies `owner-test-harness-card.js` into the local installed static folder;
2. locally imports it from `frontend.js`;
3. gives the locally patched `sv_dashboard.js` a content-addressed owner-only
   import URL so an older cached Strategy cannot hide the selector;
4. locally resets and patches `const.py` so the package resource becomes
   `/sv_dashboard/frontend.js?v=<product>-owner-<hash>`, forcing the top-level
   frontend module itself to reload after a Harness update;
5. injects the Owner-Testmodus selector directly into the generated LIVE
   Strategy layout before the Hero, matching the proven beta.30/beta.31 path;
6. patches Strategy generation and rendered Hybrid visual cards with the
   browser-local PHEV context;
7. leaves the repository's committed production `custom_components/` package
   fixture-free. The installed Owner test runtime intentionally has local
   overlays in `frontend.js`, `sv_dashboard.js`, `const.py` and the
   additional Harness module.

Re-run the installer after every normal SV Dashboard install/update because the
normal package intentionally overwrites the local overlay.

## Safety / release rule

Do not move the harness into `custom_components/sv_dashboard/`, do not add its
import to the committed production `frontend.js`, and do not add fixture
branches to the production dashboard Strategy. Releases must remain fixture-free.


### Cache token contract

The owner cache token covers both `owner-test-harness-card.js` **and the
installer source**. Changing local patch behavior therefore changes the
top-level frontend and nested Strategy module URLs even when the Harness module
itself is unchanged.

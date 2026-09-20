# beta.26 DS N°4 external test scope

`v0.6.0-beta.26` is the next frozen external validation candidate for the real DS N°4 MY2026 PHEV / French runtime tracked in Issue #2.

It intentionally rolls the tester forward from beta.12 to the current accepted product line rather than asking for another full regression of every historical beta item.

## Why beta.26

Since beta.12, the product gained or hardened:

- automatic generated Dual-Energy LIVE Hero behavior and later Hero interaction/layout fixes;
- guarded START/STOP preconditioning lifecycle;
- compact Hybrid Trip History with richer grouped details;
- canonical Fuel History with restart-safe deduplication, semantic/source timestamps, odometer-at-refuel and guarded estimated added litres;
- charging-session reconstruction guards for isolated bad SOC samples such as `67 → 0 → 68`;
- Server Trip History lifecycle/retry hardening;
- package-owned Canonical mileage/LTS;
- privacy-safe Vehicle API Audit and raw-path alias reconciliation;
- notification/wake-up migration and notify-provider lifecycle resilience;
- a documented cross-vehicle capability/behavior matrix proving that field presence alone is not sufficient for every live calculation.

## Already answered by tester evidence — do not repeat

The supplied DS N°4 / historical DS4 logs already establish:

- DS N°4 odometer can increment during an active `ignition=StartUp` trip;
- owner ë-C3 can instead update odometer only after authoritative trip completion;
- DS N°4 dedicated trip log has no live `fuel.consumptions.instant` field;
- historical DS4 exposes `consumptions.instant` but the supplied moving sample remained `0.0`, so field presence alone is not proof of a trustworthy live value;
- DS N°4 does not expose the older DS4's SOH capacity/resistance or `kinetic.moving` fields in the supplied status log;
- DS N°4 `alarm.status.activation=Active` correlated with the opened/in-use lifecycle in the dedicated test and must not be interpreted as a triggered theft alarm without further evidence.

These findings are recorded in `docs/VEHICLE_CAPABILITY_MATRIX.md`.

## Focused beta.26 checks

### Update path

- HACS Pre-release is enabled.
- `v0.6.0-beta.26` is offered and installs normally.
- Home Assistant restarts successfully.
- System view reports the beta.26 package generation.

### Vehicle / localisation

- DS brand/title remains correct and no e-C3 naming leaks into the UI.
- Hybrid detection remains automatic.
- French Config Flow/options/package entities/dashboard text is understandable and layout-safe.
- Add Card picker exposes only the intended compact and Dual-Energy public Hero cards.

### Dual-Energy LIVE Hero

- generated Vehicle / LIVE automatically uses the Dual-Energy Hero;
- Battery and Fuel stay visible together with the current stacked layout;
- electric SOC/range and fuel level/range are correct;
- missing DS N°4 SOH/capacity fields do not create invented values;
- idle, driving and charging presentations remain stable;
- no live fuel-consumption value is invented when the N°4 has no trustworthy live field;
- native More Info/history interactions work for the displayed values.

### Preconditioning

- inactive state is neutral;
- START enters a pending state and duplicate START clicks are guarded;
- upstream active state becomes visually active when reported;
- STOP is available only after confirmed active state and has its own pending lifecycle;
- command acceptance is not reported as physical success until upstream state confirms it.

### Trip / Fuel History

- Hybrid Trip History keeps the compact primary row and grouped expanded details;
- completed-trip distance/consumption remains authoritative even though live behavior differs by vehicle;
- a fuel-driven trip with unchanged electric SOC does not fabricate electric energy;
- on the **next real refuel**, Fuel History should produce one canonical event with the correct source time, odometer and plausible added litres;
- an HA restart must not duplicate that canonical refuel event.

### Charging History

Re-test the beta.12 issue where the 19 Sep charge initially appeared missing/incorrect and older sessions appeared duplicated:

- the latest genuine charging session appears without requiring an HA restart to become correct;
- the main dashboard and Charging History agree on the canonical session;
- one physical session is shown once, not as duplicated logical sessions;
- start/end SOC and timestamps are plausible against the supplied real charge evidence;
- isolated bad SOC samples do not corrupt the session;
- no meaningless unavailable reconstructed duration/type rows are repeated.

### Vehicle API Audit

Run the read-only Vehicle API Audit once if practical:

- no wake-up or remote command is sent;
- Copy Markdown / Download JSON works;
- known raw aliases are not falsely presented as new unmapped capabilities;
- report remains privacy-sanitized.

## Evidence requested

A compact report is enough. Screenshots are most useful for:

1. HACS beta.26 version/update;
2. generated Vehicle / LIVE;
3. one current Charging History view showing recent sessions;
4. one compact + expanded Hybrid Trip History example;
5. Fuel History after the next real refuel;
6. any French wording/layout issue.

Do not repeat the dedicated odometer/live-fuel/alarm tests unless behavior changes after the update.

## Promotion gate

beta.26 is an **external validation prerelease**, not a stable release. `main` remains unchanged until the exact candidate passes CI and the required owner/external acceptance.

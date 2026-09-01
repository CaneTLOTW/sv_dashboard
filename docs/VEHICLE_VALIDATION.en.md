# Vehicle validation guide

This guide is the shared test procedure for validating SV Dashboard with additional Stellantis vehicles, brands and powertrains. Use it for beta reports, GitHub Discussions and model-specific test issues.

SV Dashboard is capability-driven. A vehicle should therefore be validated against the data and controls actually exposed by the upstream **Stellantis Vehicles** integration rather than against a hard-coded model checklist.

## Test levels

Use these terms consistently:

- **Expected / upstream-supported** — the upstream integration supports the brand and the SV capability model should handle the vehicle, but no real SV Dashboard test is recorded yet.
- **Beta testing** — a real vehicle/tester is available and an immutable SV beta has been assigned.
- **Confirmed** — the relevant dashboard surfaces have been tested on a real vehicle and no release-blocking vehicle-specific defect is known.

A successful static CI run is not a vehicle confirmation by itself.

## Use an immutable beta

External testers must use a published beta/pre-release or an exact immutable SHA. Never ask a tester to follow a moving `develop` branch.

Record at minimum:

- SV Dashboard version and SHA;
- Home Assistant version;
- Stellantis Vehicles version;
- vehicle brand/model and powertrain;
- Home Assistant UI language used for the test.

## Safe parallel installation

When migrating from a predecessor dashboard integration, keep the old integration/dashboard installed during the first SV Dashboard test.

SV Dashboard uses:

- its own Home Assistant domain: `sv_dashboard`;
- its own config entries;
- its own package-owned entity namespace (`sv_...` object IDs);
- its own metric/history/notification stores;
- its own generated dashboard.

It does not rename or replace the upstream Stellantis Vehicles entities.

Recommended migration sequence:

1. Install the selected SV Dashboard beta through HACS.
2. Restart Home Assistant.
3. Add **SV Dashboard** under **Settings → Devices & services**.
4. Select the already configured Stellantis Vehicles device.
5. Keep the predecessor dashboard available for comparison.
6. Verify SV Dashboard data, history, controls and UI.
7. Remove the predecessor only after the new installation has passed the desired checks.

## Battery-capacity fallback

For Electric and Hybrid vehicles, the Config Flow can accept an optional nominal traction-battery capacity for that specific vehicle.

Use the vehicle's known nominal capacity when available. The configured value is a **per-vehicle fallback**, not a model-global constant. Runtime data should prefer trustworthy API/persisted capacity/residual values when present.

When the upstream API provides neither a trustworthy residual value nor a trustworthy capacity, SV Dashboard must not invent a generic kWh value.

Thermic vehicles must not be asked for a traction-battery capacity.

## History and statistics after a new installation

SV Dashboard deliberately does not copy the predecessor integration's private stores.

After initial setup:

- available Stellantis/server history is fetched again;
- SV-local derived history/metrics are rebuilt independently;
- some cards/statistics may therefore need time to populate;
- compare historical results only after the initial rebuild has completed.

Confirm that Trips, Charging history where applicable, GPS/positions and Statistics populate without requiring access to predecessor stores.

## Universal checks

Perform these checks for every vehicle:

- dashboard title/brand is correct;
- vehicle image is correct when upstream provides one;
- mileage and tracker/position baseline are present;
- Vehicle/LIVE view renders without fatal frontend errors;
- Trips, GPS, Statistics, System and Help views open;
- generated dashboard survives a Home Assistant restart;
- package-owned entities use the `sv_...` namespace and do not depend on `_2` collision suffixes;
- unsupported features are omitted or clearly unavailable rather than presented as working;
- no VIN, account identifier or private location leaks into screenshots/issues.

## Electric validation

Where the upstream vehicle exposes the capability, check:

- traction-battery SOC;
- electric range;
- charging state and plug state;
- current charging power;
- charging-end information when trustworthy;
- charging history/curves;
- current/last-trip electric energy and consumption;
- traction-battery health/SOH when available;
- preconditioning/conditioning controls;
- wake-up behaviour.

Check that parked residual kWh is displayed only when it can be derived from a trustworthy residual/capacity source.

## Hybrid validation

Hybrid vehicles are especially important because they exercise both electric and fuel capability paths.

Check:

- electric SOC and electric range;
- fuel level and fuel range;
- charging UI only when the vehicle actually exposes charging support;
- no invented electric residual/capacity value;
- configured per-vehicle battery-capacity fallback behaves plausibly;
- electric trip/charging metrics appear only where real data exists;
- fuel cards/statistics render correctly;
- SOH capacity/resistance entities and values, if exposed;
- unsupported remote functions remain absent.

Do not assume every Hybrid exposes the same battery-health or charging fields.

## Thermic validation

For combustion-only vehicles verify that the dashboard remains useful without traction-battery data:

- fuel level/range is the primary energy presentation;
- fuel consumption is shown when upstream exposes it;
- no traction-battery capacity, electric SOC, charge-history/curve or electric-energy-only controls are displayed;
- universal Trips, GPS, availability and system functions still work;
- notification settings do not expose charge/SOC-specific controls that cannot apply.

## Hydrogen / unknown powertrain

These paths are defensive/future-facing rather than a blanket compatibility claim.

Record exactly which upstream entities/capabilities are present before drawing conclusions. Do not infer functionality from the model name alone.

## Remote-control validation

Separate these observations in every report:

1. the upstream entity/control exists;
2. SV Dashboard displays/maps the control correctly;
3. Home Assistant accepts the command/service call;
4. the physical vehicle effect is actually verified.

Do not trigger intrusive commands merely to discover compatibility. Only test remote actions the tester is comfortable performing.

## Notifications and push messages

Where practical, test:

- explicit recipient selection;
- test notification;
- trip reports;
- charge start/end reports for charging-capable vehicles;
- vehicle/range/availability warnings;
- quiet-hours behaviour;
- outage/recovery behaviour;
- duplicate suppression;
- actual localized push wording.

Report messages that are missing, duplicated, delayed incorrectly, contain wrong values, or use awkward/incorrect translations.

The backend notification catalog is maintained across the same 18-language matrix as the rest of the integration, but real-world language review is still valuable.

## Language validation

For a targeted vehicle test, prioritize the tester's actual Home Assistant language rather than asking one tester to review all languages.

Check:

- Config Flow and Options;
- Home Assistant entity names;
- dashboard navigation and card labels;
- notifications/push messages;
- setup/error text.

Good corrections are short and technically precise. UI labels should remain suitable for compact cards/badges. Report the current wording and the preferred replacement.

## Screenshots

Screenshots are particularly useful for new brands, Hybrid/Thermic layouts and non-English UI.

Useful surfaces include:

- Vehicle / LIVE;
- Charging where applicable;
- Statistics;
- Trips/history;
- GPS;
- Notifications;
- System.

Redact VINs, home/current location, account details, tokens, notification-recipient names and any other private data before posting.

## Test-report template

```text
Vehicle: <brand/model/year if useful>
Powertrain: Electric / Hybrid / Thermic / other
Home Assistant: <version>
Stellantis Vehicles: <version>
SV Dashboard: <version + SHA if available>
UI language: <locale>
Install: fresh / parallel migration
Battery-capacity fallback: <value or not configured>

Dashboard/brand: PASS / FAIL + details
Vehicle/LIVE: PASS / FAIL + details
History rebuild: PASS / FAIL / still populating
Trips: PASS / FAIL / N/A
Charging: PASS / FAIL / N/A
Statistics: PASS / FAIL / N/A
GPS/positions: PASS / FAIL / N/A
Remote controls: PASS / FAIL / N/A + physical effect verified yes/no
Notifications/push: PASS / FAIL / not tested
Translations: PASS / corrections below
Unexpected/missing entities: <details>
Screenshots: <links/attachments, redacted>
```

## Where to report

- Use **GitHub Discussions** for compatibility observations, screenshots, translation feedback, early ideas and general testing questions.
- Use a dedicated vehicle beta issue when maintainers have opened one for a specific validation campaign.
- Open a **Bug report** for a reproducible SV Dashboard defect that needs implementation tracking.
- Upstream API/authentication/data-availability defects belong to the Stellantis Vehicles project unless SV Dashboard itself maps or presents the available data incorrectly.

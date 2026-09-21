# Dashboard features

SV Dashboard is organized by task. Exact views, cards and controls depend on the capabilities exposed by the selected Stellantis vehicle.

## Screenshots

The legacy dashboard screenshots were captured from a real Home Assistant installation and anonymized. The new Dual-Energy examples below are documentation renderings based on the owner beta.9 runtime screenshots and approved terminology; they contain no private vehicle/location data.

![Compact vehicle overview card](assets/vehicle-overview-card.png)

![Dual-Energy Hero – German](assets/dual-energy-hero-de.svg)

![Dual-Energy Hero – English](assets/dual-energy-hero-en.svg)

![Dual-Energy Hero – French](assets/dual-energy-hero-fr.svg)

![Vehicle LIVE view](assets/vehicle-live.png)

![Historical charging curves](assets/charging-history.png)

![Long-term statistics](assets/statistics.png)

![Trip history](assets/trips-history.png)

![GPS history](assets/gps-history.png)

![Wake-up controls](assets/wakeup.png)

![Notification controls](assets/notifications.png)

![System controls](assets/system.png)

![Integration and entities](assets/integration-entities.png)

## Public vehicle cards

SV Dashboard exposes two different vehicle overview cards in Home Assistant's normal card picker.

### Compact vehicle overview

`custom:sv-dashboard-vehicle-overview-card` is the reusable compact presentation for another Home Assistant dashboard.

```yaml
type: custom:sv-dashboard-vehicle-overview-card
```

With multiple SV Dashboard entries, bind the card to a specific config entry with `entry_id`.

See [Vehicle overview card](VEHICLE_OVERVIEW_CARD.md).

### Dual-Energy vehicle overview

`custom:sv-dashboard-dual-energy-overview-card` is the wide native battery + fuel Hero, intended especially for Hybrid/PHEV vehicles but capability-driven rather than model-driven.

```yaml
type: custom:sv-dashboard-dual-energy-overview-card
```

The production Hero is native Lit code. It does not embed the temporary `custom:button-card` prototype that was used during beta design work.

The card remains independently addable to any normal Lovelace dashboard, for example as a start-page vehicle summary. Clicking the vehicle image opens the generated SV vehicle dashboard.

See [Dual-Energy vehicle overview card](DUAL_ENERGY_OVERVIEW_CARD.md).

## Vehicle / LIVE

Vehicle / LIVE is the day-to-day cockpit. Its Hero is selected automatically from actual vehicle capabilities:

- vehicles exposing **both electric and fuel** data use the wide **Dual-Energy Hero**;
- vehicles without both energy domains retain the compact universal vehicle overview.

This selection is capability-driven rather than tied to DS4, e-C3 or another hard-coded model name. Depending on the selected vehicle, the LIVE view can show:

- vehicle picture;
- electric SOC/range and/or fuel level/range;
- contextual temperature and charging/driving state;
- remote-connection state;
- preconditioning/remote quick actions where available;
- mileage;
- consumption/usage information;
- battery/SOH information where the vehicle exposes it;
- 12-V/service-battery information;
- current position;
- latest trip and charge;
- vehicle/maintenance information.

Unsupported electric/fuel sections remain hidden or neutral rather than showing invented values.

### Native Hero interactions

The native Dual-Energy Hero uses normal Home Assistant interactions:

- vehicle image → generated SV vehicle view;
- vehicle temperature → native More Info/history;
- battery/fuel percentage → native More Info/history for the mapped entity;
- detail value → native More Info/history for the metric currently displayed;
- preconditioning icon → sends a mapped **START** request once where supported.

The Hero uses a guarded, upstream-confirmed **START / STOP state machine**. Vehicle/API feedback can arrive with a delay, so an inactive click sends START and enters a pending state; repeated START requests are blocked until the upstream state confirms active. Once active is confirmed, clicking the Hero control sends STOP and enters a separate stop-pending state until the upstream state confirms inactive. Explicit **Start** and **Stop** controls also remain available in the generated dashboard's **Quick actions** section.

SV Dashboard does not impose its own fixed climate run time. The vehicle/upstream service remains responsible for the remote-preconditioning cycle and its termination.

### Hybrid / Dual-Energy state contract

The two energy domains remain deliberately independent.

| State | Battery side | Fuel side |
| --- | --- | --- |
| Parked / idle | SOC + electric range | fuel level + fuel range |
| Driving | SOC + electric range remains visible | fuel level + fuel range remain visible; a fresh trustworthy upstream `l/100 km` may appear as secondary detail |
| Charging | SOC + electric range remain visible; current charge power may appear as secondary detail | fuel level + fuel range remain visible |

The Hero deliberately keeps both ranges visible across states. It does **not** synthesize a live EV `kWh/100 km` value from coarse SOC/odometer changes. Package metrics such as `current_trip_energy` and normalized trip consumption remain available elsewhere when their source quality supports them.

Fuel consumption is intentionally conservative: a stale, absent or behaviorally untrusted value must not be presented as current Hybrid consumption.

## Consumption & reserves

For vehicles exposing **both electric and fuel** capabilities, the generated Vehicle view adds a compact matched **Consumption & reserves** block between the general Consumption & usage section and Quick Actions.

The two summary cards use package-owned canonical metrics rather than inline frontend arithmetic:

- **Electric · remaining** — prefers a valid upstream `battery_residual` kWh value; otherwise derives remaining energy from current SOC × the existing trustworthy capacity hierarchy. Direct residual values are marked direct; SOC × capacity is marked estimated.
- **Electric · last 500 km** — reuses the existing rolling electric `trailing_consumption_500km` metric.
- **Fuel · remaining** — estimates litres from configured per-vehicle tank capacity × current fuel-level percentage. It is explicitly an estimate, not measured tank volume.
- **Fuel · last 500 km** — derives l/100 km from canonical **completed-trip** `fuel_consumption_l` and distance over up to the latest 500 km. Invalid statistics rows and trips without fuel telemetry are excluded; a canonical explicit zero remains a valid EV-only trip contribution.

The block is capability-gated rather than model-gated and is not added to BEV-only or thermic-only generated layouts in this scope. Dual-Energy values already represented by the Hero/reserve block are not repeated as raw fuel cards in the older Consumption & usage group.

SV Dashboard deliberately does **not** calculate current-trip litres or live l/100 km from coarse tank-level percentage changes. A direct live fuel value may still be shown where the upstream vehicle provides a fresh, behaviorally trustworthy source.

## Fuel history

Fuel-capable vehicles can expose fuel history/consumption presentation when the upstream data is sufficient. Refuelling detection remains conservative and restart-safe. When a direct refill amount exists it is preferred; otherwise a configured per-vehicle tank capacity may estimate added litres from a confirmed fuel-level increase, with explicit provenance/estimated status. Ambiguous level changes remain excluded.

## Charging

Charging is shown only when the vehicle exposes relevant charging capabilities.

It can include:

- completed AC/DC sessions;
- start/end SOC;
- duration;
- energy when source data permits;
- average charging power when defensibly derivable;
- mileage in expanded history details when a canonical session carries it;
- reconstructed SOC/time curves.

Reconstructed parking-window events show only information actually known for that event. Unknown charging duration/type fields are not repeated as empty detail rows when the reconstruction hint already explains why they are unavailable.

Derived power/energy values are **battery-side estimates**, not wallbox/EVSE/grid meter data. They must not be mixed silently with an external measured energy source because charging losses and tariff accounting would otherwise become ambiguous.

## Statistics

Depending on available data, Statistics can include:

- package-owned **Canonical mileage** and driven distance;
- trailing consumption;
- fuel-consumption metrics;
- SOH capacity/resistance;
- Home Assistant long-term statistics.

The LIVE/current mileage display can still use the raw upstream odometer. Statistics use the monotonic Canonical mileage sensor instead: raw rollback/unavailable samples cannot reset its counter, and canonical server-trip odometer anchors may reconcile missed distance forward. The generated driven-distance bar is a real **monthly** `change` graph; week/year analysis is available from the same total-increasing Home Assistant entity.

SV Dashboard does not silently rewrite malformed stored LTS history. One-time migration/repair of pre-beta.18 mileage statistics is handled separately through Home Assistant's supported Recorder statistics APIs and tracked in issue #71.

## Trips

Trips uses canonical Stellantis server history with:

- server-history refresh;
- filters;
- short/zero-distance handling;
- plausibility checks;
- continuity repair only when strong evidence exists;
- electric and fuel telemetry only when the selected vehicle actually provides the corresponding data.

For Dual-Energy vehicles, the main table is intentionally compact:

`Date | Duration | Distance | Avg. km/h | kWh/100 km | l/100 km`

Additional telemetry such as absolute kWh, trip type, SOC, start/end mileage, fuel level/range, consumed litres and maximum speed stays available in the expandable row details. Missing electric or fuel values remain `—`; the UI does not infer a value from the other energy domain.

Raw upstream values remain retained for diagnostics when a derived boundary is repaired.

## GPS

GPS combines available Home Assistant Recorder points and canonical Stellantis history while keeping the current position separate from archived history.

Sparse points and straight server start/stop lines are expected when the upstream vehicle reports only occasional positions.

## Wake-up

Wake-up contains reachability controls such as:

- wake vehicle now;
- hourly wake-up;
- availability probe;
- wake-up while charging where relevant;
- remote-connection state.

A command marked `accepted` or `forwarded` is not treated as proof of fresh telemetry.

## Notifications

Notification controls are opt-in and capability-aware. The view can include:

- master switch;
- vehicle alerts;
- trip reports;
- charge reports for charging-capable vehicles;
- selected recipients;
- thresholds/delays;
- quiet hours;
- diagnostics;
- test notification.

Notify-service discovery never silently activates a recipient.

Focused runtime QA is tracked in issue #3.

## System

System contains integration/runtime administration rather than everyday vehicle status. It can include:

- setup/connection status;
- mapped upstream entities;
- opt-in read-only Vehicle API audit with sanitized JSON download and GitHub Markdown copy;
- privacy/data-sharing state;
- refresh interval;
- battery-value correction where applicable;
- ABRP controls/status where configured.

The package-owned **Dashboard status** sensor is part of the same Home Assistant translation contract as the other SV entities; it must not remain a hard-coded English exception. The Vehicle API audit is an internal generated-dashboard diagnostic component, not another public Add Card picker card. Its read-only/privacy/runtime contract and accepted beta.22–beta.24 hardening are documented in [Vehicle capability audit](VEHICLE_AUDIT.md).

## Capability gating

SV Dashboard is not model-hardcoded.

- **Electric:** electric SOC/range/charging/battery analytics where available.
- **Hybrid / PHEV:** electric and fuel features can coexist and are gated independently; when both domains are present, the generated LIVE view uses the Dual-Energy Hero.
- **Thermic / combustion:** fuel features without electric-only charging/battery analytics.
- **Hydrogen / unknown:** only actual mapped capabilities are shown.

See [Vehicle capability matrix](VEHICLE_CAPABILITY_MATRIX.en.md).

## Multi-vehicle behavior

Each `sv_dashboard` config entry owns its selected upstream device, generated dashboard and package state. The frontend uses the explicit config-entry ID rather than localized entity IDs or dashboard ordering.

## Localisation

Config flow, options, package-owned Home Assistant entities, frontend cards and backend notifications/logbook messages follow the same supported 18-language matrix. The Dual-Energy Hero and editor use the shared frontend i18n layer; card files do not maintain private German/English text branches.

DE / EN / FR runtime switching of the native Hero has been visually checked, including long French Hybrid labels. See [Localisation](LOCALISATION.en.md).

## Custom Lovelace/YAML prototypes

Advanced users can build a different presentation from the same mapped Stellantis entities and package-owned SV metric entities. A useful proposal includes the YAML/custom-card configuration, screenshots and the vehicle state being demonstrated.

Such a prototype can become concrete design input for a future package feature. It does not automatically make every third-party custom card a required SV Dashboard dependency.

## Data quality and privacy

Direct upstream data and derived estimates are deliberately distinguished. SOC-derived energy, SOC/time charging power and sparse GPS geometry are never presented as meter-grade/live telemetry.

Before publishing screenshots or diagnostics, redact private VINs, account identifiers, GPS coordinates/locations, Notify recipient names, config-entry IDs, credentials and tokens.

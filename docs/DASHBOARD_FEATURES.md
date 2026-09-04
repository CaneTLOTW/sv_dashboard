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

See [Dual-Energy vehicle overview card](DUAL_ENERGY_OVERVIEW_CARD.md).

## Vehicle / LIVE

Vehicle / LIVE is the day-to-day cockpit. Depending on the selected vehicle it can show:

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
- preconditioning → mapped upstream start/stop action where supported.

### Hybrid / Dual-Energy state contract

The two energy domains remain deliberately independent.

| State | Battery side | Fuel side |
| --- | --- | --- |
| Parked / idle | SOC + electric range | fuel level + fuel range |
| Driving | SOC + current-trip energy used in **kWh** | fuel level + fresh upstream `l/100 km` when trustworthy, otherwise fuel range |
| Charging | SOC + current charge power | fuel level/range remains available |

`current_trip_energy` is an **absolute current-trip kWh value**, not a Hero `kWh/100 km` value. Normalized electric consumption remains available elsewhere where the underlying metric supports it.

Fuel consumption is intentionally conservative: a stale value from an earlier drive must not be presented as current Hybrid consumption.

## Fuel history

Fuel-capable vehicles can expose fuel history/consumption presentation when the upstream data is sufficient. Refuelling detection remains conservative; SV Dashboard does not invent litres from ambiguous level changes.

## Charging

Charging is shown only when the vehicle exposes relevant charging capabilities.

It can include:

- completed AC/DC sessions;
- start/end SOC;
- duration;
- energy when source data permits;
- average charging power when defensibly derivable;
- reconstructed SOC/time curves.

Derived power/energy values are **battery-side estimates**, not wallbox/EVSE/grid meter data. They must not be mixed silently with an external measured energy source because charging losses and tariff accounting would otherwise become ambiguous.

## Statistics

Depending on available data, Statistics can include:

- mileage and driven distance;
- trailing consumption;
- fuel-consumption metrics;
- SOH capacity/resistance;
- Home Assistant long-term statistics.

SV Dashboard does not silently rewrite malformed stored LTS history. The dedicated LTS investigation is tracked in issue #4.

## Trips

Trips uses canonical Stellantis server history with:

- server-history refresh;
- filters;
- short/zero-distance handling;
- plausibility checks;
- continuity repair only when strong evidence exists;
- electric and fuel columns only when the selected vehicle actually provides the corresponding data.

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
- privacy/data-sharing state;
- refresh interval;
- battery-value correction where applicable;
- ABRP controls/status where configured.

The package-owned **Dashboard status** sensor is part of the same Home Assistant translation contract as the other SV entities; it must not remain a hard-coded English exception.

## Capability gating

SV Dashboard is not model-hardcoded.

- **Electric:** electric SOC/range/charging/battery analytics where available.
- **Hybrid / PHEV:** electric and fuel features can coexist and are gated independently.
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

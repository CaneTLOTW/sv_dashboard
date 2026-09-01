# Architecture concept: SV Dashboard

## Purpose

`sv_dashboard` is a Home Assistant custom integration distributed through HACS. It builds a vehicle-focused Home Assistant experience on top of the upstream **Stellantis Vehicles** integration.

Each SV Dashboard config entry provides:

- one generated multi-view dashboard;
- package-owned derived/canonical history and controls;
- one reusable vehicle-overview card;
- independent state for the selected vehicle.

SV Dashboard is not an alternative Stellantis API client.

## Upstream boundary

[Stellantis Vehicles](https://github.com/andreadegiovine/homeassistant-stellantis-vehicles) remains responsible for:

- authentication;
- Stellantis API/MQTT communication;
- native vehicle entities;
- upstream polling/update behavior;
- native remote commands.

SV Dashboard consumes Home Assistant entities belonging to the vehicle selected during config flow. It does not call the Stellantis API directly or import private upstream implementation code.

## Vehicle mapping

Each SV Dashboard config entry stores the selected upstream Home Assistant device plus a stable local identifier. Mapping is resolved from entity-registry/device relationships rather than guessed from VIN-shaped entity IDs.

Every entry owns its own:

- dynamic upstream mapping;
- capability profile;
- generated dashboard;
- derived sensors and controls;
- metrics/session state;
- canonical history store;
- notification/wake-up state.

This supports multiple vehicles without relying on dashboard order or localized entity IDs.

## Capability model

SV Dashboard is capability-based rather than model-hardcoded.

The selected vehicle is classified from upstream type/data into an effective profile such as:

- electric;
- hybrid;
- thermic / combustion;
- hydrogen;
- unknown.

Views and metrics are enabled by actual mapped capabilities.

### Electric

May expose SOC, electric range, charging, traction-battery/SOH and electric energy metrics.

### Hybrid

Electric and fuel capabilities can exist independently. Missing battery capacity/residual/SOH data is valid and must not produce invented values.

### Thermic / combustion

Fuel level, fuel range and fuel consumption can be shown where available. Electric-only charging and traction-battery analytics remain hidden.

### Hydrogen / unknown

Handled defensively. Only mapped capabilities are exposed.

See [Vehicle capability matrix](VEHICLE_CAPABILITY_MATRIX.en.md).

## Battery data

SV Dashboard has no generic fixed vehicle capacity.

Trust order for battery capacity is:

1. current usable upstream value;
2. persisted last valid upstream value;
3. configured per-vehicle fallback;
4. unknown.

Residual energy prefers a direct upstream residual value. SOC × capacity is used only when a trustworthy capacity exists. Unknown values are omitted rather than estimated from an e-C3-specific constant.

## Generated dashboard

The dashboard is organized by task:

1. Vehicle
2. Charging
3. Statistics
4. Trips
5. GPS
6. Wake-up
7. Notifications
8. System

Unsupported views/content are capability-gated.

The generated LIVE hero and the standalone compact card share the same canonical `vehicle-overview-card` implementation.

## Frontend resource model

Home Assistant registers one package-owned Lovelace resource:

```text
/sv_dashboard/frontend.js
```

That entry point loads package-owned modules, performs required dependency checks and loads the SV Dashboard strategy.

Internal modules are not registered individually as Lovelace resources. This reduces load-order and cache-version problems.

## Third-party Lovelace dependencies

The generated dashboard uses maintained HACS cards rather than vendoring them:

- Bubble Card
- Button Card
- ha-map-card
- layout-card

Config flow performs a registered-resource preflight. The frontend performs the final browser-side custom-element check.

## Dashboard ownership

After setup, SV Dashboard creates one dedicated storage dashboard for the config entry and stores the explicit config-entry ID in the strategy configuration.

The integration does not treat arbitrary user-created dashboards as disposable package state.

## History and data quality

### Canonical server history

SV Dashboard retains normalized Stellantis trip/charge history while preserving raw source values for diagnostics.

Implausible rows do not feed derived statistics. A derived boundary can be repaired only when strong continuity evidence exists; the original upstream value remains unchanged.

### Recorder history

Home Assistant Recorder provides HA-side state/tracker history and local timeline reconstruction. The SV history window is only a display/query boundary and does not change Recorder retention.

### Package stores

Restart-safe stores retain package-owned history, metrics and notification/wake-up state per config entry.

### Derived values

The package distinguishes direct values from estimates:

- valid odometer deltas can provide high-quality distance;
- SOC × capacity energy is an estimate;
- SOC/time charging power is an estimate;
- sparse GPS points are not presented as a complete driven route.

No artificial precision is added.

## Long-term statistics

Statistics views may consume Home Assistant long-term statistics for supported mileage/SOH sources. SV Dashboard does not silently rewrite malformed existing statistics.

The known mileage/LTS reset investigation is tracked in **SV Dashboard issue #4**.

## Notifications and wake-up

Notification and automatic wake-up behavior is opt-in.

SV Dashboard provides:

- notification master/topic switches;
- explicitly selected recipient switches;
- Number settings for thresholds/delays;
- Time settings for quiet hours;
- manual wake-up and notification-test buttons;
- persisted episode/diagnostic state.

A command being accepted/forwarded is not treated as fresh telemetry. Quiet-hour availability warnings are deferred rather than discarded.

Focused event QA is tracked in **SV Dashboard issue #3**.

## Remote capabilities

An upstream command entity being present does not prove that the selected vehicle supports the physical action. SV Dashboard keeps upstream availability/command results intact and does not automatically probe locks, horn, lights, climate or charging.

Vehicle-specific observations and the general validation policy are documented in [Vehicle capability matrix](VEHICLE_CAPABILITY_MATRIX.en.md).

## New integration and migration

SV Dashboard uses the new Home Assistant domain `sv_dashboard` and component path `custom_components/sv_dashboard/`.

The predecessor `e_c3_dashboard` is not kept as the active domain in this project. Existing e-C3 Dashboard config entries are not silently mutated into SV Dashboard entries.

Migration is explicit: install SV Dashboard, configure the upstream vehicle again, validate the new dashboard, then remove the predecessor integration when satisfied.

The migration plan is maintained in **issue #1**.

## Localisation

Home Assistant UI, frontend and backend messages cover 18 languages with English fallback. Technical keys and placeholders remain language-neutral. See [Localisation](LOCALISATION.en.md).

## Privacy

The repository must not contain private VINs, account/customer IDs, exact private GPS history, Notify recipient names, credentials, tokens or raw private exports.

Screenshots and examples must redact private values where needed.

## Development and release model

Development is prepared and validated on `develop`. External testers receive an exact validated SHA/pre-release rather than a moving branch.

`main` is promoted only after CI and explicit runtime acceptance. See [Branch and deployment workflow](BRANCH_AND_DEPLOYMENT_WORKFLOW.md) and [Release checklist](RELEASE_CHECKLIST.md).

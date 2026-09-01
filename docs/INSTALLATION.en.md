# Installation

## Prerequisites

SV Dashboard is installed as a HACS **custom integration repository**.

Required Home Assistant baseline: **2026.5.0 or later**.

Install and configure these projects first:

1. [Stellantis Vehicles](https://github.com/andreadegiovine/homeassistant-stellantis-vehicles)
2. [Bubble Card](https://github.com/Clooos/Bubble-Card)
3. [Button Card](https://github.com/custom-cards/button-card)
4. [ha-map-card](https://github.com/nathan-gs/ha-map-card)
5. [layout-card](https://github.com/thomasloven/lovelace-layout-card)

Stellantis Vehicles must already be authenticated and expose a real Home Assistant vehicle device. Mileage and tracker data form the universal baseline. Battery entities are only required for battery-specific features.

The four frontend dependencies must also be loaded as Lovelace JavaScript modules.

## Install through HACS

1. Open **HACS → Integrations → Custom repositories**.
2. Add `CaneTLOTW/sv_dashboard` as category **Integration**.
3. Download **SV Dashboard**.
4. Restart Home Assistant.
5. Open **Settings → Devices & services → Add integration**.
6. Select **SV Dashboard**.
7. Select the configured Stellantis vehicle and choose the desired modules/options.
8. Complete setup. SV Dashboard creates a dedicated storage dashboard for that config entry.
9. Refresh the browser/app once and open the generated dashboard.

## Migration from e-C3 Dashboard

SV Dashboard uses the new Home Assistant domain `sv_dashboard`. It is a separate integration, not an in-place rename of `e_c3_dashboard`.

For migration testing:

1. leave the old e-C3 Dashboard installed temporarily;
2. install SV Dashboard separately;
3. configure the same upstream Stellantis vehicle;
4. compare dashboard, history and controls;
5. remove the old integration only after the SV installation is confirmed.

Old e-C3 config entries are not silently rewritten into the new domain.

## Frontend resource model

SV Dashboard registers one package-owned Lovelace resource:

```text
/sv_dashboard/frontend.js
```

The dashboard strategy and bundled custom cards are internal ES modules loaded through this entry point. Do not manually register individual package modules.

After a frontend update, restart/reload Home Assistant when required and hard-refresh the browser or fully reopen the mobile app if it still serves an older module graph.

## More than one vehicle

Add one SV Dashboard config entry per Stellantis vehicle. Each entry owns its selected device, generated dashboard, derived/canonical data and notification/wake-up state.

The dashboard strategy stores the explicit config-entry ID, so multiple vehicles do not depend on dashboard order or VIN-shaped entity-name guesses.

The compact card can be bound to a specific entry:

```yaml
type: custom:sv-dashboard-vehicle-overview-card
entry_id: YOUR_CONFIG_ENTRY_ID
```

With only one SV Dashboard entry, `entry_id` is optional.

## Capability-based views

SV Dashboard only shows features supported by the selected vehicle's mapped capabilities.

- Electric vehicles can expose SOC, electric range, charging and battery/SOH views.
- Hybrids may expose electric and fuel capabilities independently.
- Combustion vehicles can expose fuel level/range/consumption without electric-only charging or traction-battery analytics.
- Missing battery capacity/residual data is treated as unknown; no fixed e-C3 capacity is substituted.

See [Vehicle capability matrix](VEHICLE_CAPABILITY_MATRIX.en.md).

## Notifications

Notifications remain inactive after installation.

To enable them:

1. open **Settings → Devices & services → SV Dashboard → Configure**;
2. enable the notification/recipient module if needed;
3. select one or more available Notify services;
4. reload the config entry if requested;
5. enable the desired notification master/topics/recipient switches in the generated **Notifications** view.

A discovered Notify service is only a choice; discovery never opts it in automatically.

Thresholds, delays and quiet hours are package-owned Number/Time entities. See [Notifications and wake-up](NOTIFICATIONS_AND_WAKEUP.en.md).

## History and retention

SV Dashboard combines:

- canonical Stellantis server history for retained trip/charge records;
- a restart-safe package store for local/observed session data;
- Home Assistant Recorder for HA-side state/tracker history;
- Home Assistant long-term statistics for supported aggregate/statistics cards.

The **History display window** defaults to 2,160 hours (90 days). It is only a query/display limit and does not change Recorder retention.

If you need 90 days of Recorder-backed data, configure Recorder accordingly. SV Dashboard does not change `purge_keep_days`, Recorder filters, database backend or purge schedule.

## Data quality expectations

SV Dashboard distinguishes direct upstream values from derived estimates:

- mileage/odometer deltas are used when valid;
- SOC × capacity energy is an estimate and requires trustworthy vehicle-specific capacity;
- charging power derived from SOC/time is an estimate;
- server-trip GPS lines can be start-to-stop approximations rather than complete routes.

Implausible upstream rows can be excluded from derived metrics while raw source values remain available for diagnostics.

## Troubleshooting

### Missing custom card / setup page

Verify Bubble Card, Button Card, ha-map-card and layout-card are installed **and loaded** as Lovelace resources. Restart Home Assistant if HACS requests it, then hard-refresh the browser.

### Dashboard still shows an old frontend

Confirm the current SV Dashboard version is installed and `/sv_dashboard/frontend.js` is the registered package resource, then hard-refresh the client.

### Vehicle cannot be selected

Verify Stellantis Vehicles is configured, compatible and exposes mileage and tracker entities for the selected device. Battery entities are not a universal prerequisite.

### Battery-specific features are missing

Check whether the selected vehicle actually exposes the relevant electric/battery entities. Hybrid and combustion vehicles can validly omit battery capacity/residual/SOH data.

### Normal telemetry works but remote values are unavailable

Check the upstream Stellantis Vehicles authentication/session/config-entry health first. Remote-channel availability can fail independently of ordinary telemetry.

### History is shorter than the configured window

Check Recorder retention and include filters. SV Dashboard cannot recreate Recorder history already purged.

## Updating

Install updates through HACS. Restart Home Assistant when release notes require it and refresh browser/app cache after frontend changes.

During migration, development is validated on exact `develop` SHAs before any stable promotion to `main`.

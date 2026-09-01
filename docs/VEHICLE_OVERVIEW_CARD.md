# Vehicle overview card

## Purpose

`custom:sv-dashboard-vehicle-overview-card` is the reusable compact vehicle card shipped with SV Dashboard.

The generated **Vehicle / LIVE** view uses the same canonical card implementation with `variant: live`. The start-page card and LIVE hero therefore share vehicle mapping, image handling and primary status semantics.

![Vehicle overview card](assets/vehicle-overview-card.png)

## Minimal configuration

```yaml
type: custom:sv-dashboard-vehicle-overview-card
```

With one configured SV Dashboard vehicle this is sufficient.

The card can present, depending on vehicle capabilities:

- vehicle image;
- electric range/SOC or fuel/range state;
- contextual temperature or charging information;
- preconditioning control where mapped;
- charging-cable/driving indicators;
- primary energy/status bar;
- navigation to the generated Vehicle view.

## Multiple vehicles

```yaml
type: custom:sv-dashboard-vehicle-overview-card
entry_id: <sv_dashboard config-entry id>
navigation_path: /optional/override/vehicle
heading: Mobility
heading_icon: fa6-solid:car
```

`entry_id` is only required when more than one SV Dashboard config entry exists. `navigation_path` is an optional override.

`variant: live` is package-internal and normally should not be set manually.

## Mapping contract

The card does not rely on copied VIN-derived or localized entity IDs. It consumes the selected SV Dashboard config entry's mapping/capability contract.

Common mapped values can include:

- `vehicle_tracker`
- battery/SOC and electric range
- fuel level/range
- temperature
- charging state/end time/cable
- engine/driving state
- preconditioning state/start/stop
- package metric entities such as current charge power or current trip energy

Only values relevant to the selected vehicle are used.

## Vehicle image

The vehicle image comes from the mapped tracker's `entity_picture`. The card monitors the picture URL and refreshes the inner card when the image appears late or changes.

The vehicle hero and map marker remain separate rendering paths.

## Primary status behavior

### Electric / hybrid electric capability

- parked: battery label plus residual kWh only when a trustworthy residual value is available;
- driving: localized driving state plus current trip energy when available;
- charging: localized charging state plus current charge power when available;
- SOC remains the right-side primary percentage.

No fixed vehicle battery capacity is used.

### Combustion capability

The hero uses fuel/range state when available and does not invent battery/SOC presentation.

## Navigation and interaction

Depending on mapped capabilities:

- vehicle area → generated SV Dashboard Vehicle view;
- range/energy/fuel status → native Home Assistant More Info;
- preconditioning tap/hold → mapped upstream start/stop action;
- battery/fuel status → native More Info for the displayed entity.

In `variant: live`, the info action opens the shared vehicle/maintenance dialog.

## System vs. Vehicle

Administrative integration controls belong in the generated **System** view rather than the day-to-day Vehicle hero. This includes package/integration settings such as refresh behavior, battery-value correction where relevant and optional ABRP controls.

## Packaging

The overview card is an internal ES module loaded through the single package resource:

```text
/sv_dashboard/frontend.js
```

It does not require its own Lovelace resource registration.

## Acceptance

Before promoting a runtime candidate verify:

1. the card appears as **Vehicle overview** in the card picker/localized UI;
2. minimal YAML works with one SV config entry;
3. `entry_id` selects the correct vehicle with multiple entries;
4. `entity_picture` appears without manual reload even when delayed;
5. capability-specific range/energy/fuel/status values update correctly;
6. displayed status opens More Info for the correct mapped entity;
7. mapped preconditioning controls work where supported;
8. navigation opens the correct generated Vehicle view;
9. LIVE view and reusable card share the same canonical implementation;
10. no VIN/fixed household entity IDs or model-specific product naming exists in active card code;
11. the card remains part of the single SV Dashboard frontend resource model.

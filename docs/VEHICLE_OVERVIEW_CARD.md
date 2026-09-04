# Vehicle overview card

## Purpose

`custom:sv-dashboard-vehicle-overview-card` is the reusable **compact universal** vehicle card shipped with SV Dashboard.

It is intentionally separate from the wide `custom:sv-dashboard-dual-energy-overview-card`, which presents Battery + Fuel side by side for Hybrid/PHEV and other dual-capability use cases. Both cards are public Home Assistant card-picker entries with distinct localized names.

![Vehicle overview card](assets/vehicle-overview-card.png)

For the wide Hybrid-oriented card, see [Dual-Energy vehicle overview card](DUAL_ENERGY_OVERVIEW_CARD.md).

## Minimal configuration

```yaml
type: custom:sv-dashboard-vehicle-overview-card
```

With one configured SV Dashboard vehicle this is sufficient.

The compact card can present, depending on vehicle capabilities:

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

The compact card uses fuel/range state when available and does not invent battery/SOC presentation.

For simultaneous Battery + Fuel presentation, use the Dual-Energy card instead of forcing both domains into the compact layout.

## Navigation and interaction

Depending on mapped capabilities:

- vehicle area → generated SV Dashboard Vehicle view;
- range/energy/fuel status → native Home Assistant More Info;
- preconditioning tap/hold → mapped upstream start/stop action;
- battery/fuel status → native More Info for the displayed entity.

In `variant: live`, the info action opens the shared vehicle/maintenance dialog.

## Localisation

The compact card uses the shared 18-language frontend catalog and follows the Home Assistant UI language automatically. Its public picker name is deliberately distinct from the Dual-Energy card in every supported language.

## Custom presentation

The bundled compact and Dual-Energy cards are reference implementations, not restrictions on the underlying data. Advanced users can build another Lovelace/YAML presentation from the same mapped Stellantis and SV-owned entities and share YAML + screenshots as design input for a possible future package feature.

## System vs. Vehicle

Administrative integration controls belong in the generated **System** view rather than the day-to-day Vehicle presentation. This includes package/integration settings such as refresh behavior, battery-value correction where relevant and optional ABRP controls.

## Packaging

The overview card is an internal ES module loaded through the single package resource:

```text
/sv_dashboard/frontend.js
```

It does not require its own Lovelace resource registration.

## Acceptance

Before promoting a runtime candidate verify:

1. the card appears with the localized **compact** vehicle-overview name in the Home Assistant card picker;
2. the Dual-Energy overview appears as a separate public card;
3. minimal YAML works with one SV config entry;
4. `entry_id` selects the correct vehicle with multiple entries;
5. `entity_picture` appears without manual reload even when delayed;
6. capability-specific range/energy/fuel/status values update correctly;
7. displayed status opens More Info for the correct mapped entity;
8. mapped preconditioning controls work where supported;
9. navigation opens the correct generated Vehicle view;
10. no VIN/fixed household entity IDs or model-specific product naming exists in active card code;
11. the card remains part of the single SV Dashboard frontend resource model.

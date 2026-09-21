# Dual-Energy vehicle overview card

`custom:sv-dashboard-dual-energy-overview-card` is the wide native SV Dashboard card for vehicles that expose both electric and fuel data, especially PHEV/Hybrid vehicles.

It is also available from Home Assistant's normal **Add card** picker as the localized **SV vehicle overview – Dual Energy** entry. The compact universal vehicle overview remains a separate public card.

## Two intended roles

The Dual-Energy Hero is deliberately reusable in two different contexts:

1. **Standalone/start-page Hero** — add the card to any ordinary Home Assistant dashboard to show the most important vehicle information without opening the complete SV Dashboard first. This is a supported product use case, not only a beta test scaffold.
2. **Generated SV Dashboard Hero** — the generated dashboard can use the same Dual-Energy presentation for vehicles that expose both electric and fuel capabilities. Pure-electric and other non-dual vehicles keep the compact/universal Hero.

The generated Vehicle / LIVE view automatically selects the Dual-Energy Hero when the mapped vehicle exposes both electric and fuel capabilities. Pure-electric and other non-dual vehicles keep the compact/universal Hero.

## Minimal configuration

```yaml
type: custom:sv-dashboard-dual-energy-overview-card
```

With more than one SV Dashboard config entry, select the vehicle in the card editor or bind the card to the corresponding `entry_id`.

## What the Hero shows

The card keeps the two energy domains deliberately separate:

| Vehicle state | Battery side | Fuel side |
| --- | --- | --- |
| Parked / idle | battery SOC and electric range | fuel level and fuel range |
| Driving | battery SOC and electric range stay visible | fuel level and fuel range stay visible; fresh trustworthy instantaneous fuel consumption may appear as secondary detail |
| Charging | battery SOC and electric range stay visible; current charge power may appear as secondary detail | fuel level and fuel range stay visible |

Important rules:

- Both ranges remain visible across idle, driving and charging states.
- The Hero does **not** synthesize live EV `kWh/100 km` from SOC/odometer changes. The package-owned `current_trip_energy` metric can still exist elsewhere in the generated dashboard/history when source quality supports it.
- Fuel consumption is shown only when the mapped upstream value is numeric, belongs to the current drive, is sufficiently fresh **and the vehicle/runtime behavior supports treating it as a live measurement**. A field that is absent, stale or observed to remain zero while the vehicle is demonstrably moving must not be promoted to a live value.
- Unknown or unsupported values stay neutral (`—`); the card does not invent Hybrid/EV values.
- The card must not branch on model names. Vehicle-specific differences such as live-vs-end-of-trip odometer behavior belong to the canonical capability/behavior resolver.
- Package-derived charging power and energy can be battery-side SOC/time estimates. They are not EVSE/grid meter readings and do not include charging losses.

## Native interactions

The production Hero uses native card interactions rather than nested `custom:button-card` instances:

- click the **vehicle image** → generated SV vehicle dashboard (`/<dashboard_url_path>/vehicle` unless `navigation_path` overrides it);
- click vehicle temperature → Home Assistant native **More Info** / recorded history;
- click Battery or Fuel percentage → native **More Info** for the mapped entity;
- click the current battery/fuel detail → native **More Info** for the metric currently being displayed.

The vehicle-picture navigation is especially important for the standalone/start-page use case: the card acts as the compact entry point into the full generated vehicle dashboard. The whole card is not a navigation target; the vehicle picture is.

The native implementation replaced the temporary YAML/button-card interaction playground used during beta development.

## Preconditioning interaction

The Hero climate control uses a guarded, upstream-confirmed **START / STOP state machine**.

Remote preconditioning state feedback can arrive with noticeable delay, so the card must not treat a command submission as immediate physical state confirmation.

Design contract:

- inactive + click → send the mapped START action and enter a start-pending state;
- repeated START clicks are blocked while the command is pending;
- only an upstream active state confirms the running state;
- confirmed active + click → send the mapped STOP action and enter a separate stop-pending state;
- repeated STOP clicks are blocked while pending;
- only an upstream inactive state confirms completion;
- explicit **Start climate / Stop climate** actions remain available in the generated SV Dashboard Quick Actions area as an alternate control surface.

## Localisation

The card and its editor use the shared SV Dashboard frontend localisation layer and follow the Home Assistant UI language automatically. An explicit card `language` override uses the same resolution path.

SV Dashboard currently ships the public frontend contract in 18 languages:

`de`, `en`, `fr`, `it`, `es`, `pt`, `nl`, `da`, `nb`, `sv`, `fi`, `pl`, `cs`, `sk`, `hu`, `ro`, `sl`, `hr`.

DE / EN / FR runtime switching was visually checked during beta.9 owner QA, including the longer French Hybrid labels.

## Documentation examples

The SVGs below are documentation renderings based on the owner beta.9 runtime screenshots and the approved post-beta.9 wording. They demonstrate layout and localisation without publishing private vehicle/location data.

### Deutsch

![Dual-Energy Hero – Deutsch](assets/dual-energy-hero-de.svg)

### English

![Dual-Energy Hero – English](assets/dual-energy-hero-en.svg)

### Français

![Dual-Energy Hero – Français](assets/dual-energy-hero-fr.svg)

## Building a different presentation

The SV Dashboard card is not the only way to present the data. The mapped Stellantis entities and the package-owned SV entities are normal Home Assistant data sources, so an advanced user can build a different Lovelace/YAML presentation for the same vehicle data.

A useful prototype contribution contains:

1. the YAML/custom-card configuration;
2. one or more screenshots;
3. which vehicle/powertrain state is being shown (parked, driving, charging, Hybrid fuel use, etc.);
4. the intended interaction or information hierarchy;
5. no VIN, exact location, account data or other private identifiers.

A well-defined custom prototype can be used as design input for a future package-owned feature. Sharing a prototype does not mean that every third-party card or layout will become a built-in dependency.

## Related documentation

- [Vehicle overview card](VEHICLE_OVERVIEW_CARD.md)
- [Dashboard features](DASHBOARD_FEATURES.md)
- [Localisation](LOCALISATION.en.md)
- [Vehicle capability matrix](VEHICLE_CAPABILITY_MATRIX.en.md)

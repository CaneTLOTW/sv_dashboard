# SV Dashboard

**Stellantis Vehicle Dashboard for Home Assistant**

SV Dashboard is a HACS custom integration that builds a vehicle-focused Home Assistant dashboard on top of [Stellantis Vehicles](https://github.com/andreadegiovine/homeassistant-stellantis-vehicles).

> **Beta status:** SV Dashboard is the successor to `CaneTLOTW/e_c3_dashboard`. The new Home Assistant domain is `sv_dashboard`. The first owner live validation has passed on `v0.6.0-beta.2`; no stable SV release has been promoted to `main` yet.

[![Open the SV Dashboard repository in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=CaneTLOTW&repository=sv_dashboard&category=integration)

Install this repository as an **Integration**, not as a standalone Lovelace-card repository.

## What it provides

- Dynamic vehicle discovery from Stellantis Vehicles; no hard-coded VIN entity IDs.
- Multi-vehicle dashboard generation with brand-aware titles.
- Capability-based UI for electric, hybrid and combustion vehicles.
- Electric SOC/range/charging views only when the upstream vehicle exposes those capabilities.
- Fuel/range/consumption views for combustion-capable vehicles when available upstream.
- Vehicle overview card shared by the generated LIVE view and reusable Home Assistant cards.
- Trip, charging and GPS history with data-quality guards.
- Long-term statistics for supported mileage/SOH data.
- Optional notifications, recipients, warning thresholds, quiet hours and reachability diagnostics.
- Wake-up/reachability controls with conservative status handling.
- 18 Home Assistant/frontend languages with English fallback.
- No fixed e-C3 battery capacity assumption; battery energy is shown only from trustworthy vehicle-specific data.

## Vehicle and brand compatibility

SV Dashboard is designed around the capabilities exposed by the upstream **Stellantis Vehicles** integration rather than hard-coded model names.

The upstream project currently covers the PSA-side brands:

- Citroën
- Peugeot
- DS Automobiles
- Opel
- Vauxhall

Real-world SV Dashboard validation is intentionally tracked separately from expected upstream compatibility:

| Brand / vehicle | SV status |
| --- | --- |
| Citroën e-C3 | **Confirmed** — owner live validation passed on `v0.6.0-beta.2` |
| DS4 Hybrid | **Beta testing** — external Hybrid/French validation active |
| Peugeot | **Expected / upstream-supported** — real SV vehicle test pending |
| Opel | **Expected / upstream-supported** — real SV vehicle test pending |
| Vauxhall | **Expected / upstream-supported** — real SV vehicle test pending |

Other Stellantis brands are **not claimed as supported** unless the upstream integration exposes the required vehicle data and SV Dashboard has been validated against it.

See the [Vehicle validation guide](docs/VEHICLE_VALIDATION.en.md), the completed [migration record](https://github.com/CaneTLOTW/sv_dashboard/issues/1) and the active [DS4 Hybrid beta issue](https://github.com/CaneTLOTW/sv_dashboard/issues/2).

## Powertrain behavior

SV Dashboard derives a vehicle capability profile from the upstream integration:

- **Electric** — SOC, electric range, charging, battery/SOH and electric energy metrics when available.
- **Hybrid** — electric and fuel capabilities can appear independently; no battery-capacity estimate is invented when upstream does not provide one.
- **Thermic / combustion** — fuel level, fuel range and fuel-consumption views where available; electric-only charging and battery analytics remain hidden.
- **Hydrogen / unknown** — handled defensively; only capabilities actually exposed upstream are shown.

## Languages

Home Assistant integration UI, package-owned entities, frontend cards and backend messages use the same 18-language matrix:

`de`, `en`, `fr`, `it`, `es`, `pt`, `nl`, `da`, `nb`, `sv`, `fi`, `pl`, `cs`, `sk`, `hu`, `ro`, `sl`, `hr`

English is the fallback language. See [Localisation](docs/LOCALISATION.en.md).

## Compact vehicle overview card

The integration registers a reusable vehicle overview card:

```yaml
type: custom:sv-dashboard-vehicle-overview-card
```

With multiple SV Dashboard entries, bind the card to the required config entry with `entry_id`.

The generated Vehicle/LIVE hero uses the same card implementation (`variant: live`), so the compact card and full dashboard share entity mapping, vehicle-image handling and primary status semantics.

![Compact vehicle overview card](docs/assets/vehicle-overview-card.png)

See [Vehicle overview card](docs/VEHICLE_OVERVIEW_CARD.md).

## Requirements

SV Dashboard currently targets Home Assistant **2026.5.0 or later**.

Install and configure these dependencies first:

1. [Stellantis Vehicles](https://github.com/andreadegiovine/homeassistant-stellantis-vehicles)
2. [Bubble Card](https://github.com/Clooos/Bubble-Card)
3. [Button Card](https://github.com/custom-cards/button-card)
4. [ha-map-card](https://github.com/nathan-gs/ha-map-card)
5. [layout-card](https://github.com/thomasloven/lovelace-layout-card)

Stellantis Vehicles must already expose a real vehicle. Mileage and tracker data are the universal baseline; battery entities are only required for battery-specific features.

See [Installation](docs/INSTALLATION.en.md).

## Dashboard views

| View | Purpose |
| --- | --- |
| **Vehicle** | Current vehicle state, LIVE hero, range/energy or fuel state, latest trip/charge and quick actions. |
| **Charging** | Charging sessions and charge curves when the vehicle exposes charging capabilities. |
| **Statistics** | Mileage, driven distance, consumption and available SOH/long-term statistics. |
| **Trips** | Canonical driving history, filters and data-quality handling. |
| **GPS** | Recorder/server position history plus current vehicle position. |
| **Wake-up** | Manual and optional reachability controls. |
| **Notifications** | Recipient controls, thresholds, quiet hours and diagnostics. |
| **System** | Integration/runtime administration and mapped upstream diagnostics. |

Views and cards are capability-gated: unsupported electric or fuel features are not shown merely because another vehicle type provides them.

### Vehicle / LIVE

![Vehicle LIVE view](docs/assets/vehicle-live.png)

### Charging

![Charging history](docs/assets/charging-history.png)

### Statistics

![Long-term statistics](docs/assets/statistics.png)

### Trips

![Trip history with private rows redacted](docs/assets/trips-history.png)

### GPS

![GPS history with map and position redacted](docs/assets/gps-history.png)

### Wake-up

![Wake-up controls](docs/assets/wakeup.png)

### Notifications

![Notification controls](docs/assets/notifications.png)

### System

![System view](docs/assets/system.png)

## Migration from e-C3 Dashboard

SV Dashboard is a **new Home Assistant integration** with the domain `sv_dashboard`; it is not an in-place rename of `e_c3_dashboard`.

During the beta phase the recommended migration is:

1. keep the old e-C3 Dashboard installation available as reference;
2. install SV Dashboard separately;
3. configure the same upstream vehicle in SV Dashboard;
4. validate dashboard, history and controls;
5. remove the old e-C3 Dashboard only after the SV installation is confirmed.

Existing e-C3 Dashboard config entries are not silently rewritten into the new domain. SV Dashboard uses its own stores; available history is fetched/rebuilt independently rather than copying private predecessor storage.

The migration implementation and owner live acceptance are recorded in the now-completed [migration issue #1](https://github.com/CaneTLOTW/sv_dashboard/issues/1).

## Development and validation

Active development happens on `develop`. External beta testers receive an exact validated commit/pre-release rather than a moving development branch.

CI currently checks:

- Python compilation
- frontend JavaScript syntax
- Node regression tests
- all JSON catalogs
- Home Assistant translation key/placeholder coverage
- 18-language frontend/backend coverage
- SV domain/branding rules
- Hassfest
- HACS repository validation

Promotion to `main` happens only after the exact candidate has passed CI and the required live acceptance.

## License and trademarks

SV Dashboard is licensed under **GPL-3.0-or-later**. See [LICENSE](LICENSE).

SV Dashboard is an independent community project and is not affiliated with or endorsed by Stellantis, its brands, Home Assistant or their affiliates. Brand names are used only to describe compatibility/interoperability. See [TRADEMARKS.md](TRADEMARKS.md).

## Documentation

- [Installation](docs/INSTALLATION.en.md)
- [Vehicle validation guide](docs/VEHICLE_VALIDATION.en.md)
- [Community guide](docs/COMMUNITY.en.md)
- [Concept](docs/CONCEPT.md)
- [Dashboard features](docs/DASHBOARD_FEATURES.md)
- [Entity catalog](docs/ENTITY_CATALOG.md)
- [Localisation](docs/LOCALISATION.en.md)
- [Notifications and wake-up](docs/NOTIFICATIONS_AND_WAKEUP.en.md)
- [Vehicle overview card](docs/VEHICLE_OVERVIEW_CARD.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [Branch and deployment workflow](docs/BRANCH_AND_DEPLOYMENT_WORKFLOW.md)

For current compatibility/beta testing, use the [Vehicle validation guide](docs/VEHICLE_VALIDATION.en.md) and GitHub Discussions once enabled. The completed migration history remains available in [issue #1](https://github.com/CaneTLOTW/sv_dashboard/issues/1).
# SV Dashboard

**Stellantis Vehicle Dashboard for Home Assistant**

SV Dashboard is a HACS custom integration that builds a vehicle-focused Home Assistant dashboard on top of [Stellantis Vehicles](https://github.com/andreadegiovine/homeassistant-stellantis-vehicles).

> **Beta status:** SV Dashboard is the successor to `CaneTLOTW/e_c3_dashboard`. The new Home Assistant domain is `sv_dashboard`. Owner runtime validation has progressed through beta.25; beta.26 is the next frozen external DS N°4/French validation candidate. Real-vehicle evidence now covers both field availability and vehicle-specific timing/behavior differences before promotion to `main`.

[![Open the SV Dashboard repository in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=CaneTLOTW&repository=sv_dashboard&category=integration)

Install this repository as an **Integration**, not as a standalone Lovelace-card repository.

### Beta updates through HACS

While SV Dashboard is distributed only as GitHub **prereleases**, beta testers should enable the per-repository **Pre-release** switch for SV Dashboard in HACS. With that switch disabled, HACS can fall back to the repository's `develop` commit SHA instead of advertising the semantic `v0.6.0-beta.N` tag.

HACS 2.0.x also currently builds the external update/release link without GitHub's required `/tag/` path segment. A 404 from that particular HACS-generated link does not mean the SV Dashboard package failed to install; use the canonical GitHub release page (`/releases/tag/<tag>`) instead. This upstream behavior is tracked in [issue #41](https://github.com/CaneTLOTW/sv_dashboard/issues/41).

Once a stable SV Dashboard release exists, normal stable users should not need to enable HACS prereleases.

## What it provides

- Dynamic vehicle discovery from Stellantis Vehicles; no hard-coded VIN entity IDs.
- Multi-vehicle dashboard generation with brand-aware titles.
- Capability-based UI for electric, hybrid and combustion vehicles.
- Electric SOC/range/charging views only when the upstream vehicle exposes those capabilities.
- Fuel/range/consumption views for combustion-capable vehicles when available upstream.
- A compact universal vehicle overview plus a native **Dual-Energy** vehicle overview for simultaneous battery + fuel presentation.
- Native Hero interactions: vehicle navigation and Home Assistant More Info/history for temperature, battery/fuel percentages and the active detail metric.
- Trip, charging, fuel and GPS history with data-quality guards.
- Long-term statistics for supported mileage/SOH data.
- Optional notifications, recipients, warning thresholds, quiet hours and reachability diagnostics.
- Wake-up/reachability controls with conservative status handling.
- 18 Home Assistant/frontend/backend languages with English fallback.
- No fixed e-C3/DS4 battery-capacity assumption; battery energy is shown only from trustworthy vehicle-specific data or an explicit per-vehicle fallback.

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
| Citroën ë-C3 CC21 | **Confirmed owner validation** — EV dashboard/runtime validation plus end-of-trip odometer behavior evidence |
| DS N°4 MY2026 PHEV | **Active external beta** — real Hybrid/French validation by `@chmtc94`; live odometer and reduced status-payload behavior documented |
| DS4 E-Tense Hybrid 225 MY2022 | **Historical tester evidence** — richer legacy payload retained for cross-generation comparison |
| Peugeot | **Expected / upstream-supported** — real SV vehicle test pending |
| Opel | **Expected / upstream-supported** — real SV vehicle test pending |
| Vauxhall | **Expected / upstream-supported** — real SV vehicle test pending |

Other Stellantis brands are **not claimed as supported** unless the upstream integration exposes the required vehicle data and SV Dashboard has been validated against it.

See the [Vehicle validation guide](docs/VEHICLE_VALIDATION.en.md), [Vehicle capability evidence matrix](docs/VEHICLE_CAPABILITY_MATRIX.md), the completed [migration record](https://github.com/CaneTLOTW/sv_dashboard/issues/1) and the active [DS N°4 / Hybrid beta issue](https://github.com/CaneTLOTW/sv_dashboard/issues/2).

## Powertrain behavior

SV Dashboard derives a vehicle capability profile from the upstream integration. For calculations where timing/semantics matter, it also distinguishes **behavioral capability** from simple field presence:

- **Electric** — SOC, electric range, charging, battery/SOH and electric energy metrics when available.
- **Hybrid / PHEV** — electric and fuel capabilities can appear simultaneously or independently. The Dual-Energy Hero keeps both energy domains visible without inventing unavailable values.
- **Thermic / combustion** — fuel level, fuel range and fuel-consumption views where available; electric-only charging and battery analytics remain hidden.
- **Hydrogen / unknown** — handled defensively; only capabilities actually exposed upstream are shown.
- **Behavior-qualified metrics** — a mapped field is not automatically a valid live metric. For example, odometer updates can be live on one vehicle but arrive only after trip completion on another; a fuel-consumption field can be present but remain unusably stale/zero while driving.

The Dual-Energy Hero keeps **electric range and fuel range permanently visible**. It does not replace the electric range with a synthetic live EV-efficiency estimate while driving. A secondary live fuel-consumption value is shown only when the mapped upstream value is numeric, fresh for the current drive and behaviorally trustworthy; otherwise the fuel range remains the authoritative visible value. Package metrics such as `current_trip_energy` still exist elsewhere in the generated dashboard/history, and package-derived charge power/energy can be battery-side SOC/time estimates rather than EVSE/grid meter readings.

## Languages

Home Assistant integration UI, package-owned entities, frontend cards and backend messages use the same 18-language matrix:

`de`, `en`, `fr`, `it`, `es`, `pt`, `nl`, `da`, `nb`, `sv`, `fi`, `pl`, `cs`, `sk`, `hu`, `ro`, `sl`, `hr`

English is the fallback language. DE/EN/FR runtime switching of the native Dual-Energy Hero has been visually checked, including long French Hybrid labels. See [Localisation](docs/LOCALISATION.en.md).

## Public vehicle cards

SV Dashboard exposes two vehicle cards in Home Assistant's normal card picker.

### Compact universal overview

```yaml
type: custom:sv-dashboard-vehicle-overview-card
```

This is the compact reusable vehicle card for another Home Assistant dashboard. With multiple SV Dashboard entries, bind it to the required config entry with `entry_id`.

![Compact vehicle overview card](docs/assets/vehicle-overview-card.png)

See [Vehicle overview card](docs/VEHICLE_OVERVIEW_CARD.md).

### Dual-Energy overview

```yaml
type: custom:sv-dashboard-dual-energy-overview-card
```

This is the wide native battery + fuel Hero intended especially for Hybrid/PHEV vehicles. It supports idle, driving and charging presentation, native More Info/history targets, mapped preconditioning and automatic localisation.

![Dual-Energy Hero – English](docs/assets/dual-energy-hero-en.svg)

See [Dual-Energy vehicle overview card](docs/DUAL_ENERGY_OVERVIEW_CARD.md) for DE/EN/FR examples and the exact data/interaction contract.

Advanced users are not limited to the bundled presentation: the mapped Stellantis entities and SV-owned metric entities are normal Home Assistant data sources. A custom Lovelace/YAML prototype plus screenshots can be shared as concrete design input for future package features.

## Requirements

SV Dashboard currently targets Home Assistant **2026.5.0 or later**.

Install and configure these dependencies first:

1. [Stellantis Vehicles](https://github.com/andreadegiovine/homeassistant-stellantis-vehicles)
2. [Bubble Card](https://github.com/Clooos/Bubble-Card)
3. [Button Card](https://github.com/custom-cards/button-card)
4. [ha-map-card](https://github.com/nathan-gs/ha-map-card)
5. [layout-card](https://github.com/thomasloven/lovelace-layout-card)

Stellantis Vehicles must already expose a real vehicle. Mileage and tracker data are the universal baseline; battery/fuel/charging entities are capability-specific.

See [Installation](docs/INSTALLATION.en.md).

## Dashboard views

| View | Purpose |
| --- | --- |
| **Vehicle** | Current vehicle state, native LIVE/Dual-Energy Hero where applicable, range/energy/fuel state, latest trip/charge and quick actions. |
| **Charging** | Charging sessions and charge curves when the vehicle exposes charging capabilities. |
| **Statistics** | Mileage, driven distance, consumption and available SOH/long-term statistics. |
| **Trips** | Canonical driving history, filters and data-quality handling. |
| **GPS** | Recorder/server position history plus current vehicle position. |
| **Wake-up** | Manual and optional reachability controls. |
| **Notifications** | Recipient controls, thresholds, quiet hours and diagnostics. |
| **System** | Integration/runtime administration, mapped upstream diagnostics and the opt-in privacy-safe Vehicle API audit. |

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

Promotion to `main` happens only after the exact candidate has passed CI and the required owner/external live acceptance. The current plan is to complete the frozen beta.26 DS N°4/French retest before the next `develop` → `main` promotion.

## License and trademarks

SV Dashboard is licensed under **GPL-3.0-or-later**. See [LICENSE](LICENSE).

SV Dashboard is an independent community project and is not affiliated with or endorsed by Stellantis, its brands, Home Assistant or their affiliates. Brand names are used only to describe compatibility/interoperability. See [TRADEMARKS.md](TRADEMARKS.md).

## Documentation

- [Installation](docs/INSTALLATION.en.md)
- [Vehicle validation guide](docs/VEHICLE_VALIDATION.en.md)
- [Vehicle capability evidence matrix](docs/VEHICLE_CAPABILITY_MATRIX.md)
- [beta.26 DS N°4 external test scope](docs/BETA26_TEST_SCOPE.md)
- [Vehicle capability audit](docs/VEHICLE_AUDIT.md)
- [Community guide](docs/COMMUNITY.en.md)
- [Concept](docs/CONCEPT.md)
- [Stellantis API reference and runtime findings](docs/STELLANTIS_API_REFERENCE.md)
- [Dashboard features](docs/DASHBOARD_FEATURES.md)
- [Entity catalog](docs/ENTITY_CATALOG.md)
- [Localisation](docs/LOCALISATION.en.md)
- [Notifications and wake-up](docs/NOTIFICATIONS_AND_WAKEUP.en.md)
- [Vehicle overview card](docs/VEHICLE_OVERVIEW_CARD.md)
- [Dual-Energy vehicle overview card](docs/DUAL_ENERGY_OVERVIEW_CARD.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [Branch and deployment workflow](docs/BRANCH_AND_DEPLOYMENT_WORKFLOW.md)

For current compatibility/beta testing, use the [Vehicle validation guide](docs/VEHICLE_VALIDATION.en.md) and GitHub Discussions once enabled. The completed migration history remains available in [issue #1](https://github.com/CaneTLOTW/sv_dashboard/issues/1).

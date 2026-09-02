# Changelog

All notable user-facing changes to SV Dashboard are recorded here.

SV Dashboard uses semantic package versions. `develop` is the integration/acceptance branch; `main` represents the last explicitly accepted publishable state.

## 0.6.0-beta.5 candidate hardening

- Removed the browser-time `unpkg.com` dependency; Lit is pinned and bundled locally with its license notice.
- Added stable VIN-backed ConfigEntry identity/recovery and a powertrain fallback override that is available only when automatic detection remains unknown.
- Added live `kWh/100 km` trip consumption, Hybrid/Fuel-aware local fallback history and fuel telemetry in trip notifications.
- Centralized the new Hybrid/Fuel card strings into the shared 18-language frontend catalogs.
- Hardened refuelling detection against single-sample fuel-level spikes and made charge-power formatting locale-aware.
- Renamed remaining internal `Ec3...` implementation classes to neutral `Sv...` names without changing public entity identity.

## Unreleased — 0.6.0-beta.1 migration line

### Migration

- Created SV Dashboard as the successor to the former e-C3 Dashboard project.
- Introduced the new Home Assistant domain `sv_dashboard` and component path `custom_components/sv_dashboard/`.
- Migrated the validated predecessor `develop` source baseline from exact SHA `0a2873611d92a36eca4c41d165ea1fc1462caa50`.
- Replaced active product/runtime identifiers with SV Dashboard naming rather than carrying the old integration domain forward.
- Moved active migration, DS4 beta, notification QA, LTS and backlog tracking into the new SV Dashboard repository.

### Added / expanded

- Multi-brand vehicle naming and multi-vehicle behavior.
- Capability-based handling for electric, hybrid and combustion vehicles, with defensive hydrogen/unknown handling.
- Vehicle-specific battery-capacity/residual resolver with no generic fixed e-C3 capacity.
- 18-language Home Assistant, frontend and backend message matrix:
  `de`, `en`, `fr`, `it`, `es`, `pt`, `nl`, `da`, `nb`, `sv`, `fi`, `pl`, `cs`, `sk`, `hu`, `ro`, `sl`, `hr`.
- Structural CI checks for Home Assistant translation keys/placeholders, frontend catalogs, backend messages and locale fallbacks.
- New repository description/topics and HACS metadata required for repository validation.
- GPL-3.0-or-later licensing and explicit trademark/affiliation notice.
- Generalized vehicle capability documentation and explicit tested/beta/expected compatibility status.

### Documentation

- Rebuilt README for SV Dashboard, the new `sv_dashboard` domain and the migration/beta state.
- Updated installation, architecture, entity catalog, dashboard features, localisation, notification/wake-up, vehicle-card, release and branch workflow documentation.
- Retained anonymized screenshots as UI examples.
- Kept predecessor e-C3 observations only where they are useful as clearly labelled historical/reference vehicle evidence.

### Validation status

- Source/frontend test suite migrated and passing on the SV code line.
- 97 predecessor regression tests migrated; additional HA translation-structure coverage added during migration.
- Hassfest passing on validated migration commits.
- HACS repository validation passing after repository metadata/license setup.
- Owner live e-C3 regression on the new SV integration is still pending.
- DS4 Hybrid/French external beta is still pending in issue #2.
- Notification real-event QA continues in issue #3.
- Mileage/LTS investigation continues in issue #4.

No stable SV Dashboard release has been promoted to `main` yet.

## Historical predecessor baseline — e-C3 Dashboard 0.5.53 (2026-08-30)

The migration source inherited the predecessor project's mature feature set, including:

- generated Vehicle, Charging, Statistics, Trips, GPS, Wake-up, Notifications and System views;
- reusable vehicle overview/LIVE hero card;
- canonical Stellantis trip/charge/GPS history and data-quality handling;
- package-owned notification thresholds, quiet hours and recipient controls;
- manual history synchronization, wake-up and notification-test actions;
- long-term-statistics presentation and trailing consumption metrics;
- a single package-owned frontend resource model;
- restart-safe local history/notification state;
- multi-entry config-entry mapping without household-specific VIN/entity IDs.

Historical development detail remains available in the predecessor repository/Git history and closed issues. New work is tracked only in `CaneTLOTW/sv_dashboard`.

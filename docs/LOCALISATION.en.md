# Localisation

SV Dashboard supports 18 UI languages:

`de`, `en`, `fr`, `it`, `es`, `pt`, `nl`, `da`, `nb`, `sv`, `fi`, `pl`, `cs`, `sk`, `hu`, `ro`, `sl`, `hr`.

English is the fallback language.

The localisation contract covers three separate runtime surfaces: Home Assistant integration/entity translations, browser/frontend cards, and backend notification/logbook text. They intentionally use different catalog files but the same supported language matrix.

## Home Assistant UI and package-owned entities

Home Assistant config flows, options and package-owned entity names use the runtime catalogs in `translations/<language>.json` for all 18 languages. `translations/en.json` defines the canonical key set and English fallback. This custom integration does not use `strings.json`.

All 18 files must keep identical keys and format placeholders.

Package-owned sensors, switches, numbers, times and buttons use `translation_key` values rather than relying on their English fallback names. This includes the package **Dashboard status** sensor; it is not a special English-only exception.

Examples from the French entity surface include:

- `dashboard_status` → `Statut du tableau de bord`
- `current_trip_energy` → `Énergie consommée sur le trajet en cours`
- `current_trip_consumption` → `Consommation du trajet en cours`
- `current_charge_power` → `Puissance de recharge actuelle`
- `last_trip_result` → `Dernier trajet enregistré par SV Dashboard`
- `last_charge_result` → `Dernière recharge enregistrée par SV Dashboard`
- `trailing_consumption_500km` → `Consommation moyenne (500 km)`

The `local` result concept therefore means **observed/derived locally by SV Dashboard**, not "at home". Translations must not imply home charging or a geographic location.

## Frontend

The bundled Lovelace frontend resolves the Home Assistant/browser locale through the shared i18n layer in `custom_components/sv_dashboard/static/`.

Regional variants are normalized, for example:

- `fr-FR` → `fr`
- `de-AT` → `de`
- `nb-NO` / `no-NO` → `nb`
- unsupported locales → `en`

Trip history, charging history, fuel history, the compact vehicle overview, the Dual-Energy overview and generated dashboard views use the same locale resolver. Do not add language conditionals to business logic or private `TEXT` matrices to card files.

The public Home Assistant card-picker names are also localized. The compact overview and the wide Dual-Energy overview must remain distinguishable in every language.

### Hybrid / Dual-Energy terminology

The Dual-Energy Hero has its own canonical frontend namespace, `dualEnergyOverview`, but it is part of the same 18-language runtime contract.

Examples:

| Concept | DE | EN | FR |
| --- | --- | --- | --- |
| battery | Batterie | Battery | Batterie |
| fuel | Kraftstoff | Fuel | Carburant |
| electric range | E-Reichweite | EV range | Autonomie électrique |
| fuel range | Kraftstoffreichweite | Fuel range | Autonomie carburant |
| current-trip energy used | Verbraucht | Energy used | Énergie consommée |
| charge power | Ladeleistung | Charge power | Puissance de recharge |

The Hero's current-trip energy value is an **absolute kWh value**. Translators must not label it as `kWh/100 km` consumption. Likewise, current charge power may be a battery-side SOC/time estimate and should not be worded as though it were a direct wallbox/EVSE meter reading.

DE / EN / FR runtime language switching of the native Hero was visually checked during beta.9 owner QA; the long French labels remained stable without clipping or column drift.

See [Dual-Energy vehicle overview card](DUAL_ENERGY_OVERVIEW_CARD.md).

## Backend messages

Server-side notifications, push messages and Logbook messages use `custom_components/sv_dashboard/i18n.py`. The backend catalog covers the same 18-language matrix and preserves keys and format placeholders across languages. Any new backend message key must be added to all 18 languages in the same change.

## Translation rules

- Keep labels concise and suitable for Home Assistant controls, badges and cards.
- Preserve technical meaning; do not turn short UI labels into explanatory prose.
- Keep placeholders unchanged.
- Translate visible package text only. Upstream entity states, attributes and remote commands are not rewritten.
- Do not imply measurement precision or provenance that the source does not provide.
- English defines canonical semantics; changes must remain structurally complete in all 18 languages.
- Wording-only corrections should remain narrow; do not broadly rewrite already-reviewed languages without a concrete defect.

## CI contract

CI checks:

- exact Home Assistant translation-key parity across all 18 catalogs;
- non-empty values and placeholder parity;
- frontend key/placeholder parity;
- source coverage for all supported frontend languages;
- backend message coverage;
- locale fallback behavior;
- public vehicle-card naming separation;
- targeted long-label smoke coverage for DE/FR/PL.

The old post-composition capability-label compatibility patch is no longer part of the runtime model; capability labels are owned by the normal per-language catalogs.

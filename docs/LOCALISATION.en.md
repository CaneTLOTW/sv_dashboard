# Localisation

SV Dashboard supports 18 UI languages:

`de`, `en`, `fr`, `it`, `es`, `pt`, `nl`, `da`, `nb`, `sv`, `fi`, `pl`, `cs`, `sk`, `hu`, `ro`, `sl`, `hr`.

English is the fallback language.

## Home Assistant UI

Home Assistant config flows, options and package-owned entity names use:

- `strings.json` as the canonical schema
- `translations/<language>.json` for all 18 languages

All translation files must keep identical keys and format placeholders.

## Frontend

The bundled Lovelace frontend resolves the Home Assistant/browser locale through the shared i18n layer in `custom_components/sv_dashboard/static/`.

Regional variants are normalized, for example:

- `fr-FR` → `fr`
- `de-AT` → `de`
- `nb-NO` / `no-NO` → `nb`
- unsupported locales → `en`

Trip history, charging history, vehicle overview and dashboard views use the same locale resolver. Do not add language conditionals to business logic.

## Backend messages

Server-side notifications and Logbook messages use `custom_components/sv_dashboard/i18n.py`. The backend catalog covers the same 18-language matrix and preserves format placeholders across languages.

## Translation rules

- Keep labels concise and suitable for Home Assistant controls, badges and cards.
- Preserve technical meaning; do not turn short UI labels into explanatory prose.
- Keep placeholders unchanged.
- Translate visible package text only. Upstream entity states, attributes and remote commands are not rewritten.
- English defines canonical semantics; changes must remain structurally complete in all 18 languages.

CI checks Home Assistant key coverage, placeholder parity, frontend key coverage, backend message coverage and locale fallback behavior.

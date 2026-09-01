# Maintainer notes for coding agents

This file is a compact operating guide for AI-assisted and automated changes. It complements, rather than replaces, [CONTRIBUTING.md](CONTRIBUTING.md).

## Branch and deployment workflow

- Develop **all** features, fixes, documentation, tests, dependency changes and candidate version bumps on `develop`. Do not commit product feature/fix work directly to `main`.
- The designated Home Assistant household instance is the acceptance/canary runtime and may intentionally run an **exact `develop` SHA**. This is live acceptance, not a public/stable release.
- Every runtime Issue must distinguish:
  - **Candidate** = exact `develop` SHA/version prepared in GitHub;
  - **Runtime** = exact SHA/version deployed into Home Assistant;
  - **Validated** = exact Runtime SHA/version that passed required live/user checks.
- Never describe a Candidate as deployed or validated merely because it exists on `develop`.
- Every Codex deployment records the exact SHA and reports PASS/FAIL against that same SHA in the relevant GitHub Issue.
- A required Home Assistant restart is a normal deployment step. After restart, continue with the task-specific functional check.
- Runtime validation is **task-driven**. Transport/management/health endpoints are diagnostic tools when needed, not an unrelated precondition for normal SV Dashboard acceptance.
- A newer `develop` HEAD never silently changes the currently deployed Runtime.
- `main` represents the last accepted/publishable state. Stable promotion is fast-forward only to the exact validated SHA; no squash/rebase/cherry-pick between acceptance and promotion.
- Stable tag/release comes from that exact `main` SHA.
- Emergency fixes still use `develop` → validation → fast-forward `main`.
- If `main` and `develop` diverge, stop release work and reconcile through a maintenance Issue.

Full rationale: [Branch and deployment workflow](docs/BRANCH_AND_DEPLOYMENT_WORKFLOW.md).

## Temporary patches versus accepted source

- Temporary runtime/frontend patches are diagnostic evidence, not accepted architecture.
- Before acceptance, fold proven behavior into the canonical owning source, remove the temporary path, bump frontend cache/version when required and repeat affected tests.
- Do not accumulate post-generation Strategy wrappers, `customElements.define` interception, runtime monkey patches or multiple separately registered Lovelace resources merely because they worked during diagnosis.
- Prefer one package-owned frontend entry resource; internal ES module order/readiness is owned by that entry module.
- A third-party compatibility shim must be narrow, necessary, canonical, documented and regression-tested.
- An Issue cannot become `Validated` while accepted behavior still depends on a disposable diagnostic patch.

## Issue-based task and agent handoff workflow

- GitHub Issues in `CaneTLOTW/sv_dashboard` are the canonical work items for bugs, features, migrations, investigations and follow-ups.
- Do not maintain a duplicate Home Assistant todo item for repository work.
- Durable architecture/contracts belong in repository code/docs; an Issue is the work thread, not the only documentation.
- Search existing/open/recently closed Issues before creating a duplicate.
- ChatGPT prepares analysis, architecture, code, tests, documentation and executable runbooks as far as possible before Codex handoff.
- Codex is primarily the executor for work requiring the real Home Assistant runtime: deployment, entity/config-entry resolution, reload/restart, runtime tests and sanitized evidence.
- Codex may fix a **small, obvious and local defect** needed for the handed-off acceptance, on `develop`, with focused tests and explicit reporting.
- Larger contract/architecture changes are handed back instead of being redesigned during execution.
- Use Issue comments headed `## ChatGPT → Codex Handoff`, `## Codex → ChatGPT Ergebnis`, and `## ChatGPT Review / Next Step`.
- Handoffs reference exact branch/SHA, scope, runbook, acceptance criteria and prohibited changes.
- Keep an Issue open until its acceptance/runtime criteria are actually complete.

## Scope and architecture

- SV Dashboard is a portable companion integration for `andreadegiovine/homeassistant-stellantis-vehicles`; it does not call the Stellantis API directly.
- Select an upstream vehicle through config flow and map entities through Home Assistant entity/device registries; never derive entity IDs from VIN, friendly name or household slug.
- Keep package-owned metrics/session/notification state scoped to the config entry.
- Do not edit user `.storage` dashboards or `configuration.yaml` directly.
- Dashboard JavaScript consumes the integration mapping/capability contract and remains safe when optional upstream entities are absent or unavailable.
- Features are capability-gated rather than hard-coded to a vehicle model or brand.

## Privacy and compatibility

- Do not commit VINs, GPS tracks/private locations, screenshots with private data, exports, tokens, recipient names, credentials or raw Home Assistant config.
- Do not copy proprietary Stellantis application code. Use the public upstream integration contract.
- New functionality must degrade visibly and safely rather than pretending a remote command or data value is supported.

## User-facing text

- Config/options/entity text belongs in `strings.json` plus `translations/`.
- Custom dashboard/card text belongs in the shared frontend i18n catalogs under `static/`.
- Notification and Logbook text belongs in `i18n.py`.
- Preserve the full supported 18-language matrix for changed user-facing keys.
- Keep keys/placeholders structurally identical across languages.
- Keep UI labels concise and technically precise; do not expand badges, controls or card labels into explanatory prose.
- Do not place language conditionals in calculations or notification business logic.
- Do not broadly rewrite already reviewed translations without a concrete semantic/technical defect.

## Validation before runtime acceptance or release

Run at least:

```sh
python3 -m py_compile custom_components/sv_dashboard/*.py
node --check custom_components/sv_dashboard/static/frontend.js
node --check custom_components/sv_dashboard/static/i18n.js
node --check custom_components/sv_dashboard/static/sv_dashboard.js
node --check custom_components/sv_dashboard/static/vehicle-overview-card.js
node --check custom_components/sv_dashboard/static/gps-history-card.js
node --check custom_components/sv_dashboard/static/gps-history-core.js
node --check custom_components/sv_dashboard/static/trip-history-card.js
node --check custom_components/sv_dashboard/static/charge-history-card.js
node --check custom_components/sv_dashboard/static/charge-history-core.js
node --test tests/*.test.mjs
python3 -m json.tool hacs.json
python3 -m json.tool custom_components/sv_dashboard/manifest.json
git diff --check
```

The normal `Validate` workflow additionally checks all translation JSON catalogs, SV domain/branding, HACS and Hassfest.

For runtime acceptance, deploy the exact candidate `develop` SHA and record it in the Issue. Test a fresh config entry when onboarding/config-flow behavior changed and the generated dashboard after frontend changes. Keep HACS, Home Assistant Core and Stellantis Vehicles compatibility explicit in documentation.

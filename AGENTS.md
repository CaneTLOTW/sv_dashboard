# Maintainer notes for coding agents

This file is a compact operating guide for AI-assisted and automated changes. It complements, rather than replaces, [CONTRIBUTING.md](CONTRIBUTING.md).

## Agent role split — mandatory

- **ChatGPT owns development.** Analysis, architecture, source-code changes, documentation changes, tests, migrations, candidate/version preparation and release-plan changes are prepared and reviewed by ChatGPT before any Codex handoff.
- **Codex is deployment/runtime execution only.** Codex may execute an already prepared runbook against the designated Home Assistant runtime: verify the exact candidate SHA/version, deploy/install it, reload/restart when instructed, run the prescribed runtime checks, collect sanitized evidence and report PASS/FAIL in the canonical GitHub Issue.
- **Codex must never develop or patch product source.** It must not edit source, frontend, tests, docs, translations, manifests, version/cache values or repository architecture; it must not create an implementation commit, “quick fix”, hotfix, migration or speculative workaround during deployment.
- If deployment exposes a defect, missing prerequisite or ambiguous instruction, Codex must **STOP and report the evidence back to the Issue**. ChatGPT then prepares the required source change and a new exact Candidate.
- Codex may run read-only/static validation commands defined by the Issue or this repository, but validation does not authorize source modification.
- Codex must never turn an uncommitted/runtime-only patch into a candidate. A runtime copy is not a source of truth.
- Repository mutations that are not deployment evidence comments are outside the Codex role unless the maintainer gives an explicit one-off instruction for a non-development administrative action.

## Codex handoff default

- ChatGPT → Codex handoffs are **Issue-driven**. The canonical GitHub Issue must already contain the complete deployment runbook, exact Candidate SHA/version, runtime steps, acceptance criteria, abort conditions and prohibited actions before Codex is started.
- When that canonical Issue exists, the user-facing Codex start instruction must contain **only the full repository name and the Issue number**.
- Canonical short handoff form:

  ```text
  Repository: CaneTLOTW/sv_dashboard
  Issue: #55
  ```

- Do **not** duplicate the Issue body, runbook, SHA list, acceptance criteria, prohibitions or explanatory prose into the chat handoff.
- Codex must open the referenced Issue itself and follow the latest applicable `## ChatGPT → Codex Handoff` or `## ChatGPT Review / Next Step` comment.
- If the Issue is not yet complete enough for execution, **do not expand the chat handoff**. First update the canonical Issue, then hand off only repository + Issue number.
- An Issue number without the full repository name is never sufficient.

## Vehicle capability evidence matrix

- Read and maintain [`docs/VEHICLE_CAPABILITY_MATRIX.md`](docs/VEHICLE_CAPABILITY_MATRIX.md) whenever work touches vehicle-specific data, controls, capability discovery, fallbacks, LIVE metrics or external vehicle testing.
- New real-vehicle evidence must update the matrix in the same workstream when it materially changes what SV knows about a model year/powertrain/API capability.
- Record observed evidence as `confirmed`, `absent`, `reported-historical`, or `unknown`; never infer support merely from brand, platform, related model or previous model year.
- Prefer capability-gated behavior. Introduce model-/vehicle-class-specific behavior only when repeated evidence shows capability discovery cannot express the difference safely.
- Keep current/live API values separate from completed-trip/history values; availability of one never proves availability of the other.
- Do not commit private raw exports, VINs, locations or account data to support the matrix; reference sanitized fixtures and canonical Issues instead.

## Branch and deployment workflow

- Develop **all** features, fixes, documentation, tests, dependency changes and candidate version bumps on `develop`. Do not commit product feature/fix work directly to `main`.
- The designated Home Assistant household instance is the acceptance/canary runtime and may intentionally run an **exact `develop` SHA**. This is live acceptance, not a public/stable release.
- Every runtime Issue must distinguish:
  - **Candidate** = exact `develop` SHA/version prepared in GitHub by the development/review side;
  - **Runtime** = exact SHA/version deployed into Home Assistant by the deployment executor;
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
- Before acceptance, ChatGPT must fold proven behavior into the canonical owning source, remove the temporary path, bump frontend cache/version when required and repeat affected tests.
- Codex must not create or retain runtime monkey patches as a deployment shortcut.
- Do not accumulate post-generation Strategy wrappers, `customElements.define` interception, runtime monkey patches or multiple separately registered Lovelace resources merely because they worked during diagnosis.
- Prefer one package-owned frontend entry resource; internal ES module order/readiness is owned by that entry module.
- Browser runtime dependencies must be pinned and shipped locally with SV Dashboard; do not add CDN/runtime imports such as unpkg to package JavaScript. Preserve required third-party license notices.
- A third-party compatibility shim must be narrow, necessary, canonical, documented and regression-tested.
- An Issue cannot become `Validated` while accepted behavior still depends on a disposable diagnostic patch.

## Issue-based task and agent handoff workflow

- GitHub Issues in `CaneTLOTW/sv_dashboard` are the canonical work items for bugs, features, migrations, investigations and follow-ups.
- Do not maintain a duplicate Home Assistant todo item for repository work.
- Durable architecture/contracts belong in repository code/docs; an Issue is the work thread, not the only documentation.
- Search existing/open/recently closed Issues before creating a duplicate.
- ChatGPT prepares analysis, architecture, source changes, tests, documentation, exact Candidate SHA/version and the executable deployment runbook **before** Codex handoff.
- Codex executes only the prepared deployment/runtime runbook. It may resolve runtime entity/config-entry identifiers, install the exact Candidate, reload/restart, perform the specified runtime checks and collect sanitized evidence.
- Codex **must not fix even a small or obvious defect** during execution. Any defect or missing source change is returned to ChatGPT for preparation of a new Candidate.
- Use Issue comments headed `## ChatGPT → Codex Handoff`, `## Codex → ChatGPT Ergebnis`, and `## ChatGPT Review / Next Step`.
- Handoffs reference exact branch/SHA, scope, runbook, acceptance criteria and prohibited changes **inside the canonical Issue**.
- Chat handoffs must use the short repository-qualified form defined at the top of this file whenever the Issue already contains the complete task.
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

- Config/options/entity text belongs in `translations/<language>.json`; `translations/en.json` defines the canonical runtime key set. Do not add `strings.json` to this custom integration.
- Custom dashboard/card text belongs in the shared frontend i18n catalogs under `static/`.
- Notification, push and Logbook text belongs in `i18n.py`.
- Every new or changed user-facing string — config, options, entities, frontend, notification, push or Logbook — must be carried through the full supported 18-language matrix in the same change.
- `tests/ha-translation-structure.test.mjs`, `tests/frontend-i18n.test.mjs` and `tests/server-i18n.test.mjs` are mandatory parity guards; do not bypass them for new text.
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
node --check custom_components/sv_dashboard/static/vehicle-audit-card.js
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

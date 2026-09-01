# Branch and deployment workflow

## Branch roles

SV Dashboard uses two long-lived branches:

- `develop` — integration, validation and acceptance branch;
- `main` — last explicitly accepted publishable state.

A designated Home Assistant instance may run an exact `develop` commit for acceptance. That does not make the commit a stable/public release.

## Normal flow

```text
GitHub Issue
  -> implementation on develop
  -> repository/static validation
  -> Candidate = exact develop SHA/version
  -> deploy exact Candidate to acceptance Home Assistant
  -> required reload/restart
  -> Runtime = exact deployed SHA/version
  -> task-specific browser/app/runtime validation
  -> integrate any diagnostic-only patch back into canonical source
  -> build/redeploy replacement Candidate if needed
  -> Validated = exact Runtime SHA/version that passed required checks
  -> explicit maintainer/user acceptance
  -> fast-forward that exact Validated SHA to main
  -> tag/release from that exact main SHA
```

## Candidate, Runtime and Validated

Every active deployment issue should record:

```text
Candidate: <develop SHA> / <version>
Runtime:   <deployed SHA> / <version> | NOT_DEPLOYED
Validated: <accepted SHA> / <version> | NOT_VALIDATED
```

Rules:

1. `Candidate` changes when a new intended test commit is prepared.
2. `Runtime` changes only after that exact candidate is deployed.
3. A newer `develop` HEAD does not silently change the Home Assistant runtime.
4. `Validated` changes only after the required live/browser/app checks pass on the exact Runtime.
5. Failed runtimes remain useful evidence but are not accepted candidates.
6. Only an exact `Validated` SHA can be promoted to `main`.
7. Runtime-only diagnostic patches must first be integrated into canonical source and retested as a new Candidate.

## Runtime acceptance

A Home Assistant Core restart is a normal deployment step when Python/platform code changed. Frontend-only changes may require resource/cache refresh instead.

Acceptance is task-specific: open the generated dashboard, resolve the config entry/entities, exercise the changed control/card/history flow and verify the exact behavior named in the active issue.

Transport/health interfaces are diagnostic tools, not an unrelated acceptance gate unless connectivity itself is the feature under test.

## Patch-to-source gate

Temporary runtime/frontend patches can be useful during diagnosis but are not permanent architecture.

Before acceptance:

1. identify what the diagnostic patch proved;
2. move the behavior into the canonical owning module;
3. remove the temporary patch path;
4. bump the frontend cache/version when browser code changed;
5. rerun repository tests;
6. deploy the integrated Candidate;
7. repeat the affected runtime checks.

SV Dashboard should normally register exactly one package-owned Lovelace resource:

```text
/sv_dashboard/frontend.js
```

Package-owned ES modules are imported from that entry point rather than independently registered/raced resources.

A narrowly scoped compatibility shim for a third-party component is acceptable only when the third-party public API cannot express the required behavior. It must remain isolated, canonical and regression-tested.

## Invariants

1. Feature, fix, documentation, test and version changes are prepared on `develop`.
2. `main` does not receive an independent product fix/feature lane.
3. Before stable promotion, `main` must be an ancestor of the validated `develop` SHA.
4. Promotion is **fast-forward only** to the exact accepted SHA.
5. Do not squash, rebase or cherry-pick between runtime acceptance and promotion.
6. Tags/releases are created from promoted `main`, never an unvalidated development head.
7. Emergency fixes use the same `develop -> validate -> accept -> fast-forward main` path.

## Version and frontend cache

`manifest.json` version and `FRONTEND_VERSION` are maintained as part of the candidate on `develop`.

Frontend behavior changes must use a new cache/resource version. Internal `?v=` imports must remain coherent with the intended frontend version.

Documentation-only changes do not require a runtime version bump.

## Runtime deployment contract

A deployment result should record at least:

```text
repository: CaneTLOTW/sv_dashboard
source branch: develop
Candidate SHA/version: <sha> / <version>
Runtime SHA/version before deploy: <sha> / <version>
Runtime SHA/version after deploy: <sha> / <version>
frontend resource version: <version>
HA deployment/restart: PASS|FAIL
browser/app validation: PASS|FAIL|NOT_TESTED
Validated SHA/version: <sha> / <version> | NOT_VALIDATED
issue acceptance: PASS|FAIL|BLOCKED
```

A runtime copy with uncommitted/local modifications is never a new source of truth. Any useful runtime-only diff must be committed back to `develop` and retested before stable promotion.

## GitHub Issue handoff

The issue remains the operative work thread. Recommended headings:

```md
## ChatGPT -> Codex Handoff
## Codex -> ChatGPT Ergebnis
## ChatGPT Review / Next Step
```

Always distinguish intended Candidate, actually deployed Runtime and finally Validated SHA.

## Prohibited branch operations

Unless an explicit branch-recovery task requires otherwise:

- no direct product feature/fix commits on `main`;
- no independent cherry-picks to both long-lived branches;
- no squash/rebase between acceptance and promotion;
- no force-push of `main`/`develop`;
- no blind branch-content merge to hide semantic conflicts;
- no release from an unvalidated commit.

## Branch health

Before beginning or closing substantial work verify:

```text
main ancestor of develop: YES
main-only product commits: 0
develop status: equal to main OR ahead of main
```

If the branches diverge, stop release work and resolve the divergence through a maintenance issue before the next promotion.

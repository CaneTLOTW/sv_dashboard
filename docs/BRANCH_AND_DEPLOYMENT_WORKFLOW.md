# Branch and deployment workflow

## Branch roles

SV Dashboard uses two long-lived branches:

- `develop` — integration, validation and acceptance branch;
- `main` — last explicitly accepted publishable state.

After the first accepted promotion, the GitHub repository **default branch is `main`**. `develop` remains long-lived but must not be the default/public fallback once it can contain unaccepted work.

A designated Home Assistant instance may run an exact `develop` commit for acceptance. That does not make the commit a stable/public release.

## Agent responsibility split

Repository/source development and runtime deployment are deliberately separated.

- **ChatGPT prepares the Candidate.** This includes analysis, architecture, code, tests, documentation, migrations, version/cache changes, release notes and the exact `develop` SHA/version intended for acceptance.
- **Codex deploys and validates the prepared Candidate.** It installs the exact SHA/version on the designated Home Assistant runtime, performs only the runtime steps defined in the canonical Issue, restarts/reloads when required, collects sanitized evidence and reports PASS/FAIL.
- Codex does **not** edit product source, frontend, tests, docs, translations, manifests, versions or repository architecture. It does not create implementation commits or deployment-time hotfixes.
- If runtime validation exposes a defect or missing source change, Codex stops and reports the evidence. ChatGPT prepares a replacement Candidate, which is then deployed as a new exact SHA/version.

## Normal flow

```text
GitHub Issue
  -> ChatGPT implementation/review on develop
  -> repository/static validation
  -> Candidate = exact develop SHA/version
  -> ChatGPT completes the deployment runbook in the canonical Issue
  -> Codex deploys exact Candidate to acceptance Home Assistant
  -> required reload/restart
  -> Runtime = exact deployed SHA/version
  -> Codex performs the prescribed browser/app/runtime validation
  -> PASS: Validated = exact Runtime SHA/version
  -> FAIL/BLOCKED: Codex reports evidence and stops
  -> ChatGPT prepares replacement Candidate when needed
  -> explicit maintainer/user acceptance
  -> optional immutable external prerelease from that exact Validated develop SHA
  -> external acceptance when required
  -> fast-forward the accepted SHA to main
  -> stable tag/release from the accepted main SHA
```

## Candidate, Runtime and Validated

Every active deployment issue should record:

```text
Candidate: <develop SHA> / <version>
Runtime:   <deployed SHA> / <version> | NOT_DEPLOYED
Validated: <accepted SHA> / <version> | NOT_VALIDATED
```

Rules:

1. `Candidate` changes when a new intended test commit is prepared by the development/review side.
2. `Runtime` changes only after that exact candidate is deployed.
3. A newer `develop` HEAD does not silently change the Home Assistant runtime.
4. `Validated` changes only after the required live/browser/app checks pass on the exact Runtime.
5. Failed runtimes remain useful evidence but are not accepted candidates.
6. Only an exact `Validated` SHA can be promoted to `main`.
7. Runtime-only modifications are never candidates. Any required source change must be prepared on `develop` by ChatGPT and retested as a new Candidate.

## Runtime acceptance

A Home Assistant Core restart is a normal deployment step when Python/platform code changed. Frontend-only changes may require resource/cache refresh instead.

Acceptance is task-specific: open the generated dashboard, resolve the config entry/entities, exercise the changed control/card/history flow and verify the exact behavior named in the active issue.

Transport/health interfaces are diagnostic tools, not an unrelated acceptance gate unless connectivity itself is the feature under test.

Codex may inspect runtime state and execute the prescribed validation commands, but a failed check never authorizes it to patch source or create a replacement Candidate.

## Patch-to-source gate

Temporary diagnostic evidence may reveal the required source change, but deployment execution itself must stay patch-free.

Before acceptance:

1. identify what runtime evidence proved;
2. ChatGPT moves the required behavior into the canonical owning module;
3. ChatGPT removes any obsolete diagnostic path;
4. ChatGPT bumps frontend cache/version when browser code changed;
5. repository tests are rerun;
6. a new exact Candidate SHA/version is recorded;
7. Codex deploys that integrated Candidate;
8. the affected runtime checks are repeated.

SV Dashboard should normally register exactly one package-owned Lovelace resource:

```text
/sv_dashboard/frontend.js
```

Package-owned ES modules are imported from that entry point rather than independently registered/raced resources.

A narrowly scoped compatibility shim for a third-party component is acceptable only when the third-party public API cannot express the required behavior. It must remain isolated, canonical and regression-tested.

## Invariants

1. Feature, fix, documentation, test and version changes are prepared on `develop`.
2. Codex does not create source/product commits as part of deployment.
3. `main` does not receive an independent product fix/feature lane.
4. Before stable promotion, `main` must be an ancestor of the validated `develop` SHA.
5. Promotion is **fast-forward only** to the exact accepted SHA.
6. Do not squash, rebase or cherry-pick between runtime acceptance and promotion.
7. **External prerelease tags/releases** may be created from an exact, statically/runtime-validated `develop` candidate when the purpose is immutable external acceptance. They must never point at a moving branch head.
8. **Stable tags/releases** are created only from the accepted `main` SHA.
9. Emergency fixes use the same `develop -> validate -> accept -> fast-forward main` path.

## External prerelease contract

When an external tester is needed before stable promotion:

1. freeze an exact validated `develop` SHA;
2. create an immutable semantic prerelease tag for that SHA;
3. publish it as a GitHub **Pre-release**;
4. ask the tester to use Marketplace or legacy HACS **Pre-release**, never a moving `develop` checkout;
5. record tester acceptance against that exact tag/SHA;
6. do not move/recreate the tag if `develop` advances later.

A prerelease from `develop` is an acceptance artifact, not a stable-main promotion.

## Version and frontend cache

`manifest.json` version and `FRONTEND_VERSION` are maintained as part of the candidate on `develop`.

Frontend behavior changes must use a new cache/resource version. Internal `?v=` imports must remain coherent with the intended frontend version.

Documentation-only changes do not require a runtime version bump.

## Python bytecode and frontend identity during deployment or rollback

Timestamp-based Python bytecode can remain valid when a source replacement preserves its old mtime and size. A previous version's bytecode can therefore be imported from an otherwise correct package tree. See [Issue #136](https://github.com/CaneTLOTW/sv_dashboard/issues/136#issuecomment-7213957163).

For normal package deployments and recovery:

1. Verify exact candidate SHA, successful CI, package path, complete rollback backup (including relevant store and resource evidence), and current HA readiness. A retained/unknown climate sensor is not a deployment gate; do not poll the vehicle. Schedule around a known in-flight command or imminent dispatch.
2. Stage and verify candidate source/assets; replace only the intended package files, preserving ownership, permissions and ACLs. Do not copy generated caches from staging or backup. Use fresh source mtimes for changed files when possible; mtime alone is not sufficient.
3. Before requesting a Core restart, invalidate generated Python caches only below the verified `custom_components/sv_dashboard` directory: remove actual package-local `__pycache__` directories and generated `.pyc` files without following symlinks or touching other integrations, storage, dependencies or source. Verify the package boundary and cache absence; report counts. A currently running process can regenerate caches, so recheck after restart and validate loaded identity, not merely the cleanup command.
4. Request one normal Core restart and observe process replacement/readiness; a management timeout is not evidence that a second request is needed. Verify tracked package hashes, HA configuration/health, integration readiness, and expected backend behavior using an existing read-only live API. For beta.18, the authenticated departure-plans `get` response includes the new global `climate_min_soc` field; check this alongside the versioned resource. Do not invoke a settings mutation to test identity.
5. The package's frontend registration must converge to exactly one expected versioned SV resource in storage-mode Lovelace, with matching served assets. Inspect authenticated resource and asset responses when available; do not edit `.storage` manually or mask a stale resource by adding a second one. Browser reload/behavior is a separate acceptance check. Report missing evidence as NOT_TESTED; do not claim validated runtime solely from source hashes or `ready`.
6. If a restart/deployment fails, report the evidence. When an authorized rollback is required, restore the verified previous source/assets and invalidate package-local bytecode again. A separate controlled recovery restart is required to reload restored code when the process may have imported the failed candidate; do not call a disk-only rollback a verified running rollback. Verify previous backend identity, resource and health after recovery. If a recovery restart cannot be completed, explicitly report running identity UNKNOWN and stop rather than cycling restarts.

No vehicle command, manual store edit, source hotfix or stable promotion is authorized by this procedure. Normal startup-managed resource and store changes are distinct from manual edits and must be documented.

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

A runtime copy with uncommitted/local modifications is never a new source of truth.

## GitHub Issue handoff

The GitHub Issue is the complete operative runbook. Recommended headings:

```md
## ChatGPT -> Codex Handoff
## Codex -> ChatGPT Ergebnis
## ChatGPT Review / Next Step
```

Before Codex is started, the Issue must already contain the exact Candidate SHA/version, deployment/runtime steps, acceptance criteria, abort conditions and prohibited actions.

The **user-facing Codex start prompt must then contain only**:

```text
Repository: CaneTLOTW/sv_dashboard
Issue: #<number>
```

Do not copy the Issue body, runbook, SHA list, acceptance criteria or extra instructions into the chat handoff. If the Issue is incomplete, update the Issue first rather than expanding the Codex prompt.

Always distinguish intended Candidate, actually deployed Runtime and finally Validated SHA.

## Prohibited branch operations

Unless an explicit branch-recovery task requires otherwise:

- no direct product feature/fix commits on `main`;
- no Codex product/source commits during deployment;
- no independent cherry-picks to both long-lived branches;
- no squash/rebase between acceptance and promotion;
- no force-push of `main`/`develop`;
- no blind branch-content merge to hide semantic conflicts;
- no release from an unvalidated commit.

## Branch health

Before beginning or closing substantial work verify:

```text
GitHub default branch: main
main ancestor of develop: YES
main-only product commits: 0
develop status: equal to main OR ahead of main
```

If the branches diverge, stop release work and resolve the divergence through a maintenance issue before the next promotion.

# Issue-board closure audit — 2026-11-04

This is the **truth-preserving archive** for the maintainer-directed closure of the previously open SV Dashboard GitHub issues. Closing an issue is repository housekeeping, **not proof of product/runtime acceptance**. All previous issue bodies, evidence, comments and attachments remain accessible through their original URLs.

## Still outstanding after issue closure

| Topic | Original issue | Remaining evidence/action |
|---|---|---|
| Overlapping trips / wrong duration | [#125](https://github.com/CaneTLOTW/sv_dashboard/issues/125) | 04 Nov owner screenshots show two 08:18 trips: 23 km/28 min and 43 km/**14 h 28 min**; physical trip identity, raw boundaries, odometer continuity and source timestamps remain **unresolved**. Collect privacy-sanitized raw trip rows before mutating the canonical model. |
| Upstream 2026.10.3 compatibility | [#123](https://github.com/CaneTLOTW/sv_dashboard/issues/123) | UTC query bug source-fixed in [PR #124](https://github.com/CaneTLOTW/sv_dashboard/pull/124), CI PASS, landed `main`; full owner runtime compatibility, MQTT command lifecycle, and upstream PRs #704/#705/#706 still **unverified**. |
| Mixed-unit trip speed | [#120](https://github.com/CaneTLOTW/sv_dashboard/issues/120) | [PR #122](https://github.com/CaneTLOTW/sv_dashboard/pull/122) fixed mixed km/h vs m/s and landed `main`. Owner runtime still displayed 171.7/191.7 km/h on the **previous installed build**; validate after deployment and canonical reload; avoid claiming automatic historical repairs until observed. |
| Ongoing charging curve 0–2% SOC defect | [#120](https://github.com/CaneTLOTW/sv_dashboard/issues/120) | [PR #126](https://github.com/CaneTLOTW/sv_dashboard/pull/126) protects null/residual SOC, active 1%-step plotting and live refresh; source CI PASS, landed `develop` only as of this audit. **No new beta, main promotion, owner deployment or real-vehicle acceptance** yet. |
| External DS N°4 MY2026 Hybrid validation | [#2](https://github.com/CaneTLOTW/sv_dashboard/issues/2) | Tester `chmtc94` last reported **02 Oct 2026** on beta.36: duplicated charge row and stale/duplicated trip SOC/range boundaries. beta.40 issued **03 Oct 2026**, but **no reported installation/result yet**. The tester can reply to the archived issue; reopen or make a fresh issue for new evidence. |
| Notification natural events | [#3](https://github.com/CaneTLOTW/sv_dashboard/issues/3) | Quiet-hours outage/recovery, one wake-up probe per true stale episode, fresh telemetry recovery and natural notification de-duplication have not all been verified end-to-end. |
| Advanced notification routing / EventEntity | [#78](https://github.com/CaneTLOTW/sv_dashboard/issues/78) | Requested feature remains **unimplemented / not scheduled**; preserve specification without implying delivery. |
| Optional future analytics | [#5](https://github.com/CaneTLOTW/sv_dashboard/issues/5), [#6](https://github.com/CaneTLOTW/sv_dashboard/issues/6), [#7](https://github.com/CaneTLOTW/sv_dashboard/issues/7) | Consumption by temperature/speed, temperature-aware DC curve comparison, EVSE/meter energy and charge costs are **unimplemented backlog**, not defects fixed by beta.40. |

## Source consolidation completed / already subsumed

- [#115](https://github.com/CaneTLOTW/sv_dashboard/issues/115): live charging power/provenance, nonzero positive threshold, per-metric timestamps and bounded freshness addressed in the beta.37–40 development line and regression tests. Real-charge display acceptance may need repeating in the next runtime candidate.
- [#116](https://github.com/CaneTLOTW/sv_dashboard/issues/116): Recorder-backed read-only diagnostics implemented; prior-window baseline leak audited/fixed, CI PASS. Owner diagnostics UX/privacy runtime acceptance was not separately documented as complete.
- [#117](https://github.com/CaneTLOTW/sv_dashboard/issues/117): completed-charge metadata/provenance and same physical session merging consolidated into beta.40 source via [#121](https://github.com/CaneTLOTW/sv_dashboard/issues/121); DS N°4 validation pending.
- [#118](https://github.com/CaneTLOTW/sv_dashboard/issues/118): per-field canonical trip resolver and timestamp-quality guard consolidated into beta.40 via #121; DS N°4 verification pending.
- [#114](https://github.com/CaneTLOTW/sv_dashboard/issues/114): owner-only harness implementation subject to explicit activation and existing CI contract; owner-specific runtime overlay is not a public product feature.
- [#120](https://github.com/CaneTLOTW/sv_dashboard/issues/120): beta.40 published and owner-side accepted as of Oct 2026; current Nov 04 observations belong to later source changes, not immutable beta.40.
- [#123](https://github.com/CaneTLOTW/sv_dashboard/issues/123): UTC source change accepted; remaining runtime checks described above.

## Reopening policy

A **new verified bug, external tester response, repeatable runtime regression, or feature prioritization** warrants reopening the relevant archived thread (or creating a linked new issue if the failure has a different root cause). Do not treat GitHub `closed` state as proof of functional correctness and do not quietly discard attached logs or screenshots.

The public tester thread #2 remains historically browsable and can receive follow-up comments even if closed as part of this housekeeping request. No follow-up with the tester has been fabricated or assumed.

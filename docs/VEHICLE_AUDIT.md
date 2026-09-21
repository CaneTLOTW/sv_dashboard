# Vehicle capability audit

SV Dashboard includes an opt-in, **read-only vehicle capability audit** for onboarding and comparing real Stellantis vehicles.

The audit is intentionally located in the generated dashboard's **System** view. It is a diagnostic/tester tool rather than a normal vehicle-control surface.

## Purpose

Stellantis vehicles can expose different fields and remote capabilities by vehicle, model year, powertrain, activated services and account authorization. SV Dashboard therefore records evidence for the exact tested vehicle instead of inferring support from a model name.

The audit provides one repeatable way to answer:

- which current status fields are actually returned;
- which upstream Home Assistant entities are mapped and available;
- which documented vehicle capabilities are advertised;
- which useful status paths are returned but not currently mapped upstream;
- which historical Trips query/pagination behavior is observed;
- which optional read-only HAL resources are advertised and accessible.

Official API links and durable protocol findings are maintained in [Stellantis API reference and runtime findings](STELLANTIS_API_REFERENCE.md).

## Safety contract

The default audit is **Phase A / read-only**.

It does not:

- wake the vehicle;
- send MQTT vehicle commands;
- start/stop charging or preconditioning;
- operate horn, lights or locks;
- create/delete callbacks or monitors;
- change Home Assistant, Stellantis Vehicles or SV Dashboard configuration;
- write an audit report to `/config/www` or another persistent server path.

All API reads reuse the already-loaded **Stellantis Vehicles** authenticated transport/session. SV Dashboard does not create a second OAuth/client/session stack.

Potential active command testing belongs to a separate, explicit future Phase B and is never part of the automatic audit.

## Running the audit

Open the generated SV Dashboard and go to:

**System → Vehicle API audit**

Choose **Run audit**.

The card shows a result for every bounded probe. A probe can be:

- `pass`;
- `unavailable`;
- `forbidden`;
- `error`.

An unavailable or forbidden optional endpoint is useful capability evidence and does not abort the complete audit.

After a successful run:

- **Download JSON** creates the sanitized report locally in the browser with a JavaScript `Blob`;
- **Copy Markdown** creates a compact GitHub-ready summary in the clipboard.

No unauthenticated download URL is created.

## Read-only probes

The Phase A audit attempts, where supported by the loaded upstream runtime:

- vehicle/account collection;
- current vehicle status;
- maintenance;
- vehicle extensions:
  - `onboardCapabilities`;
  - branding;
  - pictures;
- Trips collection:
  - baseline page;
  - `pageSize=1`;
  - `indexRange=0-0`;
  - explicit final index when a global total is available;
  - server-provided HAL `last`;
  - timestamp-overlap query;
  - one bounded trip-detail lookup;
- advertised read-only HAL relations:
  - telemetry;
  - alerts;
  - collisions;
  - alarms;
  - last position.

HAL links are followed only when they remain on the expected HTTPS Stellantis API origin/path.

## Structural inventory

For the current status payload, the report creates a flattened path inventory containing, where applicable:

- JSON path;
- observed value type;
- occurrence count;
- bounded observed enum values;
- freshest source timestamp and age;
- whether that path is already represented by the loaded upstream integration's sensor/binary-sensor mapping.

The `unmapped_candidate_fields` section is evidence for investigation, **not** an instruction to automatically expose every field as a Home Assistant entity.

## Privacy

The audit is designed for a report that can be attached to a public GitHub issue.

The sanitizer removes or replaces at least:

- OAuth/MQTT tokens and other secrets;
- customer/account identifiers;
- VIN and opaque vehicle identifiers;
- correlation/callback/monitor identifiers;
- exact GPS coordinates;
- URLs/HAL links that may contain vehicle identifiers;
- ABRP/external-service tokens.

Known identifiers are also scrubbed when embedded inside strings. Large lists, objects and strings are bounded so a report cannot accidentally become an unbounded raw-log dump.

Useful non-identifying evidence is retained, including:

- brand;
- powertrain/capability profile;
- API field names and structure;
- safe enum/numeric values;
- timestamps;
- probe status;
- history counts and sanitized trip signatures.

The report includes a `privacy_redaction_summary` stating the export contract. Testers should still review a file before publishing it publicly.

## Report schema

Current schema version: **1**

Top-level sections:

- `schema_version`
- `generated_at`
- `audit_id`
- `mode`
- `environment`
- `vehicle_summary`
- `advertised_capabilities`
- `upstream_entities`
- `probe_results`
- `status_path_inventory`
- `trip_query_audit`
- `unmapped_candidate_fields`
- `privacy_redaction_summary`

The audit ID is a stable one-way hash for correlating repeated reports from the same SV config entry/vehicle without exporting the VIN or vehicle identifier.

## Accepted runtime QA status

The audit has completed owner-runtime acceptance across the beta.22–beta.24 hardening cycle and is included in the beta.26 external validation candidate.

Accepted behavior:

- the audit resolves the **currently loaded** Stellantis Vehicles client at run time and rejects a stale client that is already shutting down;
- browser export supports both the normal Clipboard API and a local-HTTP fallback for Home Assistant origins where `navigator.clipboard` is unavailable;
- vehicle/status/maintenance/branding/pictures and bounded Trips probes can complete independently of optional HAL resources;
- optional resources can remain unavailable or authorization-limited without turning the full audit into a false global failure;
- probe failures retain a privacy-safe error class/status summary rather than triggering a second request/authentication path;
- raw Stellantis status aliases are normalized **for audit comparison only** so already mapped battery/SOC/range/charging/preconditioning fields are not falsely reported as new unmapped capabilities.

The owner-runtime acceptance established that a successful audit does **not** mean every optional endpoint is available. In the accepted run, ordinary vehicle/status/history probes succeeded while some optional resources remained unavailable or authorization-limited. This is valid capability evidence rather than a product failure.

### Audit-only alias reconciliation

Real status payloads can expose raw paths that differ from the canonical upstream mapping paths. The audit keeps the raw inventory intact for diagnostics but canonicalizes known aliases when deciding whether a field is already represented upstream.

Examples include:

- raw `energy[].battery.*` versus mapped `energies[].extension.electric.battery.*`;
- raw electric range/SOC/charging aliases under `energy[]`;
- observed `preconditionning.*` spelling versus the existing upstream `preconditioning.*` mapping;
- `charging.nextDelayedTime` represented by the upstream charging-start time entity.

This reconciliation is deliberately narrow. It does **not** create new Home Assistant entities, rewrite the raw export or infer semantics from unknown fields.

At the end of the beta.24 reconciliation, the remaining actionable unmapped evidence was intentionally limited to naturally unobserved/empty data such as charging schedules and `stolen.*` state/timestamps. Those remain future-evidence items rather than reasons to add speculative entities.

## Evidence policy

Audit results update [Vehicle capability matrix](VEHICLE_CAPABILITY_MATRIX.md) only as evidence for the vehicle/runtime that produced them.

A returned or advertised field must not be generalized to another model, model year or powertrain without separate evidence. Likewise, a field being absent or forbidden in one audit does not prove platform-wide absence.

Implementation history and future natural-capability evidence are tracked in [issue #70](https://github.com/CaneTLOTW/sv_dashboard/issues/70). The core audit/runtime/path-normalization work is accepted; #70 should now be used only for genuinely new vehicle/API evidence rather than cosmetic reclassification.

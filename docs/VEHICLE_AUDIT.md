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

- `ok`;
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

## Evidence policy

Audit results update [Vehicle capability matrix](VEHICLE_CAPABILITY_MATRIX.md) only as evidence for the vehicle/runtime that produced them.

A returned or advertised field must not be generalized to another model, model year or powertrain without separate evidence. Likewise, a field being absent or forbidden in one audit does not prove platform-wide absence.

Current implementation/testing is tracked in [issue #70](https://github.com/CaneTLOTW/sv_dashboard/issues/70).

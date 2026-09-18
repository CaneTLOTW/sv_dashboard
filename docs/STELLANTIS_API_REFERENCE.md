# Stellantis API reference and runtime findings

This document records Stellantis B2C API behavior relevant to SV Dashboard and separates **officially documented contracts** from **empirically observed production behavior**.

SV Dashboard remains a companion integration for [Stellantis Vehicles](https://github.com/andreadegiovine/homeassistant-stellantis-vehicles). It does not introduce a second authentication/session stack, and observed behavior is not treated as a permanent API contract unless Stellantis documents it.

## Canonical Stellantis documentation

Use these links for future API audits:

- [B2C API reference](https://developer.groupe-psa.io/webapi/b2c/api-reference/references/)
- [Trips reference](https://developer.groupe-psa.io/webapi/b2c/api-reference/references/#tag/Trips)
- [API concepts / collection pagination](https://developer.groupe-psa.io/webapi/b2c/overview/api-concepts/)
- [Data availability and scopes](https://developer.groupe-psa.io/webapi/b2c/quickstart/data-availability-scopes/)
- [Vehicle capability / eligibility quickstart](https://developer.groupe-psa.io/webapi/b2c/quickstart/enroll-users/)
- [B2C API changelog](https://developer.groupe-psa.io/webapi/b2c/api-reference/changelog/)
- [Remote API overview](https://developer.groupe-psa.io/webapi/b2c/remote/about/)
- [Monitor API overview](https://developer.groupe-psa.io/webapi/b2c/monitor/about/)

The official documentation describes the API reference as the superset of possibilities. A value is available only when it is documented, produced by the vehicle, uploaded by an activated vehicle service and authorized for the application/user. This is why SV Dashboard keeps real-vehicle capability evidence separate from model/year assumptions.

## Trips collection: documented pagination

For collections Stellantis documents:

- `indexRange=a-b` to request a specific element range;
- `pageSize=n` to limit results per page;
- HAL navigation through optional `_links.first/next/prev/last`;
- `total` as the collection element count.

The documentation does **not** guarantee the chronological ordering of the Trips collection. Ordering remains an observed behavior unless Stellantis documents it explicitly.

## Trips collection: production probe 2026-09-18

A read-only probe was executed against the owner's production B2C account. No wake-up, MQTT/remote action or configuration mutation was performed. Private identifiers and HAL URLs were sanitized.

Canonical runtime evidence: [issue #69](https://github.com/CaneTLOTW/sv_dashboard/issues/69).

Observed behavior:

| Query | Observed result |
| --- | --- |
| normal collection | first page starts with the oldest trip |
| `indexRange=0-0` | oldest trip |
| `indexRange=0-4` | first five trips in chronological ascending order |
| `pageSize=1` | oldest trip; global `total` preserved; HAL `last` present |
| `indexRange=global_total-1` | newest trip |
| follow `_links.last` from `pageSize=1` | same newest trip as the explicit final index |

The observed collection was therefore chronological ascending:

**index 0 = oldest; global total - 1 = newest.**

### Important `indexRange` behavior

When `indexRange` was used, the production response changed `total` to the size of the requested window:

- `indexRange=0-0` → `total=1`;
- `indexRange=0-4` → `total=5`.

A ranged response therefore cannot by itself reveal the global final index. A caller that wants `total - 1` must first obtain the global collection size separately.

By contrast, `pageSize=1` preserved the global `total` and returned server-generated HAL navigation links.

## Decision: keep timestamp + page-token/HAL pagination for SV history

SV Dashboard will **not switch historical synchronization to `indexRange`**.

The canonical server-history flow remains:

1. initial/full sync without a timestamp lower bound;
2. incremental sync from the newest stored server trip minus a two-hour overlap;
3. follow server-provided `_links.next` page tokens until exhaustion;
4. merge and deduplicate by Stellantis trip ID;
5. persist canonical history locally.

This is a better fit for synchronization than random-access ranges because it:

- follows server-provided collection navigation;
- avoids global-index arithmetic;
- supports incremental timestamp windows directly;
- works naturally with overlap plus ID deduplication;
- does not depend on the observed chronological ordering remaining unchanged.

`indexRange` remains useful for targeted diagnostics, sampling and future repair/audit tooling.

## Gap recovery after inactivity or Home Assistant downtime

SV Dashboard does not use upstream `get_vehicle_last_trip()` as its canonical history source.

If Home Assistant is offline while trips occur, the next successful incremental sync begins from the newest already persisted trip minus overlap and retrieves subsequent pages. Normal downtime gaps are therefore recovered as long as Stellantis still retains those trips server-side.

The server-side trip retention period has not been established and must not be assumed to be unlimited.

## Separate upstream behavior: `get_vehicle_last_trip()`

Current upstream code fetches `get_vehicle_last_trip()` when the engine transitions from running to `Stop`. In that current event-driven path, the maintainer correctly notes that the trip has just ended, so the existing one-day timestamp window is normally sufficient.

However, the helper itself currently applies:

`timestamps=<now - 1 day>/`

If the same helper is used for an **initial/startup last-trip fetch** after the vehicle has been parked for more than 24 hours, it can return no trip. That startup use case was explicitly raised in upstream PR #616.

This is a separate upstream behavior; it is not the method SV Dashboard uses for canonical history.

If upstream wants `get_vehicle_last_trip()` to mean “latest retained trip regardless of age”, the production probe supports:

1. request `distance=0.1-` with `pageSize=1`;
2. follow the server-provided `_links.last`;
3. use the single trip from the final page.

An `indexRange` implementation is also possible after first obtaining the global `total`, but it offers no clear advantage and requires manual global-index arithmetic.

Tracking:
- [SV Dashboard issue #56](https://github.com/CaneTLOTW/sv_dashboard/issues/56)
- [upstream PR #616](https://github.com/andreadegiovine/homeassistant-stellantis-vehicles/pull/616)

## Upstream transport boundary

PR #616 intentionally requests only a raw authenticated history primitive:

`get_vehicle_trips(vehicle, since=None, page_token=None)`

SV Dashboard keeps ownership of:

- pagination traversal;
- overlap and deduplication;
- canonical persistence;
- Recorder/local enrichment;
- quality guards;
- history UI.

The optional `since` parameter remains useful for incremental synchronization and is independent of the fixed one-day behavior in upstream `get_vehicle_last_trip()`.

## Alerts, alarms and vehicle warnings

The Stellantis B2C API documents a per-vehicle **Alerts** collection at
`GET /user/vehicles/{id}/alerts`. The response can be localized with the
`locale` query parameter. The vehicle HAL document can advertise this
collection through its `alerts` relation.

This is separate from **alarms**:

- `alerts` are the server-side vehicle alert/warning collection;
- `alarms` describe the vehicle alarm system and its activation state;
- neither term should be used as a synonym for the other.

The Monitor API can also include `vehicle.alerts` in callback events. Callback
delivery is an explicit monitor/callback configuration and is not automatically
provided merely because a vehicle exposes the Alerts REST endpoint.

Current Stellantis Vehicles does not expose the Alerts collection as a normal
Home Assistant entity and SV Dashboard does not create a second background
poller or monitor/session stack. The Phase A Vehicle API audit therefore probes
the advertised `alerts` relation **on demand and read-only** through the
already-authenticated upstream transport. beta.20 added an `alert_evidence` summary containing probe status and collection count. beta.21 also retains a privacy-sanitized probe error class, HTTP status when available, and bounded error text so a failed Alerts probe can be diagnosed without a second request.

An empty or unavailable Alerts response is not evidence that no warning was
shown locally in the vehicle. API data remains conditional on the vehicle
producing the datum, uploading it through an activated service, and authorizing
it to the requesting application. A dashboard warning such as an electric
drivetrain/motor fault therefore needs real-vehicle evidence before SV can
claim that the same fault is observable through `/alerts`.

Stellantis' broader vehicle-data disclosures also describe diagnostic/error
and malfunction data as data that connected vehicles may generate. That does
not by itself prove that raw DTC/error-code data are exposed by the current B2C
credential scope used by Stellantis Vehicles.

## Vehicle capability API and future audit work

Stellantis documents a vehicle capability/eligibility lookup around `onboardCapabilities`. Capability metadata can indicate datasets and remote operations a vehicle is technically able to support.

Important limitations:

- advertised capability does not prove that a runtime value is currently present or fresh;
- actual availability also depends on vehicle production/upload and user/application authorization;
- compatibility with the mobile-app credential/session path used by the current upstream integration must be tested rather than assumed.

Capability metadata should therefore complement, not replace, real-vehicle evidence in [VEHICLE_CAPABILITY_MATRIX.md](VEHICLE_CAPABILITY_MATRIX.md).

The privacy-safe **Phase A Vehicle API audit** tracked in [issue #70](https://github.com/CaneTLOTW/sv_dashboard/issues/70) is implemented on `develop` and probes, where accessible:

- vehicle/account list and extensions;
- current vehicle status;
- maintenance;
- Trips collection, trip detail and pagination/filter semantics;
- telemetry;
- alerts;
- collisions;
- alarms;
- last-position presence/schema with coordinates redacted;
- `onboardCapabilities`;
- powertrain / engine status;
- kinetic acceleration and lateral acceleration;
- transmission/gearbox mode;
- ADAS;
- `lightingSystem`;
- safety/eCall fields;
- window/roof opening identifiers;
- preconditioning cause/failure fields;
- charging schedule / power-level fields.

A 403, 404 or absent field is capability evidence and does not fail the complete audit. The implementation and privacy/export contract are documented in [Vehicle capability audit](VEHICLE_AUDIT.md).

## Evidence rules

When adding future findings:

- label each finding as **documented** or **observed**;
- do not promote one vehicle's payload to a platform-wide assumption;
- retain the exact documentation link and observation date;
- use sanitized fixtures/issues only;
- keep live/current values separate from completed-trip/history values.

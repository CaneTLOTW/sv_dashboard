# Vehicle capability evidence matrix

This document records **observed vehicle/API capabilities and behavior**, not assumptions based on brand, platform or model name. Stellantis payload shape and refresh semantics can differ by powertrain, model year and even closely related vehicle generations.

The matrix is evidence for architecture decisions. It is **not** a model-name lookup table for runtime behavior.

## Maintenance contract

- Update this matrix whenever a new real vehicle, model year or materially different upstream payload is validated.
- Record only evidence actually observed in runtime, a sanitized fixture/export or a tester report.
- Use `confirmed`, `absent`, `reported-historical`, or `unknown`; do not infer a capability from a related model.
- Keep **field presence** separate from **behavioral semantics**. A field can exist but still be unusable for a live metric.
- Keep **live/current** data separate from **completed-trip/server-history** data.
- A missing or untrusted capability must make SV Dashboard degrade safely; it must not be replaced by an invented value.
- When a feature is based on a configured nominal value or other fallback rather than an upstream measurement, state that explicitly.
- Link the canonical Issue/test source rather than private exports, VINs or location data.
- Prefer the privacy-safe [Vehicle capability audit](VEHICLE_AUDIT.md) for new tester vehicles when available; an audit remains evidence for that exact vehicle/runtime only.

## Payload / field capability evidence

| Vehicle / model year | Powertrain | Electric SOC / range | Fuel level / range | Live fuel consumption field | Completed-trip fuel consumption | Battery SOH capacity / resistance | `kinetic.moving` / speed | Odometer | 12 V battery | Alarm field | Preconditioning | Charging | Notable extra status fields | Evidence / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Citroën ë-C3 CC21, owner runtime | BEV | confirmed | n/a | n/a | n/a | **confirmed**: upstream 2026.9.3 maps SOH capacity/resistance; accepted runtime sample 94% / 100% | unknown / no product contract | confirmed | confirmed upstream entity/path where exposed | confirmed present; semantics not validated | confirmed | confirmed | battery load capacity confirmed; accepted runtime 42.1 kWh | Owner runtime + #70. Raw status exposes battery health/load aliases and canonical upstream mappings. |
| DS N°4, MY2026, tester current vehicle | PHEV | confirmed | confirmed | **absent** in the dedicated 19 Sep trip log: no `consumptions.instant` in 52 status responses, including active-trip samples | confirmed in previously supplied completed-trip fixture | **absent** according to tester and dedicated status log | **absent** in the dedicated status log | confirmed | confirmed raw battery-voltage field | confirmed present | confirmed | confirmed | thermic coolant/oil/air temperatures present | External tester #2 plus sanitized 19 Sep trip/charge logs. |
| DS4 E-Tense Hybrid 225, MY2022, tester historical vehicle | PHEV | confirmed | confirmed | **confirmed present but not proven useful**: `instant=0.0` even while `kinetic.moving=true` and speed is nonzero in the supplied drive log | confirmed present in Trips response, but supplied sample is 0.0 | **confirmed**: supplied sample capacity 95 / resistance 23 | **confirmed**: `kinetic.moving`, speed, acceleration | confirmed | confirmed raw battery-voltage field | confirmed present | confirmed | confirmed | lighting system, belt status, driving mode, engine speeds present | External tester #2 + sanitized 6 Jul historical DS4 log. |

## Behavioral semantics evidence

Presence alone is not enough for calculations. The following behaviors were observed directly.

| Vehicle / model year | Active-trip signal observed | Odometer behavior during active trip | Live fuel-consumption usability | Alarm behavior observed | Behavioral classification |
| --- | --- | --- | --- | --- | --- |
| Citroën ë-C3 CC21, owner runtime | Server Trip History gives authoritative trip boundaries; no live-distance contract is assumed | **Delayed/end-of-trip.** Two genuine trips showed no recorded odometer change during the authoritative trip window; first new value arrived about 55 s and 73 s after trip end and matched the completed trip distance. | n/a | semantics still unknown | `odometer=end_of_trip` |
| DS N°4, MY2026 | `ignition=StartUp` during both dedicated test drives | **Live.** First drive: 2369.1 → 2369.3 → 2369.9 → 2370.7 → 2371.3 km while `StartUp`; second drive: 2371.6 → 2371.9 → 2372.4 → 2373.0 → 2373.9 → 2374.4 → 2374.8 km while `StartUp`. | **Unavailable:** the live field is absent, not merely zero/unavailable. | `Inactive → Active` after opening/entering; remained Active through both drives and a final Start/Stop; returned Inactive only after leaving/closing. This does **not** support interpreting `Active` as a triggered theft alarm. | `odometer=live`; `fuel_instant=absent`; alarm semantics vehicle-specific/unresolved |
| DS4 E-Tense Hybrid 225, MY2022 | `ignition=StartUp` plus `kinetic.moving` and speed | **Live.** Supplied drive log shows 63683.5 → 63685.2 → 63687.1 km during the first drive and 63689.2 → 63690.7 → 63692.2 → 63694.1 → 63695.4 km during the second. | **Present but untrusted for live display:** `instant=0.0` while vehicle is moving at nonzero speed. | Active throughout supplied window; semantics not established from this sample alone. | `odometer=live`; `fuel_instant=present_untrusted` |

## Architectural consequence: canonical metric strategies

SV Dashboard must not make the generated dashboard branch on model names. Instead, each user-facing metric should have a **canonical strategy** with explicit availability, provenance and quality.

Recommended runtime metadata per canonical metric:

- `available`: source exists now;
- `source`: e.g. `upstream_status`, `server_trip`, `reconstructed`, `configured_fallback`;
- `freshness`: timestamp/source age when known;
- `quality`: `direct`, `validated_behavior`, `fallback`, `untrusted`, `unavailable`;
- `live`: whether the value is proven to update while the relevant activity is in progress.

The frontend should consume canonical metrics and their quality metadata. It should **not** know that a DS N°4, DS4 or ë-C3 behaves differently.

### Example: current-trip distance

Use a strategy, not a vehicle special case:

1. If odometer behavior has been validated as `live`, current-trip distance may be calculated from fresh odometer minus the trip-start odometer.
2. If odometer behavior is `end_of_trip`, do not display an odometer-derived live trip distance.
3. Once the authoritative server trip exists, use its server-reported distance for the completed trip regardless of the live strategy.
4. If behavior is still unknown, fail closed and leave live trip distance unavailable.

### Example: live fuel consumption

1. A present field is not sufficient.
2. Show a live value only after a fresh, plausible runtime value has been observed during combustion-engine driving.
3. DS N°4 currently classifies as `absent`.
4. The historical DS4 currently classifies as `present_untrusted` because its field remained 0.0 while the vehicle was demonstrably moving.
5. Do not synthesize a user-facing live l/100 km value from coarse fuel-level percentages.

### Example: live charge sample time and charge-curve provenance

1. Prefer a vehicle/upstream payload timestamp when the mapped charging sample exposes one.
2. Home Assistant `last_updated` is a receipt/runtime fallback only; it must not outrank a valid upstream timestamp merely because HA observed the entity later.
3. Battery-side power already derived from trustworthy residual-energy deltas plus source timestamps is preferred for the displayed charge curve.
4. Whole-percent SOC/time reconstruction remains a fallback when no derived-power sample is available.
5. Keep `received_at` alongside `source_time` for diagnostics; the two timestamps answer different questions and must not be conflated.

This is a provenance rule, not a vehicle-model rule. It applies wherever the upstream integration exposes usable source timestamps and energy data.

### Example: alarm/security state

- Presence of `alarm.status.activation` does not establish user-facing semantics.
- For the DS N°4, `Active` correlates with the open/unlocked-use lifecycle in the dedicated test and therefore must not be presented as “theft alarm triggered”.
- Until semantics are established across more vehicles/events, keep this field diagnostic or neutrally labelled and do not drive safety automations from it.

## Proposed behavioral capability states

Some capabilities cannot be discovered from schema/entity presence alone. Track these as evidence-backed behavioral states per config entry:

| Capability | States | Meaning |
| --- | --- | --- |
| `odometer_update_mode` | `unknown`, `live`, `end_of_trip` | Whether mileage can support current-trip distance |
| `live_fuel_consumption_quality` | `unknown`, `absent`, `direct`, `untrusted` | Whether live l/100 km may be shown |
| `alarm_semantics` | `unknown`, later evidence-defined states only | Prevents interpreting mere field presence as a safety event |
| `movement_signal` | `kinetic`, `ignition`, `none/unknown` | Best observed current-driving signal |
| `soh_source` | `direct`, `absent`, `unknown` | Whether SOH may participate in capacity calculations |

These are **behavior/profile properties**, not hard-coded model capabilities.

## Cross-vehicle rules derived from the evidence

1. **Capability-gate, never model-gate by default.** Model/vehicle-class special cases require repeated evidence that runtime capability/behavior discovery cannot express the difference.
2. **Field presence and field usability are separate.** The historical DS4 proves that a field can exist yet still be useless for a live calculation.
3. **Current/live values and completed-trip values are separate contracts.** A completed trip can contain useful consumption/distance even when the live status path is absent or delayed.
4. **Polling cadence is not equivalent to trip provenance.** Server trips own completed-trip start/stop/distance; local live metrics remain limited by upstream refresh behavior.
5. **SOH is optional.** If a nominal battery-capacity fallback is configured and a trustworthy SOH-capacity percentage exists, SV may apply it. Missing SOH must not block the feature.
6. **Odometer-derived current-trip distance is behavioral.** The N°4 and historical DS4 support it; the owner ë-C3 does not. Never assume it from an odometer entity alone.
7. **Alarm values require semantic validation.** Presence or an `Active` value alone is not enough to call it a triggered alarm.
8. **Raw mileage is source evidence, not the driven-distance LTS contract.** Package-owned Canonical mileage remains the monotonic Home Assistant statistics counter.
9. **The frontend should stay simple.** Complexity belongs in canonical metric/source selection, not duplicated card layouts or per-model JavaScript branches.
10. **Vehicle source time outranks HA receipt time for telemetry deltas.** Keep receipt time for diagnostics/fallback, but do not let it silently replace an available upstream timestamp in charge-power or curve calculations.

## Open evidence requests

- DS N°4 MY2026: validate the next real refuel against the current Fuel History implementation.
- DS N°4 MY2026: final French runtime wording/layout check on the next frozen external prerelease.
- DS N°4 / historical DS4: obtain more natural alarm/security-state samples before assigning a user-facing semantic label.
- Additional Stellantis vehicles: collect odometer update mode and live-fuel-consumption quality because the current evidence proves both are vehicle-dependent behaviors.
- Owner ë-C3: no further odometer test is required unless a future upstream/API change materially changes behavior.

Canonical external vehicle test thread: #2.

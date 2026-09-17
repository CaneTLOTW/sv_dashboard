# Vehicle capability evidence matrix

This matrix records **observed vehicle/API capabilities**, not assumptions based on brand, platform or model name. It exists because Stellantis data points and remote controls can differ by powertrain, model year and even closely related vehicle generations.

## Maintenance contract

- Update this matrix whenever a new real vehicle, model year or materially different upstream payload is validated.
- Record only evidence that was actually observed in a runtime, sanitized fixture/export or tester report.
- Use `confirmed`, `absent`, `reported-historical`, or `unknown`; do not infer a capability from a related model.
- Keep model year and powertrain explicit where known.
- A missing capability must make the SV Dashboard degrade safely; it must not be replaced by an invented value.
- When a feature is based on a fallback/configured nominal value rather than an upstream measurement, say so explicitly.
- Link the canonical Issue/test source rather than committing private exports, VINs or location data.

## Current evidence

| Vehicle / model year | Powertrain | Electric SOC / range | Fuel level / range | Live fuel consumption | Trip fuel consumption | Battery SOH capacity / resistance | `moving` | Mileage during active trip | 12 V battery | Alarm status | Preconditioning | Charging | Wake-up | Evidence / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Citroën ë-C3 CC21, owner runtime | BEV | confirmed | n/a | n/a | n/a | unknown in matrix | n/a | **not continuously confirmed**; owner Recorder evidence shows odometer updates can arrive only later/end-of-trip | confirmed upstream entity path where exposed; SV alert logic exists | upstream entity exists but trustworthy semantics not validated | confirmed | confirmed | confirmed | Runtime/history evidence in #52 and owner acceptance work. Treat live odometer-derived trip distance as unavailable unless a fresh mileage sample proves otherwise. |
| DS4, MY2022, tester historical vehicle | PHEV | reported-historical | reported-historical | unknown | unknown | **reported-historical: capacity + resistance present** | **reported-historical: present** | unknown | unknown | unknown | reported-historical | reported-historical | reported-historical | External tester report in #2. Historical report only; do not use as the contract for newer DS vehicles. |
| DS N°4, MY2026, tester current vehicle | PHEV | confirmed by tester context | confirmed by tester context | **unknown / validation requested** | confirmed in real anonymized trip fixture for completed trips | **absent according to tester** | **absent according to tester** | **unknown / validation requested** | unknown | **semantics questioned; validation requested** | confirmed by tester workflow | confirmed by tester workflow | confirmed by tester workflow | External beta #2. Tester explicitly reports that the MY2026 vehicle no longer exposes `moving`, SOH capacity or SOH resistance that existed on the 2022 DS4. Completed-trip fixture proves fuel `consumption` / `avgConsumption`; live `consumptions.instant` still needs runtime evidence. |

## Cross-vehicle rules derived from the evidence

1. **Capability-gate, never model-gate by default.** Model/vehicle-class special cases require repeated evidence that capability discovery alone cannot express the difference.
2. **Current/live values and completed-trip values are separate contracts.** A completed trip can contain fuel consumption even when the live vehicle-status path is absent or `unknown`.
3. **Polling cadence is not equivalent to trip provenance.** Canonical server trips carry server start/stop data; local live/reconstructed metrics can still be limited by upstream refresh timing.
4. **SOH is optional.** If a nominal battery-capacity fallback is configured and a trustworthy SOH-capacity percentage exists, SV may apply it to the fallback calculation. Missing SOH must not block the feature.
5. **Odometer-derived live trip distance is optional.** Do not advertise "distance since trip start" unless mileage is observed to update during the active trip for that vehicle/runtime.
6. **Alarm values require semantic validation.** Presence of an upstream alarm entity alone is not enough to treat its state as a reliable user-facing alarm indication.

## Open evidence requests

- DS N°4 MY2026: does `fuel_consumption_instant` / raw `energies -> Fuel -> extension -> fuel -> consumptions -> instant` become numeric during combustion-engine driving?
- DS N°4 MY2026: does mileage update during an active trip, or only near/after trip completion?
- DS N°4 MY2026: does the alarm entity ever change meaningfully, and what physical vehicle condition corresponds to each state?
- DS N°4 MY2026: after a manual wake-up, does the temperature entity receive a fresh upstream `updatedAt` timestamp consistently enough to act as a "fresh vehicle payload" indicator?

Canonical external vehicle test thread: #2.

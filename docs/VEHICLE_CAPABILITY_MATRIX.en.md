# Vehicle capability matrix

SV Dashboard is capability-based. A control or sensor exposed by Stellantis Vehicles is not automatically proof that every vehicle supports the corresponding function.

The dashboard distinguishes:

1. an upstream entity/control being present;
2. an upstream request being accepted;
3. the vehicle actually supporting and completing the function.

No unsafe or intrusive remote command is triggered automatically to discover compatibility.

## Brand validation status

| Brand / vehicle | SV Dashboard status | Notes |
| --- | --- | --- |
| Citroën e-C3 | **Confirmed owner validation** | EV dashboard, native Dual-Energy Hero visual/i18n regression and existing e-C3 runtime observations provide the owner reference. |
| DS4 Hybrid | **Active external beta** | Real Hybrid/French/SOH validation is active with `@chmtc94`; this remains the promotion gate before the next `develop` → `main` step. |
| Peugeot | Expected / upstream-supported | Real SV Dashboard validation pending. |
| Opel | Expected / upstream-supported | Real SV Dashboard validation pending. |
| Vauxhall | Expected / upstream-supported | Real SV Dashboard validation pending. |

Compatibility with other Stellantis brands is not claimed unless the upstream integration exposes the required data and a real SV Dashboard test confirms the relevant capabilities.

## Powertrain capability policy

### Electric

May expose SOC, electric range, charging, battery health and electric energy metrics. Battery-derived kWh values are shown only when a trustworthy vehicle-specific capacity/residual value exists.

### Hybrid / PHEV

Electric and fuel capabilities are independent and can be displayed simultaneously. SOC/range can be valid even when battery capacity/residual or SOH data is missing. SV Dashboard must degrade safely rather than invent values.

The native Dual-Energy overview keeps the two domains separate:

- parked: battery SOC/electric range + fuel level/range;
- driving: battery SOC + absolute current-trip energy in kWh; fuel consumption only when a fresh trustworthy upstream value exists, otherwise fuel range;
- charging: battery SOC/current charge power while the fuel side remains available.

The Hero's `current_trip_energy` is not a synthetic `kWh/100 km` value. Derived charge power/energy can be battery-side SOC/time estimates and must not be described as direct EVSE/grid measurements.

### Thermic / combustion

Fuel level, fuel range and fuel consumption may be displayed when mapped upstream. Electric-only charging, traction-battery and electric-energy views remain hidden.

### Hydrogen / unknown

Handled defensively. Only actual mapped capabilities are shown; no powertrain-specific feature is assumed.

## Remote-control policy

- **Presence is not proof of compatibility.** Generic upstream controls can exist even when the vehicle rejects them.
- **Lifecycle completion is not proof of physical effect.** A completed upstream command must not be described as physically verified unless the vehicle-side result was observed.
- **Unavailable controls remain unavailable.** SV Dashboard does not bypass upstream guards.
- **No automatic capability probing.** Locks, horn, lights, preconditioning or charging are never triggered merely to test compatibility.
- **Wake-up remains conservative.** A forwarded/accepted wake-up request is not treated as fresh vehicle telemetry.

## Reference observations: Citroën e-C3

These observations originate from owner/predecessor testing and remain useful as vehicle-specific evidence. They are **not** generalized to other Stellantis vehicles.

| Function | e-C3 observation | SV interpretation |
| --- | --- | --- |
| Vehicle status, SOC, range, odometer, temperature, position | Present in upstream data | Use with freshness handling. |
| Last trip / last charge | Present | Use; derived energy remains an estimate where applicable. |
| Wake-up | Upstream command lifecycle completed in retained tests | Use carefully; completion does not guarantee immediate fresh data. |
| Preconditioning start/stop | Repeatedly completed and vehicle function verified in regular use | Confirmed on the tested e-C3. |
| Door lock/unlock | Returned `Not compatible` | Do not advertise as e-C3 functionality. |
| Horn | Returned `Not compatible` | Do not advertise as e-C3 functionality. |
| Flash / parking lights | Returned `Not compatible` | Do not advertise as e-C3 functionality. |
| Start charging | Unavailable in tested setup | Do not present as operable. |
| Stop charging | Mixed lifecycle results; physical interruption not verified | Do not present as confirmed functionality. |
| Charging limit | Controls available; effect not fully verified | Configuration only until vehicle-side behavior is confirmed. |
| Scheduled charging time | Entity present | Presence alone does not prove remote charging control. |
| ABRP sync | Unavailable without required token/configuration | Integration feature, not a vehicle capability. |
| Battery-value correction | Upstream integration option | Does not alter vehicle behavior. |

## Active external validation: DS4 Hybrid

The DS4 test is intended to verify the areas that cannot be reproduced from the e-C3 owner vehicle:

- automatic Hybrid detection without manual override;
- simultaneous electric + fuel presentation;
- real fuel range/consumption behavior while driving;
- no invented battery capacity/residual when the payload lacks those values;
- behavior of the tester-provided 14.6 kWh per-vehicle fallback;
- SOH capacity/resistance if exposed;
- charging, conditioning and wake-up controls that are actually available;
- unsupported remote functions staying absent;
- French config/options/entity/dashboard/notification wording;
- native Dual-Energy Hero layout and interactions on a real DS4 Hybrid.

The external candidate must be an exact immutable prerelease/SHA rather than a moving `develop` branch.

## Reference telemetry behavior: Citroën e-C3

Observed Recorder data from the predecessor/owner project showed:

| Value | Observed behavior | Dashboard implication |
| --- | --- | --- |
| GPS | Sparse/event-driven updates, commonly around trip end | Do not describe as live tracking. |
| Temperature | Can refresh after wake-up and during driving/charging | Keep freshness visible; do not promise an update for each request. |
| SOC | Integer-percent steps at multi-minute intervals | SOC-derived energy/power/consumption is estimated, not meter-grade. |
| Odometer | Commonly updates at trip end | Trip finalization must tolerate delayed odometer updates. |

## Safe validation of another vehicle

1. Confirm the upstream vehicle is configured and reasonably fresh.
2. Record the mapped sensors and controls without triggering remote actions.
3. Test only safe, deliberate commands required for the beta plan.
4. Record the upstream result and, separately, whether the vehicle-side effect was observed.
5. Mark unsupported/missing capabilities as such; do not add model-specific workarounds without evidence.

See the upstream [Stellantis Vehicles documentation](https://github.com/andreadegiovine/homeassistant-stellantis-vehicles#features) for the upstream feature set. SV Dashboard applies the stricter runtime capability policy documented here.

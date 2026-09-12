# beta.13 owner test scope

This focused prerelease verifies the trip-history regression reported during owner QA after beta.12.

- Pure EV / thermic vehicles: the main Trip History table must not show a redundant Powertrain/Antrieb column.
- Hybrid/PHEV vehicles: the main table keeps per-trip EV / Hybrid / ICE classification.
- Electric-capable vehicles: kWh and kWh/100 km may be restored only when a canonical Stellantis server trip has no electric energy and a strongly matched local SV observation contains a positive SOC/capacity-derived energy result.
- Existing server electric telemetry must never be overwritten.
- Missing or unchanged SOC must remain unknown rather than being converted into invented electric consumption.
- Short-trip and zero-distance filtering remains unchanged.

Candidate branch starts from `develop` commit `0eceffe48c1565b27cc9b7b90319a2a7ac8a1935`, which already contains the reviewed fix from PR #45 and a fully green post-merge Validate run.

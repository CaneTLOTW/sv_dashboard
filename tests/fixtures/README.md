# External beta fixtures

Files in this directory are anonymized regression inputs derived from tester-provided upstream payloads.

- `ds4-hybrid-get-last-trip-2026-09-05.json` contains two real DS4 Hybrid trip shapes used to guard independent electric/fuel parsing. IDs and location data are removed. The fixture deliberately includes one fuel-using trip whose electric SOC does not decrease, so tests must not infer electric energy that the source does not support.

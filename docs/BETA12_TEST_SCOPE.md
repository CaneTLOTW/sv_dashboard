# beta.12 external test scope

> **Historical prerelease record:** this document is retained for traceability of beta.12. The current external DS N°4 validation candidate is **v0.6.0-beta.26**; use [BETA26_TEST_SCOPE.md](BETA26_TEST_SCOPE.md) for current testing.

This short note records the focused DS4 Hybrid acceptance scope for `v0.6.0-beta.12`.

- Generated Vehicle/LIVE view must select the Dual-Energy Hero when both electric and fuel capabilities are present.
- The standalone Dual-Energy card remains independently usable on any Lovelace dashboard and its vehicle image must navigate to the generated SV vehicle view.
- Hero preconditioning is START-only with pending/active visual feedback; explicit STOP remains in full-dashboard Quick Actions.
- Hybrid Trip History uses the compact six-column main table with richer expandable details.
- Charging History exposes canonical mileage when available and avoids redundant unavailable reconstructed fields.
- French package-owned entity wording should match the reviewed beta.12 translations.
- Driving/charging states must continue to avoid fabricated electric/fuel telemetry.

Promotion to `main` remains blocked until external DS4 Hybrid/French acceptance in issue #2.

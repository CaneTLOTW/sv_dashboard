# beta.33 owner acceptance scope

This note defines the focused acceptance scope for the beta.33 candidate tracked in #96.

## Product behavior

### Charge timestamp provenance

- A valid Stellantis source timestamp wins over Home Assistant `last_updated` / receipt time.
- HA time is a fallback only when no upstream source timestamp is available.
- `received_at` remains preserved for diagnostics.

### Charge Curve V2

- Prefer stored `derived_power_kw` samples.
- Use residual-energy/capacity positioning when available.
- Fall back to the existing SOC/time reconstruction when direct derived-power points are unavailable.
- Completed and active sessions use the same provenance order.
- No model-specific branches.

## Owner-only PHEV harness

The local harness must remain outside the production/HACS payload.

When an `sv_owner_fixture` profile is active:

- the generated dashboard resolves as Dual-Energy/PHEV;
- the fixture context reaches rendered cards, not only Strategy generation;
- Standard mode remains the real owner BEV dashboard;
- real BEV-side charge/history data remains usable;
- deterministic synthetic data is available for:
  - fuel level/range;
  - driving fuel consumption;
  - remaining fuel;
  - 500-km fuel consumption;
  - fallback electric reserve/500-km metrics;
  - Hybrid Trip History;
  - Fuel History.

Profiles:

- `phev` — live owner EV side + synthetic fuel side;
- `phev-fresh` — deterministic current temperature source timestamp;
- `phev-idle`;
- `phev-driving`;
- `phev-charging`;
- `phev-stale` — deterministic stale source timestamps.

## Visual owner checks

After exact-candidate installation plus harness overlay:

1. Standard mode shows the normal BEV dashboard.
2. PHEV mode switches the **whole generated dashboard**, not only the Hero.
3. Vehicle view shows the Dual-Energy Hero and all four Consumption & reserves rows.
4. Trip History uses the Hybrid six-column layout and contains meaningful electric + fuel fixture values.
5. Fuel History renders summary and refuel rows.
6. Charging/Charge History still renders the owner's real BEV charging data.
7. `phev-fresh` shows the blue recent-temperature treatment.
8. `phev-stale` removes the freshness treatment.
9. `phev-driving` shows synthetic current fuel consumption.
10. `phev-charging` preserves the charging-state layout without overlay/z-index regression.
11. Navigation/view selector remains above card content and is never obscured by transformed Hero imagery.

## Charge curve owner checks

On the next real charging session:

- live curve should no longer prefer HA receipt timing over a valid upstream timestamp;
- where residual-energy-derived power exists, it should drive the displayed curve;
- the stored/completed curve should use the same provenance order;
- visual differences between active and completed curves should be explainable by sample availability, not by different timestamp rules.

## Static gate

Run the normal repository validation from `AGENTS.md`, including:

- Python compile checks;
- JS syntax checks;
- `node --test tests/*.test.mjs`;
- manifest/HACS JSON validation;
- Hassfest/HACS workflow;
- `git diff --check`.

Additionally syntax-check:

- `dev/owner_test_harness/owner-test-harness-card.js`;
- `dev/owner_test_harness/install.py`.

No deployment or release follows automatically from static PASS.

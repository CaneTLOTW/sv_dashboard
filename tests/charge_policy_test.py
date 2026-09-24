from __future__ import annotations

import importlib.util
from pathlib import Path

MODULE = Path(__file__).parents[1] / "custom_components" / "sv_dashboard" / "charge_policy.py"
spec = importlib.util.spec_from_file_location("sv_dashboard_charge_policy", MODULE)
policy = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(policy)


def main() -> None:
    bev_before = {"soc_end": 69, "fuel_level_end": None}
    bev_after = {"soc_start": 72, "fuel_level_start": None}
    assert policy.allow_soc_only_charge_reconstruction(bev_before, bev_after)

    phev_before = {"soc_end": 69, "fuel_level_end": 27, "fuel_consumption_l": 0}
    phev_after = {"soc_start": 72, "fuel_level_start": 27}
    assert not policy.allow_soc_only_charge_reconstruction(phev_before, phev_after)

    # Zero fuel consumption still proves this is a dual-energy trip; it must
    # not reactivate the BEV-only SOC fallback.
    assert policy.has_fuel_evidence({"fuel_consumption_l": 0})


if __name__ == "__main__":
    main()

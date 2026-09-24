from __future__ import annotations

import importlib.util
from pathlib import Path

MODULE = Path(__file__).parents[1] / "custom_components" / "sv_dashboard" / "state_contract.py"
spec = importlib.util.spec_from_file_location("sv_dashboard_state_contract", MODULE)
state_contract = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(state_contract)


def main() -> None:
    short = "charge-2026-09-24T10:00:00+00:00"
    assert state_contract.bounded_state_identifier(short, prefix="charge") == short

    long_id = "charge:" + ("a" * 160) + ":" + ("b" * 160)
    first = state_contract.bounded_state_identifier(long_id, prefix="charge")
    second = state_contract.bounded_state_identifier(long_id, prefix="charge")
    assert first == second
    assert first is not None
    assert first.startswith("charge:")
    assert len(first) <= state_contract.MAX_HA_STATE_LENGTH
    assert first != long_id
    assert state_contract.bounded_state_identifier(None, prefix="charge") is None


if __name__ == "__main__":
    main()

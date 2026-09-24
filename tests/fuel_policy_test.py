from __future__ import annotations

from datetime import datetime, timedelta, timezone
import importlib.util
from pathlib import Path

MODULE = Path(__file__).parents[1] / "custom_components" / "sv_dashboard" / "fuel_policy.py"
spec = importlib.util.spec_from_file_location("sv_dashboard_fuel_policy", MODULE)
policy = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(policy)


def main() -> None:
    after_time = datetime(2026, 9, 24, 8, 32, 37, tzinfo=timezone.utc)

    confirmed, delay = policy.tail_refill_confirmation(
        baseline=23,
        after_value=100,
        after_time=after_time,
        current_value=100,
        current_source_time=after_time,
        now=after_time + timedelta(seconds=45),
        minimum_refill_percent=5,
        hold_seconds=90,
    )
    assert confirmed is False
    assert 44 <= delay <= 46

    confirmed, delay = policy.tail_refill_confirmation(
        baseline=23,
        after_value=100,
        after_time=after_time,
        current_value=100,
        current_source_time=after_time,
        now=after_time + timedelta(seconds=91),
        minimum_refill_percent=5,
        hold_seconds=90,
    )
    assert confirmed is True
    assert delay is None

    confirmed, delay = policy.tail_refill_confirmation(
        baseline=23,
        after_value=100,
        after_time=after_time,
        current_value=23,
        current_source_time=after_time,
        now=after_time + timedelta(seconds=120),
        minimum_refill_percent=5,
        hold_seconds=90,
    )
    assert confirmed is False
    assert delay is None


if __name__ == "__main__":
    main()

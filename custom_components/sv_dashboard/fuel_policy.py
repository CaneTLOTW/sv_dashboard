"""Pure policy helpers for fuel/refill detection."""

from __future__ import annotations

from datetime import datetime


def tail_refill_confirmation(
    *,
    baseline: float,
    after_value: float,
    after_time: datetime,
    current_value: float | None,
    current_source_time: datetime | None,
    now: datetime,
    minimum_refill_percent: float,
    hold_seconds: float,
) -> tuple[bool, float | None]:
    """Confirm or defer the newest refill candidate.

    Recorder significant-state history may end exactly at the refill jump,
    leaving no later equal fuel sample. The live current state can confirm that
    the higher level persisted, but only after a short hold period. Returning a
    delay lets callers schedule one bounded recheck rather than polling.
    """
    if after_value - baseline < minimum_refill_percent:
        return False, None

    sustained_floor = baseline + max(1.0, minimum_refill_percent * 0.6)
    if current_value is None or current_value < sustained_floor:
        return False, None
    if current_source_time is not None and current_source_time < after_time:
        return False, None

    age_seconds = max(0.0, (now - after_time).total_seconds())
    if age_seconds < hold_seconds:
        return False, hold_seconds - age_seconds
    return True, None

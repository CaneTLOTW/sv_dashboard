"""Pure helpers for bounded automatic history reconciliation."""

from __future__ import annotations

from datetime import datetime, timezone
import math
from typing import Any

AUTO_RECONCILE_DELAYS_SECONDS = (25, 60, 120)
_TRIP_TIME_TOLERANCE_SECONDS = 15 * 60
_CHARGE_TIME_TOLERANCE_SECONDS = 10 * 60


def _number(value: Any) -> float | None:
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    return value if math.isfinite(value) else None


def _time(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _close_time(left: Any, right: Any, tolerance_seconds: int) -> bool:
    first, second = _time(left), _time(right)
    return bool(
        first
        and second
        and abs((first - second).total_seconds()) <= tolerance_seconds
    )


def completion_key(event_type: str, payload: dict[str, Any]) -> str:
    """Return a stable-enough in-memory key used only to coalesce event work."""
    return "|".join(
        [
            event_type,
            str(payload.get("id") or ""),
            str(payload.get("start_time") or ""),
            str(payload.get("end_time") or ""),
        ]
    )


def _trip_matches(expected: dict[str, Any], candidate: dict[str, Any]) -> bool:
    if not _close_time(
        expected.get("end_time"),
        candidate.get("end_time"),
        _TRIP_TIME_TOLERANCE_SECONDS,
    ):
        return False

    evidence_available = False
    evidence_matches = False

    expected_start = _number(expected.get("start_mileage"))
    candidate_start = _number(
        candidate.get("start_mileage", candidate.get("start_mileage_km"))
    )
    if expected_start is not None and candidate_start is not None:
        evidence_available = True
        evidence_matches |= abs(expected_start - candidate_start) <= 1.0

    expected_distance = _number(expected.get("distance_km"))
    candidate_distance = _number(candidate.get("distance_km"))
    if expected_distance is not None and candidate_distance is not None:
        evidence_available = True
        evidence_matches |= abs(expected_distance - candidate_distance) <= 2.0

    if expected.get("start_time") and candidate.get("start_time"):
        evidence_available = True
        evidence_matches |= _close_time(
            expected.get("start_time"),
            candidate.get("start_time"),
            _TRIP_TIME_TOLERANCE_SECONDS,
        )

    return evidence_matches if evidence_available else True


def _soc_compatible(left: Any, right: Any, tolerance: float = 3.0) -> bool:
    first, second = _number(left), _number(right)
    return first is None or second is None or abs(first - second) <= tolerance


def _charge_matches(expected: dict[str, Any], candidate: dict[str, Any]) -> bool:
    time_match = _close_time(
        expected.get("start_time"),
        candidate.get("start_time"),
        _CHARGE_TIME_TOLERANCE_SECONDS,
    ) or _close_time(
        expected.get("end_time"),
        candidate.get("end_time"),
        _CHARGE_TIME_TOLERANCE_SECONDS,
    )
    if not time_match:
        return False
    return _soc_compatible(expected.get("soc_start"), candidate.get("soc_start")) and _soc_compatible(
        expected.get("soc_end"), candidate.get("soc_end")
    )


def completion_represented(
    event_type: str,
    payload: dict[str, Any],
    *,
    trips: list[dict[str, Any]],
    charges: list[dict[str, Any]],
) -> bool:
    """Return whether a completed local event is represented canonically."""
    rows = trips if event_type == "trip" else charges if event_type == "charge" else []
    matcher = _trip_matches if event_type == "trip" else _charge_matches
    return any(
        matcher(payload, candidate)
        for candidate in rows
        if isinstance(candidate, dict)
    )

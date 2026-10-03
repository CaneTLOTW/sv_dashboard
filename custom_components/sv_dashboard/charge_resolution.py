"""Canonical charge-session identity, field resolution and sample provenance."""

from __future__ import annotations

from datetime import datetime
import math
from typing import Any

_CHARGE_START_MATCH_SECONDS = 90
_CHARGE_END_MATCH_SECONDS = 5 * 60
_CHARGE_FANOUT_SECONDS = 10

_SUMMARY_FIELDS = (
    "start_time",
    "end_time",
    "charging_duration_seconds",
    "duration_seconds",
    "soc_start",
    "soc_end",
    "capacity_kwh",
    "energy_kwh",
    "battery_energy_added_kwh",
    "average_power_kw",
    "minimum_power_kw",
    "median_power_kw",
    "maximum_power_kw",
    "charge_type",
)

_NUMERIC_FIELDS = {
    "charging_duration_seconds",
    "duration_seconds",
    "soc_start",
    "soc_end",
    "capacity_kwh",
    "energy_kwh",
    "battery_energy_added_kwh",
    "average_power_kw",
    "minimum_power_kw",
    "median_power_kw",
    "maximum_power_kw",
}


def _number(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _time(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str) or not value.strip():
        return None
    text = value.strip()
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    return parsed if parsed.tzinfo is not None else None


def normalize_charge_type(value: Any) -> str:
    """Normalize only explicit recorded AC/DC semantics.

    Power level is deliberately not used as an AC/DC classifier. A missing or
    transient No state during a proven charge remains Unknown until a real
    mode observation arrives.
    """
    normalized = str(value or "").strip().lower()
    if normalized in {"ac", "slow", "normal", "standard"}:
        return "AC"
    if normalized in {"dc", "fast", "quick", "rapid"}:
        return "DC"
    return "Unknown"


def charge_type_is_known(value: Any) -> bool:
    return normalize_charge_type(value) != "Unknown"


def charge_value_is_known(field: str, value: Any) -> bool:
    """Return whether a canonical charge field contains meaningful evidence."""
    if field == "charge_type":
        return charge_type_is_known(value)
    if field in _NUMERIC_FIELDS:
        return _number(value) is not None
    if field in {"start_time", "end_time"}:
        return _time(value) is not None
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip().lower() not in {"", "unknown", "—", "-", "none", "unavailable"}
    return True


def charge_samples_same_payload(
    previous: dict[str, Any] | None,
    current: dict[str, Any] | None,
    *,
    fanout_seconds: float = _CHARGE_FANOUT_SECONDS,
) -> bool:
    """Identify bounded HA entity fan-out without collapsing later observations.

    Stellantis may reuse one source timestamp for hours or days. Equality of
    source timestamps therefore cannot by itself identify one physical payload.
    Same-source samples are coalesced only when their HA receipt observations
    are very close in time.
    """
    if not isinstance(previous, dict) or not isinstance(current, dict):
        return False
    previous_source = previous.get("source_time") or previous.get("time")
    current_source = current.get("source_time") or current.get("time")
    if not previous_source or previous_source != current_source:
        return False
    previous_received = _time(previous.get("received_at"))
    current_received = _time(current.get("received_at"))
    if previous_received is None or current_received is None:
        return False
    try:
        delta = abs((current_received - previous_received).total_seconds())
    except TypeError:
        return False
    if delta > fanout_seconds:
        return False

    # Runtime samples record which mapped HA metric triggered this timeline
    # point. A second update from the same metric is a new observation even if
    # Stellantis reused the same source timestamp within the fan-out window.
    current_trigger = current.get("trigger_metric")
    previous_metrics = {
        str(value)
        for value in (previous.get("fanout_metrics") or [])
        if value
    }
    if previous.get("trigger_metric"):
        previous_metrics.add(str(previous.get("trigger_metric")))
    if current_trigger and str(current_trigger) in previous_metrics:
        return False
    return True


def _sample_sort_time(sample: dict[str, Any]) -> datetime | None:
    return (
        _time(sample.get("received_at"))
        or _time(sample.get("source_time"))
        or _time(sample.get("time"))
    )


def _sample_semantic_key(sample: dict[str, Any]) -> tuple[Any, ...]:
    return (
        sample.get("source_time") or sample.get("time"),
        _number(sample.get("soc")),
        _number(sample.get("residual_kwh")),
        _number(sample.get("derived_power_kw")),
        normalize_charge_type(sample.get("charge_type")),
    )


def merge_charge_samples(
    existing: list[dict[str, Any]] | None,
    incoming: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    """Merge raw samples while retaining changed values with frozen source time."""
    rows = [
        dict(sample)
        for sample in [*(existing or []), *(incoming or [])]
        if isinstance(sample, dict)
    ]
    rows.sort(
        key=lambda sample: (
            (_sample_sort_time(sample) or datetime.min.replace(tzinfo=None)).isoformat(),
            str(sample.get("received_at") or ""),
        )
    )

    merged: list[dict[str, Any]] = []
    for sample in rows:
        if not merged:
            merged.append(sample)
            continue
        previous = merged[-1]
        same_semantics = _sample_semantic_key(previous) == _sample_semantic_key(sample)
        if same_semantics and charge_samples_same_payload(previous, sample):
            combined = dict(previous)
            combined.update(sample)
            merged[-1] = combined
            continue
        if (
            same_semantics
            and previous.get("received_at")
            and previous.get("received_at") == sample.get("received_at")
        ):
            combined = dict(previous)
            combined.update(sample)
            merged[-1] = combined
            continue
        merged.append(sample)
    return merged


def same_physical_charge(
    left: dict[str, Any],
    right: dict[str, Any],
    *,
    start_tolerance_seconds: float = _CHARGE_START_MATCH_SECONDS,
    end_tolerance_seconds: float = _CHARGE_END_MATCH_SECONDS,
) -> bool:
    """Match completed charge representations by stable interval evidence.

    SOC/type/energy are deliberately excluded from event identity because those
    are precisely the fields that can disagree between local, Recorder and REST
    evidence.
    """
    if not isinstance(left, dict) or not isinstance(right, dict):
        return False
    if left.get("id") and left.get("id") == right.get("id"):
        return True

    left_start = _time(left.get("start_time") or left.get("start"))
    right_start = _time(right.get("start_time") or right.get("start"))
    if left_start is None or right_start is None:
        return False
    try:
        if abs((left_start - right_start).total_seconds()) > start_tolerance_seconds:
            return False
    except TypeError:
        return False

    left_end = _time(left.get("end_time") or left.get("end"))
    right_end = _time(right.get("end_time") or right.get("end"))
    if left_end is None or right_end is None:
        return False
    try:
        if abs((left_end - right_end).total_seconds()) > end_tolerance_seconds:
            return False
    except TypeError:
        return False

    left_duration = _number(
        left.get("charging_duration_seconds", left.get("duration_seconds"))
    )
    right_duration = _number(
        right.get("charging_duration_seconds", right.get("duration_seconds"))
    )
    if left_duration is not None and right_duration is not None:
        tolerance = max(120.0, 0.2 * max(left_duration, right_duration))
        if abs(left_duration - right_duration) > tolerance:
            return False
    return True


def _field_source(row: dict[str, Any], field: str) -> str | None:
    sources = row.get("field_sources")
    if isinstance(sources, dict):
        value = sources.get(field)
        if isinstance(value, str) and value:
            return value
    source = row.get(f"{field}_source")
    if isinstance(source, str) and source:
        return source
    generic = row.get("source")
    return str(generic) if generic else None


def merge_charge_evidence(
    preferred: dict[str, Any],
    supplementary: dict[str, Any],
) -> dict[str, Any]:
    """Merge two representations of the same physical charge per field.

    Preferred known fields stay authoritative. Supplementary evidence fills
    only degraded/missing fields. Raw samples are merged independently so a
    sparse summary cannot erase a richer curve.
    """
    result = dict(preferred)
    field_sources = dict(preferred.get("field_sources") or {})
    conflicts = dict(preferred.get("field_conflicts") or {})

    for field in _SUMMARY_FIELDS:
        preferred_value = result.get(field)
        supplementary_value = supplementary.get(field)
        preferred_known = charge_value_is_known(field, preferred_value)
        supplementary_known = charge_value_is_known(field, supplementary_value)

        if not preferred_known and supplementary_known:
            result[field] = (
                normalize_charge_type(supplementary_value)
                if field == "charge_type"
                else supplementary_value
            )
            source = _field_source(supplementary, field)
            if source:
                field_sources[field] = source
            if field == "maximum_power_kw" and "maximum_power_kw_estimated" in supplementary:
                result["maximum_power_kw_estimated"] = bool(
                    supplementary.get("maximum_power_kw_estimated")
                )
            if field in {"average_power_kw", "maximum_power_kw"} and "power_estimated" in supplementary:
                result["power_estimated"] = bool(supplementary.get("power_estimated"))
            if field in {"energy_kwh", "battery_energy_added_kwh"}:
                if "energy_estimated" in supplementary:
                    result["energy_estimated"] = bool(supplementary.get("energy_estimated"))
                if supplementary.get("energy_source"):
                    result["energy_source"] = supplementary.get("energy_source")
        elif preferred_known and supplementary_known and preferred_value != supplementary_value:
            conflicts.setdefault(
                field,
                {
                    "preferred": preferred_value,
                    "supplementary": supplementary_value,
                    "resolution": "preferred_known_retained",
                },
            )

    if charge_type_is_known(result.get("charge_type")):
        result["charge_type"] = normalize_charge_type(result.get("charge_type"))
    else:
        result["charge_type"] = "Unknown"

    result["samples"] = merge_charge_samples(
        preferred.get("samples", []),
        supplementary.get("samples", []),
    )
    if result["samples"]:
        result["sample_count"] = len(result["samples"])
        result["has_charge_curve"] = len(result["samples"]) >= 2
    else:
        result["sample_count"] = max(
            int(_number(preferred.get("sample_count")) or 0),
            int(_number(supplementary.get("sample_count")) or 0),
        )
        result["has_charge_curve"] = bool(
            preferred.get("has_charge_curve") or supplementary.get("has_charge_curve")
        )

    result["sources"] = list(
        dict.fromkeys(
            [
                *(preferred.get("sources") or ([preferred.get("source")] if preferred.get("source") else [])),
                *(supplementary.get("sources") or ([supplementary.get("source")] if supplementary.get("source") else [])),
            ]
        )
    )

    for field in (
        "source_timestamp_count",
        "ha_fallback_timestamp_count",
    ):
        result[field] = max(
            int(_number(preferred.get(field)) or 0),
            int(_number(supplementary.get(field)) or 0),
        )

    average = _number(result.get("average_power_kw"))
    maximum = _number(result.get("maximum_power_kw"))
    maximum_estimated = bool(result.get("maximum_power_kw_estimated", True))
    if (
        average is not None
        and maximum is not None
        and maximum_estimated
        and maximum + 1e-9 < average
    ):
        result["maximum_power_kw"] = None
        flags = list(result.get("quality_flags") or [])
        if "estimated_max_below_average_suppressed" not in flags:
            flags.append("estimated_max_below_average_suppressed")
        result["quality_flags"] = flags

    if field_sources:
        result["field_sources"] = field_sources
    if conflicts:
        result["field_conflicts"] = conflicts
    return result

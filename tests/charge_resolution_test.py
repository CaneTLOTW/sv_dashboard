"""Pure canonical charge-session resolution regressions."""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).parents[1]
MODULE_PATH = ROOT / "custom_components" / "sv_dashboard" / "charge_resolution.py"
SPEC = importlib.util.spec_from_file_location("charge_resolution", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


def _sample(
    received_at,
    soc,
    *,
    source_time="2026-09-16T15:34:34+00:00",
    residual=None,
    trigger_metric=None,
    fanout_metrics=None,
):
    return {
        "source_time": source_time,
        "received_at": received_at,
        "soc": soc,
        "residual_kwh": residual,
        "charge_type": "slow",
        "trigger_metric": trigger_metric,
        "fanout_metrics": fanout_metrics or ([trigger_metric] if trigger_metric else []),
    }


def test_charge_type_requires_explicit_mode_evidence():
    assert MODULE.normalize_charge_type("slow") == "AC"
    assert MODULE.normalize_charge_type("quick") == "DC"
    assert MODULE.normalize_charge_type("no") == "Unknown"
    assert MODULE.normalize_charge_type(None) == "Unknown"


def test_same_source_timestamp_only_coalesces_bounded_entity_fanout():
    first = _sample(
        "2026-10-03T08:00:00+00:00", 70, trigger_metric="soc"
    )
    fanout = _sample(
        "2026-10-03T08:00:04+00:00",
        70,
        residual=28.0,
        trigger_metric="residual",
    )
    repeated_soc = _sample(
        "2026-10-03T08:00:07+00:00",
        71,
        residual=28.0,
        trigger_metric="soc",
        fanout_metrics=["soc"],
    )
    later = _sample(
        "2026-10-03T08:01:05+00:00",
        71,
        residual=28.0,
        trigger_metric="soc",
    )

    assert MODULE.charge_samples_same_payload(first, fanout) is True
    assert MODULE.charge_samples_same_payload(first, repeated_soc) is False
    assert MODULE.charge_samples_same_payload(fanout, later) is False


def test_frozen_source_time_does_not_collapse_real_soc_progression():
    rows = MODULE.merge_charge_samples(
        [],
        [
            _sample("2026-10-03T08:00:00+00:00", 70),
            _sample("2026-10-03T08:01:00+00:00", 71),
            _sample("2026-10-03T08:02:00+00:00", 72),
            _sample("2026-10-03T08:03:00+00:00", 73),
        ],
    )

    assert [row["soc"] for row in rows] == [70, 71, 72, 73]


def test_same_physical_charge_ignores_conflicting_soc_summary():
    left = {
        "start_time": "2026-10-02T19:54:00+00:00",
        "end_time": "2026-10-03T01:35:00+00:00",
        "duration_seconds": 20460,
        "soc_start": 24,
        "soc_end": 96,
    }
    right = {
        **left,
        "end_time": "2026-10-03T01:36:00+00:00",
        "duration_seconds": 20520,
        "soc_end": 99,
    }

    assert MODULE.same_physical_charge(left, right) is True


def test_distinct_charge_intervals_remain_distinct():
    first = {
        "start_time": "2026-10-03T08:00:00+00:00",
        "end_time": "2026-10-03T09:00:00+00:00",
        "duration_seconds": 3600,
    }
    second = {
        "start_time": "2026-10-03T08:01:00+00:00",
        "end_time": "2026-10-03T09:20:00+00:00",
        "duration_seconds": 4740,
    }

    assert MODULE.same_physical_charge(first, second) is False


def test_sparse_preferred_is_enriched_field_by_field_from_rich_same_session():
    sparse = {
        "id": "charge-a",
        "source": "ha_live",
        "start_time": "2026-10-02T14:59:00+00:00",
        "end_time": "2026-10-02T17:02:00+00:00",
        "soc_start": None,
        "soc_end": 70,
        "energy_kwh": None,
        "average_power_kw": None,
        "maximum_power_kw": None,
        "charge_type": "Unknown",
        "samples": [_sample("2026-10-02T15:00:00+00:00", 70)],
    }
    rich = {
        "id": "charge-b",
        "source": "ha_recorder",
        "start_time": sparse["start_time"],
        "end_time": sparse["end_time"],
        "soc_start": 62,
        "soc_end": 70,
        "energy_kwh": 3.36,
        "average_power_kw": 1.64,
        "maximum_power_kw": None,
        "charge_type": "AC",
        "samples": [
            _sample("2026-10-02T15:00:00+00:00", 62),
            _sample("2026-10-02T17:00:00+00:00", 70),
        ],
    }

    merged = MODULE.merge_charge_evidence(sparse, rich)

    assert merged["soc_start"] == 62
    assert merged["soc_end"] == 70
    assert merged["energy_kwh"] == 3.36
    assert merged["average_power_kw"] == 1.64
    assert merged["charge_type"] == "AC"
    assert merged["sample_count"] >= 2
    assert merged["has_charge_curve"] is True


def test_preferred_finished_boundary_beats_earlier_intermediate_soc():
    finished = {
        "source": "ha_live",
        "start_time": "2026-10-02T19:54:00+00:00",
        "end_time": "2026-10-03T01:36:00+00:00",
        "soc_start": 24,
        "soc_end": 99,
        "charge_type": "AC",
    }
    intermediate = {
        "source": "ha_recorder",
        "start_time": "2026-10-02T19:54:00+00:00",
        "end_time": "2026-10-03T01:35:00+00:00",
        "soc_start": 24,
        "soc_end": 96,
        "charge_type": "AC",
    }

    merged = MODULE.merge_charge_evidence(finished, intermediate)

    assert merged["soc_end"] == 99
    assert merged["field_conflicts"]["soc_end"]["resolution"] == "preferred_known_retained"


def test_equivalent_charge_type_spellings_do_not_create_false_conflict():
    preferred = {
        "start_time": "2026-10-03T08:00:00+00:00",
        "end_time": "2026-10-03T09:00:00+00:00",
        "charge_type": "slow",
    }
    supplementary = {
        "charge_type": "AC",
    }

    merged = MODULE.merge_charge_evidence(preferred, supplementary)

    assert merged["charge_type"] == "AC"
    assert "charge_type" not in merged.get("field_conflicts", {})


def test_impossible_estimated_maximum_below_average_is_suppressed():
    preferred = {
        "start_time": "2026-10-03T08:00:00+00:00",
        "end_time": "2026-10-03T09:00:00+00:00",
        "average_power_kw": 1.92,
        "maximum_power_kw": 1.50,
        "maximum_power_kw_estimated": True,
        "charge_type": "AC",
    }

    merged = MODULE.merge_charge_evidence(preferred, {})

    assert merged["maximum_power_kw"] is None
    assert "estimated_max_below_average_suppressed" in merged["quality_flags"]


def test_valid_numeric_zero_is_not_treated_as_unknown():
    preferred = {
        "start_time": "2026-10-03T08:00:00+00:00",
        "end_time": "2026-10-03T09:00:00+00:00",
        "energy_kwh": 0,
        "charge_type": "Unknown",
    }
    supplementary = {
        "energy_kwh": 2.5,
        "charge_type": "slow",
    }

    merged = MODULE.merge_charge_evidence(preferred, supplementary)

    assert merged["energy_kwh"] == 0
    assert merged["charge_type"] == "AC"


def run():
    tests = [value for name, value in globals().items() if name.startswith("test_")]
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
    print(f"{len(tests)} charge resolution tests passed")


if __name__ == "__main__":
    run()

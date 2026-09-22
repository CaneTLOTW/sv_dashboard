from __future__ import annotations

import importlib.util
from pathlib import Path

MODULE = Path(__file__).parents[1] / "custom_components" / "sv_dashboard" / "history_reconcile.py"
spec = importlib.util.spec_from_file_location("sv_dashboard_history_reconcile", MODULE)
history = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(history)


def main() -> None:
    assert history.AUTO_RECONCILE_DELAYS_SECONDS == (25, 60, 120)

    trip = {
        "id": "local-trip",
        "start_time": "2026-09-22T17:00:00+00:00",
        "end_time": "2026-09-22T17:30:00+00:00",
        "start_mileage": 2000.0,
        "distance_km": 25.0,
    }
    canonical_trip = {
        "id": "server-trip",
        "start_time": "2026-09-22T17:00:40+00:00",
        "end_time": "2026-09-22T17:31:10+00:00",
        "start_mileage": 2000.0,
        "distance_km": 25.2,
    }
    assert history.completion_represented(
        "trip", trip, trips=[canonical_trip], charges=[]
    )
    assert not history.completion_represented(
        "trip",
        trip,
        trips=[{**canonical_trip, "end_time": "2026-09-22T19:30:00+00:00"}],
        charges=[],
    )

    malformed_same_time = {
        **canonical_trip,
        "start_mileage": 0,
        "distance_km": 1977,
    }
    assert not history.completion_represented(
        "trip", trip, trips=[malformed_same_time], charges=[]
    )

    charge = {
        "id": "local-charge",
        "start_time": "2026-09-22T14:08:06+00:00",
        "end_time": "2026-09-22T14:54:11+00:00",
        "soc_start": 51,
        "soc_end": 68,
    }
    canonical_charge = {
        "id": "canonical-charge",
        "start_time": "2026-09-22T14:08:20+00:00",
        "end_time": "2026-09-22T14:54:20+00:00",
        "soc_start": 51,
        "soc_end": 68,
    }
    assert history.completion_represented(
        "charge", charge, trips=[], charges=[canonical_charge]
    )
    assert not history.completion_represented(
        "charge",
        charge,
        trips=[],
        charges=[{**canonical_charge, "soc_end": 80}],
    )

    assert history.completion_key("trip", trip).startswith("trip|")
    assert history.completion_key("charge", charge).startswith("charge|")


if __name__ == "__main__":
    main()

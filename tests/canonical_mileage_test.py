from __future__ import annotations

import importlib.util
from pathlib import Path

MODULE = Path(__file__).parents[1] / "custom_components" / "sv_dashboard" / "distance.py"
spec = importlib.util.spec_from_file_location("sv_dashboard_distance", MODULE)
distance = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(distance)


def main() -> None:
    assert distance.monotonic_mileage(1438, 1434) == 1438
    assert distance.monotonic_mileage(1438, "unavailable") == 1438
    assert distance.monotonic_mileage(623, 636, max_forward_jump_km=1000) == 636
    assert distance.monotonic_mileage(636, 5000, max_forward_jump_km=1000) == 636
    assert distance.monotonic_mileage(None, 1956) == 1956

    anchor = distance.canonical_server_mileage(
        [
            {
                "id": "before",
                "start_time": "2026-09-14T18:00:00Z",
                "end_time": "2026-09-14T18:20:00Z",
                "start_mileage": 1832,
                "distance_km": 19,
                "valid_for_statistics": True,
            },
            {
                "id": "after",
                "start_time": "2026-09-15T10:33:10Z",
                "end_time": "2026-09-15T10:38:40Z",
                "start_mileage": 1872,
                "distance_km": 4,
                "valid_for_statistics": True,
            },
            {
                "id": "invalid",
                "start_mileage": 9999,
                "distance_km": 10,
                "valid_for_statistics": False,
            },
        ]
    )
    assert anchor is not None
    assert anchor["mileage_km"] == 1876
    assert anchor["trip_id"] == "after"
    assert anchor["mileage_km"] - (1832 + 19) == 25


if __name__ == "__main__":
    main()

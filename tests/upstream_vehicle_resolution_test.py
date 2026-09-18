"""Focused offline contract tests for the cached upstream resolver."""

from __future__ import annotations

import sys
import importlib.util
from pathlib import Path

MODULE_PATH = Path(__file__).parents[1] / "custom_components" / "sv_dashboard" / "upstream_compat.py"
SPEC = importlib.util.spec_from_file_location("sv_dashboard_upstream_compat", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
freshest_upstream_timestamp = MODULE.freshest_upstream_timestamp
get_upstream_coordinator_data = MODULE.get_upstream_coordinator_data
resolve_cached_upstream = MODULE.resolve_cached_upstream
resolve_loaded_upstream = MODULE.resolve_loaded_upstream
select_upstream_client = MODULE.select_upstream_client


VIN = "TESTVIN123"


class Coordinator:
    def __init__(self, **values):
        self.__dict__.update(values)


class Client:
    def __init__(self, coordinator=None, **values):
        self.coordinator = coordinator
        self.__dict__.update(values)
        self.fetches = 0

    def async_get_coordinator_by_vin(self, vin):
        return self.coordinator

    def get_user_vehicles(self):  # pragma: no cover - must never be called
        self.fetches += 1
        raise AssertionError("resolver performed a network vehicle fetch")


class UpstreamEntry:
    def __init__(self, entry_id, runtime_data=None, domain="stellantis_vehicles"):
        self.entry_id = entry_id
        self.runtime_data = runtime_data
        self.domain = domain


def vehicle(vin=VIN):
    return {"vin": vin, "vehicle_id": "cached-id"}


def check(label, client, expected=True):
    resolved_client, resolved_vehicle = resolve_cached_upstream(client, VIN)
    actual = resolved_client is client and resolved_vehicle == vehicle()
    assert actual is expected, label
    assert client.fetches == 0, label


def main():
    legacy_client = Client(Coordinator(_vehicle=vehicle()))
    runtime_client = Client(Coordinator(_vehicle=vehicle()))
    assert select_upstream_client(
        UpstreamEntry("entry", runtime_client), {"entry": legacy_client}
    ) is runtime_client
    assert select_upstream_client(
        UpstreamEntry("entry"), {"entry": legacy_client}
    ) is legacy_client

    # Legacy client layout: client is found in hass.data by the caller and its
    # selected coordinator exposes the current private cache shape.
    check("legacy _vehicle", Client(Coordinator(_vehicle=vehicle())))

    # Current layout: client comes from ConfigEntry.runtime_data and the
    # coordinator still owns the selected _vehicle cache.
    check("runtime_data _vehicle", Client(Coordinator(_vehicle=vehicle())))

    # Stellantis Vehicles 2026.9.3 exposes current status through
    # coordinator.data.  Treat it as an optional isolated diagnostic snapshot,
    # not as replacement vehicle metadata or a network-backed lookup.
    live_data = {
        "updatedAt": "2026-09-16T18:00:00+00:00",
        "lastPosition": {"geometry": {"coordinates": [8.0, 51.0]}},
        "odometer": {"mileage": 1500},
    }
    data_client = Client(Coordinator(_vehicle=vehicle(), data=live_data))
    snapshot = get_upstream_coordinator_data(data_client, VIN)
    assert snapshot == live_data
    assert snapshot is not live_data
    snapshot["updatedAt"] = "mutated"
    snapshot["lastPosition"]["geometry"]["coordinates"][0] = 99.0
    assert live_data["updatedAt"] == "2026-09-16T18:00:00+00:00"
    assert live_data["lastPosition"]["geometry"]["coordinates"][0] == 8.0
    assert data_client.fetches == 0
    assert get_upstream_coordinator_data(Client(Coordinator(data=None)), VIN) is None
    assert get_upstream_coordinator_data(Client(), VIN) is None

    # Heartbeat uses source timestamps from the already-loaded payload, even
    # when a value such as ambient temperature itself did not change.
    from datetime import datetime, timezone

    heartbeat_payload = {
        "updatedAt": "2026-09-18T17:01:00+00:00",
        "environment": {
            "air": {
                "temp": 12.0,
                "createdAt": "2026-09-18T17:00:00+00:00",
            }
        },
        "odometer": {
            "mileage": 1956,
            "createdAt": "2026-09-18T16:55:00+00:00",
        },
        "maintenance": {
            "updatedAt": "2026-09-18T17:09:00+00:00",
        },
        "commandHistory": {
            "createdAt": "2026-09-18T17:05:00+00:00",
        },
    }
    heartbeat = freshest_upstream_timestamp(
        heartbeat_payload,
        now=datetime(2026, 9, 18, 17, 10, tzinfo=timezone.utc),
    )
    # The root vehicle-status updatedAt is the same freshness contract used by
    # Stellantis Vehicles itself; maintenance/command timestamps cannot win.
    assert heartbeat == datetime(2026, 9, 18, 17, 1, tzinfo=timezone.utc)

    # Without a root updatedAt, fallback scans telemetry timestamps but still
    # excludes maintenance and command/action lifecycle metadata.
    fallback_payload = {
        "environment": {"air": {"createdAt": "2026-09-18T17:00:00+00:00"}},
        "maintenance": {"updatedAt": "2026-09-18T17:09:00+00:00"},
        "pendingAction": {"updatedAt": "2026-09-18T17:08:00+00:00"},
    }
    assert freshest_upstream_timestamp(
        fallback_payload,
        now=datetime(2026, 9, 18, 17, 10, tzinfo=timezone.utc),
    ) == datetime(2026, 9, 18, 17, 0, tzinfo=timezone.utc)

    # A far-future source timestamp is not accepted as freshness proof.
    future_only = {"environment": {"createdAt": "2026-09-19T17:00:00+00:00"}}
    assert freshest_upstream_timestamp(
        future_only,
        now=datetime(2026, 9, 18, 17, 10, tzinfo=timezone.utc),
    ) is None

    # Older/public candidate attribute remains supported.
    check("public vehicle_info", Client(Coordinator(vehicle_info=vehicle())))

    # Client-level caches are accepted only when VIN validation succeeds.
    check("client _vehicles cache", Client(_vehicles={VIN: vehicle()}))
    check("wrong VIN rejected", Client(Coordinator(_vehicle=vehicle("OTHER"))), False)
    check("malformed cache rejected", Client(Coordinator(_vehicle=[vehicle()])), False)
    check("missing vehicle_info does not raise", Client(Coordinator()), False)

    linked = UpstreamEntry("linked", Client(Coordinator(_vehicle=vehicle())))
    fallback = UpstreamEntry("fallback", Client(Coordinator(_vehicle=vehicle())))
    resolved_client, resolved_vehicle = resolve_loaded_upstream(
        [fallback, linked], VIN, {}, {"linked"}
    )
    assert resolved_client is linked.runtime_data
    assert resolved_vehicle == vehicle()

    # A stale/missing device link must fall back to loaded entries only.
    resolved_client, resolved_vehicle = resolve_loaded_upstream(
        [fallback], VIN, {}, set()
    )
    assert resolved_client is fallback.runtime_data
    assert resolved_vehicle == vehicle()

    wrong = UpstreamEntry("wrong", Client(Coordinator(_vehicle=vehicle("OTHER"))))
    resolved_client, resolved_vehicle = resolve_loaded_upstream([wrong], VIN, {}, set())
    assert resolved_client is None and resolved_vehicle is None

    legacy = Client(Coordinator(_vehicle=vehicle()))
    legacy_entry = UpstreamEntry("legacy")
    resolved_client, resolved_vehicle = resolve_loaded_upstream(
        [legacy_entry], VIN, {"legacy": legacy}, set()
    )
    assert resolved_client is legacy
    assert resolved_vehicle == vehicle()

    print("UPSTREAM_VEHICLE_RESOLUTION_TEST=PASS")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"UPSTREAM_VEHICLE_RESOLUTION_TEST=FAIL: {error}", file=sys.stderr)
        raise

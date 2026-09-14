"""Offline contract tests for the authenticated historical trips adapter."""

from __future__ import annotations

import asyncio
import importlib.util
import sys
import types
from pathlib import Path
from urllib.parse import parse_qs, urlsplit


MODULE_PATH = (
    Path(__file__).parents[1]
    / "custom_components"
    / "sv_dashboard"
    / "server_history_transport.py"
)
SPEC = importlib.util.spec_from_file_location("sv_dashboard_server_history_transport", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class FakeClient:
    __module__ = "fake_upstream.stellantis"

    def __init__(self, pages):
        self.pages = iter(pages)
        self.urls = []
        self.headers = []

    def apply_query_params(self, url, params, vehicle):
        return f"{url}?client_id=resolved&vehicle_id={vehicle['vehicle_id']}"

    def apply_dict_params(self, headers):
        return {**headers, "Authorization": "Bearer [filtered]"}

    async def make_http_request(self, url, method="GET", headers=None, **_kwargs):
        assert method == "GET"
        self.urls.append(url)
        self.headers.append(headers)
        return next(self.pages)


def install_fake_upstream_constants():
    package = types.ModuleType("fake_upstream")
    package.__path__ = []
    client_module = types.ModuleType("fake_upstream.stellantis")
    const_module = types.ModuleType("fake_upstream.const")
    client_module.CAR_API_GET_VEHICLE_TRIPS_URL = "https://api.example/trips"
    const_module.CAR_API_GET_VEHICLE_TRIPS_URL = client_module.CAR_API_GET_VEHICLE_TRIPS_URL
    const_module.CLIENT_ID_QUERY_PARAMS = {"client_id": "{#client_id#}"}
    const_module.CAR_API_HEADERS = {"Authorization": "Bearer {#oauth|access_token#}"}
    sys.modules["fake_upstream"] = package
    sys.modules["fake_upstream.stellantis"] = client_module
    sys.modules["fake_upstream.const"] = const_module


def test_since_pagination_dedupe_and_cycle_guard():
    install_fake_upstream_constants()
    client = FakeClient(
        [
            {
                "_embedded": {"trips": [{"id": "a"}, {"id": "b"}]},
                "_links": {"next": {"href": "https://api.example/trips?pageToken=one"}},
            },
            {
                "_embedded": {"trips": [{"id": "b", "updated": True}, {"id": "c"}]},
                "_links": {"next": {"href": "https://api.example/trips?pageToken=two"}},
            },
            {
                "_embedded": {"trips": [{"id": "d"}]},
                "_links": {"next": {"href": "https://api.example/trips?pageToken=one"}},
            },
        ]
    )

    result = asyncio.run(
        MODULE.async_fetch_historical_trips(
            client, {"vehicle_id": "vehicle-1"}, since="2026-09-01T00:00:00+00:00"
        )
    )

    assert [item["id"] for item in result["trips"]] == ["a", "b", "c", "d"]
    assert len(client.urls) == 3
    first_query = parse_qs(urlsplit(client.urls[0]).query)
    assert first_query["timestamps"] == ["2026-09-01T00:00:00+00:00/"]
    assert first_query["distance"] == ["0.1-"]
    assert parse_qs(urlsplit(client.urls[1]).query)["pageToken"] == ["one"]
    assert all(headers["Authorization"] == "Bearer [filtered]" for headers in client.headers)


def test_unsupported_transport_is_explicit_and_does_not_create_auth():
    class UnsupportedClient:
        __module__ = "missing_upstream.client"

    assert not MODULE.historical_transport_available(UnsupportedClient())
    try:
        asyncio.run(MODULE.async_fetch_historical_trips(UnsupportedClient(), {}, since=None))
    except MODULE.HistoricalTripsTransportUnavailable as error:
        assert str(error) == "upstream_authenticated_trips_transport_unavailable"
    else:  # pragma: no cover - defensive assertion
        raise AssertionError("unsupported transport did not fail closed")


if __name__ == "__main__":
    test_since_pagination_dedupe_and_cycle_guard()
    test_unsupported_transport_is_explicit_and_does_not_create_auth()
    print("SERVER_HISTORY_TRANSPORT_TEST=PASS")

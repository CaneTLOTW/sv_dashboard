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


class FakeConnector:
    def __init__(self, closed=False):
        self.closed = closed


class FakeSession:
    def __init__(self, *, closed=False, connector_closed=False):
        self.closed = closed
        self.connector = FakeConnector(connector_closed)

    async def close(self):
        self.closed = True
        self.connector.closed = True


class FakeClient:
    __module__ = "fake_upstream.stellantis"

    def __init__(self, pages, *, session=None, fail_closed_once=False):
        self.pages = iter(pages)
        self.urls = []
        self.headers = []
        self._session = session
        self._shutting_down = False
        self.fail_closed_once = fail_closed_once
        self.request_attempts = 0
        self.created_sessions = 0
        self.close_calls = 0

    def apply_query_params(self, url, params, vehicle):
        resolved_url = url.replace("{#vehicle_id#}", vehicle["vehicle_id"])
        return f"{resolved_url}?client_id=resolved&vehicle_id={vehicle['vehicle_id']}"

    def apply_dict_params(self, headers):
        return {**headers, "Authorization": "Bearer [filtered]"}

    def start_session(self):
        if not self._session:
            self._session = FakeSession()
            self.created_sessions += 1

    async def close_session(self):
        self.close_calls += 1
        if not self._session or self._session.closed:
            return
        await self._session.close()
        self._session = None

    async def make_http_request(self, url, method="GET", headers=None, **_kwargs):
        assert method == "GET"
        self.request_attempts += 1
        self.start_session()
        if self.fail_closed_once:
            self.fail_closed_once = False
            self._session.connector.closed = True
            raise RuntimeError("Connector is closed.")
        if self._session.closed or self._session.connector.closed:
            raise RuntimeError("Connector is closed.")
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


def one_page(trip_id="a"):
    return {"_embedded": {"trips": [{"id": trip_id}]}, "_links": {}}


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


def test_stranded_closed_session_is_cleared_before_request():
    install_fake_upstream_constants()
    stranded = FakeSession(closed=True, connector_closed=True)
    client = FakeClient([one_page()], session=stranded)

    result = asyncio.run(
        MODULE.async_fetch_historical_trips(client, {"vehicle_id": "vehicle-1"})
    )

    assert [item["id"] for item in result["trips"]] == ["a"]
    assert client._session is not stranded
    assert client.created_sessions == 1
    # The exact upstream bug returns early from close_session() for an already
    # closed session, so the shim clears only that dead private reference.
    assert client.close_calls == 0


def test_closed_connector_uses_upstream_cleanup_before_recreation():
    install_fake_upstream_constants()
    client = FakeClient(
        [one_page()],
        session=FakeSession(closed=False, connector_closed=True),
    )

    result = asyncio.run(
        MODULE.async_fetch_historical_trips(client, {"vehicle_id": "vehicle-1"})
    )

    assert [item["id"] for item in result["trips"]] == ["a"]
    assert client.close_calls == 1
    assert client.created_sessions == 1


def test_closed_connector_race_retries_exactly_once():
    install_fake_upstream_constants()
    client = FakeClient([one_page()], fail_closed_once=True)

    result = asyncio.run(
        MODULE.async_fetch_historical_trips(client, {"vehicle_id": "vehicle-1"})
    )

    assert [item["id"] for item in result["trips"]] == ["a"]
    assert client.request_attempts == 2
    assert client.close_calls == 1
    assert client.created_sessions == 2


def test_shutting_down_client_is_not_resurrected():
    install_fake_upstream_constants()
    client = FakeClient([one_page()])
    client._shutting_down = True

    try:
        asyncio.run(
            MODULE.async_fetch_historical_trips(client, {"vehicle_id": "vehicle-1"})
        )
    except MODULE.HistoricalTripsTransportUnavailable as error:
        assert str(error) == "upstream_client_shutting_down"
    else:  # pragma: no cover - defensive assertion
        raise AssertionError("shutting-down upstream client was reused")
    assert client.request_attempts == 0
    assert client.created_sessions == 0


def test_generic_authenticated_get_reuses_upstream_query_and_headers():
    install_fake_upstream_constants()
    client = FakeClient([{"ok": True}])

    result = asyncio.run(
        MODULE.async_authenticated_get(
            client,
            {"vehicle_id": "vehicle-1"},
            "https://api.example/vehicles/{#vehicle_id#}/status",
            query={"pageSize": 1, "extension": "onboardCapabilities"},
        )
    )

    assert result == {"ok": True}
    query = parse_qs(urlsplit(client.urls[0]).query)
    assert query["client_id"] == ["resolved"]
    assert query["vehicle_id"] == ["vehicle-1"]
    assert query["pageSize"] == ["1"]
    assert query["extension"] == ["onboardCapabilities"]
    assert client.headers[0]["Authorization"] == "Bearer [filtered]"


def test_generic_authenticated_href_follows_server_url_unchanged():
    install_fake_upstream_constants()
    client = FakeClient([{"ok": True}])
    href = "https://api.example/trips?client_id=resolved&pageToken=opaque"

    result = asyncio.run(MODULE.async_authenticated_get_href(client, href))

    assert result == {"ok": True}
    assert client.urls == [href]
    assert client.headers[0]["Authorization"] == "Bearer [filtered]"


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
    test_stranded_closed_session_is_cleared_before_request()
    test_closed_connector_uses_upstream_cleanup_before_recreation()
    test_closed_connector_race_retries_exactly_once()
    test_shutting_down_client_is_not_resurrected()
    test_generic_authenticated_get_reuses_upstream_query_and_headers()
    test_generic_authenticated_href_follows_server_url_unchanged()
    test_unsupported_transport_is_explicit_and_does_not_create_auth()
    print("SERVER_HISTORY_TRANSPORT_TEST=PASS")

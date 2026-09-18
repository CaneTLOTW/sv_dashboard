"""Compatibility adapter for the authenticated upstream historical trips API.

SV Dashboard owns the historical aggregation contract, but never owns
Stellantis authentication or an HTTP session. This module discovers the
already-loaded upstream transport helpers from the resolved client and keeps
all version-specific coupling in one place.

The upstream integration currently has one lifecycle edge case: an already
closed ``ClientSession`` can remain referenced because ``close_session()``
returns early when ``session.closed`` is true, while ``start_session()`` only
creates a replacement when ``_session`` is falsey. Until upstream fixes that
lifecycle contract, this adapter performs a deliberately narrow compatibility
repair: only a demonstrably dead shared transport is cleared/closed, then the
upstream client's own request machinery recreates and owns the replacement.
SV never creates or retains its own Stellantis HTTP session.
"""

from __future__ import annotations

from importlib import import_module
from typing import Any
from urllib.parse import parse_qs, urlencode, urlsplit


class HistoricalTripsTransportUnavailable(RuntimeError):
    """The loaded upstream client cannot provide the authenticated transport."""


def _upstream_modules(client: Any) -> list[Any]:
    """Return the loaded client module and its sibling constants module."""
    module_name = getattr(client.__class__, "__module__", "")
    names = [module_name]
    if "." in module_name:
        names.append(f"{module_name.rsplit('.', 1)[0]}.const")
    modules = []
    for name in names:
        if not name:
            continue
        try:
            module = import_module(name)
        except (ImportError, AttributeError):
            continue
        if module not in modules:
            modules.append(module)
    return modules


def _module_value(client: Any, name: str) -> Any:
    """Resolve a transport constant from the upstream implementation."""
    for module in _upstream_modules(client):
        value = getattr(module, name, None)
        if value is not None:
            return value
    return None


def _transport_parts(client: Any) -> tuple[Any, Any, Any, Any, Any, Any] | None:
    """Return the complete transport contract or ``None`` if unsupported."""
    apply_query = getattr(client, "apply_query_params", None)
    apply_headers = getattr(client, "apply_dict_params", None)
    request = getattr(client, "make_http_request", None)
    url = _module_value(client, "CAR_API_GET_VEHICLE_TRIPS_URL")
    query_params = _module_value(client, "CLIENT_ID_QUERY_PARAMS")
    headers = _module_value(client, "CAR_API_HEADERS")
    if not all((callable(apply_query), callable(apply_headers), callable(request), url, query_params, headers)):
        return None
    return apply_query, apply_headers, request, url, query_params, headers


def historical_transport_available(client: Any) -> bool:
    """Return whether the loaded client exposes the required auth transport."""
    return _transport_parts(client) is not None


def upstream_transport_constant(client: Any, name: str) -> Any:
    """Return one loaded upstream transport constant for diagnostic adapters."""
    return _module_value(client, name)


async def async_authenticated_get(
    client: Any,
    vehicle: Any,
    url: str,
    *,
    query: dict[str, Any] | None = None,
) -> Any:
    """Perform one read-only GET through the already-loaded upstream transport.

    This helper deliberately reuses the same authentication headers, query
    template, session lifecycle and closed-connector recovery as canonical
    history. It does not create credentials, sessions or remote commands.
    """
    parts = _transport_parts(client)
    if parts is None:
        raise HistoricalTripsTransportUnavailable(
            "upstream_authenticated_transport_unavailable"
        )
    apply_query, apply_headers, request, _trips_url, query_params, header_template = parts
    request_url = apply_query(url, dict(query_params), vehicle)
    if query:
        request_url = _append_query(
            request_url,
            {str(key): str(value) for key, value in query.items() if value is not None},
        )
    headers = apply_headers(dict(header_template))
    return await _request_page(client, request, request_url, headers)


async def async_authenticated_get_href(client: Any, href: str) -> Any:
    """Follow one server-provided authenticated HAL link without rewriting it."""
    parts = _transport_parts(client)
    if parts is None:
        raise HistoricalTripsTransportUnavailable(
            "upstream_authenticated_transport_unavailable"
        )
    _apply_query, apply_headers, request, _trips_url, _query_params, header_template = parts
    headers = apply_headers(dict(header_template))
    return await _request_page(client, request, href, headers)


def _append_query(url: str, values: dict[str, str]) -> str:
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}{urlencode(values)}"


def _page_token(href: Any) -> str | None:
    if not isinstance(href, str) or not href:
        return None
    values = parse_qs(urlsplit(href).query).get("pageToken")
    return values[0] if values and values[0] else None


def _page_trips(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        return []
    embedded = payload.get("_embedded")
    values = embedded.get("trips") if isinstance(embedded, dict) else payload.get("trips")
    return [item for item in values if isinstance(item, dict) and item.get("id")] if isinstance(values, list) else []


def _next_page_token(payload: Any) -> str | None:
    if not isinstance(payload, dict):
        return None
    links = payload.get("_links")
    if not isinstance(links, dict):
        return None
    next_link = links.get("next")
    if isinstance(next_link, dict):
        return _page_token(next_link.get("href"))
    return _page_token(next_link)


def _closed_transport_error(error: BaseException) -> bool:
    """Recognize the narrow aiohttp closed-session/connector failure family."""
    pending: list[BaseException] = [error]
    seen: set[int] = set()
    messages: list[str] = []
    while pending:
        current = pending.pop()
        if id(current) in seen:
            continue
        seen.add(id(current))
        messages.append(str(current).lower())
        for linked in (getattr(current, "__cause__", None), getattr(current, "__context__", None)):
            if isinstance(linked, BaseException):
                pending.append(linked)
    text = " | ".join(messages)
    return any(
        marker in text
        for marker in (
            "connector is closed",
            "session is closed",
            "closed connector",
        )
    )


async def _prepare_upstream_transport(client: Any) -> None:
    """Repair only a demonstrably dead upstream-owned HTTP transport.

    The compatibility write to ``_session`` is intentionally limited to the
    exact upstream bug where the referenced ClientSession is already closed.
    There is nothing left to close or preserve in that object. A connector-only
    failure is instead handed to upstream ``close_session()`` first so normal
    ownership/cleanup semantics remain in charge.
    """
    if getattr(client, "_shutting_down", False):
        raise HistoricalTripsTransportUnavailable("upstream_client_shutting_down")

    try:
        session = getattr(client, "_session")
    except AttributeError:
        return
    if session is None:
        return

    session_closed = bool(getattr(session, "closed", False))
    connector = getattr(session, "connector", None)
    connector_closed = bool(connector is not None and getattr(connector, "closed", False))
    if not session_closed and not connector_closed:
        return

    if session_closed:
        # Upstream close_session() currently returns before clearing this exact
        # stranded reference. Clearing it lets upstream start_session() create
        # the replacement on the next normal authenticated request.
        if getattr(client, "_session", None) is session:
            client._session = None
        return

    close_session = getattr(client, "close_session", None)
    if not callable(close_session):
        raise HistoricalTripsTransportUnavailable("upstream_closed_connector_unrecoverable")
    await close_session()


async def _request_page(client: Any, request: Any, url: str, headers: dict[str, Any]) -> Any:
    """Make one upstream-owned request with one closed-transport recovery retry."""
    await _prepare_upstream_transport(client)
    try:
        return await request(url, method="GET", headers=headers)
    except Exception as error:
        if not _closed_transport_error(error):
            raise
        # make_http_request() may already have closed/cleared the failed
        # transport. Preparing again is therefore safe whether the dead object
        # is still referenced or has already become None. Retry exactly once.
        await _prepare_upstream_transport(client)
        return await request(url, method="GET", headers=headers)


async def async_fetch_historical_trips(
    client: Any,
    vehicle: Any,
    *,
    since: str | None = None,
) -> dict[str, list[dict[str, Any]]]:
    """Fetch and deduplicate every historical trips page via upstream auth."""
    parts = _transport_parts(client)
    if parts is None:
        raise HistoricalTripsTransportUnavailable(
            "upstream_authenticated_trips_transport_unavailable"
        )
    apply_query, apply_headers, request, base_url, query_params, header_template = parts
    url = apply_query(base_url, dict(query_params), vehicle)
    url = _append_query(url, {"distance": "0.1-"})
    headers = apply_headers(dict(header_template))

    trips_by_id: dict[str, dict[str, Any]] = {}
    token: str | None = None
    seen_tokens: set[str] = set()
    while True:
        page_url = url
        if since:
            page_url = _append_query(page_url, {"timestamps": f"{since}/"})
        if token is not None:
            page_url = _append_query(page_url, {"pageToken": token})
        payload = await _request_page(client, request, page_url, headers)
        for trip in _page_trips(payload):
            trips_by_id[str(trip["id"])] = trip

        next_token = _next_page_token(payload)
        if next_token is None or next_token in seen_tokens:
            break
        seen_tokens.add(next_token)
        token = next_token

    return {"trips": list(trips_by_id.values())}

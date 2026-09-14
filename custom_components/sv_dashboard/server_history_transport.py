"""Compatibility adapter for the authenticated upstream historical trips API.

SV Dashboard owns the historical aggregation contract, but never owns
Stellantis authentication or an HTTP session.  This module discovers the
already-loaded upstream transport helpers from the resolved client and keeps
all version-specific coupling in one place.
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
        payload = await request(page_url, method="GET", headers=headers)
        for trip in _page_trips(payload):
            trips_by_id[str(trip["id"])] = trip

        next_token = _next_page_token(payload)
        if next_token is None or next_token in seen_tokens:
            break
        seen_tokens.add(next_token)
        token = next_token

    return {"trips": list(trips_by_id.values())}

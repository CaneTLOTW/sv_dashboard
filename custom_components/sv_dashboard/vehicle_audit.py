"""Privacy-safe, opt-in vehicle capability audit for SV Dashboard."""

from __future__ import annotations

from collections import defaultdict
from copy import deepcopy
from datetime import timedelta
import hashlib
import math
import re
from typing import Any
from urllib.parse import quote, urlsplit

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.const import __version__ as HA_VERSION
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .const import DOMAIN, FRONTEND_VERSION
from .server_history_transport import (
    HistoricalTripsTransportUnavailable,
    async_authenticated_get,
    async_authenticated_get_href,
    upstream_transport_constant,
)

_SCHEMA_VERSION = 1
_SAMPLE_LIST_LIMIT = 12
_SAMPLE_DICT_LIMIT = 100
_SAMPLE_STRING_LIMIT = 500
_INVENTORY_ENUM_LIMIT = 8
_UNMAPPED_LIMIT = 120

_SENSITIVE_KEYS = {
    "access_token",
    "refresh_token",
    "id_token",
    "oauth_code",
    "code_verifier",
    "code_challenge",
    "client_secret",
    "basic_token",
    "customer_id",
    "account_id",
    "accountid",
    "email",
    "password",
    "pin",
    "pin_code",
    "authorization",
    "correlation_id",
    "callback_id",
    "callbackid",
    "monitor_id",
    "monitorid",
    "remote_id",
    "remoteid",
    "text_abrp_token",
    "abrp_token",
    "vin",
    "vehicle_id",
}
_LOCATION_KEYS = {"coordinates", "latitude", "longitude"}
_URL_KEYS = {"href", "picture", "pictures", "url", "uri", "link"}
_META_PATH_ENDINGS = (
    ".createdAt",
    ".updatedAt",
    ".created_at",
    ".updated_at",
)
_INVENTORY_PRIVATE_PATH_TOKENS = {
    "vin",
    "token",
    "secret",
    "href",
    "coordinate",
    "coordinates",
    "latitude",
    "longitude",
    "picture",
    "pictures",
    "account",
    "accountid",
    "account_id",
    "customer",
    "customer_id",
    "correlation_id",
    "callback_id",
    "monitor_id",
    "remote_id",
    "vehicle_id",
}
_VIN_PATTERN = re.compile(r"\b[A-HJ-NPR-Z0-9]{17}\b", re.IGNORECASE)


def _hash_id(value: Any, *, length: int = 12) -> str | None:
    if value is None:
        return None
    text = str(value)
    if not text:
        return None
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:length]


def _safe_error(error: BaseException, secrets: set[str]) -> str:
    text = f"{error.__class__.__name__}: {error}"
    for secret in sorted(secrets, key=len, reverse=True):
        if len(secret) >= 6:
            text = text.replace(secret, "**REDACTED**")
    text = _VIN_PATTERN.sub("**REDACTED-VIN**", text)
    return text[:500]


def _collect_secrets(client: Any, vehicle: dict[str, Any]) -> set[str]:
    values: set[str] = set()
    for key in ("vin", "vehicle_id", "id"):
        value = vehicle.get(key)
        if value:
            values.add(str(value))

    config = getattr(client, "_config", None)
    if isinstance(config, dict):
        pending = [config]
        while pending:
            current = pending.pop()
            if isinstance(current, dict):
                for key, value in current.items():
                    normalized = str(key).casefold()
                    if isinstance(value, (dict, list, tuple)):
                        pending.append(value)
                    elif (
                        normalized in _SENSITIVE_KEYS
                        or "token" in normalized
                        or "secret" in normalized
                        or "customer" in normalized
                        or "account" in normalized
                    ):
                        if value:
                            values.add(str(value))
            elif isinstance(current, (list, tuple)):
                pending.extend(current)
    return values


def _redaction_counter() -> defaultdict[str, int]:
    return defaultdict(int)


def _sanitize_string(value: str, secrets: set[str], counts) -> str:
    text = value
    for secret in sorted(secrets, key=len, reverse=True):
        if len(secret) >= 6 and secret in text:
            text = text.replace(secret, "**REDACTED**")
            counts["embedded_identifier"] += 1
    redacted, replacements = _VIN_PATTERN.subn("**REDACTED-VIN**", text)
    if replacements:
        counts["vin_pattern"] += replacements
    return redacted[:_SAMPLE_STRING_LIMIT]


def _sanitize(
    value: Any,
    secrets: set[str],
    counts,
    *,
    key: str | None = None,
    depth: int = 0,
) -> Any:
    if depth > 8:
        counts["depth_truncated"] += 1
        return "**TRUNCATED**"

    normalized_key = str(key or "").casefold()
    if normalized_key in _SENSITIVE_KEYS or "token" in normalized_key or "secret" in normalized_key:
        counts["sensitive_key"] += 1
        return "**REDACTED**"
    if normalized_key in _LOCATION_KEYS:
        counts["location"] += 1
        return "**REDACTED**"
    if normalized_key in _URL_KEYS:
        counts["url"] += 1
        if isinstance(value, list):
            return ["**REDACTED-URL**"] * min(len(value), _SAMPLE_LIST_LIMIT)
        return "**REDACTED-URL**"

    if normalized_key == "_links" and isinstance(value, dict):
        counts["hal_urls"] += len(value)
        return {
            str(relation): {"present": True}
            for relation in list(value)[:_SAMPLE_DICT_LIMIT]
        }

    if normalized_key == "lastposition" and isinstance(value, dict):
        counts["location"] += 1
        properties = value.get("properties")
        safe_properties = {}
        if isinstance(properties, dict):
            for prop_key, prop_value in properties.items():
                if str(prop_key).casefold() in _LOCATION_KEYS:
                    continue
                safe_properties[str(prop_key)] = _sanitize(
                    prop_value, secrets, counts, key=str(prop_key), depth=depth + 1
                )
        geometry = value.get("geometry")
        geometry_type = geometry.get("type") if isinstance(geometry, dict) else None
        return {
            "present": True,
            "type": value.get("type"),
            "geometry": {"type": geometry_type, "coordinates": "**REDACTED**"},
            "properties": safe_properties,
        }

    if isinstance(value, dict):
        result = {}
        for index, (child_key, child_value) in enumerate(value.items()):
            if index >= _SAMPLE_DICT_LIMIT:
                counts["dict_truncated"] += 1
                result["__truncated__"] = True
                break
            result[str(child_key)] = _sanitize(
                child_value,
                secrets,
                counts,
                key=str(child_key),
                depth=depth + 1,
            )
        return result
    if isinstance(value, (list, tuple)):
        if len(value) > _SAMPLE_LIST_LIMIT:
            counts["list_truncated"] += 1
        return [
            _sanitize(item, secrets, counts, key=key, depth=depth + 1)
            for item in list(value)[:_SAMPLE_LIST_LIMIT]
        ]
    if isinstance(value, str):
        if (
            normalized_key == "id"
            and len(value) >= 8
            and value.casefold() not in {"driver", "passenger", "rearleft", "rearright", "trunk"}
        ):
            counts["opaque_id"] += 1
            return f"sha256:{_hash_id(value)}"
        return _sanitize_string(value, secrets, counts)
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def _probe_status_from_error(error: BaseException) -> str:
    text = str(error).casefold()
    if "403" in text or "forbidden" in text:
        return "forbidden"
    if "404" in text or "not found" in text:
        return "unavailable"
    return "error"


def _embedded_items(payload: Any, key: str) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        return []
    embedded = payload.get("_embedded")
    values = embedded.get(key) if isinstance(embedded, dict) else payload.get(key)
    return [item for item in values if isinstance(item, dict)] if isinstance(values, list) else []


def _trip_rows(payload: Any) -> list[dict[str, Any]]:
    return _embedded_items(payload, "trips")


def _relation_href(payload: Any, relation: str) -> str | None:
    if not isinstance(payload, dict):
        return None
    links = payload.get("_links")
    if not isinstance(links, dict):
        return None
    value = links.get(relation)
    if isinstance(value, dict):
        value = value.get("href")
    return value if isinstance(value, str) and value else None


def _allowed_hal_href(href: str, api_base: str) -> bool:
    try:
        target = urlsplit(href)
        base = urlsplit(api_base)
    except ValueError:
        return False
    return (
        target.scheme == "https"
        and target.netloc == base.netloc
        and target.path.startswith("/connectedcar/v4/user/")
    )


def _selected_vehicle(payload: Any, vehicle: dict[str, Any]) -> dict[str, Any] | None:
    target_id = str(vehicle.get("vehicle_id") or vehicle.get("id") or "")
    target_vin = str(vehicle.get("vin") or "")
    for candidate in _embedded_items(payload, "vehicles"):
        if target_id and str(candidate.get("id") or candidate.get("vehicle_id") or "") == target_id:
            return candidate
        if target_vin and str(candidate.get("vin") or "") == target_vin:
            return candidate
    return None


def _find_key(value: Any, target: str) -> Any:
    if isinstance(value, dict):
        if target in value:
            return value[target]
        for child in value.values():
            found = _find_key(child, target)
            if found is not None:
                return found
    elif isinstance(value, list):
        for child in value:
            found = _find_key(child, target)
            if found is not None:
                return found
    return None


def _value_map_path(value: Any) -> str | None:
    if not isinstance(value, list):
        return None
    parts: list[str] = []
    for item in value:
        if isinstance(item, str):
            parts.append(item)
        elif isinstance(item, int) or isinstance(item, dict):
            if parts:
                parts[-1] = f"{parts[-1]}[]"
    return ".".join(parts) if parts else None


def _known_upstream_paths(client: Any) -> set[str]:
    paths = {"lastPosition"}
    for constant in ("SENSORS_DEFAULT", "BINARY_SENSORS_DEFAULT"):
        mapping = upstream_transport_constant(client, constant)
        if not isinstance(mapping, dict):
            continue
        for config in mapping.values():
            if not isinstance(config, dict):
                continue
            for key in ("value_map", "updated_at_map"):
                path = _value_map_path(config.get(key))
                if path:
                    paths.add(path)
    return paths


def _path_is_mapped(path: str, known: set[str]) -> bool:
    for candidate in known:
        if path == candidate or path.startswith(f"{candidate}.") or candidate.startswith(f"{path}."):
            return True
    return False


def _inventory_path_allows_enum(path: str) -> bool:
    """Return whether a path may safely retain short observed string values."""
    segments = {
        segment.casefold()
        for segment in re.split(r"[.\[\]]+", path)
        if segment
    }
    if "id" in segments:
        return False
    return not bool(segments & _INVENTORY_PRIVATE_PATH_TOKENS)


def _inventory_payload(
    payload: Any,
    mapped_paths: set[str],
    secrets: set[str],
    counts,
) -> list[dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}

    def visit(value: Any, path: str) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                child_path = f"{path}.{key}" if path else str(key)
                if str(key) == "_links":
                    row = rows.setdefault(
                        child_path,
                        {"path": child_path, "types": set(), "count": 0, "enum_values": set(), "timestamps": []},
                    )
                    row["types"].add("object")
                    row["count"] += 1
                    continue
                visit(child, child_path)
            return
        if isinstance(value, list):
            list_path = f"{path}[]"
            row = rows.setdefault(
                list_path,
                {"path": list_path, "types": set(), "count": 0, "enum_values": set(), "timestamps": []},
            )
            row["types"].add("array")
            row["count"] += len(value)
            for child in value:
                visit(child, list_path)
            return

        row = rows.setdefault(
            path,
            {"path": path, "types": set(), "count": 0, "enum_values": set(), "timestamps": []},
        )
        row["count"] += 1
        if value is None:
            row["types"].add("null")
        elif isinstance(value, bool):
            row["types"].add("boolean")
            row["enum_values"].add(str(value).lower())
        elif isinstance(value, (int, float)):
            row["types"].add("number")
        elif isinstance(value, str):
            row["types"].add("string")
            if _inventory_path_allows_enum(path) and len(value) <= 80:
                safe_value = _sanitize_string(value, secrets, counts)
                if not safe_value.startswith("**REDACTED"):
                    row["enum_values"].add(safe_value)
            if path.endswith(("createdAt", "updatedAt", "created_at", "updated_at")):
                parsed = dt_util.parse_datetime(value)
                if parsed is not None:
                    row["timestamps"].append(parsed)
        else:
            row["types"].add(type(value).__name__)

    visit(payload, "")
    now = dt_util.utcnow()
    result = []
    for path in sorted(rows):
        row = rows[path]
        timestamps = row.pop("timestamps")
        record = {
            "path": path,
            "types": sorted(row["types"]),
            "count": row["count"],
            "mapped_upstream": _path_is_mapped(path, mapped_paths),
        }
        enums = sorted(row["enum_values"])
        if enums:
            record["enum_values"] = enums[:_INVENTORY_ENUM_LIMIT]
            if len(enums) > _INVENTORY_ENUM_LIMIT:
                record["enum_values_truncated"] = True
        if timestamps:
            freshest = max(timestamps)
            record["freshest_timestamp"] = freshest.isoformat()
            record["freshest_age_seconds"] = max(0, round((now - freshest).total_seconds()))
        result.append(record)
    return result


def _unmapped_candidates(inventory: list[dict[str, Any]]) -> list[str]:
    candidates = []
    for row in inventory:
        path = str(row.get("path") or "")
        if row.get("mapped_upstream"):
            continue
        if not path or path.endswith(_META_PATH_ENDINGS):
            continue
        lower = path.casefold()
        if any(token in lower for token in ("_links", "coordinate", "latitude", "longitude", "vin", "picture")):
            continue
        candidates.append(path)
    return candidates[:_UNMAPPED_LIMIT]


def _entity_inventory(hass: HomeAssistant, mapping: dict[str, str], secrets: set[str], counts) -> list[dict[str, Any]]:
    rows = []
    seen: set[tuple[str, str]] = set()
    for key, entity_id in sorted(mapping.items()):
        if not isinstance(entity_id, str) or "." not in entity_id:
            continue
        state = hass.states.get(entity_id)
        domain = entity_id.split(".", 1)[0]
        identity = (key, domain)
        if identity in seen:
            continue
        seen.add(identity)
        raw_state = state.state if state is not None else None
        rows.append(
            {
                "key": key,
                "domain": domain,
                "available": bool(state is not None and raw_state not in ("unknown", "unavailable")),
                "state": _sanitize(raw_state, secrets, counts, key="state") if state is not None else None,
                "unit": _sanitize(
                    state.attributes.get("unit_of_measurement"),
                    secrets,
                    counts,
                    key="unit",
                )
                if state is not None
                else None,
                "device_class": _sanitize(
                    state.attributes.get("device_class"),
                    secrets,
                    counts,
                    key="device_class",
                )
                if state is not None
                else None,
            }
        )
    return rows


def _trip_signature(trip: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(trip, dict):
        return None
    return {
        "id_hash": _hash_id(trip.get("id")),
        "startedAt": trip.get("startedAt"),
        "stoppedAt": trip.get("stoppedAt"),
        "distance": trip.get("distance"),
    }


def _trip_query_summary(payload: Any) -> dict[str, Any]:
    trips = _trip_rows(payload)
    return {
        "total": payload.get("total") if isinstance(payload, dict) else None,
        "currentPage": payload.get("currentPage") if isinstance(payload, dict) else None,
        "totalPage": payload.get("totalPage") if isinstance(payload, dict) else None,
        "returned": len(trips),
        "first": _trip_signature(trips[0] if trips else None),
        "last": _trip_signature(trips[-1] if trips else None),
        "links": {
            relation: bool(_relation_href(payload, relation))
            for relation in ("first", "next", "prev", "last")
        },
    }


async def _run_probe(name: str, awaitable, secrets: set[str], counts) -> tuple[dict[str, Any], Any]:
    try:
        payload = await awaitable
    except Exception as error:
        return (
            {
                "name": name,
                "status": _probe_status_from_error(error),
                "error": _safe_error(error, secrets),
            },
            None,
        )
    status = "pass" if payload not in (None, {}, []) else "unavailable"
    return (
        {
            "name": name,
            "status": status,
            "sample": _sanitize(deepcopy(payload), secrets, counts),
        },
        payload,
    )


def _resolve_runtime(coordinator: Any) -> tuple[Any, dict[str, Any] | None]:
    manager = getattr(coordinator, "server_history", None)
    if manager is None:
        return None, None
    client = getattr(manager, "_client", None)
    vehicle = getattr(manager, "_vehicle", None)
    if client is not None and isinstance(vehicle, dict):
        return client, vehicle
    resolver = getattr(manager, "_resolve_upstream", None)
    if callable(resolver):
        resolved_client, resolved_vehicle = resolver()
        if resolved_client is not None and isinstance(resolved_vehicle, dict):
            return resolved_client, resolved_vehicle
    return None, None


def _environment(coordinator: Any) -> dict[str, Any]:
    data = getattr(coordinator, "data", {}) or {}
    compatibility = data.get("upstream_compatibility") or {}
    return {
        "home_assistant_version": HA_VERSION,
        "sv_dashboard_version": FRONTEND_VERSION,
        "stellantis_vehicles_version": compatibility.get("version"),
    }


async def async_build_vehicle_audit(hass: HomeAssistant, coordinator: Any) -> dict[str, Any]:
    """Run one bounded, read-only capability audit against the selected vehicle."""
    client, vehicle = _resolve_runtime(coordinator)
    if client is None or not isinstance(vehicle, dict):
        raise HistoricalTripsTransportUnavailable("upstream_vehicle_unavailable")

    secrets = _collect_secrets(client, vehicle)
    counts = _redaction_counter()
    data = getattr(coordinator, "data", {}) or {}
    mapping = data.get("entity_mapping") or {}
    known_paths = _known_upstream_paths(client)
    audit_salt = f"{getattr(coordinator.entry, 'entry_id', '')}:{vehicle.get('vin') or vehicle.get('vehicle_id') or ''}"
    audit_id = _hash_id(audit_salt, length=16)
    probes: dict[str, dict[str, Any]] = {}
    raw: dict[str, Any] = {}

    vehicles_url = upstream_transport_constant(client, "CAR_API_VEHICLES_URL")
    status_url = upstream_transport_constant(client, "CAR_API_GET_VEHICLE_STATUS_URL")
    maintenance_url = upstream_transport_constant(client, "CAR_API_GET_VEHICLE_MAINTENANCE_URL")
    trips_url = upstream_transport_constant(client, "CAR_API_GET_VEHICLE_TRIPS_URL")
    if not all((vehicles_url, status_url, maintenance_url, trips_url)):
        raise HistoricalTripsTransportUnavailable("upstream_read_only_urls_unavailable")

    probe, payload = await _run_probe(
        "vehicles",
        async_authenticated_get(client, vehicle, vehicles_url),
        secrets,
        counts,
    )
    raw["vehicles"] = payload
    if payload is not None:
        selected = _selected_vehicle(payload, vehicle)
        probe["account_vehicle_count"] = len(_embedded_items(payload, "vehicles"))
        probe["sample"] = {
            "selected_vehicle": _sanitize(selected, secrets, counts)
            if selected is not None
            else None
        }
    probes["vehicles"] = probe

    probe, payload = await _run_probe(
        "status",
        async_authenticated_get(client, vehicle, status_url),
        secrets,
        counts,
    )
    probes["status"] = probe
    raw["status"] = payload

    probe, payload = await _run_probe(
        "maintenance",
        async_authenticated_get(client, vehicle, maintenance_url),
        secrets,
        counts,
    )
    probes["maintenance"] = probe
    raw["maintenance"] = payload

    vehicle_detail_url = f"{vehicles_url}/{{#vehicle_id#}}"
    extension_payloads: dict[str, Any] = {}
    for extension in ("onboardCapabilities", "branding", "pictures"):
        probe, payload = await _run_probe(
            f"vehicle_extension_{extension}",
            async_authenticated_get(
                client,
                vehicle,
                vehicle_detail_url,
                query={"extension": extension},
            ),
            secrets,
            counts,
        )
        probes[probe["name"]] = probe
        extension_payloads[extension] = payload

    trip_payloads: dict[str, Any] = {}
    for name, query in (
        ("trips_baseline", {"distance": "0.1-"}),
        ("trips_page_size_one", {"distance": "0.1-", "pageSize": 1}),
        ("trips_index_zero", {"distance": "0.1-", "indexRange": "0-0"}),
    ):
        probe, payload = await _run_probe(
            name,
            async_authenticated_get(client, vehicle, trips_url, query=query),
            secrets,
            counts,
        )
        probe["summary"] = _trip_query_summary(payload)
        probe.pop("sample", None)
        probes[name] = probe
        trip_payloads[name] = payload

    page_one = trip_payloads.get("trips_page_size_one")
    global_total = page_one.get("total") if isinstance(page_one, dict) else None
    if isinstance(global_total, int) and global_total > 0:
        probe, payload = await _run_probe(
            "trips_last_index",
            async_authenticated_get(
                client,
                vehicle,
                trips_url,
                query={"distance": "0.1-", "indexRange": f"{global_total - 1}-{global_total - 1}"},
            ),
            secrets,
            counts,
        )
        probe["summary"] = _trip_query_summary(payload)
        probe.pop("sample", None)
        probes["trips_last_index"] = probe
        trip_payloads["trips_last_index"] = payload

    last_href = _relation_href(page_one, "last")
    api_base = str(vehicles_url)
    if last_href and _allowed_hal_href(last_href, api_base):
        probe, payload = await _run_probe(
            "trips_hal_last",
            async_authenticated_get_href(client, last_href),
            secrets,
            counts,
        )
        probe["summary"] = _trip_query_summary(payload)
        probe.pop("sample", None)
        probes["trips_hal_last"] = probe
        trip_payloads["trips_hal_last"] = payload
    else:
        probes["trips_hal_last"] = {
            "name": "trips_hal_last",
            "status": "unavailable",
            "reason": "last_link_not_advertised",
        }

    newest_trip = None
    for source_name in ("trips_hal_last", "trips_last_index", "trips_baseline"):
        rows = _trip_rows(trip_payloads.get(source_name))
        if rows:
            candidate = rows[-1]
            if newest_trip is None or str(candidate.get("startedAt") or "") > str(newest_trip.get("startedAt") or ""):
                newest_trip = candidate

    if newest_trip and newest_trip.get("startedAt"):
        parsed = dt_util.parse_datetime(str(newest_trip.get("startedAt")))
        if parsed is not None:
            since = (parsed - timedelta(hours=2)).isoformat()
            probe, payload = await _run_probe(
                "trips_timestamp_overlap",
                async_authenticated_get(
                    client,
                    vehicle,
                    trips_url,
                    query={"distance": "0.1-", "timestamps": f"{since}/"},
                ),
                secrets,
                counts,
            )
            probe["summary"] = _trip_query_summary(payload)
            probe.pop("sample", None)
            probes["trips_timestamp_overlap"] = probe
            trip_payloads["trips_timestamp_overlap"] = payload

    if newest_trip and newest_trip.get("id"):
        trip_detail_url = f"{trips_url}/{quote(str(newest_trip['id']), safe='')}"
        probe, payload = await _run_probe(
            "trip_detail",
            async_authenticated_get(client, vehicle, trip_detail_url),
            secrets,
            counts,
        )
        probes["trip_detail"] = probe
        raw["trip_detail"] = payload
    else:
        probes["trip_detail"] = {
            "name": "trip_detail",
            "status": "unavailable",
            "reason": "no_trip_id_available",
        }

    selected_raw = _selected_vehicle(raw.get("vehicles"), vehicle)
    hal_source = selected_raw
    if not isinstance(hal_source, dict):
        hal_source = extension_payloads.get("onboardCapabilities")
    links = hal_source.get("_links") if isinstance(hal_source, dict) else None
    for relation in ("telemetry", "alerts", "collisions", "alarms", "lastPosition"):
        href = None
        if isinstance(links, dict):
            relation_value = links.get(relation)
            if isinstance(relation_value, dict):
                href = relation_value.get("href")
            elif isinstance(relation_value, str):
                href = relation_value
        name = f"hal_{relation}"
        if not isinstance(href, str) or not _allowed_hal_href(href, api_base):
            probes[name] = {"name": name, "status": "unavailable", "reason": "not_advertised"}
            continue
        probe, payload = await _run_probe(
            name,
            async_authenticated_get_href(client, href),
            secrets,
            counts,
        )
        probes[name] = probe
        raw[name] = payload

    status_inventory = _inventory_payload(
        raw.get("status") or {},
        known_paths,
        secrets,
        counts,
    )
    capabilities_payload = extension_payloads.get("onboardCapabilities")
    advertised_capabilities = _find_key(capabilities_payload, "onboardCapabilities")
    if advertised_capabilities is None:
        advertised_capabilities = {"available": False}

    first_sig = _trip_query_summary(trip_payloads.get("trips_page_size_one")).get("first")
    index_zero_sig = _trip_query_summary(trip_payloads.get("trips_index_zero")).get("first")
    last_sig = _trip_query_summary(trip_payloads.get("trips_hal_last")).get("first")
    explicit_last_sig = _trip_query_summary(trip_payloads.get("trips_last_index")).get("first")
    trip_query_audit = {
        "global_total": global_total,
        "page_size_one_equals_index_zero": bool(first_sig and index_zero_sig and first_sig.get("id_hash") == index_zero_sig.get("id_hash")),
        "hal_last_equals_explicit_last_index": bool(last_sig and explicit_last_sig and last_sig.get("id_hash") == explicit_last_sig.get("id_hash")),
        "first": first_sig,
        "last": last_sig or explicit_last_sig,
        "observed_order": (
            "ascending_oldest_to_newest"
            if first_sig
            and (last_sig or explicit_last_sig)
            and str(first_sig.get("startedAt") or "") <= str((last_sig or explicit_last_sig).get("startedAt") or "")
            else "unknown"
        ),
        "note": "Observed ordering is runtime evidence, not a documented Stellantis ordering guarantee.",
    }

    report = {
        "schema_version": _SCHEMA_VERSION,
        "generated_at": dt_util.utcnow().isoformat(),
        "audit_id": audit_id,
        "mode": "read_only",
        "environment": _environment(coordinator),
        "vehicle_summary": {
            "brand": vehicle.get("brand"),
            "powertrain": data.get("powertrain") or vehicle.get("type") or vehicle.get("motorization"),
            "capability_profile": _sanitize(data.get("capabilities") or {}, secrets, counts),
            "mapped_entity_count": len(mapping),
        },
        "advertised_capabilities": _sanitize(
            advertised_capabilities, secrets, counts
        ),
        "upstream_entities": _entity_inventory(hass, mapping, secrets, counts),
        "probe_results": probes,
        "status_path_inventory": status_inventory,
        "trip_query_audit": trip_query_audit,
        "unmapped_candidate_fields": _unmapped_candidates(status_inventory),
        "privacy_redaction_summary": {
            "redactions": dict(sorted(counts.items())),
            "gps_coordinates_exported": False,
            "raw_vin_exported": False,
            "raw_vehicle_id_exported": False,
            "tokens_exported": False,
            "persistent_report_written": False,
        },
    }
    return report


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/vehicle_audit",
        vol.Required("entry_id"): str,
    }
)
@websocket_api.async_response
async def websocket_vehicle_audit(hass: HomeAssistant, connection, msg) -> None:
    """Run and return one privacy-safe read-only vehicle audit."""
    coordinator = hass.data.get(DOMAIN, {}).get(msg["entry_id"])
    if coordinator is None:
        connection.send_error(msg["id"], "not_found", "SV Dashboard entry is unavailable")
        return
    try:
        report = await async_build_vehicle_audit(hass, coordinator)
    except HistoricalTripsTransportUnavailable as error:
        connection.send_error(msg["id"], "unavailable", str(error))
        return
    except Exception as error:
        # A top-level failure may occur before we can reconstruct the complete
        # per-vehicle secret set. Do not echo transport URLs/identifiers into
        # the browser error surface.
        connection.send_error(
            msg["id"],
            "audit_failed",
            f"Vehicle audit failed ({error.__class__.__name__})",
        )
        return
    connection.send_result(msg["id"], report)


def async_register_vehicle_audit_websocket(hass: HomeAssistant) -> None:
    """Register the opt-in read-only vehicle-audit WebSocket command once."""
    websocket_api.async_register_command(hass, websocket_vehicle_audit)

"""Narrow compatibility helpers for cached Stellantis vehicle metadata."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Any, Iterator


def _valid_vehicle(candidate: Any, target_vin: str) -> dict[str, Any] | None:
    """Return only a dict that belongs to the selected vehicle."""
    if not isinstance(candidate, dict):
        return None
    if str(candidate.get("vin") or "").strip() != target_vin:
        return None
    return candidate


def _cached_candidates(client: Any, coordinator: Any) -> Iterator[Any]:
    """Yield cached metadata exposed by supported upstream object shapes."""
    for owner in (coordinator, client):
        if owner is None:
            continue
        for attribute in ("vehicle_info", "_vehicle", "vehicles", "_vehicles"):
            try:
                value = getattr(owner, attribute)
            except AttributeError:
                continue
            if attribute in ("vehicle_info", "_vehicle"):
                yield value
                continue
            if isinstance(value, dict):
                # Some clients expose one vehicle directly, others map VINs to
                # cached vehicle dictionaries.
                if "vin" in value:
                    yield value
                else:
                    yield from value.values()
            elif isinstance(value, (list, tuple, set)):
                yield from value


def _client_shutting_down(client: Any) -> bool:
    """Return whether the upstream runtime is already being torn down."""
    return bool(client is not None and getattr(client, "_shutting_down", False))


def _coordinator_for_vin(client: Any, target_vin: str) -> Any:
    """Return the already-loaded upstream coordinator for one VIN, if available."""
    if not client or not target_vin or _client_shutting_down(client):
        return None

    lookup = getattr(client, "async_get_coordinator_by_vin", None)
    if not callable(lookup):
        return None
    try:
        return lookup(target_vin)
    except Exception:
        return None


def get_upstream_coordinator_data(client: Any, target_vin: str) -> dict[str, Any] | None:
    """Return an isolated snapshot of the upstream coordinator's current data.

    Stellantis Vehicles 2026.9.3 made ``coordinator.data`` the single source of
    current vehicle status.  SV Dashboard keeps Home Assistant entities as its
    public product data contract, but this optional snapshot is useful for
    compatibility checks and diagnostics while already operating on the loaded
    upstream runtime.  It never performs network discovery and never exposes a
    mutable reference to the upstream coordinator's live dictionary.
    """
    coordinator = _coordinator_for_vin(client, target_vin)
    if coordinator is None:
        return None
    data = getattr(coordinator, "data", None)
    if not isinstance(data, dict):
        return None
    return deepcopy(data)


def freshest_upstream_timestamp(
    payload: Any,
    *,
    now: datetime | None = None,
    max_future_skew: timedelta = timedelta(minutes=5),
) -> datetime | None:
    """Return the newest trustworthy source timestamp from cached vehicle data.

    Only source metadata fields are considered. This deliberately ignores
    command-history/status timestamps and performs no network I/O.
    """
    reference = now or datetime.now(timezone.utc)
    candidates: list[datetime] = []

    def visit(value: Any) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                normalized = str(key).replace("_", "").casefold()
                if normalized in {"createdat", "updatedat"}:
                    parsed = None
                    if isinstance(child, datetime):
                        parsed = child
                    elif child:
                        text = str(child).strip().replace("Z", "+00:00")
                        try:
                            parsed = datetime.fromisoformat(text)
                        except ValueError:
                            parsed = None
                    if parsed is not None:
                        if parsed.tzinfo is None:
                            parsed = parsed.replace(tzinfo=timezone.utc)
                        else:
                            parsed = parsed.astimezone(timezone.utc)
                        if parsed <= reference + max_future_skew:
                            candidates.append(parsed)
                visit(child)
        elif isinstance(value, (list, tuple)):
            for child in value:
                visit(child)

    visit(payload)
    return max(candidates) if candidates else None


def select_upstream_client(upstream_entry: Any, legacy_clients: Any) -> Any:
    """Prefer ConfigEntry.runtime_data, then use the legacy hass.data cache.

    A runtime object that is already shutting down is intentionally rejected.
    Reacquisition can bind to the replacement ``runtime_data`` after the
    upstream config entry finishes reloading, rather than reusing a stale
    client whose shared HTTP/MQTT transports are being destroyed.
    """
    client = getattr(upstream_entry, "runtime_data", None)
    if client is not None:
        return None if _client_shutting_down(client) else client
    entry_id = getattr(upstream_entry, "entry_id", None)
    if isinstance(legacy_clients, dict) and entry_id:
        client = legacy_clients.get(entry_id)
        return None if _client_shutting_down(client) else client
    return None


def resolve_cached_upstream(client: Any, target_vin: str) -> tuple[Any, dict[str, Any]]:
    """Resolve one vehicle from an already-loaded upstream client cache.

    ``async_get_coordinator_by_vin`` is the upstream's local coordinator lookup;
    this adapter deliberately never calls a vehicle-list or network method.
    """
    if not client or not target_vin or _client_shutting_down(client):
        return None, None

    coordinator = _coordinator_for_vin(client, target_vin)
    for candidate in _cached_candidates(client, coordinator):
        vehicle = _valid_vehicle(candidate, target_vin)
        if vehicle is not None:
            return client, vehicle
    return None, None


def resolve_loaded_upstream(
    entries: Any,
    target_vin: str,
    legacy_clients: Any,
    preferred_entry_ids: Any = (),
) -> tuple[Any, dict[str, Any]]:
    """Resolve a VIN from already-loaded upstream ConfigEntry objects.

    Device linkage is the preferred lookup path, but it can be stale while
    Home Assistant is still restoring the upstream integration.  The fallback
    scans only the ConfigEntry/runtime cache already present in memory; it
    never calls a vehicle-list or other network discovery method.
    """
    if not target_vin:
        return None, None

    entry_list = [entry for entry in (entries or []) if entry is not None]
    preferred = {str(entry_id) for entry_id in (preferred_entry_ids or ())}
    ordered = sorted(
        enumerate(entry_list),
        key=lambda item: (0 if str(getattr(item[1], "entry_id", "")) in preferred else 1, item[0]),
    )
    for _index, upstream_entry in ordered:
        if getattr(upstream_entry, "domain", None) not in (None, "stellantis_vehicles"):
            continue
        client = select_upstream_client(upstream_entry, legacy_clients)
        resolved_client, vehicle = resolve_cached_upstream(client, target_vin)
        if resolved_client is not None and vehicle is not None:
            return resolved_client, vehicle
    return None, None

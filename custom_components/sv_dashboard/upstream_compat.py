"""Narrow compatibility helpers for cached Stellantis vehicle metadata."""

from __future__ import annotations

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


def select_upstream_client(upstream_entry: Any, legacy_clients: Any) -> Any:
    """Prefer ConfigEntry.runtime_data, then use the legacy hass.data cache."""
    client = getattr(upstream_entry, "runtime_data", None)
    if client is not None:
        return client
    entry_id = getattr(upstream_entry, "entry_id", None)
    if isinstance(legacy_clients, dict) and entry_id:
        return legacy_clients.get(entry_id)
    return None


def resolve_cached_upstream(client: Any, target_vin: str) -> tuple[Any, dict[str, Any]]:
    """Resolve one vehicle from an already-loaded upstream client cache.

    ``async_get_coordinator_by_vin`` is the upstream's local coordinator lookup;
    this adapter deliberately never calls a vehicle-list or network method.
    """
    if not client or not target_vin:
        return None, None

    coordinator = None
    lookup = getattr(client, "async_get_coordinator_by_vin", None)
    if callable(lookup):
        try:
            coordinator = lookup(target_vin)
        except Exception:
            coordinator = None

    for candidate in _cached_candidates(client, coordinator):
        vehicle = _valid_vehicle(candidate, target_vin)
        if vehicle is not None:
            return client, vehicle
    return None, None

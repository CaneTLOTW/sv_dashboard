"""Stable, SV-namespaced identity for package-owned Home Assistant entities."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.util import slugify

from .const import (
    CONF_VEHICLE_DEVICE_ID,
    CONF_VEHICLE_VIN,
    DOMAIN,
    UPSTREAM_DOMAIN,
)

_LOGGER = logging.getLogger(__name__)

ENTITY_ID_PREFIX = "sv"

# The dashboard status sensor predates the package-wide translation-key pass and
# is the only entity whose technical key is applied here without class-owned
# translation metadata. Keep the mapping explicit so entity identity remains
# language-neutral while Home Assistant can resolve the visible name from the
# normal 18-language translation catalogs.
ENTITY_TRANSLATION_KEYS = {
    "status": "dashboard_status",
}


def _device_vin(device: Any) -> str | None:
    if device is None:
        return None
    for identifier in device.identifiers:
        if len(identifier) >= 2 and identifier[0] == UPSTREAM_DOMAIN:
            vin = str(identifier[1]).strip()
            if vin:
                return vin
    return None


def _device_for_vin(hass: HomeAssistant, vin: str | None):
    if not vin:
        return None
    registry = dr.async_get(hass)
    for device in registry.devices.values():
        if _device_vin(device) == vin:
            return device
    return None


def vehicle_vin(hass: HomeAssistant, entry: ConfigEntry) -> str | None:
    """Return the stable upstream VIN, with stored identity as recovery fallback."""
    device_id = entry.data.get(CONF_VEHICLE_DEVICE_ID)
    device = dr.async_get(hass).async_get(device_id) if device_id else None
    live_vin = _device_vin(device)
    stored_vin = str(entry.data.get(CONF_VEHICLE_VIN) or "").strip() or None
    if live_vin:
        return live_vin
    if stored_vin:
        recovered = _device_for_vin(hass, stored_vin)
        return _device_vin(recovered) or stored_vin
    return None


def async_repair_vehicle_reference(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Repair a stale HA device pointer from the stable VIN without touching upstream."""
    data = dict(entry.data)
    stored_vin = str(data.get(CONF_VEHICLE_VIN) or "").strip() or None
    device_id = data.get(CONF_VEHICLE_DEVICE_ID)
    registry = dr.async_get(hass)
    device = registry.async_get(device_id) if device_id else None
    live_vin = _device_vin(device)

    if stored_vin and live_vin != stored_vin:
        recovered = _device_for_vin(hass, stored_vin)
        if recovered is not None:
            device = recovered
            live_vin = _device_vin(recovered)

    if device is None and stored_vin:
        device = _device_for_vin(hass, stored_vin)
        live_vin = _device_vin(device)

    changed = False
    if device is not None and data.get(CONF_VEHICLE_DEVICE_ID) != device.id:
        data[CONF_VEHICLE_DEVICE_ID] = device.id
        changed = True
    if live_vin and data.get(CONF_VEHICLE_VIN) != live_vin:
        data[CONF_VEHICLE_VIN] = live_vin
        changed = True
    if changed:
        hass.config_entries.async_update_entry(entry, data=data)


def _vehicle_identity_base(hass: HomeAssistant, entry: ConfigEntry) -> str:
    """Return the stable vehicle identity base used by package-owned entities."""
    return vehicle_vin(hass, entry) or entry.entry_id


def vehicle_entity_unique_id(
    hass: HomeAssistant, entry: ConfigEntry, technical_key: str
) -> str:
    """Build an SV-owned unique ID using the upstream VIN when available."""
    base = _vehicle_identity_base(hass, entry)
    return f"{DOMAIN}_{base}_{technical_key}"


def vehicle_entity_id(
    hass: HomeAssistant,
    entry: ConfigEntry,
    entity_domain: str,
    technical_key: str,
) -> str:
    """Build an SV-namespaced entity ID that cannot collide with the predecessor."""
    base = _vehicle_identity_base(hass, entry)
    object_id = slugify(f"{ENTITY_ID_PREFIX}_{base}_{technical_key}")
    return f"{entity_domain}.{object_id}"


def apply_vehicle_entity_identity(
    entity: Any,
    hass: HomeAssistant,
    entry: ConfigEntry,
    entity_domain: str,
    technical_key: str,
) -> None:
    """Apply one language-neutral SV + VIN + technical-key identity to an entity.

    ``unique_id`` and the suggested ``entity_id`` are intentionally namespaced
    separately from the predecessor integration. This lets both integrations
    target the same upstream vehicle during migration acceptance without
    requesting the same entity-registry IDs.
    """
    entity._attr_unique_id = vehicle_entity_unique_id(hass, entry, technical_key)
    entity.entity_id = vehicle_entity_id(
        hass, entry, entity_domain, technical_key
    )
    translation_key = ENTITY_TRANSLATION_KEYS.get(technical_key)
    if translation_key and getattr(entity, "_attr_translation_key", None) is None:
        entity._attr_translation_key = translation_key


def registry_technical_key(
    registry_entry: er.RegistryEntry, entry: ConfigEntry, vin: str | None
) -> str | None:
    """Return the technical suffix from current or pre-namespace package IDs."""
    unique_id = str(registry_entry.unique_id or "")

    if vin:
        current_vin_prefix = f"{DOMAIN}_{vin}_"
        if unique_id.startswith(current_vin_prefix):
            return unique_id[len(current_vin_prefix) :]

        # Pre-release SV builds used an unnamespaced VIN-based unique ID shape.
        # Recognize those rows so an early test installation can migrate.
        legacy_vin_prefix = f"{vin}_"
        if unique_id.startswith(legacy_vin_prefix):
            return unique_id[len(legacy_vin_prefix) :]

    current_entry_prefix = f"{DOMAIN}_{entry.entry_id}_"
    if unique_id.startswith(current_entry_prefix):
        return unique_id[len(current_entry_prefix) :]

    legacy_entry_prefix = f"{entry.entry_id}_"
    if unique_id.startswith(legacy_entry_prefix):
        return unique_id[len(legacy_entry_prefix) :]
    return None


def async_migrate_package_entity_ids(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Migrate package-owned registry rows to the SV entity namespace.

    This touches only entities owned by this integration and this config entry.
    Upstream Stellantis entities and entities owned by another integration are
    never modified.
    """
    vin = vehicle_vin(hass, entry)
    if not vin:
        _LOGGER.warning(
            "Cannot migrate SV Dashboard entity identities because the selected "
            "Stellantis device exposes no VIN identifier"
        )

    registry = er.async_get(hass)
    for registry_entry in er.async_entries_for_config_entry(registry, entry.entry_id):
        if registry_entry.platform != DOMAIN:
            continue
        technical_key = registry_technical_key(registry_entry, entry, vin)
        if not technical_key:
            continue

        desired_unique_id = vehicle_entity_unique_id(hass, entry, technical_key)
        desired_entity_id = vehicle_entity_id(
            hass, entry, registry_entry.domain, technical_key
        )
        if (
            registry_entry.unique_id == desired_unique_id
            and registry_entry.entity_id == desired_entity_id
        ):
            continue

        existing = registry.async_get(desired_entity_id)
        if existing is not None and existing.entity_id != registry_entry.entity_id:
            _LOGGER.warning(
                "Keeping existing entity id %s while migrating unique id to %s "
                "because %s is already registered",
                registry_entry.entity_id,
                desired_unique_id,
                desired_entity_id,
            )
            registry.async_update_entity(
                registry_entry.entity_id,
                new_unique_id=desired_unique_id,
            )
            continue

        registry.async_update_entity(
            registry_entry.entity_id,
            new_unique_id=desired_unique_id,
            new_entity_id=desired_entity_id,
        )
        _LOGGER.info(
            "Migrated SV Dashboard entity %s to %s (%s)",
            registry_entry.entity_id,
            desired_entity_id,
            desired_unique_id,
        )

"""Preset selector for the upstream Stellantis refresh interval."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event

from .const import DOMAIN
from .entity_identity import apply_vehicle_entity_identity

_REFRESH_INTERVAL_PRESETS = (30, 60, 120, 300, 600)


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Expose a compact preset selector only when the upstream number exists."""
    coordinator = hass.data[DOMAIN][entry.entry_id]
    target = coordinator.data.get("entity_mapping", {}).get("refresh_interval")
    if not target:
        return
    async_add_entities([SvRefreshIntervalPresetSelect(coordinator, entry, target)])


class SvRefreshIntervalPresetSelect(SelectEntity):
    """Proxy fixed, useful presets to the upstream refresh-interval number."""

    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_name = "Refresh interval"
    _attr_icon = "mdi:update"

    def __init__(self, coordinator, entry: ConfigEntry, target_entity_id: str) -> None:
        self.coordinator = coordinator
        self.entry = entry
        self.target_entity_id = target_entity_id
        apply_vehicle_entity_identity(
            self,
            coordinator.hass,
            entry,
            "select",
            "refresh_interval_preset",
        )

    def _current_seconds(self) -> int | None:
        state = self.hass.states.get(self.target_entity_id) if self.hass else None
        if state is None or state.state in {"unknown", "unavailable", "none", ""}:
            return None
        try:
            return int(round(float(state.state)))
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _label(seconds: int) -> str:
        return f"{seconds} s"

    @property
    def options(self) -> list[str]:
        current = self._current_seconds()
        values = list(_REFRESH_INTERVAL_PRESETS)
        # Preserve visibility of an existing custom upstream value (for example
        # 45 s) until the user deliberately moves to one of the compact presets.
        if current is not None and current not in values:
            values.insert(0, current)
        return [self._label(value) for value in values]

    @property
    def current_option(self) -> str | None:
        current = self._current_seconds()
        return self._label(current) if current is not None else None

    @property
    def available(self) -> bool:
        return self._current_seconds() is not None

    async def async_select_option(self, option: str) -> None:
        try:
            seconds = int(str(option).split(maxsplit=1)[0])
        except (TypeError, ValueError, IndexError) as err:
            raise ValueError(f"Invalid refresh interval option: {option}") from err

        current = self._current_seconds()
        if seconds not in _REFRESH_INTERVAL_PRESETS and seconds != current:
            raise ValueError(f"Unsupported refresh interval preset: {seconds}")

        await self.hass.services.async_call(
            "number",
            "set_value",
            {"entity_id": self.target_entity_id, "value": seconds},
            blocking=True,
        )

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self.async_on_remove(
            async_track_state_change_event(
                self.hass,
                [self.target_entity_id],
                self._handle_target_state,
            )
        )

    @callback
    def _handle_target_state(self, _event: Event) -> None:
        self.async_write_ha_state()

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        return {
            "integration_domain": DOMAIN,
            "entry_id": self.entry.entry_id,
            "target_entity_id": self.target_entity_id,
            "preset_seconds": list(_REFRESH_INTERVAL_PRESETS),
        }

    @property
    def device_info(self) -> DeviceInfo:
        vehicle_name = self.coordinator.data.get("vehicle_name") or "Stellantis"
        return DeviceInfo(
            identifiers={(DOMAIN, self.entry.entry_id)},
            name=f"{vehicle_name} dashboard",
            manufacturer="SV Dashboard",
            model="Local dashboard companion",
        )

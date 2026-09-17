"""Vehicle capacity fallback policy for SV Dashboard."""

from __future__ import annotations

from .const import CONF_BATTERY_CAPACITY_KWH
from .metrics import VehicleMetricsManager as BaseVehicleMetricsManager


class VehicleMetricsManager(BaseVehicleMetricsManager):
    """Use upstream capacity first and apply SOH only to the manual fallback."""

    def battery_capacity(self) -> tuple[float | None, str | None]:
        """Return usable capacity and provenance without inventing a default.

        Trust order is unchanged for measured data: a current upstream capacity
        wins, followed by the last valid upstream capacity.  Only when SV has to
        fall back to the configured nominal capacity do we apply a trustworthy
        upstream SOH-capacity percentage.  Missing or invalid SOH therefore
        behaves exactly like 100 % and never blocks the fallback.
        """
        if not self.capabilities.get("battery_capacity", bool(self.mapping.get("battery"))):
            return None, None

        current = self._number("battery_capacity")
        if current is not None and current > 0:
            return round(current, 3), "api"

        stored = self._as_float(self.data.get("last_valid_battery_capacity_kwh"))
        if stored is not None and stored > 0:
            return round(stored, 3), "last_api"

        configured = self._as_float(self.entry.data.get(CONF_BATTERY_CAPACITY_KWH))
        if configured is None or configured <= 0:
            return None, None

        soh = self._number("battery_health_capacity")
        if soh is not None and 0 < soh <= 100:
            return round(configured * soh / 100, 3), "configured_soh"

        return round(configured, 3), "configured"

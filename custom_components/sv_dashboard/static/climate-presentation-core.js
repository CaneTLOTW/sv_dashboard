// Display-only inference; HA reception time and aggregate heartbeat do not prove individual source freshness.
export function climatePresentation(climate, temperature, now = Date.now()) {
  const fresh = entity => {
    const a = entity?.attributes || {};
    for (const raw of [a["Last updated"], a.last_updated, a.updatedAt, a.updated_at, a.createdAt, a.created_at, a.source_timestamp, a.source_time]) {
      if (typeof raw !== "string" || !raw.trim()) continue;
      const t = Date.parse(raw);
      if (Number.isFinite(t)) return now - t >= -5 * 60000 && now - t <= 15 * 60000;
    }
    return false;
  };
  const raw = String(climate?.state ?? "").toLowerCase();
  const active = ["on","true","inprogress","running","enabled"].includes(raw) ? true
    : ["off","false","disabled","finished","stopped"].includes(raw) ? false : null;
  const confirmed = active !== null && fresh(climate);
  const rawTemp = temperature?.state;
  let temp = rawTemp === null || rawTemp === undefined || String(rawTemp).trim() === "" ? NaN : Number(rawTemp);
  const unit = temperature?.attributes?.unit_of_measurement || "°C";
  if (unit === "°F") temp = (temp - 32) * 5 / 9;
  else if (unit !== "°C") temp = NaN;
  const mode = !confirmed ? "unknown" : !active ? "off"
    : !fresh(temperature) || !Number.isFinite(temp) ? "active" : temp > 20 ? "cooling" : "heating";
  const icon = mode === "heating" ? "mdi:radiator" : mode === "unknown" ? "mdi:help-circle-outline" : "mdi:air-conditioner";
  const color = mode === "heating" ? "rgb(244,67,54)" : mode === "cooling" ? "rgb(33,150,243)" : null;
  return {active, confirmed, mode, icon, color};
}

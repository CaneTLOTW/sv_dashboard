// Display only: neutral OFF is the idle/default presentation, not proof of physical OFF.
// A recent reported ON may arrive via MQTT without a newer REST field timestamp.
// Never feed this heuristic into scheduling, safety gates or confirmation history.
export function climatePresentation(climate, temperature, now = Date.now(), startButton, stopButton) {
  const sourceTime = entity => {
    const a = entity?.attributes || {};
    for (const raw of [a["Zuletzt aktualisiert"], a["Last updated"], a.last_updated, a.updatedAt, a.updated_at, a.createdAt, a.created_at, a.source_timestamp, a.source_time]) {
      if (typeof raw !== "string" || !raw.trim()) continue;
      const t = Date.parse(raw);
      if (Number.isFinite(t)) return t;
    }
    return NaN;
  };
  const recent = (t, maxAge) => Number.isFinite(t) && t <= now && now - t <= maxAge;
  const raw = String(climate?.state ?? "").toLowerCase();
  const rawActive = ["on","true","inprogress","running","enabled"].includes(raw) ? true
    : ["off","false","disabled","finished","stopped"].includes(raw) ? false : null;
  const changed = Date.parse(climate?.last_changed || "");
  const source = sourceTime(climate);
  const active = rawActive === true && (recent(source, 30 * 60000) || recent(changed, 30 * 60000));
  const confirmed = rawActive !== null && recent(source, 15 * 60000);
  const rawTemp = temperature?.state;
  let temp = rawTemp === null || rawTemp === undefined || String(rawTemp).trim() === "" ? NaN : Number(rawTemp);
  const unit = temperature?.attributes?.unit_of_measurement || "°C";
  if (unit === "°F") temp = (temp - 32) * 5 / 9;
  else if (unit !== "°C") temp = NaN;
  const start = Date.parse(startButton?.state || "");
  const stop = Date.parse(stopButton?.state || "");
  const actionAt = Math.max(Number.isFinite(start) ? start : -Infinity, Number.isFinite(stop) ? stop : -Infinity);
  const expected = start === actionAt;
  const observed = rawActive === expected && (recent(changed, 30 * 60000) && changed >= actionAt || recent(source, 30 * 60000) && source >= actionAt);
  const pending = recent(actionAt, 180000) && !observed;
  const mode = pending ? "pending" : !active ? "off"
    : !Number.isFinite(temp) ? "active" : temp > 20 ? "cooling" : "heating";
  const icon = mode === "pending" ? "mdi:sync" : mode === "heating" ? "mdi:radiator" : "mdi:air-conditioner";
  const color = mode === "pending" ? "#e5a329" : mode === "heating" ? "rgb(244,67,54)" : mode === "cooling" ? "rgb(33,150,243)" : null;
  return {active, rawActive, confirmed, pending, mode, icon, color};
}

// Pure presentation helpers. Null is not a zero-valued measurement.
export function finite(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function monthIndex(key) {
  if (typeof key !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) return null;
  const [year, month] = key.split("-").map(Number);
  return year * 12 + month - 1;
}

export function monthSeries(rows) {
  const byMonth = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const index = monthIndex(row?.month);
    if (index !== null) byMonth.set(index, row);
  }
  if (!byMonth.size) return [];
  const indexes = [...byMonth.keys()];
  const latest = Math.max(...indexes);
  const earliest = Math.max(Math.min(...indexes), latest - 11);
  return Array.from({length: latest - earliest + 1}, (_, offset) => {
    const index = earliest + offset;
    const month = String(Math.floor(index / 12)).padStart(4, "0") + "-" + String(index % 12 + 1).padStart(2, "0");
    return byMonth.get(index) || {month};
  });
}

export function chartGeometry(rows) {
  const consumption = rows.map(row => finite(row.consumption_kwh_100km));
  const temperatures = rows.map(row => finite(row.ambient_temperature_c));
  const energyStep = Math.max(5, Math.ceil(Math.max(0, ...consumption.filter(n => n !== null)) / 20) * 5);
  const energyMax = energyStep * 4;
  const tempMin = Math.floor(Math.min(-10, ...temperatures.filter(n => n !== null)) / 10) * 10;
  const tempStep = Math.max(10, Math.ceil((Math.max(30, ...temperatures.filter(n => n !== null)) - tempMin) / 40) * 10);
  const tempMax = tempMin + tempStep * 4;
  let line = "", points = "", previous = false;
  temperatures.forEach((value,index) => {
    if (value === null) { previous = false; return; }
    const x = (index + .5) * 100;
    const y = 200 * (1 - (value - tempMin) / (tempMax - tempMin));
    line += (previous ? "L" : "M") + x + " " + y + " ";
    points += "M" + x + " " + y + " h0.01 ";
    previous = true;
  });
  return {energyMax, energyStep, tempMin, tempStep, tempMax, line, points};
}

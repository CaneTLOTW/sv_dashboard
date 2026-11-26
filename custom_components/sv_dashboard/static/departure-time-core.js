// Adjust only the selected local wall-clock time; never silently change the date.
export function shiftDepartureTime(clock, delta) {
  if (typeof clock !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(clock) || ![15,-15].includes(delta)) return null;
  const [hour, minute] = clock.split(":").map(Number);
  const value = hour * 60 + minute + delta;
  if (value < 0 || value >= 1440) return null;
  return String(Math.floor(value / 60)).padStart(2,"0") + ":" + String(value % 60).padStart(2,"0");
}

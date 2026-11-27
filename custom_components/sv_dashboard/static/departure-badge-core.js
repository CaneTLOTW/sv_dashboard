// No network request: consume the backend's per-entry plan summary.
export function plannedClimateLabel(plan, now, locale, strings, active, pending) {
  if (!plan || active || pending || !["once","weekly"].includes(plan.kind)) return null;
  const start = Date.parse(plan.start), departure = Date.parse(plan.departure);
  if (!Number.isFinite(start) || !Number.isFinite(departure) || start <= now || departure <= start) return null;
  if (plan.kind === "weekly" && start - now > 3 * 3600000) return null;
  try {
    const timeZone = plan.timezone;
    const dateKey = value => new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(value)
      .filter(p=>p.type!=="literal").reduce((obj,p)=>({...obj,[p.type]:p.value}),{});
    const key = value => {const p=dateKey(value);return p.year+"-"+p.month+"-"+p.day;};
    const today = key(now);
    const tomorrow = new Date(Date.parse(today+"T00:00:00Z")+86400000).toISOString().slice(0,10);
    const day = key(start) === today ? strings.departureQuickToday : key(start) === tomorrow ? strings.departureQuickTomorrow
      : new Intl.DateTimeFormat(locale,{timeZone,day:"numeric",month:"numeric"}).format(start);
    const clock = new Intl.DateTimeFormat(locale,{timeZone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(start);
    const target = new Intl.DateTimeFormat(locale,{timeZone,hour:"2-digit",minute:"2-digit",hourCycle:"h23",day:"numeric",month:"short"}).format(departure);
    const label = day+" "+clock;
    return {label,title:strings.departureStart+": "+label+" · "+strings.departureTime+": "+target};
  } catch (_) { return null; }
}

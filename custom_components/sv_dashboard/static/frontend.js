/* Single Home Assistant Lovelace entry point for the complete SV package. */
const REQUIRED_ELEMENTS = [
  ["bubble-card", "Bubble Card"],
  ["button-card", "Button Card"],
  ["map-card", "ha-map-card"],
  ["layout-card", "layout-card"],
];
const DEPENDENCY_GRACE_MS = 10000;

/*
 * Only intentionally user-addable SV cards belong in Home Assistant's normal
 * Add-card picker. The generated dashboard still uses the internal elements
 * below directly, so their customElements registrations stay untouched.
 */
const INTERNAL_CARD_TYPES = new Set([
  "sv-dashboard-trip-history-card",
  "sv-dashboard-charge-history-card",
  "sv-dashboard-charge-curve-card",
  "sv-dashboard-charge-curve-browser-card",
  "sv-dashboard-gps-date-card",
  "sv-dashboard-gps-map-card",
]);

const waitForElement = async ([tag, name]) => {
  if (customElements.get(tag)) return { tag, name, ready: true };
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(false), DEPENDENCY_GRACE_MS);
  });
  const defined = customElements.whenDefined(tag).then(() => true);
  const ready = await Promise.race([defined, timeout]);
  clearTimeout(timeoutId);
  return { tag, name, ready };
};

/*
 * Narrow third-party compatibility shim: ha-map-card owns the marker shadow
 * DOM, so dashboard CSS cannot make only our picture marker transparent.
 * This is intentionally the only runtime prototype hook in the package and is
 * scoped by --sv-transparent-picture-marker:1. It never touches the LIVE hero
 * or dashboard Strategy.
 */
const installTransparentMapMarkerCompatibility = () => {
  const tag = "map-card-entity-marker";
  const property = "--sv-transparent-picture-marker";
  const flag = Symbol.for("sv_dashboard.transparent_picture_marker");
  const apply = (host) => {
    if (host?.style?.getPropertyValue(property)?.trim() !== "1") return;
    const marker = host.shadowRoot?.querySelector(".marker.picture");
    if (!marker) return;
    marker.style.setProperty("background", "transparent", "important");
    marker.style.setProperty("background-color", "transparent", "important");
  };

  customElements.whenDefined(tag).then(() => {
    const MarkerClass = customElements.get(tag);
    if (!MarkerClass || MarkerClass.prototype[flag]) return;

    const connected = MarkerClass.prototype.connectedCallback;
    MarkerClass.prototype.connectedCallback = function (...args) {
      const result = connected?.apply(this, args);
      queueMicrotask(() => apply(this));
      return result;
    };

    const updated = MarkerClass.prototype.updated;
    MarkerClass.prototype.updated = function (...args) {
      const result = updated?.apply(this, args);
      apply(this);
      queueMicrotask(() => apply(this));
      return result;
    };

    Object.defineProperty(MarkerClass.prototype, flag, { value: true });
    document.querySelectorAll(tag).forEach(apply);
  });
};

installTransparentMapMarkerCompatibility();

/*
 * Start package modules immediately. Only the dashboard Strategy itself waits
 * for external HACS custom elements. Existing-but-still-loading cards therefore
 * no longer produce a false missing-dependency page during the first reload.
 */
const packageModules = Promise.all([
  import("./trip-history-card.js?v=0.6.0-beta.10"),
  import("./charge-history-card.js?v=0.6.0-beta.10"),
  import("./gps-history-card.js?v=0.6.0-beta.7"),
  import("./vehicle-overview-card.js?v=0.6.0-beta.10"),
  import("./dual-energy-overview-card.js?v=0.6.0-beta.10"),
  import("./fuel-history-card.js?v=0.6.0-beta.10"),
]);
const dependencyReadiness = Promise.all(REQUIRED_ELEMENTS.map(waitForElement));

await packageModules;
window.customCards = (window.customCards || []).filter(
  (card) => !INTERNAL_CARD_TYPES.has(card?.type),
);
window.__svDashboardDependencyReadiness = await dependencyReadiness;
await import("./sv_dashboard.js?v=0.6.0-beta.10");

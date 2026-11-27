/*
 * SV compact vehicle card.
 *
 * This intentionally ports the existing household start-page card layout
 * without carrying over VINs, household entity IDs or the legacy KFZ route.
 * The wrapper resolves the selected sv_dashboard config-entry mapping and
 * renders the original layout as a normal custom:button-card configuration.
 *
 * The same component is also the canonical LIVE hero. `variant: live` only
 * changes presentation (no heading/self-navigation, optional info button);
 * entity resolution, picture lifecycle and overlay rendering stay shared.
 */
import { languageFor, textFor } from "./i18n.js?v=0.7.3-beta.19";
import { climatePresentation } from "./climate-presentation-core.js?v=0.7.3-beta.19";
import { plannedClimateLabel } from "./departure-badge-core.js?v=0.7.3-beta.19";

const STATUS_DOMAIN = "sv_dashboard";
const CARD_TAG = "sv-dashboard-vehicle-overview-card";
const EDITOR_TAG = "sv-dashboard-vehicle-overview-card-editor";
const FRESH_VEHICLE_DATA_MS = 15 * 60 * 1000;
const CLIMATE_COMMAND_GUARD_MS = 180 * 1000;
const CLIMATE_TAG = "sv-dashboard-climate-control";

// A single in-browser guard per vehicle survives a Hero remount and prevents
// duplicate requests when the same vehicle is shown on two overview cards.
const climateRequests = new Map();
const climateListeners = new Set();

function climateLiveState(value) {
  const raw = String(value ?? "").toLowerCase();
  if (["on","true","inprogress","running","enabled"].includes(raw)) return true;
  if (["off","false","disabled","finished","stopped"].includes(raw)) return false;
  return null;
}

function climateButtonAvailable(states, entityId) {
  const value = states?.[entityId];
  // HA buttons that have never been pressed normally have state "unknown".
  return typeof entityId === "string" && entityId.startsWith("button.")
    && Boolean(value) && String(value.state).toLowerCase() !== "unavailable";
}

function climateTransitionConfirmed(request, entity) {
  if (!request || climateLiveState(entity?.state) !== request.expectedActive) return false;
  const changed = Date.parse(entity?.last_changed || "");
  const view = climatePresentation(entity, undefined);
  return view.confirmed && view.sourceAt > request.dispatchedAt &&
    Number.isFinite(changed) && changed > request.baselineChanged;
}

function notifyClimateListeners() {
  for (const listener of climateListeners) listener();
}

class SvDashboardClimateControl extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = undefined;
    this._onChange = () => this._render();
    const root = this.attachShadow({mode:"open"});
    root.innerHTML = '<style>:host{display:block;width:max-content;max-width:100%;height:30px}.climate-composite{display:inline-flex;align-items:center;height:30px;border-radius:15px;background:rgba(20,20,20,.62);color:white;white-space:nowrap;overflow:hidden}.climate-composite:not([data-planned]){background:transparent}.climate-composite[data-planned] button{background:transparent;box-shadow:none}.plan-label{font-size:12px;font-weight:600;line-height:18px;padding:0 9px 0 7px;border-left:1px solid rgba(255,255,255,.28);max-width:135px;overflow:hidden;text-overflow:ellipsis}.plan-label[hidden]{display:none}button{box-sizing:border-box;width:30px;height:30px;border:0;border-radius:50%;padding:0;margin:0;display:grid;place-items:center;background:rgba(20,20,20,.62);color:white;box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}button:active{transform:scale(.92)}button[aria-disabled=true]{cursor:default}button[data-state=heating],button[data-state=cooling]{color:var(--climate-color);background:color-mix(in srgb,var(--climate-color) 20%,rgba(20,20,20,.72))}button[data-state=active]{color:var(--success-color,#4caf50)}button[data-state=pending]{color:#e5a329;background:color-mix(in srgb,#e5a329 12%,rgba(20,20,20,.72))}button[data-state=pending] ha-icon{animation:kfzClimatePending 1.2s ease-in-out infinite}button[data-state=failed]{color:var(--error-color)}button[data-state=unavailable]{opacity:.72}ha-icon{--mdc-icon-size:18px;width:18px;height:18px}@keyframes kfzClimatePending{0%,100%{opacity:.4}50%{opacity:1}}@media(prefers-reduced-motion:reduce){button[data-state=pending] ha-icon{animation:none}}</style><div class="climate-composite"><button type="button"><ha-icon icon="mdi:air-conditioner"></ha-icon></button><span class="plan-label" hidden></span></div>';
    this._button = root.querySelector("button");
    this._icon = root.querySelector("ha-icon");
    this._planLabel = root.querySelector(".plan-label");
    this._composite = root.querySelector(".climate-composite");
    for (const eventName of ["click","pointerdown","pointerup","dblclick","contextmenu"]) this._planLabel.addEventListener(eventName,event=>event.stopPropagation());
    for (const eventName of ["pointerdown","pointerup","keydown","keyup","dblclick","contextmenu"]) {
      this._button.addEventListener(eventName, event => event.stopPropagation());
    }
    this._button.addEventListener("click", event => {
      event.stopPropagation();
      this._activate();
    });
  }

  setConfig(config) { this._config = config || {}; this._render(); }
  getCardSize() { return 1; }
  connectedCallback() { climateListeners.add(this._onChange); this._freshnessTimer = setInterval(this._onChange, 30000); this._render(); }
  disconnectedCallback() { climateListeners.delete(this._onChange); clearInterval(this._freshnessTimer); }
  get _key() {
    return JSON.stringify([this._config.climate_entity,this._config.start_entity,this._config.stop_entity]);
  }
  set hass(hass) {
    this._hass = hass;
    const request = climateRequests.get(this._key);
    if (request && climateTransitionConfirmed(request, hass.states?.[this._config.climate_entity])) {
      clearTimeout(request.timer);
      climateRequests.delete(this._key);
      notifyClimateListeners();
    }
    this._render();
  }

  _state() {
    const states = this._hass?.states || {};
    const entity = states[this._config.climate_entity];
    const presentation = climatePresentation(entity, states[this._config.temperature_entity], Date.now(), states[this._config.start_entity], states[this._config.stop_entity]);
    const active = presentation.active;
    const target = active ? this._config.stop_entity : this._config.start_entity;
    const available = climateButtonAvailable(states, target);
    const request = climateRequests.get(this._key);
    return {states,entity,active,target,available,request,presentation};
  }

  _render() {
    if (!this._hass) return;
    const {states,active,available,request,presentation} = this._state();
    const strings = textFor(this._hass,"dashboard");
    const state = request?.status === "pending" || presentation.pending ? "pending" : presentation.mode;
    const soc = states[this._config.battery_entity]?.state;
    const brand = String(states[this._config.vehicle_info_entity]?.attributes?.brand || "")
      .normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();
    const lowSocHint = ["citroen","peugeot","ds","ds automobiles","opel","vauxhall"].includes(brand)
      && soc !== undefined && soc !== "" && Number.isFinite(Number(soc)) && Number(soc) < 20
      && climateLiveState(states[this._config.charging_entity]?.state) === false;
    const action = active ? strings.stopClimate : strings.startClimate;
    const title = state === "pending" ? strings.climatePending : !available ? strings.climateUnavailable + (lowSocHint ? " · " + strings.climateLowSoc : "")
      : request?.status === "failed" || presentation.rawActive === true && !presentation.active ? strings.climateNotConfirmed + " · " + action : action;
    this._button.dataset.state = state;
    this._button.setAttribute("aria-disabled", String(state === "pending" || !available));
    if (presentation.color) this._button.style.setProperty("--climate-color", presentation.color);
    else this._button.style.removeProperty("--climate-color");
    this._button.setAttribute("aria-busy",String(state === "pending"));
    this._button.setAttribute("aria-label",title);
    this._button.title = title;
    this._icon.setAttribute("icon", state === "pending" ? "mdi:sync" : presentation.icon);
    const plan = plannedClimateLabel(states[this._config.status_entity]?.attributes?.planned_climate, Date.now(), languageFor(this._hass), strings, active, state === "pending");
    this._planLabel.hidden = !plan;
    this._composite.toggleAttribute("data-planned",Boolean(plan));
    this._planLabel.textContent = plan?.label || "";
    this._planLabel.title = plan?.title || "";
  }

  async _activate() {
    const {entity,active,target,available,request,presentation} = this._state();
    if (request?.status === "pending" || presentation.pending || !this._hass) return;
    if (!available) {
      this.dispatchEvent(new CustomEvent("hass-notification",{detail:{message:this._button.title},bubbles:true,composed:true}));
      return;
    }
    const key = this._key;
    const next = {status:"pending",expectedActive:!active,baselineChanged:Date.parse(entity?.last_changed || ""),dispatchedAt:Date.now()};
    // Never manufacture a confirmation from a generic last_updated event.
    // A newer climate-field source timestamp must corroborate the HA state transition.
    next.timer = setTimeout(() => {
      if (climateRequests.get(key) === next) {
        next.status = "failed";
        notifyClimateListeners();
      }
    }, CLIMATE_COMMAND_GUARD_MS);
    climateRequests.set(key,next);
    notifyClimateListeners();
    this.dispatchEvent(new CustomEvent("haptic",{detail:"light",bubbles:true,composed:true}));
    try {
      await this._hass.callService("button","press",{}, {entity_id:target});
    } catch (_error) {
      if (climateRequests.get(key) === next) {
        clearTimeout(next.timer);
        next.status = "failed";
        notifyClimateListeners();
      }
    }
  }
}
if (!customElements.get(CLIMATE_TAG)) customElements.define(CLIMATE_TAG,SvDashboardClimateControl);

const unavailable = (state) =>
  !state || ["unknown", "unavailable", "none", ""].includes(String(state.state ?? "").toLowerCase());
const stateIsOn = (value) =>
  ["on", "true", "inprogress", "running"].includes(String(value ?? "").toLowerCase());

const statusCandidates = (hass, entryId) =>
  Object.entries(hass?.states || {}).filter(([entityId, state]) => {
    const attributes = state?.attributes || {};
    return (
      entityId.startsWith("sensor.") &&
      attributes.integration_domain === STATUS_DOMAIN &&
      typeof attributes.entity_mapping === "object" &&
      (!entryId || attributes.entry_id === entryId)
    );
  });

const candidateLabel = (hass, candidate, index = 0) => {
  const [, state] = candidate || [];
  const attributes = state?.attributes || {};
  const vehicleEntity = attributes.entity_mapping?.vehicle;
  const vehicle = vehicleEntity ? hass?.states?.[vehicleEntity] : undefined;
  const strings = textFor(hass, "vehicleOverview");
  return String(
    vehicle?.attributes?.friendly_name ||
    attributes.vehicle_slug ||
    strings.vehicleFallback.replace("{number}", String(index + 1))
  );
};

const metricEntity = (hass, attributes, key) =>
  attributes?.metric_entities?.[key] ||
  Object.entries(hass?.states || {}).find(([, state]) => {
    const stateAttributes = state?.attributes || {};
    return (
      stateAttributes.integration_domain === STATUS_DOMAIN &&
      stateAttributes.entry_id === attributes?.entry_id &&
      stateAttributes.metric_key === key
    );
  })?.[0];

const literal = (entityId) => JSON.stringify(entityId || "");

const freshVehicleDataTemplate = (entityId, freshValue, staleValue) => `[[[
  const value = states[${literal(entityId)}];
  if (!value || !Number.isFinite(Number(value.state))) return ${literal(staleValue)};
  const attributes = value.attributes || {};
  let updated = NaN;
  for (const raw of [attributes["Last updated"], attributes.last_updated, attributes.updatedAt, attributes.updated_at, value.last_updated, value.last_changed]) {
    const parsed = Date.parse(raw || "");
    if (Number.isFinite(parsed)) { updated = parsed; break; }
  }
  if (!Number.isFinite(updated)) return ${literal(staleValue)};
  const age = Date.now() - updated;
  return age >= -5 * 60 * 1000 && age <= ${FRESH_VEHICLE_DATA_MS} ? ${literal(freshValue)} : ${literal(staleValue)};
]]]`;

const dashboardPath = (attributes, override) => {
  if (override) return override;
  const path = String(attributes?.dashboard_url_path || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  return path ? `/${path}/vehicle` : undefined;
};

function buildConfig(hass, config, statusState) {
  const strings = textFor(hass, "vehicleOverview");
  const attributes = statusState.attributes || {};
  const mapped = attributes.entity_mapping || {};
  const controls = attributes.control_entities || {};
  const tracker = attributes.vehicle_tracker;
  const vehiclePicture = tracker ? hass.states?.[tracker]?.attributes?.entity_picture : undefined;
  const liveVariant = config.variant === "live";
  const showHeading = !liveVariant && config.show_heading !== false;

  const capabilities = attributes.capabilities || {};
  const battery = mapped.battery;
  const batteryResidual = mapped.battery_residual;
  const autonomy = mapped.autonomy;
  const fuel = mapped.fuel;
  const fuelAutonomy = mapped.fuel_autonomy;
  const fuelConsumptionEntity = mapped.fuel_consumption_instant;
  const supportsElectric = capabilities.electric_energy ?? Boolean(battery);
  const supportsFuel = capabilities.fuel ?? Boolean(fuel);
  const primaryLevel = supportsElectric && battery ? battery : supportsFuel ? fuel : battery || fuel;
  const rangeEntity = supportsElectric && autonomy ? autonomy : supportsFuel ? fuelAutonomy : autonomy || fuelAutonomy;
  const temperature = mapped.temperature;
  const charging = mapped.battery_charging;
  const chargingEnd = mapped.battery_charging_end;
  const plugged = mapped.battery_plugged;
  const engine = mapped.engine;
  const preconditioning = mapped.preconditioning;
  const preconditioningStart = mapped.preconditioning_start;
  const preconditioningStop = mapped.preconditioning_stop;
  const chargePower = metricEntity(hass, attributes, "current_charge_power");
  const tripEnergy = metricEntity(hass, attributes, "current_trip_energy");
  const tripConsumption = metricEntity(hass, attributes, "current_trip_consumption");
  const vehicleInfo = metricEntity(hass, attributes, "vehicle_info");
  const navigationPath = liveVariant ? undefined : dashboardPath(attributes, config.navigation_path);
  const chargingState = supportsElectric && charging ? stateIsOn(hass.states?.[charging]?.state) : false;
  const rightStatusEntity = chargingState && chargingEnd && hass.states?.[chargingEnd]
    ? chargingEnd
    : chargingState
      ? charging
      : temperature;

  const trackedEntities = [
    statusState.entity_id,
    primaryLevel,
    battery,
    batteryResidual,
    rangeEntity,
    autonomy,
    fuel,
    fuelAutonomy,
    fuelConsumptionEntity,
    temperature,
    charging,
    chargingEnd,
    plugged,
    engine,
    preconditioning,
    preconditioningStart,
    preconditioningStop,
    chargePower,
    tripEnergy,
    tripConsumption,
    tracker,
    controls.manual_wakeup,
    vehicleInfo,
  ].filter(Boolean);

  const climateDisplay = (preconditioningStart || preconditioningStop) ? "block" : "none";
  const showInfo = liveVariant && Boolean(vehicleInfo);

  const heroCard = {
    type: "custom:button-card",
    entity: primaryLevel,
    show_name: false,
    show_state: false,
    show_icon: false,
    tap_action: { action: "none" },
    triggers_update: trackedEntities,
    grid_options: { columns: "full", rows: liveVariant ? 4.5 : 5 },
    styles: {
      card: [
        { position: "relative" },
        { isolation: "isolate" },
        { "z-index": 0 },
        { height: "270px" },
        { overflow: "hidden" },
        { "border-radius": "12px" },
        { padding: 0 },
        { "background-color": "var(--ha-card-background)" },
        { "background-image": vehiclePicture ? `url(${JSON.stringify(String(vehiclePicture))})` : "none" },
        { "background-repeat": "no-repeat" },
        { "background-size": "100% auto" },
        { "background-position": "center 54%" },
      ],
      custom_fields: {
        range: [
          { position: "absolute" }, { top: "12px" }, { left: "12px" }, { "z-index": 10 },
        ],
        right_status: [
          { position: "absolute" }, { top: "12px" }, { right: showInfo ? "50px" : "12px" }, { "z-index": 10 },
        ],
        info: [
          { position: "absolute" }, { top: "10px" }, { right: "10px" }, { "z-index": 21 },
          { display: showInfo ? "block" : "none" },
        ],
        climate: [
          { position: "absolute" }, { top: "48px" }, { left: "12px" }, { "z-index": 20 },
          { width: "max-content" }, { "max-width": "calc(100% - 58px)" }, { height: "30px" }, { display: climateDisplay },
        ],
        cable: [
          { position: "absolute" }, { top: "48px" }, { right: "12px" }, { "z-index": 10 },
          { width: "28px" }, { height: "28px" }, { "border-radius": "50%" },
          { background: "rgba(76,175,80,0.88)" }, { color: "white" }, { "align-items": "center" },
          { "justify-content": "center" }, { "box-shadow": "0 1px 4px rgba(0,0,0,0.22)" },
          { display: `[[[ return ['on','true','inprogress','running'].includes(String(states[${literal(plugged)}]?.state ?? '').toLowerCase()) ? 'flex' : 'none'; ]]]` },
        ],
        driving: [
          { position: "absolute" }, { top: "115px" }, { left: "140px" }, { transform: "translateX(-50%)" },
          { "z-index": 10 }, { width: "30px" }, { height: "30px" }, { "min-width": "30px" },
          { "min-height": "30px" }, { padding: 0 }, { margin: 0 }, { "box-sizing": "border-box" },
          { "border-radius": "50%" }, { background: "rgba(76,175,80,0.92)" }, { color: "white" },
          { "align-items": "center" }, { "justify-content": "center" }, { "line-height": 0 },
          { "box-shadow": "0 1px 4px rgba(0,0,0,0.28)" },
          { display: `[[[ return ['on','true','inprogress','running'].includes(String(states[${literal(engine)}]?.state ?? '').toLowerCase()) ? 'flex' : 'none'; ]]]` },
        ],
        nav: [
          { position: "absolute" }, { top: "78px" }, { left: "50%" }, { transform: "translateX(-50%)" },
          { width: "220px" }, { height: "120px" }, { "z-index": 5 },
        ],
        battery: [
          { position: "absolute" }, { left: "12px" }, { right: "12px" }, { bottom: "10px" },
          { width: "auto" }, { "z-index": 10 },
        ],
      },
    },
    custom_fields: {
      range: {
        card: {
          type: "custom:button-card",
          entity: rangeEntity,
          icon: "mdi:map-marker-distance",
          show_name: true,
          show_state: false,
          tap_action: { action: "more-info" },
          hold_action: { action: "more-info" },
          name: `[[[ const value = states[${literal(rangeEntity)}]; return value && Number.isFinite(Number(value.state)) ? Math.round(Number(value.state)) + ' km' : '-- km'; ]]]`,
          styles: {
            card: [
              { height: "26px" }, { "min-height": "26px" }, { padding: "0 9px" }, { margin: 0 },
              { "border-radius": "14px" }, { border: "none" }, { background: "rgba(20,20,20,0.62)" },
              { color: "white" }, { "font-size": "12px" }, { "font-weight": 600 }, { "line-height": "16px" },
              { cursor: "pointer" },
              { "text-shadow": "0 1px 2px rgba(0,0,0,0.5)" }, { border: "none" }, { "box-shadow": "none" },
            ],
            grid: [{ "grid-template-areas": "'i n'" }, { "grid-template-columns": "16px auto" }, { "column-gap": "4px" }, { "align-items": "center" }, { "justify-content": "center" }],
            icon: [{ width: "16px" }, { height: "16px" }, { color: "white" }],
            name: [{ "font-size": "12px" }, { "font-weight": 600 }, { "line-height": "16px" }, { color: "white" }, { "white-space": "nowrap" }, { padding: 0 }, { margin: 0 }],
          },
        },
      },
      right_status: {
        card: {
          type: "custom:button-card",
          entity: rightStatusEntity,
          triggers_update: [charging, chargingEnd, temperature].filter(Boolean),
          show_name: true,
          show_state: false,
          show_icon: true,
          icon: `[[[ return ${chargingState && chargingEnd ? `states[${literal(chargingEnd)}] && states[${literal(chargingEnd)}].entity_id === ${literal(chargingEnd)}` : "false"} ? 'mdi:clock-end' : ${chargingState ? "'mdi:battery-charging'" : "'mdi:thermometer'"}; ]]]`,
          name: `[[[
            const value = states[${literal(rightStatusEntity)}];
            const raw = String(value?.state ?? '').trim();
            if (${chargingState ? "true" : "false"}) {
              if (raw && !['unknown','unavailable','none'].includes(raw.toLowerCase())) {
                const parsed = new Date(raw);
                const end = Number.isNaN(parsed.getTime()) ? (/^[0-9]{1,2}:[0-9]{2}$/.test(raw) ? raw.padStart(5, '0') : raw) : String(parsed.getHours()).padStart(2, '0') + ':' + String(parsed.getMinutes()).padStart(2, '0');
                return ${literal(strings.chargingUntil)}.replace('{time}', end);
              }
              return ${literal(strings.charging)};
            }
            return value && Number.isFinite(Number(raw)) ? raw + ' ' + (value.attributes?.unit_of_measurement || '°C') : '-- °C';
          ]]]`,
          tap_action: { action: "more-info" },
          hold_action: { action: "more-info" },
          styles: {
            card: [
              { height: "26px" }, { "min-height": "26px" }, { padding: "0 9px" }, { margin: 0 },
              { "border-radius": "14px" },
              { border: chargingState ? "none" : freshVehicleDataTemplate(temperature, "1px solid color-mix(in srgb, var(--primary-color) 45%, transparent)", "none") },
              { background: chargingState ? "rgba(20,20,20,0.62)" : freshVehicleDataTemplate(temperature, "color-mix(in srgb, var(--primary-color) 14%, rgba(20,20,20,0.72))", "rgba(20,20,20,0.62)") },
              { color: "white" }, { "font-size": "12px" }, { "font-weight": 600 }, { "line-height": "16px" },
              { cursor: "pointer" },
              { "text-align": "right" }, { "text-shadow": "0 1px 2px rgba(0,0,0,0.5)" }, { "box-shadow": "none" },
            ],
            grid: [{ "grid-template-areas": "'i n'" }, { "grid-template-columns": "16px auto" }, { "column-gap": "4px" }, { "align-items": "center" }, { "justify-content": "center" }],
            icon: [{ width: "16px" }, { height: "16px" }, { color: chargingState ? "white" : freshVehicleDataTemplate(temperature, "var(--primary-color)", "white") }],
            name: [{ "font-size": "12px" }, { "font-weight": 600 }, { "line-height": "16px" }, { color: "white" }, { "white-space": "nowrap" }, { padding: 0 }, { margin: 0 }],
          },
        },
      },
      info: showInfo ? {
        card: {
          type: "custom:button-card",
          entity: vehicleInfo,
          show_name: false,
          show_state: false,
          show_icon: true,
          icon: "mdi:information-outline",
          tap_action: { action: "navigate", navigation_path: "#sv-vehicle-info" },
          hold_action: { action: "navigate", navigation_path: "#sv-vehicle-info" },
          styles: {
            card: [
              { width: "30px" }, { height: "30px" }, { "min-height": "30px" }, { padding: 0 },
              { margin: 0 }, { "border-radius": "50%" }, { border: "none" },
              { background: "rgba(20,20,20,0.72)" }, { color: "white" },
              { "box-shadow": "0 1px 4px rgba(0,0,0,0.22)" },
            ],
            icon: [{ width: "18px" }, { height: "18px" }, { color: "white" }],
          },
        },
      } : "",
      climate: (preconditioningStart || preconditioningStop) ? {
        card: {
          type: "custom:sv-dashboard-climate-control",
          status_entity: statusState.entity_id,
          climate_entity: preconditioning,
          temperature_entity: temperature,
          start_entity: preconditioningStart,
          stop_entity: preconditioningStop,
          battery_entity: battery,
          charging_entity: charging,
          vehicle_info_entity: vehicleInfo,
        },
      } : "",
      cable: `[[[ return '<ha-icon icon="mdi:ev-plug-type2" style="width:18px;height:18px;display:block;margin:0;padding:0;color:white"></ha-icon>'; ]]]`,
      driving: `[[[ return '<ha-icon icon="mdi:lightning-bolt" style="width:18px;height:18px;display:block;margin:0;padding:0;color:white"></ha-icon>'; ]]]`,
      nav: navigationPath ? {
        card: {
          type: "custom:button-card",
          show_name: false,
          show_state: false,
          show_icon: false,
          tap_action: { action: "navigate", navigation_path: navigationPath },
          styles: {
            card: [
              { width: "220px" }, { height: "120px" }, { padding: 0 }, { margin: 0 },
              { background: "transparent" }, { border: "none" }, { "box-shadow": "none" },
              { "border-radius": "12px" }, { cursor: "pointer" },
            ],
          },
        },
      } : "",
      battery: {
        card: {
          type: "custom:button-card",
          entity: primaryLevel,
          show_name: true,
          show_state: true,
          show_icon: false,
          tap_action: { action: "more-info" },
          triggers_update: [primaryLevel, battery, batteryResidual, fuel, fuelConsumptionEntity, charging, engine, chargePower, tripEnergy, tripConsumption].filter(Boolean),
          name: `[[[
            const isCharging = ['on','true','inprogress','running'].includes(String(states[${literal(charging)}]?.state ?? '').toLowerCase());
            const isDriving = ['on','true','inprogress','running'].includes(String(states[${literal(engine)}]?.state ?? '').toLowerCase());
            if (isCharging) {
              const power = states[${literal(chargePower)}];
              if (power && !['unknown','unavailable','none',''].includes(power.state) && Number.isFinite(Number(power.state)) && Number(power.state) > 0) {
                return ${literal(strings.charging)} + ' · ' + Number(power.state).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kW';
              }
              return ${literal(strings.charging)};
            }
            if (isDriving) {
              if (${supportsElectric ? "true" : "false"}) {
                const energy = states[${literal(tripEnergy)}];
                if (energy && !['unknown','unavailable','none',''].includes(String(energy.state).toLowerCase()) && Number.isFinite(Number(energy.state))) {
                  return ${literal(strings.driving)} + ' · ' + Number(energy.state).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kWh';
                }
                const consumption = states[${literal(tripConsumption)}];
                if (consumption && !['unknown','unavailable','none',''].includes(String(consumption.state).toLowerCase()) && Number.isFinite(Number(consumption.state))) {
                  return ${literal(strings.driving)} + ' · ' + Number(consumption.state).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kWh/100 km';
                }
                return ${literal(strings.driving)};
              }
              const fuelNow = states[${literal(fuelConsumptionEntity)}];
              if (fuelNow && !['unknown','unavailable','none',''].includes(String(fuelNow.state).toLowerCase()) && Number.isFinite(Number(fuelNow.state))) {
                return ${literal(strings.driving)} + ' · ' + Number(fuelNow.state).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' l/100 km';
              }
              return ${literal(strings.driving)};
            }
            if (${supportsElectric ? "true" : "false"}) {
              const residual = states[${literal(batteryResidual)}];
              if (residual && !['unknown','unavailable','none',''].includes(String(residual.state).toLowerCase()) && Number.isFinite(Number(residual.state))) {
                return ${literal(strings.battery)} + ' · ' + Number(residual.state).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kWh';
              }
              return ${literal(strings.battery)};
            }
            return ${literal(strings.fuel || "Fuel")};
          ]]]`,
          state_display: `[[[
            if (!entity || ['unknown','unavailable'].includes(entity.state) || !Number.isFinite(Number(entity.state))) return '-- %';
            return Math.round(Number(entity.state)) + ' %';
          ]]]`,
          styles: {
            grid: [
              { "grid-template-areas": "'n s'" }, { "grid-template-columns": "1fr auto" },
              { "align-items": "center" }, { height: "100%" },
            ],
            card: [
              { height: "20px" }, { "min-height": "20px" }, { padding: "0 12px" },
              { "border-radius": "10px" }, { border: "none" }, { "box-shadow": "none" },
              { color: "white" }, { "text-shadow": "0 1px 2px rgba(0,0,0,0.65)" },
              { background: `[[[
                const value = Math.min(100, Math.max(0, Number(entity?.state) || 0));
                const isCharging = ['on','true','inprogress','running'].includes(String(states[${literal(charging)}]?.state ?? '').toLowerCase());
                const color = isCharging ? 'rgba(76,175,80,0.95)' : 'rgba(33,150,243,0.95)';
                return 'linear-gradient(90deg,' + color + ' ' + value + '%,rgba(20,20,20,0.62) ' + value + '%)';
              ]]]` },
              { animation: `[[[
                const isCharging = ['on','true','inprogress','running'].includes(String(states[${literal(charging)}]?.state ?? '').toLowerCase());
                const isDriving = ['on','true','inprogress','running'].includes(String(states[${literal(engine)}]?.state ?? '').toLowerCase());
                if (isCharging) return 'kfzBatteryChargePulse 1.5s ease-in-out infinite';
                if (isDriving) return 'kfzBatteryDrivePulse 1.7s ease-in-out infinite';
                return 'none';
              ]]]` },
            ],
            name: [
              { "justify-self": "start" }, { "align-self": "center" }, { height: "20px" },
              { "line-height": "20px" }, { margin: 0 }, { padding: 0 }, { "font-size": "12px" },
              { "font-weight": 600 }, { "white-space": "nowrap" },
            ],
            state: [
              { "justify-self": "end" }, { "align-self": "center" }, { height: "20px" },
              { "line-height": "20px" }, { margin: 0 }, { padding: 0 }, { "font-size": "12px" },
              { "font-weight": 600 }, { "white-space": "nowrap" },
            ],
          },
          extra_styles: `
            @keyframes kfzBatteryChargePulse {
              0%,100% { filter:brightness(1); box-shadow:0 0 0 0 rgba(76,175,80,0.15); }
              50% { filter:brightness(1.16); box-shadow:0 0 16px 4px rgba(76,175,80,0.70); }
            }
            @keyframes kfzBatteryDrivePulse {
              0%,100% { filter:brightness(1); box-shadow:0 0 0 0 rgba(33,150,243,0.12); }
              50% { filter:brightness(1.12); box-shadow:0 0 14px 3px rgba(33,150,243,0.55); }
            }
          `,
        },
      },
    },
  };

  if (!showHeading) return heroCard;

  return {
    type: "vertical-stack",
    cards: [
      {
        type: "heading",
        heading: config.heading || strings.heading,
        heading_style: "title",
        icon: config.heading_icon || "fa6-solid:car",
      },
      heroCard,
    ],
  };
}

class SvDashboardVehicleOverviewCard extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = undefined;
    this._inner = undefined;
    this._signature = undefined;
    this._building = false;
  }

  static getStubConfig() {
    return {};
  }

  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  setConfig(config) {
    this._config = config || {};
    this._signature = undefined;
    this._rebuild();
  }

  set hass(hass) {
    this._hass = hass;
    const selected = this._selected();
    const nextSignature = this._signatureFor(selected);
    if (nextSignature !== this._signature) {
      if (!this._building) this._rebuild();
      if (this._inner) this._inner.hass = hass;
      return;
    }
    if (this._inner) this._inner.hass = hass;
  }

  connectedCallback() {
    this._rebuild();
  }

  getCardSize() {
    return 6;
  }

  _selected() {
    if (!this._hass) return undefined;
    const candidates = statusCandidates(this._hass, this._config.entry_id);
    return candidates.length === 1 ? candidates[0] : undefined;
  }

  _signatureFor(selected) {
    if (!selected || !this._hass) return "missing";
    const [entityId, state] = selected;
    const attributes = state.attributes || {};
    const tracker = attributes.vehicle_tracker;
    const picture = tracker ? this._hass.states?.[tracker]?.attributes?.entity_picture : "";
    const chargingEntity = attributes.entity_mapping?.battery_charging;
    const chargingEndEntity = attributes.entity_mapping?.battery_charging_end;
    return JSON.stringify([
      languageFor(this._hass),
      entityId,
      attributes.entry_id,
      attributes.vehicle_slug,
      attributes.entity_mapping,
      attributes.metric_entities,
      attributes.control_entities,
      picture || "",
      chargingEntity ? this._hass.states?.[chargingEntity]?.state || "" : "",
      chargingEndEntity ? Boolean(this._hass.states?.[chargingEndEntity]) : false,
      this._config.navigation_path || "",
      this._config.heading || "",
      this._config.heading_icon || "",
      this._config.variant || "",
      this._config.show_heading === false ? "hidden" : "shown",
    ]);
  }

  async _rebuild() {
    if (!this.isConnected || !this._hass || this._building) return;
    const strings = textFor(this._hass, "vehicleOverview");
    const selected = this._selected();
    if (!selected) {
      const all = statusCandidates(this._hass);
      const message = all.length > 1 && !this._config.entry_id
        ? strings.multipleVehicles
        : this._config.entry_id
          ? strings.configuredUnavailable
          : strings.noUniqueVehicle;
      this.innerHTML = `<ha-card><div style="padding:16px;color:var(--secondary-text-color)">${message}</div></ha-card>`;
      this._inner = undefined;
      this._signature = "missing";
      return;
    }

    this._building = true;
    try {
      const helpers = await window.loadCardHelpers();
      const latest = this._selected();
      if (!latest) return;
      const config = buildConfig(this._hass, this._config, latest[1]);
      this._signature = this._signatureFor(latest);
      const inner = helpers.createCardElement(config);
      this._inner = inner;
      this.replaceChildren(inner);
      inner.hass = this._hass;
    } finally {
      this._building = false;
    }
  }
}

class SvDashboardVehicleOverviewCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = undefined;
  }

  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  connectedCallback() {
    this._render();
  }

  _emit(entryId) {
    const next = { ...this._config };
    if (entryId) next.entry_id = entryId;
    else delete next.entry_id;
    this.dispatchEvent(new CustomEvent("config-changed", {
      bubbles: true,
      composed: true,
      detail: { config: next },
    }));
  }

  _render() {
    if (!this.isConnected || !this._hass) return;
    const strings = textFor(this._hass, "vehicleOverview");
    const candidates = statusCandidates(this._hass);
    if (candidates.length === 0) {
      this.innerHTML = `<div style="padding:12px 0;color:var(--secondary-text-color)">${strings.noInstance}</div>`;
      return;
    }
    if (candidates.length === 1) {
      const label = candidateLabel(this._hass, candidates[0], 0);
      this.innerHTML = `<div style="padding:12px 0;color:var(--secondary-text-color)">${strings.vehicleAuto.replace("{vehicle}", label)}</div>`;
      return;
    }

    const options = candidates.map((candidate, index) => {
      const entryId = candidate[1]?.attributes?.entry_id || "";
      const selected = entryId === this._config.entry_id ? " selected" : "";
      const label = candidateLabel(this._hass, candidate, index);
      return `<option value="${entryId}"${selected}>${label}</option>`;
    }).join("");

    this.innerHTML = `
      <label style="display:block;padding:8px 0;font-weight:500">${strings.vehicle}</label>
      <select id="vehicle" style="box-sizing:border-box;width:100%;min-height:42px;padding:0 10px;border:1px solid var(--divider-color);border-radius:10px;background:var(--card-background-color);color:var(--primary-text-color)">
        <option value=""${this._config.entry_id ? "" : " selected"}>${strings.selectVehicle}</option>
        ${options}
      </select>
      <div style="padding:8px 0;color:var(--secondary-text-color);font-size:12px">${strings.selectionHint}</div>`;
    this.querySelector("#vehicle")?.addEventListener("change", (event) => {
      this._emit(event.target.value);
    });
  }
}

if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, SvDashboardVehicleOverviewCard);
}
if (!customElements.get(EDITOR_TAG)) {
  customElements.define(EDITOR_TAG, SvDashboardVehicleOverviewCardEditor);
}

const registrationStrings = textFor(
  { locale: { language: typeof navigator !== "undefined" ? navigator.language : "en" } },
  "vehicleOverview",
);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === CARD_TAG)) {
  window.customCards.push({
    type: CARD_TAG,
    name: registrationStrings.cardName,
    description: registrationStrings.cardDescription,
    preview: true,
  });
}

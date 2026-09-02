import { LitElement, html, css, nothing } from "https://unpkg.com/lit?module";
import { languageFor } from "./i18n.js?v=0.6.0-beta.4";

const STATUS_DOMAIN = "sv_dashboard";
const CARD_TAG = "sv-dashboard-dual-energy-overview-card";
const EDITOR_TAG = "sv-dashboard-dual-energy-overview-card-editor";

const TEXT = {
  de: { cardName: "SV Dual-Energy-Fahrzeugübersicht", cardDescription: "Breite Fahrzeugkarte für Batterie und Kraftstoff", battery: "Batterie", fuel: "Tank", electricRange: "E-Reichweite", fuelRange: "Tankreichweite", charging: "Lädt", driving: "In Fahrt", plugged: "Eingesteckt", vehicle: "Fahrzeug", selectVehicle: "Fahrzeug auswählen …", noInstance: "Keine SV Dashboard-Instanz verfügbar.", multipleVehicles: "Mehrere Fahrzeuge gefunden. Bitte im Karteneditor ein Fahrzeug auswählen.", unavailable: "Das konfigurierte Fahrzeug ist nicht verfügbar.", auto: "Fahrzeug: automatisch · {vehicle}" },
  en: { cardName: "SV dual-energy vehicle overview", cardDescription: "Wide vehicle card for battery and fuel", battery: "Battery", fuel: "Fuel", electricRange: "EV range", fuelRange: "Fuel range", charging: "Charging", driving: "Driving", plugged: "Plugged in", vehicle: "Vehicle", selectVehicle: "Select vehicle …", noInstance: "No SV Dashboard instance is available.", multipleVehicles: "Multiple vehicles found. Select a vehicle in the card editor.", unavailable: "The configured vehicle is unavailable.", auto: "Vehicle: automatic · {vehicle}" },
  fr: { cardName: "Vue véhicule SV double énergie", cardDescription: "Carte véhicule large pour batterie et carburant", battery: "Batterie", fuel: "Carburant", electricRange: "Autonomie électrique", fuelRange: "Autonomie carburant", charging: "En charge", driving: "En trajet", plugged: "Branché", vehicle: "Véhicule", selectVehicle: "Sélectionner un véhicule…", noInstance: "Aucune instance SV Dashboard n’est disponible.", multipleVehicles: "Plusieurs véhicules ont été trouvés. Sélectionnez un véhicule dans l’éditeur de carte.", unavailable: "Le véhicule configuré n’est pas disponible.", auto: "Véhicule : automatique · {vehicle}" },
  it: { cardName: "Panoramica veicolo SV doppia energia", cardDescription: "Scheda veicolo ampia per batteria e carburante", battery: "Batteria", fuel: "Carburante", electricRange: "Autonomia elettrica", fuelRange: "Autonomia carburante", charging: "In carica", driving: "In marcia", plugged: "Collegato", vehicle: "Veicolo", selectVehicle: "Seleziona veicolo…", noInstance: "Nessuna istanza SV Dashboard disponibile.", multipleVehicles: "Sono stati trovati più veicoli. Selezionane uno nell’editor della scheda.", unavailable: "Il veicolo configurato non è disponibile.", auto: "Veicolo: automatico · {vehicle}" },
  es: { cardName: "Vista de vehículo SV de doble energía", cardDescription: "Tarjeta ancha para batería y combustible", battery: "Batería", fuel: "Combustible", electricRange: "Autonomía eléctrica", fuelRange: "Autonomía combustible", charging: "Cargando", driving: "En marcha", plugged: "Conectado", vehicle: "Vehículo", selectVehicle: "Seleccionar vehículo…", noInstance: "No hay ninguna instancia de SV Dashboard disponible.", multipleVehicles: "Se encontraron varios vehículos. Selecciona uno en el editor de la tarjeta.", unavailable: "El vehículo configurado no está disponible.", auto: "Vehículo: automático · {vehicle}" },
  pt: { cardName: "Visão do veículo SV de energia dupla", cardDescription: "Cartão largo para bateria e combustível", battery: "Bateria", fuel: "Combustível", electricRange: "Autonomia elétrica", fuelRange: "Autonomia combustível", charging: "A carregar", driving: "Em andamento", plugged: "Ligado", vehicle: "Veículo", selectVehicle: "Selecionar veículo…", noInstance: "Nenhuma instância do SV Dashboard disponível.", multipleVehicles: "Foram encontrados vários veículos. Selecione um no editor do cartão.", unavailable: "O veículo configurado não está disponível.", auto: "Veículo: automático · {vehicle}" },
  nl: { cardName: "SV voertuigoverzicht met dubbele energie", cardDescription: "Brede voertuigkaart voor accu en brandstof", battery: "Accu", fuel: "Brandstof", electricRange: "Elektrisch bereik", fuelRange: "Brandstofbereik", charging: "Laden", driving: "Rijdt", plugged: "Aangesloten", vehicle: "Voertuig", selectVehicle: "Voertuig selecteren…", noInstance: "Geen SV Dashboard-instantie beschikbaar.", multipleVehicles: "Meerdere voertuigen gevonden. Selecteer een voertuig in de kaarteditor.", unavailable: "Het geconfigureerde voertuig is niet beschikbaar.", auto: "Voertuig: automatisch · {vehicle}" },
  da: { cardName: "SV køretøjsoversigt med dobbelt energi", cardDescription: "Bredt køretøjskort til batteri og brændstof", battery: "Batteri", fuel: "Brændstof", electricRange: "El-rækkevidde", fuelRange: "Brændstofrækkevidde", charging: "Oplader", driving: "Kører", plugged: "Tilsluttet", vehicle: "Køretøj", selectVehicle: "Vælg køretøj…", noInstance: "Ingen SV Dashboard-instans er tilgængelig.", multipleVehicles: "Flere køretøjer fundet. Vælg et køretøj i korteditoren.", unavailable: "Det konfigurerede køretøj er ikke tilgængeligt.", auto: "Køretøj: automatisk · {vehicle}" },
  nb: { cardName: "SV kjøretøyoversikt med dobbel energi", cardDescription: "Bredt kjøretøykort for batteri og drivstoff", battery: "Batteri", fuel: "Drivstoff", electricRange: "El-rekkevidde", fuelRange: "Drivstoffrekkevidde", charging: "Lader", driving: "Kjører", plugged: "Tilkoblet", vehicle: "Kjøretøy", selectVehicle: "Velg kjøretøy…", noInstance: "Ingen SV Dashboard-instans er tilgjengelig.", multipleVehicles: "Flere kjøretøy funnet. Velg et kjøretøy i korteditoren.", unavailable: "Det konfigurerte kjøretøyet er ikke tilgjengelig.", auto: "Kjøretøy: automatisk · {vehicle}" },
  sv: { cardName: "SV fordonsöversikt med dubbel energi", cardDescription: "Brett fordonskort för batteri och bränsle", battery: "Batteri", fuel: "Bränsle", electricRange: "Elräckvidd", fuelRange: "Bränsleräckvidd", charging: "Laddar", driving: "Kör", plugged: "Ansluten", vehicle: "Fordon", selectVehicle: "Välj fordon…", noInstance: "Ingen SV Dashboard-instans är tillgänglig.", multipleVehicles: "Flera fordon hittades. Välj ett fordon i kortredigeraren.", unavailable: "Det konfigurerade fordonet är inte tillgängligt.", auto: "Fordon: automatiskt · {vehicle}" },
  fi: { cardName: "SV-ajoneuvon kaksoisenergia-näkymä", cardDescription: "Leveä ajoneuvokortti akulle ja polttoaineelle", battery: "Akku", fuel: "Polttoaine", electricRange: "Sähköinen toimintasäde", fuelRange: "Polttoaineen toimintasäde", charging: "Lataa", driving: "Ajossa", plugged: "Kytketty", vehicle: "Ajoneuvo", selectVehicle: "Valitse ajoneuvo…", noInstance: "SV Dashboard -instanssia ei ole käytettävissä.", multipleVehicles: "Useita ajoneuvoja löytyi. Valitse ajoneuvo korttieditorissa.", unavailable: "Määritetty ajoneuvo ei ole käytettävissä.", auto: "Ajoneuvo: automaattinen · {vehicle}" },
  pl: { cardName: "Widok pojazdu SV z dwoma źródłami energii", cardDescription: "Szeroka karta pojazdu dla akumulatora i paliwa", battery: "Akumulator", fuel: "Paliwo", electricRange: "Zasięg elektryczny", fuelRange: "Zasięg paliwa", charging: "Ładowanie", driving: "W ruchu", plugged: "Podłączony", vehicle: "Pojazd", selectVehicle: "Wybierz pojazd…", noInstance: "Brak dostępnej instancji SV Dashboard.", multipleVehicles: "Znaleziono wiele pojazdów. Wybierz pojazd w edytorze karty.", unavailable: "Skonfigurowany pojazd jest niedostępny.", auto: "Pojazd: automatycznie · {vehicle}" },
  cs: { cardName: "Přehled vozidla SV se dvěma zdroji energie", cardDescription: "Široká karta vozidla pro baterii a palivo", battery: "Baterie", fuel: "Palivo", electricRange: "Elektrický dojezd", fuelRange: "Dojezd na palivo", charging: "Nabíjení", driving: "V jízdě", plugged: "Připojeno", vehicle: "Vozidlo", selectVehicle: "Vybrat vozidlo…", noInstance: "Není dostupná žádná instance SV Dashboard.", multipleVehicles: "Bylo nalezeno více vozidel. Vyberte vozidlo v editoru karty.", unavailable: "Nakonfigurované vozidlo není dostupné.", auto: "Vozidlo: automaticky · {vehicle}" },
  sk: { cardName: "Prehľad vozidla SV s dvoma zdrojmi energie", cardDescription: "Široká karta vozidla pre batériu a palivo", battery: "Batéria", fuel: "Palivo", electricRange: "Elektrický dojazd", fuelRange: "Dojazd na palivo", charging: "Nabíja", driving: "V jazde", plugged: "Pripojené", vehicle: "Vozidlo", selectVehicle: "Vybrať vozidlo…", noInstance: "Nie je dostupná žiadna inštancia SV Dashboard.", multipleVehicles: "Bolo nájdených viac vozidiel. Vyberte vozidlo v editore karty.", unavailable: "Nakonfigurované vozidlo nie je dostupné.", auto: "Vozidlo: automaticky · {vehicle}" },
  hu: { cardName: "SV kettős energiájú járműáttekintés", cardDescription: "Széles járműkártya akkumulátorhoz és üzemanyaghoz", battery: "Akkumulátor", fuel: "Üzemanyag", electricRange: "Elektromos hatótáv", fuelRange: "Üzemanyag-hatótáv", charging: "Töltés", driving: "Menetben", plugged: "Csatlakoztatva", vehicle: "Jármű", selectVehicle: "Jármű kiválasztása…", noInstance: "Nincs elérhető SV Dashboard-példány.", multipleVehicles: "Több jármű található. Válasszon járművet a kártyaszerkesztőben.", unavailable: "A beállított jármű nem érhető el.", auto: "Jármű: automatikus · {vehicle}" },
  ro: { cardName: "Prezentare vehicul SV cu energie dublă", cardDescription: "Card lat pentru baterie și combustibil", battery: "Baterie", fuel: "Combustibil", electricRange: "Autonomie electrică", fuelRange: "Autonomie combustibil", charging: "Se încarcă", driving: "În mers", plugged: "Conectat", vehicle: "Vehicul", selectVehicle: "Selectați vehiculul…", noInstance: "Nu este disponibilă nicio instanță SV Dashboard.", multipleVehicles: "Au fost găsite mai multe vehicule. Selectați un vehicul în editorul cardului.", unavailable: "Vehiculul configurat nu este disponibil.", auto: "Vehicul: automat · {vehicle}" },
  sl: { cardName: "SV pregled vozila z dvojno energijo", cardDescription: "Široka kartica vozila za baterijo in gorivo", battery: "Baterija", fuel: "Gorivo", electricRange: "Električni doseg", fuelRange: "Doseg z gorivom", charging: "Polnjenje", driving: "V vožnji", plugged: "Priključeno", vehicle: "Vozilo", selectVehicle: "Izberite vozilo…", noInstance: "Nobena instanca SV Dashboard ni na voljo.", multipleVehicles: "Najdenih je več vozil. Izberite vozilo v urejevalniku kartice.", unavailable: "Konfigurirano vozilo ni na voljo.", auto: "Vozilo: samodejno · {vehicle}" },
  hr: { cardName: "SV pregled vozila s dvostrukom energijom", cardDescription: "Široka kartica vozila za bateriju i gorivo", battery: "Baterija", fuel: "Gorivo", electricRange: "Električni doseg", fuelRange: "Doseg goriva", charging: "Punjenje", driving: "U vožnji", plugged: "Priključeno", vehicle: "Vozilo", selectVehicle: "Odaberite vozilo…", noInstance: "Nema dostupne instance SV Dashboarda.", multipleVehicles: "Pronađeno je više vozila. Odaberite vozilo u uređivaču kartice.", unavailable: "Konfigurirano vozilo nije dostupno.", auto: "Vozilo: automatski · {vehicle}" },
};

const statusCandidates = (hass, entryId) => Object.entries(hass?.states || {}).filter(([entityId, state]) => {
  const attributes = state?.attributes || {};
  return entityId.startsWith("sensor.") && attributes.integration_domain === STATUS_DOMAIN && typeof attributes.entity_mapping === "object" && (!entryId || attributes.entry_id === entryId);
});

const candidateLabel = (hass, candidate, index = 0) => {
  const [, state] = candidate || [];
  const attributes = state?.attributes || {};
  const vehicleEntity = attributes.entity_mapping?.vehicle;
  const vehicle = vehicleEntity ? hass?.states?.[vehicleEntity] : undefined;
  return String(vehicle?.attributes?.friendly_name || attributes.vehicle_slug || `Vehicle ${index + 1}`);
};

const metricEntity = (hass, attributes, key) => attributes?.metric_entities?.[key] || Object.entries(hass?.states || {}).find(([, state]) => {
  const a = state?.attributes || {};
  return a.integration_domain === STATUS_DOMAIN && a.entry_id === attributes?.entry_id && a.metric_key === key;
})?.[0];

const isOn = (state) => ["on", "true", "inprogress", "running"].includes(String(state ?? "").toLowerCase());
const usable = (state) => state && !["unknown", "unavailable", "none", ""].includes(String(state.state ?? "").toLowerCase());
const numeric = (state) => usable(state) && Number.isFinite(Number(state.state)) ? Number(state.state) : null;

class SvDashboardDualEnergyOverviewCard extends LitElement {
  static properties = { _hass: { state: true }, _config: { state: true } };

  static styles = css`
    :host { display: block; }
    ha-card { overflow: hidden; border-radius: var(--ha-card-border-radius, 16px); }
    .hero { min-height: 282px; display: grid; grid-template-columns: minmax(145px, 1fr) minmax(260px, 2.1fr) minmax(145px, 1fr); grid-template-areas: "battery vehicle fuel"; align-items: center; gap: 18px; padding: 22px 28px 18px; background: radial-gradient(circle at 50% 48%, color-mix(in srgb, var(--primary-color) 5%, transparent), transparent 42%), var(--ha-card-background, var(--card-background-color)); }
    .energy { min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; cursor: pointer; padding: 8px; border-radius: 16px; transition: background .15s ease; }
    .energy:hover { background: color-mix(in srgb, var(--primary-color) 6%, transparent); }
    .energy.battery { grid-area: battery; --accent: var(--success-color, #2eaf5d); }
    .energy.fuel { grid-area: fuel; --accent: var(--warning-color, #ef6c00); }
    .icon { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, var(--accent) 11%, transparent); color: var(--accent); margin-bottom: 10px; }
    .icon ha-icon { --mdc-icon-size: 25px; }
    .label { color: var(--primary-text-color); font-size: 15px; font-weight: 600; }
    .level { margin-top: 5px; color: var(--accent); font-size: clamp(34px, 4vw, 50px); font-weight: 600; letter-spacing: -.02em; line-height: 1.05; }
    .level small { font-size: .58em; font-weight: 500; }
    .divider { width: min(130px, 90%); height: 1px; background: var(--divider-color); margin: 14px 0 10px; }
    .range-label { color: var(--secondary-text-color); font-size: 13px; }
    .range { color: var(--primary-text-color); font-size: 24px; font-weight: 600; margin-top: 3px; }
    .range small { font-size: .6em; font-weight: 500; }
    .vehicle { grid-area: vehicle; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; align-self: stretch; }
    .picture { width: 100%; min-height: 180px; display: grid; place-items: center; overflow: hidden; }
    .picture img { display: block; width: min(100%, 520px); max-height: 205px; object-fit: contain; filter: drop-shadow(0 8px 10px rgba(0,0,0,.16)); }
    .picture .placeholder { color: var(--secondary-text-color); }
    .status { min-height: 38px; margin-top: 5px; display: flex; justify-content: center; align-items: center; }
    .status-pill { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 34px; padding: 0 17px; border-radius: 999px; background: color-mix(in srgb, var(--primary-color) 8%, var(--card-background-color)); box-shadow: 0 2px 8px rgba(0,0,0,.08); color: var(--primary-text-color); font-size: 14px; font-weight: 600; white-space: nowrap; }
    .status-pill ha-icon { color: var(--primary-color); --mdc-icon-size: 19px; }
    .status-value { color: var(--success-color, #2eaf5d); font-weight: 600; }
    .message { padding: 16px; color: var(--secondary-text-color); }
    @media (max-width: 680px) {
      .hero { grid-template-columns: 1fr 1fr; grid-template-areas: "vehicle vehicle" "battery fuel"; min-height: 0; padding: 14px 14px 18px; gap: 8px 12px; }
      .picture { min-height: 145px; }
      .picture img { max-height: 170px; }
      .energy { padding: 8px 4px; }
      .icon { width: 38px; height: 38px; margin-bottom: 6px; }
      .level { font-size: 34px; }
      .range { font-size: 21px; }
      .divider { margin: 10px 0 8px; }
    }
    @media (max-width: 410px) {
      .hero { grid-template-columns: 1fr; grid-template-areas: "vehicle" "battery" "fuel"; }
      .energy { width: 100%; box-sizing: border-box; display: grid; grid-template-columns: 40px 1fr 1fr; grid-template-areas: "icon label rangeLabel" "icon level range"; text-align: left; align-items: center; column-gap: 10px; }
      .energy .icon { grid-area: icon; margin: 0; }
      .energy .label { grid-area: label; }
      .energy .level { grid-area: level; font-size: 28px; margin: 0; }
      .energy .divider { display: none; }
      .energy .range-label { grid-area: rangeLabel; text-align: right; }
      .energy .range { grid-area: range; text-align: right; font-size: 20px; margin: 0; }
    }
  `;

  constructor() { super(); this._hass = undefined; this._config = {}; }
  setConfig(config) { this._config = { ...(config || {}) }; }
  set hass(hass) { this._hass = hass; this.requestUpdate(); }
  get hass() { return this._hass; }
  static getConfigElement() { return document.createElement(EDITOR_TAG); }
  static getStubConfig() { return {}; }
  getCardSize() { return 5; }

  _text() { const language = languageFor(this._hass || {}); return TEXT[language] || TEXT.en; }
  _selected() { if (!this._hass) return undefined; const candidates = statusCandidates(this._hass, this._config.entry_id); return candidates.length === 1 ? candidates[0] : undefined; }
  _showMore(entityId) { if (!entityId) return; this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId } })); }
  _formatValue(entityId, digits = 0) { const value = numeric(this._hass?.states?.[entityId]); if (value === null) return "—"; return new Intl.NumberFormat(languageFor(this._hass), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value); }

  _status(attributes, mapped) {
    const text = this._text();
    const state = (id) => this._hass?.states?.[id];
    const charging = isOn(state(mapped.battery_charging)?.state);
    const engine = isOn(state(mapped.engine)?.state);
    const plugged = isOn(state(mapped.battery_plugged)?.state);
    const chargePower = metricEntity(this._hass, attributes, "current_charge_power");
    const tripEnergy = metricEntity(this._hass, attributes, "current_trip_energy");
    if (charging) {
      const power = numeric(state(chargePower));
      return { icon: "mdi:battery-charging", label: text.charging, value: power === null ? "" : `${this._formatValue(chargePower, 1)} kW` };
    }
    if (engine) {
      const fuelConsumption = numeric(state(mapped.fuel_consumption_instant));
      if (fuelConsumption !== null) return { icon: "mdi:car", label: text.driving, value: `${this._formatValue(mapped.fuel_consumption_instant, 1)} l/100 km` };
      const energy = numeric(state(tripEnergy));
      return { icon: "mdi:car", label: text.driving, value: energy === null ? "" : `${this._formatValue(tripEnergy, 1)} kWh` };
    }
    if (plugged) return { icon: "mdi:ev-plug-type2", label: text.plugged, value: "" };
    return null;
  }

  render() {
    const text = this._text();
    if (!this._hass) return nothing;
    const selected = this._selected();
    if (!selected) {
      const all = statusCandidates(this._hass);
      const message = all.length > 1 && !this._config.entry_id ? text.multipleVehicles : this._config.entry_id ? text.unavailable : text.noInstance;
      return html`<ha-card><div class="message">${message}</div></ha-card>`;
    }
    const [, status] = selected;
    const attributes = status.attributes || {};
    const mapped = attributes.entity_mapping || {};
    const tracker = attributes.vehicle_tracker;
    const picture = tracker ? this._hass.states?.[tracker]?.attributes?.entity_picture : undefined;
    const statusLine = this._status(attributes, mapped);
    const battery = this._formatValue(mapped.battery, 0);
    const electricRange = this._formatValue(mapped.autonomy, 0);
    const fuel = this._formatValue(mapped.fuel, 0);
    const fuelRange = this._formatValue(mapped.fuel_autonomy, 0);
    return html`
      <ha-card>
        <div class="hero">
          <div class="energy battery" @click=${() => this._showMore(mapped.battery)}>
            <div class="icon"><ha-icon icon="mdi:lightning-bolt"></ha-icon></div>
            <div class="label">${text.battery}</div>
            <div class="level">${battery}<small>${battery === "—" ? "" : " %"}</small></div>
            <div class="divider"></div>
            <div class="range-label">${text.electricRange}</div>
            <div class="range">${electricRange}<small>${electricRange === "—" ? "" : " km"}</small></div>
          </div>
          <div class="vehicle">
            <div class="picture">${picture ? html`<img src=${picture} alt="" />` : html`<ha-icon class="placeholder" icon="mdi:car" style="--mdc-icon-size:92px"></ha-icon>`}</div>
            <div class="status">${statusLine ? html`<div class="status-pill"><ha-icon icon=${statusLine.icon}></ha-icon><span>${statusLine.label}</span>${statusLine.value ? html`<span>·</span><span class="status-value">${statusLine.value}</span>` : nothing}</div>` : nothing}</div>
          </div>
          <div class="energy fuel" @click=${() => this._showMore(mapped.fuel)}>
            <div class="icon"><ha-icon icon="mdi:gas-station"></ha-icon></div>
            <div class="label">${text.fuel}</div>
            <div class="level">${fuel}<small>${fuel === "—" ? "" : " %"}</small></div>
            <div class="divider"></div>
            <div class="range-label">${text.fuelRange}</div>
            <div class="range">${fuelRange}<small>${fuelRange === "—" ? "" : " km"}</small></div>
          </div>
        </div>
      </ha-card>`;
  }
}

class SvDashboardDualEnergyOverviewCardEditor extends HTMLElement {
  constructor() { super(); this._config = {}; this._hass = undefined; }
  setConfig(config) { this._config = config || {}; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }
  connectedCallback() { this._render(); }
  _text() { const language = languageFor(this._hass || {}); return TEXT[language] || TEXT.en; }
  _emit(entryId) { const next = { ...this._config }; if (entryId) next.entry_id = entryId; else delete next.entry_id; this.dispatchEvent(new CustomEvent("config-changed", { bubbles: true, composed: true, detail: { config: next } })); }
  _render() {
    if (!this.isConnected || !this._hass) return;
    const text = this._text();
    const candidates = statusCandidates(this._hass);
    if (!candidates.length) { this.innerHTML = `<div style="padding:12px 0;color:var(--secondary-text-color)">${text.noInstance}</div>`; return; }
    if (candidates.length === 1) { this.innerHTML = `<div style="padding:12px 0;color:var(--secondary-text-color)">${text.auto.replace("{vehicle}", candidateLabel(this._hass, candidates[0], 0))}</div>`; return; }
    const options = candidates.map((candidate, index) => { const id = candidate[1]?.attributes?.entry_id || ""; const selected = id === this._config.entry_id ? " selected" : ""; return `<option value="${id}"${selected}>${candidateLabel(this._hass, candidate, index)}</option>`; }).join("");
    this.innerHTML = `<label style="display:block;padding:8px 0;font-weight:500">${text.vehicle}</label><select id="vehicle" style="box-sizing:border-box;width:100%;min-height:42px;padding:0 10px;border:1px solid var(--divider-color);border-radius:10px;background:var(--card-background-color);color:var(--primary-text-color)"><option value="">${text.selectVehicle}</option>${options}</select>`;
    this.querySelector("#vehicle")?.addEventListener("change", (event) => this._emit(event.target.value));
  }
}

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, SvDashboardDualEnergyOverviewCard);
if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, SvDashboardDualEnergyOverviewCardEditor);
window.customCards = window.customCards || [];
const registrationLanguage = languageFor({ locale: { language: typeof navigator !== "undefined" ? navigator.language : "en" } });
const registrationText = TEXT[registrationLanguage] || TEXT.en;
if (!window.customCards.some((card) => card.type === CARD_TAG)) window.customCards.push({ type: CARD_TAG, name: registrationText.cardName, description: registrationText.cardDescription, preview: true });

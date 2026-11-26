/* Runtime composition layer for the bundled Lovelace localisation catalogs.
 *
 * Keep the established DE/EN/FR + base extra-language catalog in i18n-core.js,
 * then overlay the reviewed advanced completion catalogs. Browser-facing imports use explicit content cache keys; the changed core catalog is cache-busted for beta.36.
 */
import {
  FRONTEND_TEXT,
  languageFor,
  localeFor,
  textFor,
} from "./i18n-core.js?v=0.6.0-beta.36";
import { ADVANCED_FRONTEND_TEXT as WESTERN_ADVANCED } from "./i18n-advanced-west.js?v=0.6.0-beta.17";
import { ADVANCED_FRONTEND_TEXT as NORTHERN_ADVANCED } from "./i18n-advanced-north.js?v=0.6.0-beta.17";
import { ADVANCED_FRONTEND_TEXT as EASTERN_ADVANCED } from "./i18n-advanced-east.js?v=0.6.0-beta.17";

for (const catalog of [WESTERN_ADVANCED, NORTHERN_ADVANCED, EASTERN_ADVANCED]) {
  for (const [language, namespaces] of Object.entries(catalog)) {
    for (const [namespace, translated] of Object.entries(namespaces)) {
      FRONTEND_TEXT[namespace][language] = {
        ...FRONTEND_TEXT[namespace].en,
        ...FRONTEND_TEXT[namespace][language],
        ...translated,
      };
    }
  }
}

// Odometer-gap rows are a frontend-only provenance representation. They carry
// distance proven by adjacent canonical odometer anchors, but deliberately no
// invented trip timestamp, duration, SOC, energy or consumption.
const TRIP_HISTORY_GAP_TEXT = {
  de: "Rekonstruierte Kilometerlücke",
  en: "Reconstructed odometer gap",
  fr: "Écart kilométrique reconstruit",
  it: "Lacuna chilometrica ricostruita",
  es: "Salto de kilometraje reconstruido",
  pt: "Lacuna de quilometragem reconstruída",
  nl: "Gereconstrueerd kilometerstandsgat",
  da: "Rekonstrueret kilometertællergab",
  nb: "Rekonstruert kilometerstandsgap",
  sv: "Rekonstruerat mätarställningsgap",
  fi: "Rekonstruoitu matkamittariväli",
  pl: "Zrekonstruowana luka przebiegu",
  cs: "Rekonstruovaná mezera nájezdu",
  sk: "Rekonštruovaná medzera nájazdu",
  hu: "Rekonstruált kilométeróra-rés",
  ro: "Gol de kilometraj reconstruit",
  sl: "Rekonstruirana vrzel kilometrine",
  hr: "Rekonstruirani jaz kilometraže",
};

for (const [language, label] of Object.entries(TRIP_HISTORY_GAP_TEXT)) {
  if (FRONTEND_TEXT.tripHistory?.[language]) {
    FRONTEND_TEXT.tripHistory[language].reconstructedGap = label;
  }
}

const LOCAL_GAP_LABELS = {
  "de": "Aus lokaler Fahrterfassung wiederhergestellt",
  "en": "Recovered from local trip observations",
  "fr": "Trajet récupéré à partir des observations locales",
  "it": "Viaggio recuperato dai dati locali",
  "es": "Trayecto recuperado de los datos locales",
  "pt": "Viagem recuperada dos dados locais",
  "nl": "Rit hersteld uit lokale waarnemingen",
  "da": "Tur gendannet fra lokale observationer",
  "nb": "Tur gjenopprettet fra lokale observasjoner",
  "sv": "Resa återställd från lokala observationer",
  "fi": "Matka palautettu paikallisista havainnoista",
  "pl": "Przejazd odtworzony z danych lokalnych",
  "cs": "Jízda obnovena z místních údajů",
  "sk": "Jazda obnovená z miestnych údajov",
  "hu": "Helyi adatokból helyreállított út",
  "ro": "Călătorie recuperată din datele locale",
  "sl": "Vožnja obnovljena iz lokalnih podatkov",
  "hr": "Vožnja obnovljena iz lokalnih podataka"
};
for (const [language, label] of Object.entries(LOCAL_GAP_LABELS)) {
  FRONTEND_TEXT.tripHistory[language].localGapRecovery = label;
}

const PLUG_SESSION_LABELS = {
  "de": [
    "Ladeabschnitte",
    "Ladepausen",
    "Gesamtzeit",
    "Anschlussdauer"
  ],
  "en": [
    "Charge segments",
    "Charging pauses",
    "Elapsed time",
    "Connected time"
  ],
  "fr": [
    "Segments de charge",
    "Pauses de charge",
    "Temps écoulé",
    "Durée de connexion"
  ],
  "it": [
    "Segmenti di ricarica",
    "Pause di ricarica",
    "Tempo trascorso",
    "Durata collegamento"
  ],
  "es": [
    "Tramos de carga",
    "Pausas de carga",
    "Tiempo transcurrido",
    "Tiempo conectado"
  ],
  "pt": [
    "Segmentos de carga",
    "Pausas de carga",
    "Tempo decorrido",
    "Tempo ligado"
  ],
  "nl": [
    "Laadsegmenten",
    "Laadpauzes",
    "Verstreken tijd",
    "Aansluitduur"
  ],
  "da": [
    "Ladeafsnit",
    "Ladepauser",
    "Forløbet tid",
    "Tilslutningstid"
  ],
  "nb": [
    "Ladesegmenter",
    "Ladepauser",
    "Forløpt tid",
    "Tilkoblingstid"
  ],
  "sv": [
    "Laddningssegment",
    "Laddningspauser",
    "Förfluten tid",
    "Anslutningstid"
  ],
  "fi": [
    "Latausjaksot",
    "Lataustauot",
    "Kulunut aika",
    "Kytkentäaika"
  ],
  "pl": [
    "Odcinki ładowania",
    "Przerwy ładowania",
    "Czas całkowity",
    "Czas podłączenia"
  ],
  "cs": [
    "Úseky nabíjení",
    "Pauzy nabíjení",
    "Celkový čas",
    "Doba připojení"
  ],
  "sk": [
    "Úseky nabíjania",
    "Prestávky nabíjania",
    "Celkový čas",
    "Čas pripojenia"
  ],
  "hu": [
    "Töltési szakaszok",
    "Töltési szünetek",
    "Eltelt idő",
    "Csatlakozási idő"
  ],
  "ro": [
    "Segmente de încărcare",
    "Pauze de încărcare",
    "Timp scurs",
    "Durată conectare"
  ],
  "sl": [
    "Odseki polnjenja",
    "Premori polnjenja",
    "Pretekli čas",
    "Čas priklopa"
  ],
  "hr": [
    "Dijelovi punjenja",
    "Stanke punjenja",
    "Proteklo vrijeme",
    "Vrijeme priključenja"
  ]
};
for (const [language, labels] of Object.entries(PLUG_SESSION_LABELS)) {
  const [sessionSegments, sessionPauses, sessionElapsed, sessionPlugTime] = labels;
  Object.assign(FRONTEND_TEXT.chargeHistory[language], {sessionSegments, sessionPauses, sessionElapsed, sessionPlugTime});
}

const CLIMATE_AND_PAUSE_LABELS = {
  "de": [
    "Vorklimatisierung nicht verfügbar",
    "Warte auf Fahrzeugbestätigung",
    "Vorklimatisierung nicht bestätigt",
    "Unter 20 %: aktive Ladung kann erforderlich sein",
    "Ladepause"
  ],
  "en": [
    "Preconditioning unavailable",
    "Waiting for vehicle confirmation",
    "Preconditioning not confirmed",
    "Below 20%: active charging may be required",
    "Charging paused"
  ],
  "fr": [
    "Préconditionnement indisponible",
    "En attente de confirmation du véhicule",
    "Préconditionnement non confirmé",
    "Sous 20 % : recharge active parfois nécessaire",
    "Recharge en pause"
  ],
  "it": [
    "Precondizionamento non disponibile",
    "In attesa di conferma del veicolo",
    "Precondizionamento non confermato",
    "Sotto il 20%: può servire la ricarica attiva",
    "Ricarica in pausa"
  ],
  "es": [
    "Preacondicionamiento no disponible",
    "Esperando confirmación del vehículo",
    "Preacondicionamiento no confirmado",
    "Por debajo del 20 %: puede requerir carga activa",
    "Carga en pausa"
  ],
  "pt": [
    "Pré-condicionamento indisponível",
    "A aguardar confirmação do veículo",
    "Pré-condicionamento não confirmado",
    "Abaixo de 20%: pode exigir carregamento ativo",
    "Carregamento em pausa"
  ],
  "nl": [
    "Voorconditionering niet beschikbaar",
    "Wacht op voertuigbevestiging",
    "Voorconditionering niet bevestigd",
    "Onder 20%: actief laden kan vereist zijn",
    "Laadpauze"
  ],
  "da": [
    "Forkonditionering utilgængelig",
    "Afventer bekræftelse fra bilen",
    "Forkonditionering ikke bekræftet",
    "Under 20 %: aktiv opladning kan være nødvendig",
    "Ladepause"
  ],
  "nb": [
    "Forvarming utilgjengelig",
    "Venter på bekreftelse fra bilen",
    "Forvarming ikke bekreftet",
    "Under 20 %: aktiv lading kan være nødvendig",
    "Ladepause"
  ],
  "sv": [
    "Förkonditionering ej tillgänglig",
    "Väntar på bekräftelse från bilen",
    "Förkonditionering ej bekräftad",
    "Under 20 %: aktiv laddning kan krävas",
    "Laddningspaus"
  ],
  "fi": [
    "Esilämmitys ei käytettävissä",
    "Odotetaan auton vahvistusta",
    "Esilämmitystä ei vahvistettu",
    "Alle 20 %: aktiivinen lataus voi olla tarpeen",
    "Lataustauko"
  ],
  "pl": [
    "Klimatyzacja wstępna niedostępna",
    "Oczekiwanie na potwierdzenie pojazdu",
    "Brak potwierdzenia klimatyzacji",
    "Poniżej 20%: może być wymagane aktywne ładowanie",
    "Przerwa w ładowaniu"
  ],
  "cs": [
    "Předklimatizace nedostupná",
    "Čekání na potvrzení vozidla",
    "Předklimatizace nepotvrzena",
    "Pod 20 %: může být nutné aktivní nabíjení",
    "Pauza nabíjení"
  ],
  "sk": [
    "Predklimatizácia nedostupná",
    "Čakanie na potvrdenie vozidla",
    "Predklimatizácia nepotvrdená",
    "Pod 20 %: môže byť potrebné aktívne nabíjanie",
    "Prestávka nabíjania"
  ],
  "hu": [
    "Előklimatizálás nem elérhető",
    "Várakozás a jármű visszaigazolására",
    "Előklimatizálás nincs visszaigazolva",
    "20% alatt aktív töltés lehet szükséges",
    "Töltési szünet"
  ],
  "ro": [
    "Precondiționare indisponibilă",
    "Se așteaptă confirmarea vehiculului",
    "Precondiționare neconfirmată",
    "Sub 20%: poate fi necesară încărcarea activă",
    "Pauză de încărcare"
  ],
  "sl": [
    "Predklimatizacija ni na voljo",
    "Čakanje na potrditev vozila",
    "Predklimatizacija ni potrjena",
    "Pod 20 %: morda je potrebno aktivno polnjenje",
    "Premor polnjenja"
  ],
  "hr": [
    "Predklimatizacija nije dostupna",
    "Čekanje potvrde vozila",
    "Predklimatizacija nije potvrđena",
    "Ispod 20 %: može biti potrebno aktivno punjenje",
    "Stanka punjenja"
  ]
};
for (const [language, labels] of Object.entries(CLIMATE_AND_PAUSE_LABELS)) {
  const [climateUnavailable, climatePending, climateNotConfirmed, climateLowSoc, chargePaused] = labels;
  Object.assign(FRONTEND_TEXT.dashboard[language], {climateUnavailable, climatePending, climateNotConfirmed, climateLowSoc, chargePaused});
}

// Public Home Assistant card-picker names are intentionally owned by the
// shared i18n layer. Keep the compact universal overview clearly distinct from
// the wide Battery + Fuel / Dual-Energy overview in every supported language.
const PUBLIC_CARD_NAMES = {
  de: {
    compact: "SV Fahrzeugübersicht (kompakt)",
    dualEnergy: "SV Fahrzeugübersicht – Dual Energy",
  },
  en: {
    compact: "SV vehicle overview (compact)",
    dualEnergy: "SV vehicle overview – Dual Energy",
  },
  fr: {
    compact: "Vue d’ensemble du véhicule SV (compacte)",
    dualEnergy: "Vue d’ensemble du véhicule SV – Double énergie",
  },
  it: {
    compact: "Panoramica veicolo SV (compatta)",
    dualEnergy: "Panoramica veicolo SV – Doppia energia",
  },
  es: {
    compact: "Vista general del vehículo SV (compacta)",
    dualEnergy: "Vista general del vehículo SV – Doble energía",
  },
  pt: {
    compact: "Visão geral do veículo SV (compacta)",
    dualEnergy: "Visão geral do veículo SV – Dupla energia",
  },
  nl: {
    compact: "SV-voertuigoverzicht (compact)",
    dualEnergy: "SV-voertuigoverzicht – Dubbele energie",
  },
  da: {
    compact: "SV-køretøjsoversigt (kompakt)",
    dualEnergy: "SV-køretøjsoversigt – Dobbelt energi",
  },
  nb: {
    compact: "SV-kjøretøyoversikt (kompakt)",
    dualEnergy: "SV-kjøretøyoversikt – Dobbel energi",
  },
  sv: {
    compact: "SV-fordonsöversikt (kompakt)",
    dualEnergy: "SV-fordonsöversikt – Dubbel energi",
  },
  fi: {
    compact: "SV-ajoneuvon yleiskuva (kompakti)",
    dualEnergy: "SV-ajoneuvon yleiskuva – Kaksoisenergia",
  },
  pl: {
    compact: "Przegląd pojazdu SV (kompaktowy)",
    dualEnergy: "Przegląd pojazdu SV – Podwójna energia",
  },
  cs: {
    compact: "Přehled vozidla SV (kompaktní)",
    dualEnergy: "Přehled vozidla SV – Duální energie",
  },
  sk: {
    compact: "Prehľad vozidla SV (kompaktný)",
    dualEnergy: "Prehľad vozidla SV – Duálna energia",
  },
  hu: {
    compact: "SV járműáttekintés (kompakt)",
    dualEnergy: "SV járműáttekintés – Kettős energia",
  },
  ro: {
    compact: "Prezentare generală vehicul SV (compactă)",
    dualEnergy: "Prezentare generală vehicul SV – Energie duală",
  },
  sl: {
    compact: "Pregled vozila SV (kompakten)",
    dualEnergy: "Pregled vozila SV – Dvojna energija",
  },
  hr: {
    compact: "Pregled vozila SV (kompaktan)",
    dualEnergy: "Pregled vozila SV – Dvostruka energija",
  },
};

for (const [language, names] of Object.entries(PUBLIC_CARD_NAMES)) {
  if (FRONTEND_TEXT.vehicleOverview?.[language]) {
    FRONTEND_TEXT.vehicleOverview[language].cardName = names.compact;
  }
  if (FRONTEND_TEXT.dualEnergyOverview?.[language]) {
    FRONTEND_TEXT.dualEnergyOverview[language].cardName = names.dualEnergy;
  }
}

// Notification / wake-up parity labels added in beta.20.
const NOTIFICATION_WAKEUP_TEXT = {
  de: { periodicWakeup: "Periodischer Wake-up", wakeupInterval: "Wake-up-Intervall", wakeupsToday: "Wake-ups heute", lastWakeup: "Letzter Wake-up", lastVehicleData: "Letzte Fahrzeugdaten", lastProbe: "Letzte Probe", homeZones: "Home-Zonen", wakeupActivity24h: "Wake-up-Aktivität · 24 h", restoreNotificationDefaults: "Standardwerte wiederherstellen", reachability: "Erreichbarkeit" },
  en: { periodicWakeup: "Periodic wake-up", wakeupInterval: "Wake-up interval", wakeupsToday: "Wake-ups today", lastWakeup: "Last wake-up", lastVehicleData: "Last vehicle data", lastProbe: "Last probe", homeZones: "Home zones", wakeupActivity24h: "Wake-up activity · 24 h", restoreNotificationDefaults: "Restore defaults", reachability: "Reachability" },
  fr: { periodicWakeup: "Réveil périodique", wakeupInterval: "Intervalle de réveil", wakeupsToday: "Réveils aujourd’hui", lastWakeup: "Dernier réveil", lastVehicleData: "Dernières données véhicule", lastProbe: "Dernier test", homeZones: "Zones domicile", wakeupActivity24h: "Activité de réveil · 24 h", restoreNotificationDefaults: "Restaurer les valeurs par défaut", reachability: "Disponibilité" },
  it: { periodicWakeup: "Riattivazione periodica", wakeupInterval: "Intervallo di riattivazione", wakeupsToday: "Riattivazioni oggi", lastWakeup: "Ultima riattivazione", lastVehicleData: "Ultimi dati veicolo", lastProbe: "Ultima verifica", homeZones: "Zone casa", wakeupActivity24h: "Attività di riattivazione · 24 h", restoreNotificationDefaults: "Ripristina predefiniti", reachability: "Disponibilità" },
  es: { periodicWakeup: "Activación periódica", wakeupInterval: "Intervalo de activación", wakeupsToday: "Activaciones hoy", lastWakeup: "Última activación", lastVehicleData: "Últimos datos del vehículo", lastProbe: "Última comprobación", homeZones: "Zonas de casa", wakeupActivity24h: "Actividad de activación · 24 h", restoreNotificationDefaults: "Restaurar valores predeterminados", reachability: "Disponibilidad" },
  pt: { periodicWakeup: "Ativação periódica", wakeupInterval: "Intervalo de ativação", wakeupsToday: "Ativações hoje", lastWakeup: "Última ativação", lastVehicleData: "Últimos dados do veículo", lastProbe: "Último teste", homeZones: "Zonas de casa", wakeupActivity24h: "Atividade de ativação · 24 h", restoreNotificationDefaults: "Restaurar predefinições", reachability: "Disponibilidade" },
  nl: { periodicWakeup: "Periodieke wake-up", wakeupInterval: "Wake-upinterval", wakeupsToday: "Wake-ups vandaag", lastWakeup: "Laatste wake-up", lastVehicleData: "Laatste voertuiggegevens", lastProbe: "Laatste controle", homeZones: "Thuiszones", wakeupActivity24h: "Wake-upactiviteit · 24 u", restoreNotificationDefaults: "Standaardwaarden herstellen", reachability: "Bereikbaarheid" },
  da: { periodicWakeup: "Periodisk vækning", wakeupInterval: "Vækningsinterval", wakeupsToday: "Vækninger i dag", lastWakeup: "Seneste vækning", lastVehicleData: "Seneste køretøjsdata", lastProbe: "Seneste test", homeZones: "Hjemmezoner", wakeupActivity24h: "Vækningsaktivitet · 24 t", restoreNotificationDefaults: "Gendan standardværdier", reachability: "Tilgængelighed" },
  nb: { periodicWakeup: "Periodisk wake-up", wakeupInterval: "Wake-upintervall", wakeupsToday: "Wake-ups i dag", lastWakeup: "Siste wake-up", lastVehicleData: "Siste kjøretøydata", lastProbe: "Siste test", homeZones: "Hjemmesoner", wakeupActivity24h: "Wake-upaktivitet · 24 t", restoreNotificationDefaults: "Gjenopprett standardverdier", reachability: "Tilgjengelighet" },
  sv: { periodicWakeup: "Periodisk väckning", wakeupInterval: "Väckningsintervall", wakeupsToday: "Väckningar i dag", lastWakeup: "Senaste väckning", lastVehicleData: "Senaste fordonsdata", lastProbe: "Senaste kontroll", homeZones: "Hemzoner", wakeupActivity24h: "Väckningsaktivitet · 24 h", restoreNotificationDefaults: "Återställ standardvärden", reachability: "Tillgänglighet" },
  fi: { periodicWakeup: "Jaksottainen herätys", wakeupInterval: "Herätysväli", wakeupsToday: "Herätykset tänään", lastWakeup: "Viimeisin herätys", lastVehicleData: "Viimeisimmät ajoneuvotiedot", lastProbe: "Viimeisin tarkistus", homeZones: "Kodin alueet", wakeupActivity24h: "Herätysaktiivisuus · 24 h", restoreNotificationDefaults: "Palauta oletusarvot", reachability: "Tavoitettavuus" },
  pl: { periodicWakeup: "Okresowe wybudzanie", wakeupInterval: "Interwał wybudzania", wakeupsToday: "Wybudzenia dzisiaj", lastWakeup: "Ostatnie wybudzenie", lastVehicleData: "Ostatnie dane pojazdu", lastProbe: "Ostatnia próba", homeZones: "Strefy domowe", wakeupActivity24h: "Aktywność wybudzeń · 24 h", restoreNotificationDefaults: "Przywróć domyślne", reachability: "Dostępność" },
  cs: { periodicWakeup: "Pravidelné probuzení", wakeupInterval: "Interval probuzení", wakeupsToday: "Dnešní probuzení", lastWakeup: "Poslední probuzení", lastVehicleData: "Poslední data vozidla", lastProbe: "Poslední test", homeZones: "Domácí zóny", wakeupActivity24h: "Aktivita probuzení · 24 h", restoreNotificationDefaults: "Obnovit výchozí hodnoty", reachability: "Dostupnost" },
  sk: { periodicWakeup: "Pravidelné prebudenie", wakeupInterval: "Interval prebudenia", wakeupsToday: "Dnešné prebudenia", lastWakeup: "Posledné prebudenie", lastVehicleData: "Posledné údaje vozidla", lastProbe: "Posledný test", homeZones: "Domáce zóny", wakeupActivity24h: "Aktivita prebudení · 24 h", restoreNotificationDefaults: "Obnoviť predvolené", reachability: "Dostupnosť" },
  hu: { periodicWakeup: "Időszakos ébresztés", wakeupInterval: "Ébresztési intervallum", wakeupsToday: "Mai ébresztések", lastWakeup: "Utolsó ébresztés", lastVehicleData: "Utolsó járműadatok", lastProbe: "Utolsó próba", homeZones: "Otthoni zónák", wakeupActivity24h: "Ébresztési aktivitás · 24 ó", restoreNotificationDefaults: "Alapértékek visszaállítása", reachability: "Elérhetőség" },
  ro: { periodicWakeup: "Trezire periodică", wakeupInterval: "Interval de trezire", wakeupsToday: "Treziri astăzi", lastWakeup: "Ultima trezire", lastVehicleData: "Ultimele date ale vehiculului", lastProbe: "Ultima verificare", homeZones: "Zone de acasă", wakeupActivity24h: "Activitate de trezire · 24 h", restoreNotificationDefaults: "Restabilește valorile implicite", reachability: "Disponibilitate" },
  sl: { periodicWakeup: "Periodično prebujanje", wakeupInterval: "Interval prebujanja", wakeupsToday: "Današnja prebujanja", lastWakeup: "Zadnje prebujanje", lastVehicleData: "Zadnji podatki vozila", lastProbe: "Zadnje preverjanje", homeZones: "Domače cone", wakeupActivity24h: "Aktivnost prebujanja · 24 h", restoreNotificationDefaults: "Obnovi privzete vrednosti", reachability: "Dosegljivost" },
  hr: { periodicWakeup: "Periodično buđenje", wakeupInterval: "Interval buđenja", wakeupsToday: "Buđenja danas", lastWakeup: "Zadnje buđenje", lastVehicleData: "Zadnji podaci vozila", lastProbe: "Zadnja provjera", homeZones: "Kućne zone", wakeupActivity24h: "Aktivnost buđenja · 24 h", restoreNotificationDefaults: "Vrati zadane vrijednosti", reachability: "Dostupnost" },
};
for (const [language, labels] of Object.entries(NOTIFICATION_WAKEUP_TEXT)) {
  FRONTEND_TEXT.dashboard[language] = {
    ...FRONTEND_TEXT.dashboard.en,
    ...FRONTEND_TEXT.dashboard[language],
    ...labels,
  };
}

// Capability labels are owned by the per-language catalogs.


// Dual-Energy Consumption & reserves labels added for the beta.27 candidate.
// Keep these in the shared dashboard namespace so generated-dashboard surfaces
// inherit the same 18-language parity contract as the rest of the UI.
const CONSUMPTION_RESERVES_TEXT = {
  de: { consumptionReserves: "Reserven & Verbrauch", remainingBatteryEnergy: "Batteriereserve", trailingElectricConsumption: "Ø Strom (500 km)", remainingFuel: "Tankinhalt", trailingFuelConsumption: "Ø Kraftstoff (500 km)" },
  en: { consumptionReserves: "Reserves & consumption", remainingBatteryEnergy: "Battery reserve", trailingElectricConsumption: "Avg. electric (500 km)", remainingFuel: "Fuel remaining", trailingFuelConsumption: "Avg. fuel (500 km)" },
  fr: { consumptionReserves: "Consommation et réserves", remainingBatteryEnergy: "Énergie électrique restante", trailingElectricConsumption: "Consommation électrique moyenne (500 km)", remainingFuel: "Carburant restant", trailingFuelConsumption: "Consommation moyenne de carburant (500 km)" },
  it: { consumptionReserves: "Consumi e riserve", remainingBatteryEnergy: "Energia batteria residua", trailingElectricConsumption: "Consumo elettrico medio (500 km)", remainingFuel: "Carburante residuo", trailingFuelConsumption: "Consumo medio carburante (500 km)" },
  es: { consumptionReserves: "Consumo y reservas", remainingBatteryEnergy: "Energía restante de la batería", trailingElectricConsumption: "Consumo eléctrico medio (500 km)", remainingFuel: "Combustible restante", trailingFuelConsumption: "Consumo medio de combustible (500 km)" },
  pt: { consumptionReserves: "Consumo e reservas", remainingBatteryEnergy: "Energia restante da bateria", trailingElectricConsumption: "Consumo elétrico médio (500 km)", remainingFuel: "Combustível restante", trailingFuelConsumption: "Consumo médio de combustível (500 km)" },
  nl: { consumptionReserves: "Verbruik en reserves", remainingBatteryEnergy: "Resterende batterij-energie", trailingElectricConsumption: "Gemiddeld stroomverbruik (500 km)", remainingFuel: "Resterende brandstof", trailingFuelConsumption: "Gemiddeld brandstofverbruik (500 km)" },
  da: { consumptionReserves: "Forbrug og reserver", remainingBatteryEnergy: "Resterende batterienergi", trailingElectricConsumption: "Gennemsnitligt elforbrug (500 km)", remainingFuel: "Resterende brændstof", trailingFuelConsumption: "Gennemsnitligt brændstofforbrug (500 km)" },
  nb: { consumptionReserves: "Forbruk og reserver", remainingBatteryEnergy: "Gjenværende batterienergi", trailingElectricConsumption: "Gjennomsnittlig strømforbruk (500 km)", remainingFuel: "Gjenværende drivstoff", trailingFuelConsumption: "Gjennomsnittlig drivstofforbruk (500 km)" },
  sv: { consumptionReserves: "Förbrukning och reserver", remainingBatteryEnergy: "Återstående batterienergi", trailingElectricConsumption: "Genomsnittlig elförbrukning (500 km)", remainingFuel: "Återstående bränsle", trailingFuelConsumption: "Genomsnittlig bränsleförbrukning (500 km)" },
  fi: { consumptionReserves: "Kulutus ja varannot", remainingBatteryEnergy: "Akun jäljellä oleva energia", trailingElectricConsumption: "Keskimääräinen sähkönkulutus (500 km)", remainingFuel: "Jäljellä oleva polttoaine", trailingFuelConsumption: "Keskimääräinen polttoaineenkulutus (500 km)" },
  pl: { consumptionReserves: "Zużycie i rezerwy", remainingBatteryEnergy: "Pozostała energia akumulatora", trailingElectricConsumption: "Średnie zużycie energii (500 km)", remainingFuel: "Pozostałe paliwo", trailingFuelConsumption: "Średnie zużycie paliwa (500 km)" },
  cs: { consumptionReserves: "Spotřeba a rezervy", remainingBatteryEnergy: "Zbývající energie baterie", trailingElectricConsumption: "Průměrná spotřeba elektřiny (500 km)", remainingFuel: "Zbývající palivo", trailingFuelConsumption: "Průměrná spotřeba paliva (500 km)" },
  sk: { consumptionReserves: "Spotreba a rezervy", remainingBatteryEnergy: "Zostávajúca energia batérie", trailingElectricConsumption: "Priemerná spotreba elektriny (500 km)", remainingFuel: "Zostávajúce palivo", trailingFuelConsumption: "Priemerná spotreba paliva (500 km)" },
  hu: { consumptionReserves: "Fogyasztás és tartalékok", remainingBatteryEnergy: "Hátralévő akkumulátorenergia", trailingElectricConsumption: "Átlagos villamosenergia-fogyasztás (500 km)", remainingFuel: "Hátralévő üzemanyag", trailingFuelConsumption: "Átlagos üzemanyag-fogyasztás (500 km)" },
  ro: { consumptionReserves: "Consum și rezerve", remainingBatteryEnergy: "Energie rămasă în baterie", trailingElectricConsumption: "Consum electric mediu (500 km)", remainingFuel: "Combustibil rămas", trailingFuelConsumption: "Consum mediu de combustibil (500 km)" },
  sl: { consumptionReserves: "Poraba in rezerve", remainingBatteryEnergy: "Preostala energija baterije", trailingElectricConsumption: "Povprečna poraba elektrike (500 km)", remainingFuel: "Preostalo gorivo", trailingFuelConsumption: "Povprečna poraba goriva (500 km)" },
  hr: { consumptionReserves: "Potrošnja i rezerve", remainingBatteryEnergy: "Preostala energija baterije", trailingElectricConsumption: "Prosječna potrošnja električne energije (500 km)", remainingFuel: "Preostalo gorivo", trailingFuelConsumption: "Prosječna potrošnja goriva (500 km)" },
};
for (const [language, labels] of Object.entries(CONSUMPTION_RESERVES_TEXT)) {
  FRONTEND_TEXT.dashboard[language] = {
    ...FRONTEND_TEXT.dashboard.en,
    ...FRONTEND_TEXT.dashboard[language],
    ...labels,
  };
}



// Trip-history provenance text must match the canonical merge contract. Server
// telemetry remains authoritative; SOC-derived electric energy is a fallback
// only when the server boundary data is internally consistent.
const TRIP_HISTORY_INTRO_TEXT = {
  de: "Abgeschlossene Fahrten stammen aus der Stellantis-Serverhistorie und können älter als 90 Tage sein. Elektrische Energie wird direkt aus der Serverhistorie verwendet, wenn ein belastbarer Wert vorliegt; andernfalls wird sie nur bei konsistenten SOC-Daten geschätzt. Der Kraftstoffverbrauch verwendet die vom Server gelieferten Fahrtdaten. Nicht belastbare Werte werden als **—** angezeigt. Beim Scrollen werden ältere Einträge nachgeladen.",
  en: "Completed trips come from Stellantis server history and can be older than 90 days. Electric energy uses a reliable direct server value when available; otherwise it is estimated from SOC only when the boundary data is consistent. Fuel consumption uses the trip telemetry provided by the server. Unreliable values are shown as **—**. Older entries load as you scroll.",
  fr: "Les trajets terminés proviennent de l’historique serveur Stellantis et peuvent dater de plus de 90 jours. L’énergie électrique utilise une valeur directe fiable du serveur lorsqu’elle est disponible ; sinon, elle n’est estimée à partir du SOC que si les données de début et de fin sont cohérentes. La consommation de carburant utilise la télémétrie du trajet fournie par le serveur. Les valeurs non fiables sont affichées comme **—**. Les entrées plus anciennes se chargent pendant le défilement.",
  it: "I viaggi completati provengono dalla cronologia server Stellantis e possono risalire a più di 90 giorni fa. L’energia elettrica usa un valore diretto affidabile del server quando disponibile; altrimenti viene stimata dal SOC solo se i dati iniziali e finali sono coerenti. Il consumo di carburante usa la telemetria del viaggio fornita dal server. I valori non affidabili sono mostrati come **—**. Le voci più vecchie vengono caricate durante lo scorrimento.",
  es: "Los viajes finalizados proceden del historial del servidor Stellantis y pueden tener más de 90 días. La energía eléctrica usa un valor directo fiable del servidor cuando está disponible; de lo contrario, solo se estima a partir del SOC cuando los datos iniciales y finales son coherentes. El consumo de combustible usa la telemetría del viaje proporcionada por el servidor. Los valores poco fiables se muestran como **—**. Las entradas más antiguas se cargan al desplazarte.",
  pt: "As viagens concluídas vêm do histórico do servidor Stellantis e podem ter mais de 90 dias. A energia elétrica usa um valor direto fiável do servidor quando disponível; caso contrário, só é estimada a partir do SOC quando os dados inicial e final são coerentes. O consumo de combustível usa a telemetria da viagem fornecida pelo servidor. Valores não fiáveis são apresentados como **—**. As entradas mais antigas são carregadas ao deslocar.",
  nl: "Voltooide ritten komen uit de Stellantis-serverhistorie en kunnen ouder zijn dan 90 dagen. Elektrische energie gebruikt een betrouwbare directe serverwaarde wanneer die beschikbaar is; anders wordt ze alleen uit SOC geschat wanneer begin- en eindgegevens consistent zijn. Brandstofverbruik gebruikt de door de server geleverde rittelemetrie. Onbetrouwbare waarden worden als **—** weergegeven. Oudere items worden geladen tijdens het scrollen.",
  da: "Afsluttede ture kommer fra Stellantis-serverhistorikken og kan være ældre end 90 dage. Elektrisk energi bruger en pålidelig direkte serverværdi, når den findes; ellers estimeres den kun ud fra SOC, når start- og slutdata er konsistente. Brændstofforbrug bruger turtelemetri fra serveren. Upålidelige værdier vises som **—**. Ældre poster indlæses under rulning.",
  nb: "Fullførte turer kommer fra Stellantis-serverhistorikken og kan være eldre enn 90 dager. Elektrisk energi bruker en pålitelig direkte serververdi når den finnes; ellers beregnes den fra SOC bare når start- og sluttdata er konsistente. Drivstofforbruk bruker turtelemetri levert av serveren. Upålitelige verdier vises som **—**. Eldre oppføringer lastes mens du ruller.",
  sv: "Slutförda resor kommer från Stellantis serverhistorik och kan vara äldre än 90 dagar. Elektrisk energi använder ett tillförlitligt direkt servervärde när det finns; annars uppskattas den från SOC endast när start- och slutdata är konsekventa. Bränsleförbrukning använder resetelemetri från servern. Otillförlitliga värden visas som **—**. Äldre poster laddas när du rullar.",
  fi: "Päättyneet matkat tulevat Stellantis-palvelinhistoriasta ja voivat olla yli 90 päivää vanhoja. Sähköenergia käyttää luotettavaa suoraa palvelinarvoa, kun sellainen on saatavilla; muulloin se arvioidaan SOC-arvosta vain, jos alku- ja lopputiedot ovat johdonmukaiset. Polttoaineenkulutus käyttää palvelimen toimittamaa matkan telemetriaa. Epäluotettavat arvot näytetään muodossa **—**. Vanhempia rivejä ladataan vieritettäessä.",
  pl: "Zakończone przejazdy pochodzą z historii serwera Stellantis i mogą mieć ponad 90 dni. Energia elektryczna korzysta z wiarygodnej bezpośredniej wartości serwera, gdy jest dostępna; w przeciwnym razie jest szacowana z SOC tylko wtedy, gdy dane początku i końca są spójne. Zużycie paliwa korzysta z telemetrii przejazdu dostarczonej przez serwer. Niewiarygodne wartości są wyświetlane jako **—**. Starsze wpisy są ładowane podczas przewijania.",
  cs: "Dokončené jízdy pocházejí z historie serveru Stellantis a mohou být starší než 90 dní. Elektrická energie používá spolehlivou přímou hodnotu ze serveru, je-li dostupná; jinak se odhaduje ze SOC pouze tehdy, když jsou počáteční a koncová data konzistentní. Spotřeba paliva používá telemetrii jízdy dodanou serverem. Nespolehlivé hodnoty se zobrazují jako **—**. Starší položky se načítají při posouvání.",
  sk: "Dokončené jazdy pochádzajú z histórie servera Stellantis a môžu byť staršie ako 90 dní. Elektrická energia používa spoľahlivú priamu hodnotu zo servera, ak je dostupná; inak sa odhaduje zo SOC iba vtedy, keď sú počiatočné a koncové údaje konzistentné. Spotreba paliva používa telemetriu jazdy dodanú serverom. Nespoľahlivé hodnoty sa zobrazujú ako **—**. Staršie položky sa načítajú pri posúvaní.",
  hu: "A befejezett utak a Stellantis szerverelőzményeiből származnak, és 90 napnál régebbiek is lehetnek. Az elektromos energia megbízható közvetlen szerverértéket használ, ha elérhető; egyébként csak akkor becsüljük SOC alapján, ha a kezdő és záró adatok következetesek. Az üzemanyag-fogyasztás a szerver által biztosított úttelemetriát használja. A nem megbízható értékek **—** formában jelennek meg. Görgetés közben régebbi bejegyzések töltődnek be.",
  ro: "Călătoriile finalizate provin din istoricul serverului Stellantis și pot fi mai vechi de 90 de zile. Energia electrică folosește o valoare directă fiabilă de la server atunci când este disponibilă; altfel este estimată din SOC numai dacă datele de început și sfârșit sunt coerente. Consumul de combustibil folosește telemetria călătoriei furnizată de server. Valorile nesigure sunt afișate ca **—**. Intrările mai vechi se încarcă la derulare.",
  sl: "Zaključene vožnje prihajajo iz zgodovine strežnika Stellantis in so lahko starejše od 90 dni. Električna energija uporablja zanesljivo neposredno vrednost strežnika, kadar je na voljo; sicer se iz SOC oceni le, če so začetni in končni podatki skladni. Poraba goriva uporablja telemetrijo vožnje, ki jo zagotovi strežnik. Nezanesljive vrednosti so prikazane kot **—**. Starejši vnosi se nalagajo med pomikanjem.",
  hr: "Završene vožnje dolaze iz povijesti Stellantis poslužitelja i mogu biti starije od 90 dana. Električna energija koristi pouzdanu izravnu vrijednost poslužitelja kada je dostupna; inače se procjenjuje iz SOC-a samo ako su početni i završni podaci usklađeni. Potrošnja goriva koristi telemetriju vožnje koju daje poslužitelj. Nepouzdane vrijednosti prikazuju se kao **—**. Stariji se zapisi učitavaju tijekom pomicanja.",
};
for (const [language, tripHistoryIntro] of Object.entries(TRIP_HISTORY_INTRO_TEXT)) {
  FRONTEND_TEXT.dashboard[language] = {
    ...FRONTEND_TEXT.dashboard.en,
    ...FRONTEND_TEXT.dashboard[language],
    tripHistoryIntro,
  };
}

// Recorder-backed diagnostics copy is intentionally separate from vehicle
// command semantics. Every supported frontend locale owns the same keys.
const VEHICLE_DIAGNOSTICS_TEXT = {
  de: { title: "Fahrzeugdiagnose", hint: "Schreibgeschützte Recorder-Zustandsänderungen dieses Fahrzeugs. Eine aufgezeichnete Änderung beweist nicht, dass das Fahrzeug online ist.", timeWindow: "Zeitraum", reload: "Neu laden", copy: "Diagnose kopieren", copied: "Kopiert", loading: "Diagnose wird geladen …", error: "Diagnose konnte nicht geladen werden", empty: "Für den Zeitraum sind keine Zustandsänderungen gespeichert.", noSignals: "Für dieses Fahrzeug sind keine Diagnose-Signale zugeordnet.", truncated: "Die Anzeige ist begrenzt; es werden nur die neuesten Ereignisse gezeigt.", rawCodeNotRecorded: "Der rohe Befehls-Ergebniscode wurde nicht aufgezeichnet.", telemetryEvidence: "Fahrzeugzustand aufgezeichnet", sourceTimestamp: "Quellzeit", haTimestamp: "HA-Zeit", currentRefresh: "Aktuelles Aktualisierungsintervall", details: "Zeitstempel-Details", vehicleData: "Fahrzeugdaten", exportTitle: "SV Dashboard Fahrzeugdiagnose", version: "Paketversion", selectedWindow: "Zeitraum", rawResultCode: "Roher Ergebniscode", timeline: "Zeitverlauf", window30m: "30 Min.", window2h: "2 Std.", window6h: "6 Std.", window24h: "24 Std." },
  en: { title: "Vehicle diagnostics", hint: "Read-only Recorder state changes for this vehicle. A recorded change does not prove the vehicle is online.", timeWindow: "Time window", reload: "Reload", copy: "Copy diagnostics", copied: "Copied", loading: "Loading diagnostics …", error: "Could not load diagnostics", empty: "No state changes are recorded for this period.", noSignals: "No diagnostic signals are mapped for this vehicle.", truncated: "The timeline is bounded; only the newest events are shown.", rawCodeNotRecorded: "The raw command result code was not recorded.", telemetryEvidence: "Vehicle state recorded", sourceTimestamp: "Source time", haTimestamp: "HA time", currentRefresh: "Current refresh interval", details: "Timestamp details", vehicleData: "Vehicle data", exportTitle: "SV Dashboard vehicle diagnostics", version: "Package version", selectedWindow: "Time window", rawResultCode: "Raw result code", timeline: "Timeline", window30m: "30 min", window2h: "2 h", window6h: "6 h", window24h: "24 h" },
  fr: { title: "Diagnostic du véhicule", hint: "Changements d’état en lecture seule du Recorder. Un changement enregistré ne prouve pas que le véhicule est en ligne.", timeWindow: "Période", reload: "Actualiser", copy: "Copier le diagnostic", copied: "Copié", loading: "Chargement du diagnostic…", error: "Impossible de charger le diagnostic", empty: "Aucun changement d’état enregistré pour cette période.", noSignals: "Aucun signal de diagnostic n’est associé à ce véhicule.", truncated: "La chronologie est limitée aux événements les plus récents.", rawCodeNotRecorded: "Le code brut du résultat de commande n’a pas été enregistré.", telemetryEvidence: "État du véhicule enregistré", sourceTimestamp: "Heure source", haTimestamp: "Heure HA", currentRefresh: "Intervalle d’actualisation actuel", details: "Détails des horodatages", vehicleData: "Données du véhicule", exportTitle: "Diagnostic du véhicule SV Dashboard", version: "Version du package", selectedWindow: "Période", rawResultCode: "Code brut du résultat", timeline: "Chronologie", window30m: "30 min", window2h: "2 h", window6h: "6 h", window24h: "24 h" },
  it: { title: "Diagnostica veicolo", hint: "Variazioni di stato del Recorder in sola lettura. Una variazione registrata non prova che il veicolo sia online.", timeWindow: "Intervallo", reload: "Ricarica", copy: "Copia diagnostica", copied: "Copiato", loading: "Caricamento diagnostica…", error: "Impossibile caricare la diagnostica", empty: "Nessuna variazione di stato registrata in questo intervallo.", noSignals: "Nessun segnale diagnostico associato al veicolo.", truncated: "La cronologia è limitata agli eventi più recenti.", rawCodeNotRecorded: "Il codice grezzo del risultato del comando non è stato registrato.", telemetryEvidence: "Stato veicolo registrato", sourceTimestamp: "Ora sorgente", haTimestamp: "Ora HA", currentRefresh: "Intervallo di aggiornamento attuale", details: "Dettagli timestamp", vehicleData: "Dati veicolo", exportTitle: "Diagnostica veicolo SV Dashboard", version: "Versione pacchetto", selectedWindow: "Intervallo", rawResultCode: "Codice grezzo risultato", timeline: "Cronologia", window30m: "30 min", window2h: "2 h", window6h: "6 h", window24h: "24 h" },
  es: { title: "Diagnóstico del vehículo", hint: "Cambios de estado del Recorder en solo lectura. Un cambio registrado no demuestra que el vehículo esté conectado.", timeWindow: "Periodo", reload: "Recargar", copy: "Copiar diagnóstico", copied: "Copiado", loading: "Cargando diagnóstico…", error: "No se pudo cargar el diagnóstico", empty: "No hay cambios de estado registrados en este periodo.", noSignals: "No hay señales de diagnóstico asignadas a este vehículo.", truncated: "La cronología está limitada a los eventos más recientes.", rawCodeNotRecorded: "El código bruto del resultado del comando no se registró.", telemetryEvidence: "Estado del vehículo registrado", sourceTimestamp: "Hora de origen", haTimestamp: "Hora de HA", currentRefresh: "Intervalo de actualización actual", details: "Detalles de tiempo", vehicleData: "Datos del vehículo", exportTitle: "Diagnóstico del vehículo SV Dashboard", version: "Versión del paquete", selectedWindow: "Periodo", rawResultCode: "Código bruto del resultado", timeline: "Cronología", window30m: "30 min", window2h: "2 h", window6h: "6 h", window24h: "24 h" },
  pt: { title: "Diagnóstico do veículo", hint: "Alterações de estado do Recorder em modo só de leitura. Uma alteração registada não prova que o veículo esteja online.", timeWindow: "Período", reload: "Atualizar", copy: "Copiar diagnóstico", copied: "Copiado", loading: "A carregar diagnóstico…", error: "Não foi possível carregar o diagnóstico", empty: "Não há alterações de estado registadas neste período.", noSignals: "Não existem sinais de diagnóstico mapeados para este veículo.", truncated: "A cronologia é limitada aos eventos mais recentes.", rawCodeNotRecorded: "O código bruto do resultado do comando não foi registado.", telemetryEvidence: "Estado do veículo registado", sourceTimestamp: "Hora de origem", haTimestamp: "Hora do HA", currentRefresh: "Intervalo de atualização atual", details: "Detalhes da hora", vehicleData: "Dados do veículo", exportTitle: "Diagnóstico do veículo SV Dashboard", version: "Versão do pacote", selectedWindow: "Período", rawResultCode: "Código bruto do resultado", timeline: "Cronologia", window30m: "30 min", window2h: "2 h", window6h: "6 h", window24h: "24 h" },
  nl: { title: "Voertuigdiagnose", hint: "Alleen-lezen Recorder-statuswijzigingen. Een geregistreerde wijziging bewijst niet dat het voertuig online is.", timeWindow: "Periode", reload: "Opnieuw laden", copy: "Diagnose kopiëren", copied: "Gekopieerd", loading: "Diagnose laden…", error: "Diagnose kon niet worden geladen", empty: "Voor deze periode zijn geen statuswijzigingen vastgelegd.", noSignals: "Er zijn geen diagnosesignalen aan dit voertuig gekoppeld.", truncated: "De tijdlijn is begrensd; alleen de nieuwste gebeurtenissen worden getoond.", rawCodeNotRecorded: "De ruwe opdrachtresultaatcode is niet vastgelegd.", telemetryEvidence: "Voertuigstatus vastgelegd", sourceTimestamp: "Brontijd", haTimestamp: "HA-tijd", currentRefresh: "Huidig vernieuwingsinterval", details: "Tijdstempeldetails", vehicleData: "Voertuiggegevens", exportTitle: "SV Dashboard voertuigdiagnose", version: "Pakketversie", selectedWindow: "Periode", rawResultCode: "Ruwe resultaatcode", timeline: "Tijdlijn", window30m: "30 min", window2h: "2 u", window6h: "6 u", window24h: "24 u" },
  da: { title: "Køretøjsdiagnostik", hint: "Skrivebeskyttede Recorder-statusændringer. En registreret ændring beviser ikke, at køretøjet er online.", timeWindow: "Tidsrum", reload: "Genindlæs", copy: "Kopiér diagnostik", copied: "Kopieret", loading: "Indlæser diagnostik …", error: "Diagnostik kunne ikke indlæses", empty: "Der er ingen registrerede statusændringer i dette tidsrum.", noSignals: "Der er ingen diagnostiksignaler knyttet til køretøjet.", truncated: "Tidslinjen er begrænset til de nyeste hændelser.", rawCodeNotRecorded: "Den rå kommanderesultatskode blev ikke registreret.", telemetryEvidence: "Køretøjsstatus registreret", sourceTimestamp: "Kildetid", haTimestamp: "HA-tid", currentRefresh: "Aktuelt opdateringsinterval", details: "Tidsstempeldetaljer", vehicleData: "Køretøjsdata", exportTitle: "SV Dashboard køretøjsdiagnostik", version: "Pakkeversion", selectedWindow: "Tidsrum", rawResultCode: "Rå resultatkode", timeline: "Tidslinje", window30m: "30 min", window2h: "2 t", window6h: "6 t", window24h: "24 t" },
  nb: { title: "Kjøretøydiagnostikk", hint: "Skrivebeskyttede Recorder-statusendringer. En registrert endring beviser ikke at kjøretøyet er tilkoblet.", timeWindow: "Tidsrom", reload: "Last inn på nytt", copy: "Kopier diagnostikk", copied: "Kopiert", loading: "Laster diagnostikk …", error: "Kunne ikke laste diagnostikk", empty: "Ingen statusendringer er registrert i dette tidsrommet.", noSignals: "Ingen diagnostikksignaler er tilordnet kjøretøyet.", truncated: "Tidslinjen er avgrenset til de nyeste hendelsene.", rawCodeNotRecorded: "Rå resultatkode for kommandoen ble ikke registrert.", telemetryEvidence: "Kjøretøystatus registrert", sourceTimestamp: "Kildetid", haTimestamp: "HA-tid", currentRefresh: "Gjeldende oppdateringsintervall", details: "Tidsstempeldetaljer", vehicleData: "Kjøretøydata", exportTitle: "SV Dashboard kjøretøydiagnostikk", version: "Pakkeversjon", selectedWindow: "Tidsrom", rawResultCode: "Rå resultatkode", timeline: "Tidslinje", window30m: "30 min", window2h: "2 t", window6h: "6 t", window24h: "24 t" },
  sv: { title: "Fordonsdiagnostik", hint: "Skrivskyddade Recorder-statusändringar. En registrerad ändring bevisar inte att fordonet är online.", timeWindow: "Tidsperiod", reload: "Läs in igen", copy: "Kopiera diagnostik", copied: "Kopierat", loading: "Läser in diagnostik …", error: "Det gick inte att läsa in diagnostiken", empty: "Inga statusändringar har registrerats under perioden.", noSignals: "Inga diagnostiksignaler är kopplade till fordonet.", truncated: "Tidslinjen är begränsad till de senaste händelserna.", rawCodeNotRecorded: "Den råa kommandosvarskoden registrerades inte.", telemetryEvidence: "Fordonsstatus registrerad", sourceTimestamp: "Källtid", haTimestamp: "HA-tid", currentRefresh: "Aktuellt uppdateringsintervall", details: "Tidsstämpeldetaljer", vehicleData: "Fordonsdata", exportTitle: "SV Dashboard fordonsdiagnostik", version: "Paketversion", selectedWindow: "Tidsperiod", rawResultCode: "Rå svarskod", timeline: "Tidslinje", window30m: "30 min", window2h: "2 tim", window6h: "6 tim", window24h: "24 tim" },
  fi: { title: "Ajoneuvon diagnostiikka", hint: "Vain luettavat Recorder-tilamuutokset. Tallennettu muutos ei todista, että ajoneuvo on verkossa.", timeWindow: "Aikaväli", reload: "Lataa uudelleen", copy: "Kopioi diagnostiikka", copied: "Kopioitu", loading: "Ladataan diagnostiikkaa …", error: "Diagnostiikkaa ei voitu ladata", empty: "Tältä aikaväliltä ei ole tallennettu tilamuutoksia.", noSignals: "Ajoneuvolle ei ole määritetty diagnostiikkasignaaleja.", truncated: "Aikajana on rajattu; vain uusimmat tapahtumat näytetään.", rawCodeNotRecorded: "Komennon raakaa tuloskoodia ei tallennettu.", telemetryEvidence: "Ajoneuvon tila tallennettu", sourceTimestamp: "Lähteen aika", haTimestamp: "HA:n aika", currentRefresh: "Nykyinen päivitysväli", details: "Aikaleiman tiedot", vehicleData: "Ajoneuvon tiedot", exportTitle: "SV Dashboard -ajoneuvodiagnostiikka", version: "Paketin versio", selectedWindow: "Aikaväli", rawResultCode: "Raaka tuloskoodi", timeline: "Aikajana", window30m: "30 min", window2h: "2 h", window6h: "6 h", window24h: "24 h" },
  pl: { title: "Diagnostyka pojazdu", hint: "Tylko do odczytu zmiany stanu w Recorderze. Zarejestrowana zmiana nie dowodzi, że pojazd jest online.", timeWindow: "Zakres czasu", reload: "Odśwież", copy: "Kopiuj diagnostykę", copied: "Skopiowano", loading: "Wczytywanie diagnostyki…", error: "Nie udało się wczytać diagnostyki", empty: "W tym okresie nie zapisano zmian stanu.", noSignals: "Nie przypisano sygnałów diagnostycznych do tego pojazdu.", truncated: "Oś czasu jest ograniczona; pokazano tylko najnowsze zdarzenia.", rawCodeNotRecorded: "Surowy kod wyniku polecenia nie został zapisany.", telemetryEvidence: "Zapisano stan pojazdu", sourceTimestamp: "Czas źródłowy", haTimestamp: "Czas HA", currentRefresh: "Bieżący interwał odświeżania", details: "Szczegóły znacznika czasu", vehicleData: "Dane pojazdu", exportTitle: "Diagnostyka pojazdu SV Dashboard", version: "Wersja pakietu", selectedWindow: "Zakres czasu", rawResultCode: "Surowy kod wyniku", timeline: "Oś czasu", window30m: "30 min", window2h: "2 godz.", window6h: "6 godz.", window24h: "24 godz." },
  cs: { title: "Diagnostika vozidla", hint: "Pouze ke čtení: změny stavů v Recorderu. Zaznamenaná změna nedokazuje, že je vozidlo online.", timeWindow: "Časové období", reload: "Načíst znovu", copy: "Kopírovat diagnostiku", copied: "Zkopírováno", loading: "Načítání diagnostiky…", error: "Diagnostiku se nepodařilo načíst", empty: "V tomto období nejsou zaznamenány žádné změny stavu.", noSignals: "Pro toto vozidlo nejsou namapovány diagnostické signály.", truncated: "Časová osa je omezená; zobrazují se jen nejnovější události.", rawCodeNotRecorded: "Surový kód výsledku příkazu nebyl zaznamenán.", telemetryEvidence: "Změna stavu vozidla zaznamenána", sourceTimestamp: "Čas zdroje", haTimestamp: "Čas HA", currentRefresh: "Aktuální interval aktualizace", details: "Podrobnosti časového razítka", vehicleData: "Data vozidla", exportTitle: "Diagnostika vozidla SV Dashboard", version: "Verze balíčku", selectedWindow: "Časové období", rawResultCode: "Surový kód výsledku", timeline: "Časová osa", window30m: "30 min", window2h: "2 h", window6h: "6 h", window24h: "24 h" },
  sk: { title: "Diagnostika vozidla", hint: "Zmeny stavu v Recordere iba na čítanie. Zaznamenaná zmena nedokazuje, že je vozidlo online.", timeWindow: "Časové obdobie", reload: "Znova načítať", copy: "Kopírovať diagnostiku", copied: "Skopírované", loading: "Načítava sa diagnostika…", error: "Diagnostiku sa nepodarilo načítať", empty: "V tomto období nie sú zaznamenané žiadne zmeny stavu.", noSignals: "Pre toto vozidlo nie sú namapované diagnostické signály.", truncated: "Časová os je obmedzená; zobrazujú sa iba najnovšie udalosti.", rawCodeNotRecorded: "Surový kód výsledku príkazu nebol zaznamenaný.", telemetryEvidence: "Zmena stavu vozidla zaznamenaná", sourceTimestamp: "Čas zdroja", haTimestamp: "Čas HA", currentRefresh: "Aktuálny interval aktualizácie", details: "Podrobnosti časovej pečiatky", vehicleData: "Údaje vozidla", exportTitle: "Diagnostika vozidla SV Dashboard", version: "Verzia balíka", selectedWindow: "Časové obdobie", rawResultCode: "Surový kód výsledku", timeline: "Časová os", window30m: "30 min", window2h: "2 h", window6h: "6 h", window24h: "24 h" },
  hu: { title: "Járműdiagnosztika", hint: "Csak olvasható Recorder-állapotváltozások. A rögzített változás nem bizonyítja, hogy a jármű online.", timeWindow: "Időszak", reload: "Újratöltés", copy: "Diagnosztika másolása", copied: "Másolva", loading: "Diagnosztika betöltése…", error: "A diagnosztika nem tölthető be", empty: "Ebben az időszakban nincs rögzített állapotváltozás.", noSignals: "Ehhez a járműhöz nincs diagnosztikai jel hozzárendelve.", truncated: "Az idővonal korlátozott; csak a legújabb események láthatók.", rawCodeNotRecorded: "A parancs nyers eredménykódja nem lett rögzítve.", telemetryEvidence: "Járműállapot rögzítve", sourceTimestamp: "Forrás ideje", haTimestamp: "HA ideje", currentRefresh: "Aktuális frissítési időköz", details: "Időbélyeg részletei", vehicleData: "Járműadatok", exportTitle: "SV Dashboard járműdiagnosztika", version: "Csomagverzió", selectedWindow: "Időszak", rawResultCode: "Nyers eredménykód", timeline: "Idővonal", window30m: "30 perc", window2h: "2 óra", window6h: "6 óra", window24h: "24 óra" },
  ro: { title: "Diagnosticare vehicul", hint: "Modificări de stare Recorder doar pentru citire. O modificare înregistrată nu dovedește că vehiculul este online.", timeWindow: "Interval", reload: "Reîncarcă", copy: "Copiază diagnosticul", copied: "Copiat", loading: "Se încarcă diagnosticul…", error: "Diagnosticul nu a putut fi încărcat", empty: "Nu sunt înregistrate modificări de stare pentru acest interval.", noSignals: "Nu există semnale de diagnostic mapate pentru acest vehicul.", truncated: "Cronologia este limitată la cele mai noi evenimente.", rawCodeNotRecorded: "Codul brut al rezultatului comenzii nu a fost înregistrat.", telemetryEvidence: "Stare vehicul înregistrată", sourceTimestamp: "Ora sursei", haTimestamp: "Ora HA", currentRefresh: "Interval actual de actualizare", details: "Detalii marcaj temporal", vehicleData: "Date vehicul", exportTitle: "Diagnosticare vehicul SV Dashboard", version: "Versiunea pachetului", selectedWindow: "Interval", rawResultCode: "Cod brut rezultat", timeline: "Cronologie", window30m: "30 min", window2h: "2 h", window6h: "6 h", window24h: "24 h" },
  sl: { title: "Diagnostika vozila", hint: "Spremembe stanja v Recorderju samo za branje. Zabeležena sprememba ne dokazuje, da je vozilo povezano.", timeWindow: "Časovno obdobje", reload: "Znova naloži", copy: "Kopiraj diagnostiko", copied: "Kopirano", loading: "Nalaganje diagnostike …", error: "Diagnostike ni bilo mogoče naložiti", empty: "Za to obdobje ni zabeleženih sprememb stanja.", noSignals: "Za to vozilo niso preslikani diagnostični signali.", truncated: "Časovnica je omejena na najnovejše dogodke.", rawCodeNotRecorded: "Surova koda rezultata ukaza ni bila zabeležena.", telemetryEvidence: "Stanje vozila zabeleženo", sourceTimestamp: "Čas vira", haTimestamp: "Čas HA", currentRefresh: "Trenutni interval posodabljanja", details: "Podrobnosti časovnega žiga", vehicleData: "Podatki vozila", exportTitle: "Diagnostika vozila SV Dashboard", version: "Različica paketa", selectedWindow: "Časovno obdobje", rawResultCode: "Surova koda rezultata", timeline: "Časovnica", window30m: "30 min", window2h: "2 h", window6h: "6 h", window24h: "24 h" },
  hr: { title: "Dijagnostika vozila", hint: "Promjene stanja Recordera samo za čitanje. Zabilježena promjena ne dokazuje da je vozilo povezano.", timeWindow: "Razdoblje", reload: "Ponovno učitaj", copy: "Kopiraj dijagnostiku", copied: "Kopirano", loading: "Učitavanje dijagnostike…", error: "Dijagnostiku nije moguće učitati", empty: "U ovom razdoblju nema zabilježenih promjena stanja.", noSignals: "Za ovo vozilo nisu mapirani dijagnostički signali.", truncated: "Vremenska je crta ograničena na najnovije događaje.", rawCodeNotRecorded: "Sirovi kod rezultata naredbe nije zabilježen.", telemetryEvidence: "Stanje vozila zabilježeno", sourceTimestamp: "Vrijeme izvora", haTimestamp: "HA vrijeme", currentRefresh: "Trenutačni interval osvježavanja", details: "Pojedinosti vremenske oznake", vehicleData: "Podaci o vozilu", exportTitle: "Dijagnostika vozila SV Dashboard", version: "Verzija paketa", selectedWindow: "Razdoblje", rawResultCode: "Sirovi kod rezultata", timeline: "Vremenska crta", window30m: "30 min", window2h: "2 h", window6h: "6 h", window24h: "24 h" },
};

FRONTEND_TEXT.vehicleDiagnostics = { en: VEHICLE_DIAGNOSTICS_TEXT.en };
for (const [language, labels] of Object.entries(VEHICLE_DIAGNOSTICS_TEXT)) {
  FRONTEND_TEXT.vehicleDiagnostics[language] = {
    ...FRONTEND_TEXT.vehicleDiagnostics.en,
    ...labels,
  };
}

const PACKAGE_LOAD_LABELS = {
  "de": "SV-Module konnten nicht geladen werden. Browser neu laden und Ressourcen prüfen.",
  "en": "SV modules could not load. Reload the browser and check resources.",
  "fr": "Impossible de charger les modules SV. Rechargez le navigateur et vérifiez les ressources.",
  "it": "Impossibile caricare i moduli SV. Ricaricare il browser e verificare le risorse.",
  "es": "No se pudieron cargar los módulos SV. Recargue el navegador y revise los recursos.",
  "pt": "Não foi possível carregar os módulos SV. Recarregue o navegador e verifique os recursos.",
  "nl": "SV-modules konden niet worden geladen. Herlaad de browser en controleer de bronnen.",
  "da": "SV-moduler kunne ikke indlæses. Genindlæs browseren og kontrollér ressourcerne.",
  "nb": "SV-moduler kunne ikke lastes. Last nettleseren på nytt og sjekk ressursene.",
  "sv": "SV-moduler kunde inte laddas. Ladda om webbläsaren och kontrollera resurserna.",
  "fi": "SV-moduulien lataus epäonnistui. Lataa selain uudelleen ja tarkista resurssit.",
  "pl": "Nie można załadować modułów SV. Odśwież przeglądarkę i sprawdź zasoby.",
  "cs": "Moduly SV nelze načíst. Obnovte prohlížeč a zkontrolujte zdroje.",
  "sk": "Moduly SV sa nepodarilo načítať. Obnovte prehliadač a skontrolujte zdroje.",
  "hu": "Az SV-modulok nem tölthetők be. Frissítse a böngészőt és ellenőrizze az erőforrásokat.",
  "ro": "Modulele SV nu s-au putut încărca. Reîncărcați browserul și verificați resursele.",
  "sl": "Modulov SV ni bilo mogoče naložiti. Osvežite brskalnik in preverite vire.",
  "hr": "SV moduli nisu učitani. Osvježite preglednik i provjerite resurse."
};
for (const [language, label] of Object.entries(PACKAGE_LOAD_LABELS)) {
  FRONTEND_TEXT.dashboard[language].packageLoadFailed = label;
}

const MONTHLY_STATISTICS_TEXT = {
  "de": [
    "Durchschnittsverbrauch pro Monat",
    "Außentemperatur bei Fahrten",
    "Streckenabdeckung",
    "Temperaturabdeckung (Fahrzeit)",
    "Geschätzte Energie",
    "Keine auswertbaren Monatsdaten.",
    "Verbrauch: nach Strecke gewichtet, nur belegte positive Energie. Temperatur: nach verfügbarer Fahrzeit gewichtete HA-Beobachtungen, keine Akkutemperatur. Randmonate und Datenabdeckung können unvollständig sein.",
    "Monatsdetails",
    "Warum steigt der Verbrauch im Winter?",
    "Beim Opel Frontera Electric 44 kWh wurde ein zusätzlicher Verbrauch von etwa 5 kW während der ersten 10–20 Minuten bis ca. 5 °C Akkutemperatur beobachtet. Eine Akkuheizung ist eine plausible, aber nicht bestätigte Erklärung. Die Schwelle betrifft den Akku, nicht die Außenluft. Auch Innenraumheizung, Reifen und Kälte beeinflussen den Verbrauch.",
    "Beispielrechnung",
    "Nutzerbericht"
  ],
  "en": [
    "Monthly average consumption",
    "Ambient temperature during trips",
    "Distance coverage",
    "Temperature coverage (driving time)",
    "Estimated energy",
    "No usable monthly data.",
    "Consumption: distance-weighted, qualified positive energy only. Temperature: HA observations weighted by covered driving time, not battery temperature. Edge months and data coverage may be incomplete.",
    "Monthly details",
    "Why does consumption rise in winter?",
    "An Opel Frontera Electric 44 kWh owner observed about 5 kW of extra power for the first 10–20 minutes until battery temperature reached around 5 °C. Battery heating is plausible but unconfirmed; the threshold refers to the battery, not ambient air. Cabin heating, tyres and cold also affect consumption.",
    "Example calculation",
    "Owner report"
  ],
  "fr": [
    "Consommation moyenne mensuelle",
    "Température extérieure en trajet",
    "Couverture des distances",
    "Couverture température (temps de trajet)",
    "Énergie estimée",
    "Aucune donnée mensuelle exploitable.",
    "Consommation pondérée par la distance, énergie positive documentée uniquement. Température : observations HA pondérées par le temps de trajet couvert, pas la température de la batterie. Mois limites et couverture potentiellement incomplets.",
    "Détails mensuels",
    "Pourquoi la consommation augmente-t-elle en hiver ?",
    "Sur un Opel Frontera Electric 44 kWh, un propriétaire a observé environ 5 kW supplémentaires pendant les 10 à 20 premières minutes, jusqu'à environ 5 °C dans la batterie. Le chauffage de la batterie est plausible mais non confirmé ; le seuil concerne la batterie, pas l'air extérieur. Chauffage de l'habitacle, pneus et froid jouent aussi un rôle.",
    "Exemple de calcul",
    "Retour d'utilisateur"
  ],
  "it": [
    "Consumo medio mensile",
    "Temperatura esterna durante i viaggi",
    "Copertura delle distanze",
    "Copertura temperatura (tempo di viaggio)",
    "Energia stimata",
    "Nessun dato mensile utilizzabile.",
    "Consumo ponderato per distanza, solo energia positiva documentata. Temperatura: osservazioni HA ponderate per tempo di viaggio coperto, non temperatura della batteria. Mesi iniziali/finali e copertura possono essere incompleti.",
    "Dettagli mensili",
    "Perché aumenta il consumo in inverno?",
    "Su una Opel Frontera Electric 44 kWh un proprietario ha osservato circa 5 kW aggiuntivi nei primi 10–20 minuti, fino a circa 5 °C della batteria. Il riscaldamento della batteria è plausibile ma non confermato; la soglia riguarda la batteria, non l'aria esterna. Anche riscaldamento dell'abitacolo, pneumatici e freddo incidono.",
    "Esempio di calcolo",
    "Segnalazione utente"
  ],
  "es": [
    "Consumo medio mensual",
    "Temperatura exterior durante los viajes",
    "Cobertura de distancia",
    "Cobertura de temperatura (tiempo de viaje)",
    "Energía estimada",
    "No hay datos mensuales utilizables.",
    "Consumo ponderado por distancia, solo energía positiva documentada. Temperatura: observaciones de HA ponderadas por tiempo de conducción cubierto, no temperatura de batería. Los meses extremos y la cobertura pueden ser incompletos.",
    "Detalles mensuales",
    "¿Por qué aumenta el consumo en invierno?",
    "Un propietario de un Opel Frontera Electric 44 kWh observó unos 5 kW adicionales durante los primeros 10–20 minutos, hasta unos 5 °C de batería. La calefacción de batería es plausible pero no está confirmada; el umbral se refiere a la batería, no al aire exterior. También influyen la calefacción del habitáculo, los neumáticos y el frío.",
    "Ejemplo de cálculo",
    "Informe de usuario"
  ],
  "pt": [
    "Consumo médio mensal",
    "Temperatura exterior durante viagens",
    "Cobertura de distância",
    "Cobertura de temperatura (tempo de viagem)",
    "Energia estimada",
    "Sem dados mensais utilizáveis.",
    "Consumo ponderado pela distância, apenas energia positiva documentada. Temperatura: observações HA ponderadas pelo tempo de viagem coberto, não temperatura da bateria. Meses extremos e cobertura podem estar incompletos.",
    "Detalhes mensais",
    "Por que aumenta o consumo no inverno?",
    "Um proprietário de um Opel Frontera Electric 44 kWh observou cerca de 5 kW adicionais nos primeiros 10–20 minutos, até cerca de 5 °C na bateria. O aquecimento da bateria é plausível, mas não confirmado; o limiar refere-se à bateria, não ao ar exterior. O aquecimento do habitáculo, pneus e frio também influenciam.",
    "Exemplo de cálculo",
    "Relato de utilizador"
  ],
  "nl": [
    "Gemiddeld verbruik per maand",
    "Buitentemperatuur tijdens ritten",
    "Afstandsdekking",
    "Temperatuurdekking (rijtijd)",
    "Geschatte energie",
    "Geen bruikbare maandgegevens.",
    "Verbruik gewogen naar afstand, alleen gedocumenteerde positieve energie. Temperatuur: HA-waarnemingen gewogen naar gedekte rijtijd, geen accutemperatuur. Randmaanden en dekking kunnen onvolledig zijn.",
    "Maanddetails",
    "Waarom stijgt het verbruik in de winter?",
    "Een eigenaar van een Opel Frontera Electric 44 kWh zag circa 5 kW extra gedurende de eerste 10–20 minuten, tot de accu ongeveer 5 °C bereikte. Accuverwarming is aannemelijk maar niet bevestigd; de grens betreft de accu, niet de buitenlucht. Ook interieurverwarming, banden en kou spelen mee.",
    "Rekenvoorbeeld",
    "Gebruikersverslag"
  ],
  "da": [
    "Gennemsnitligt forbrug pr. måned",
    "Udetemperatur under ture",
    "Afstandsdækning",
    "Temperaturdækning (køretid)",
    "Estimeret energi",
    "Ingen brugbare månedsdata.",
    "Forbrug vægtet efter afstand, kun dokumenteret positiv energi. Temperatur: HA-observationer vægtet efter dækket køretid, ikke batteritemperatur. Randmåneder og dækning kan være ufuldstændige.",
    "Månedsdetaljer",
    "Hvorfor stiger forbruget om vinteren?",
    "En ejer af en Opel Frontera Electric 44 kWh observerede ca. 5 kW ekstra de første 10–20 minutter, indtil batteriet nåede ca. 5 °C. Batteriopvarmning er plausibel, men ubekræftet; grænsen gælder batteriet, ikke udeluften. Kabinevarme, dæk og kulde påvirker også forbruget.",
    "Regneeksempel",
    "Brugerrapport"
  ],
  "nb": [
    "Gjennomsnittlig forbruk per måned",
    "Utetemperatur under turer",
    "Avstandsdekning",
    "Temperaturdekning (kjøretid)",
    "Estimert energi",
    "Ingen brukbare månedsdata.",
    "Forbruk vektet etter avstand, kun dokumentert positiv energi. Temperatur: HA-observasjoner vektet etter dekket kjøretid, ikke batteritemperatur. Randmåneder og dekning kan være ufullstendige.",
    "Månedsdetaljer",
    "Hvorfor stiger forbruket om vinteren?",
    "En eier av Opel Frontera Electric 44 kWh observerte ca. 5 kW ekstra de første 10–20 minuttene, til batteriet nådde ca. 5 °C. Batterioppvarming er plausibel, men ubekreftet; grensen gjelder batteriet, ikke uteluften. Kupévarme, dekk og kulde påvirker også forbruket.",
    "Regneeksempel",
    "Brukerrapport"
  ],
  "sv": [
    "Genomsnittlig förbrukning per månad",
    "Utetemperatur under resor",
    "Sträcktäckning",
    "Temperaturtäckning (körtid)",
    "Uppskattad energi",
    "Inga användbara månadsdata.",
    "Förbrukning viktad efter sträcka, endast dokumenterad positiv energi. Temperatur: HA-observationer viktade efter täckt körtid, inte batteritemperatur. Randmånader och täckning kan vara ofullständiga.",
    "Månadsdetaljer",
    "Varför ökar förbrukningen på vintern?",
    "En ägare till Opel Frontera Electric 44 kWh observerade cirka 5 kW extra de första 10–20 minuterna, tills batteriet nådde cirka 5 °C. Batterivärmning är plausibel men obekräftad; gränsen gäller batteriet, inte uteluften. Kupévärme, däck och kyla påverkar också.",
    "Räkneexempel",
    "Användarrapport"
  ],
  "fi": [
    "Keskikulutus kuukaudessa",
    "Ulkolämpötila ajon aikana",
    "Matkan kattavuus",
    "Lämpötilan kattavuus (ajoaika)",
    "Arvioitu energia",
    "Ei käyttökelpoisia kuukausitietoja.",
    "Kulutus painotettu matkan mukaan, vain dokumentoitu positiivinen energia. Lämpötila: HA-havainnot painotettu katetulla ajoajalla, ei akun lämpötila. Reunakuukaudet ja kattavuus voivat olla puutteellisia.",
    "Kuukausitiedot",
    "Miksi kulutus kasvaa talvella?",
    "Opel Frontera Electric 44 kWh:n omistaja havaitsi noin 5 kW lisätehoa ensimmäiset 10–20 minuuttia, kunnes akku saavutti noin 5 °C. Akun lämmitys on mahdollinen mutta vahvistamaton selitys; raja koskee akkua, ei ulkoilmaa. Myös sisätilan lämmitys, renkaat ja kylmyys vaikuttavat.",
    "Laskuesimerkki",
    "Käyttäjäraportti"
  ],
  "pl": [
    "Średnie zużycie miesięczne",
    "Temperatura zewnętrzna podczas jazdy",
    "Pokrycie dystansu",
    "Pokrycie temperatury (czas jazdy)",
    "Szacowana energia",
    "Brak użytecznych danych miesięcznych.",
    "Zużycie ważone dystansem, tylko udokumentowana dodatnia energia. Temperatura: obserwacje HA ważone pokrytym czasem jazdy, nie temperatura akumulatora. Skrajne miesiące i pokrycie mogą być niepełne.",
    "Szczegóły miesięczne",
    "Dlaczego zużycie rośnie zimą?",
    "Właściciel Opla Frontera Electric 44 kWh zaobserwował około 5 kW dodatkowej mocy przez pierwsze 10–20 minut, aż akumulator osiągnął około 5 °C. Ogrzewanie akumulatora jest możliwe, ale niepotwierdzone; próg dotyczy akumulatora, nie powietrza. Ogrzewanie kabiny, opony i zimno również wpływają na zużycie.",
    "Przykład obliczenia",
    "Relacja użytkownika"
  ],
  "cs": [
    "Průměrná měsíční spotřeba",
    "Venkovní teplota během jízd",
    "Pokrytí vzdálenosti",
    "Pokrytí teploty (doba jízdy)",
    "Odhadovaná energie",
    "Žádná použitelná měsíční data.",
    "Spotřeba vážená vzdáleností, pouze doložená kladná energie. Teplota: pozorování HA vážená pokrytou dobou jízdy, nikoli teplota baterie. Okrajové měsíce a pokrytí mohou být neúplné.",
    "Měsíční podrobnosti",
    "Proč spotřeba v zimě roste?",
    "Majitel vozu Opel Frontera Electric 44 kWh pozoroval asi 5 kW navíc prvních 10–20 minut, dokud baterie nedosáhla asi 5 °C. Ohřev baterie je možný, ale nepotvrzený; hranice se týká baterie, nikoli venkovního vzduchu. Vliv má také vytápění kabiny, pneumatiky a chlad.",
    "Příklad výpočtu",
    "Zpráva uživatele"
  ],
  "sk": [
    "Priemerná mesačná spotreba",
    "Vonkajšia teplota počas jázd",
    "Pokrytie vzdialenosti",
    "Pokrytie teploty (čas jazdy)",
    "Odhadovaná energia",
    "Žiadne použiteľné mesačné údaje.",
    "Spotreba vážená vzdialenosťou, len doložená kladná energia. Teplota: pozorovania HA vážené pokrytým časom jazdy, nie teplota batérie. Okrajové mesiace a pokrytie môžu byť neúplné.",
    "Mesačné podrobnosti",
    "Prečo spotreba v zime rastie?",
    "Majiteľ Opel Frontera Electric 44 kWh pozoroval približne 5 kW navyše počas prvých 10–20 minút, kým batéria dosiahla asi 5 °C. Ohrev batérie je možný, no nepotvrdený; hranica sa týka batérie, nie vonkajšieho vzduchu. Vplyv má aj kúrenie kabíny, pneumatiky a chlad.",
    "Príklad výpočtu",
    "Správa používateľa"
  ],
  "hu": [
    "Havi átlagfogyasztás",
    "Külső hőmérséklet menet közben",
    "Távolságlefedettség",
    "Hőmérséklet-lefedettség (menetidő)",
    "Becsült energia",
    "Nincs használható havi adat.",
    "Távolsággal súlyozott fogyasztás, csak dokumentált pozitív energia. Hőmérséklet: a lefedett menetidővel súlyozott HA-megfigyelések, nem az akkumulátor hőmérséklete. A szélső hónapok és a lefedettség hiányos lehet.",
    "Havi részletek",
    "Miért nő a fogyasztás télen?",
    "Egy Opel Frontera Electric 44 kWh tulajdonosa az első 10–20 percben körülbelül 5 kW többletet figyelt meg, amíg az akkumulátor elérte a kb. 5 °C-ot. Az akkumulátorfűtés lehetséges, de nem igazolt; a határ az akkumulátorra, nem a külső levegőre vonatkozik. Az utastér fűtése, a gumik és a hideg is befolyásolják a fogyasztást.",
    "Számítási példa",
    "Felhasználói beszámoló"
  ],
  "ro": [
    "Consum mediu lunar",
    "Temperatura exterioară în timpul deplasărilor",
    "Acoperirea distanței",
    "Acoperirea temperaturii (durata deplasării)",
    "Energie estimată",
    "Nu există date lunare utilizabile.",
    "Consum ponderat după distanță, doar energie pozitivă documentată. Temperatură: observații HA ponderate după timpul de deplasare acoperit, nu temperatura bateriei. Lunile de la capete și acoperirea pot fi incomplete.",
    "Detalii lunare",
    "De ce crește consumul iarna?",
    "Un proprietar de Opel Frontera Electric 44 kWh a observat aproximativ 5 kW suplimentari în primele 10–20 minute, până când bateria a ajuns la circa 5 °C. Încălzirea bateriei este plauzibilă, dar neconfirmată; pragul se referă la baterie, nu la aerul exterior. Încălzirea habitaclului, anvelopele și frigul influențează și ele consumul.",
    "Exemplu de calcul",
    "Raport de utilizator"
  ],
  "sl": [
    "Povprečna mesečna poraba",
    "Zunanja temperatura med vožnjami",
    "Pokritost razdalje",
    "Pokritost temperature (čas vožnje)",
    "Ocenjena energija",
    "Ni uporabnih mesečnih podatkov.",
    "Poraba utežena z razdaljo, samo dokumentirana pozitivna energija. Temperatura: opazovanja HA utežena s pokritim časom vožnje, ne temperatura baterije. Robni meseci in pokritost so lahko nepopolni.",
    "Mesečne podrobnosti",
    "Zakaj poraba pozimi naraste?",
    "Lastnik Opel Frontera Electric 44 kWh je opazil približno 5 kW dodatne moči prvih 10–20 minut, dokler baterija ni dosegla okoli 5 °C. Ogrevanje baterije je verjetno, a nepotrjeno; prag velja za baterijo, ne zunanji zrak. Vplivajo tudi ogrevanje kabine, pnevmatike in mraz.",
    "Primer izračuna",
    "Poročilo uporabnika"
  ],
  "hr": [
    "Prosječna mjesečna potrošnja",
    "Vanjska temperatura tijekom vožnji",
    "Pokrivenost udaljenosti",
    "Pokrivenost temperature (vrijeme vožnje)",
    "Procijenjena energija",
    "Nema upotrebljivih mjesečnih podataka.",
    "Potrošnja ponderirana udaljenošću, samo dokumentirana pozitivna energija. Temperatura: opažanja HA ponderirana pokrivenim vremenom vožnje, ne temperatura baterije. Rubni mjeseci i pokrivenost mogu biti nepotpuni.",
    "Mjesečni detalji",
    "Zašto potrošnja raste zimi?",
    "Vlasnik Opel Frontera Electric 44 kWh primijetio je oko 5 kW dodatne snage prvih 10–20 minuta, dok baterija nije dosegnula oko 5 °C. Grijanje baterije je moguće, ali nepotvrđeno; prag se odnosi na bateriju, ne vanjski zrak. Grijanje kabine, gume i hladnoća također utječu.",
    "Primjer izračuna",
    "Izvješće korisnika"
  ]
};
for (const [language, labels] of Object.entries(MONTHLY_STATISTICS_TEXT)) {
  const keys = ["monthlyConsumptionTitle","monthlyAmbient","monthlyEnergyCoverage","monthlyTemperatureCoverage","monthlyEstimatedShare","monthlyNoData","monthlyMethod","monthlyDetails","monthlyWinterTitle","monthlyWinterText","monthlyExample","monthlySource"];
  Object.assign(FRONTEND_TEXT.dashboard[language], Object.fromEntries(keys.map((key, index) => [key, labels[index]])));
}

export { FRONTEND_TEXT, languageFor, localeFor, textFor };

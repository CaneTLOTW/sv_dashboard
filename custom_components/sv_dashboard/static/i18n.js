/* Runtime composition layer for the bundled Lovelace localisation catalogs.
 *
 * Keep the established DE/EN/FR + base extra-language catalog in i18n-core.js,
 * then overlay the reviewed advanced completion catalogs. Browser-facing imports use explicit content cache keys; the changed core catalog is cache-busted for beta.15.
 */
import {
  FRONTEND_TEXT,
  languageFor,
  localeFor,
  textFor,
} from "./i18n-core.js?v=0.6.0-beta.17";
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
  de: { consumptionReserves: "Verbrauch & Reserven", electricReserve: "Elektrisch · verbleibend", fuelReserve: "Kraftstoff · verbleibend", last500km: "Letzte 500 km" },
  en: { consumptionReserves: "Consumption & reserves", electricReserve: "Electric · remaining", fuelReserve: "Fuel · remaining", last500km: "Last 500 km" },
  fr: { consumptionReserves: "Consommation et réserves", electricReserve: "Électrique · restant", fuelReserve: "Carburant · restant", last500km: "500 derniers km" },
  it: { consumptionReserves: "Consumi e riserve", electricReserve: "Elettrico · residuo", fuelReserve: "Carburante · residuo", last500km: "Ultimi 500 km" },
  es: { consumptionReserves: "Consumo y reservas", electricReserve: "Eléctrico · restante", fuelReserve: "Combustible · restante", last500km: "Últimos 500 km" },
  pt: { consumptionReserves: "Consumo e reservas", electricReserve: "Elétrico · restante", fuelReserve: "Combustível · restante", last500km: "Últimos 500 km" },
  nl: { consumptionReserves: "Verbruik en reserves", electricReserve: "Elektrisch · resterend", fuelReserve: "Brandstof · resterend", last500km: "Laatste 500 km" },
  da: { consumptionReserves: "Forbrug og reserver", electricReserve: "Elektrisk · tilbage", fuelReserve: "Brændstof · tilbage", last500km: "Seneste 500 km" },
  nb: { consumptionReserves: "Forbruk og reserver", electricReserve: "Elektrisk · igjen", fuelReserve: "Drivstoff · igjen", last500km: "Siste 500 km" },
  sv: { consumptionReserves: "Förbrukning och reserver", electricReserve: "El · kvar", fuelReserve: "Bränsle · kvar", last500km: "Senaste 500 km" },
  fi: { consumptionReserves: "Kulutus ja varannot", electricReserve: "Sähkö · jäljellä", fuelReserve: "Polttoaine · jäljellä", last500km: "Viimeiset 500 km" },
  pl: { consumptionReserves: "Zużycie i rezerwy", electricReserve: "Elektrycznie · pozostało", fuelReserve: "Paliwo · pozostało", last500km: "Ostatnie 500 km" },
  cs: { consumptionReserves: "Spotřeba a rezervy", electricReserve: "Elektřina · zbývá", fuelReserve: "Palivo · zbývá", last500km: "Posledních 500 km" },
  sk: { consumptionReserves: "Spotreba a rezervy", electricReserve: "Elektrina · zostáva", fuelReserve: "Palivo · zostáva", last500km: "Posledných 500 km" },
  hu: { consumptionReserves: "Fogyasztás és tartalékok", electricReserve: "Elektromos · hátralévő", fuelReserve: "Üzemanyag · hátralévő", last500km: "Utolsó 500 km" },
  ro: { consumptionReserves: "Consum și rezerve", electricReserve: "Electric · rămas", fuelReserve: "Combustibil · rămas", last500km: "Ultimii 500 km" },
  sl: { consumptionReserves: "Poraba in rezerve", electricReserve: "Elektrika · preostalo", fuelReserve: "Gorivo · preostalo", last500km: "Zadnjih 500 km" },
  hr: { consumptionReserves: "Potrošnja i rezerve", electricReserve: "Električno · preostalo", fuelReserve: "Gorivo · preostalo", last500km: "Posljednjih 500 km" },
};
for (const [language, labels] of Object.entries(CONSUMPTION_RESERVES_TEXT)) {
  FRONTEND_TEXT.dashboard[language] = {
    ...FRONTEND_TEXT.dashboard.en,
    ...FRONTEND_TEXT.dashboard[language],
    ...labels,
  };
}

// Fuel History can display either a direct refill amount or an amount estimated
// from configured tank capacity × a confirmed fuel-level increase. Keep the
// helper text aligned with that provenance in every supported language.
const FUEL_HISTORY_HINTS = {
  de: "Tankvorgänge werden aus deutlichen Anstiegen des Tankfüllstands erkannt. Liter können direkt vorliegen oder aus der konfigurierten Tankkapazität geschätzt werden; Schätzwerte sind gekennzeichnet.",
  en: "Refuelling events are detected from clear fuel-level increases. Litres may come directly from the source or be estimated from the configured tank capacity; estimates are marked.",
  fr: "Les ravitaillements sont détectés par une hausse nette du niveau de carburant. La quantité peut provenir directement de la source ou être estimée à partir de la capacité configurée du réservoir ; les estimations sont signalées.",
  it: "I rifornimenti vengono rilevati da chiari aumenti del livello carburante. I litri possono provenire direttamente dalla fonte o essere stimati dalla capacità del serbatoio configurata; le stime sono indicate.",
  es: "Los repostajes se detectan por aumentos claros del nivel de combustible. Los litros pueden proceder directamente de la fuente o estimarse con la capacidad de depósito configurada; las estimaciones se indican.",
  pt: "Os abastecimentos são detetados por aumentos claros do nível de combustível. Os litros podem vir diretamente da fonte ou ser estimados pela capacidade configurada do depósito; as estimativas são assinaladas.",
  nl: "Tankbeurten worden herkend aan duidelijke stijgingen van het brandstofniveau. Liters kunnen rechtstreeks uit de bron komen of worden geschat op basis van de ingestelde tankinhoud; schattingen zijn gemarkeerd.",
  da: "Tankninger registreres ud fra tydelige stigninger i brændstofniveauet. Liter kan komme direkte fra kilden eller estimeres ud fra den konfigurerede tankkapacitet; estimater markeres.",
  nb: "Fyllinger registreres fra tydelige økninger i drivstoffnivået. Liter kan komme direkte fra kilden eller beregnes fra konfigurert tankkapasitet; estimater merkes.",
  sv: "Tankningar identifieras genom tydliga ökningar av bränslenivån. Liter kan komma direkt från källan eller uppskattas från konfigurerad tankvolym; uppskattningar markeras.",
  fi: "Tankkaukset havaitaan selkeistä polttoainetason nousuista. Litramäärä voi tulla suoraan lähteestä tai se voidaan arvioida määritetyn säiliötilavuuden perusteella; arviot merkitään.",
  pl: "Tankowania są wykrywane na podstawie wyraźnych wzrostów poziomu paliwa. Litry mogą pochodzić bezpośrednio ze źródła lub być oszacowane z ustawionej pojemności zbiornika; wartości szacowane są oznaczone.",
  cs: "Tankování se zjišťuje podle výrazného nárůstu hladiny paliva. Litry mohou pocházet přímo ze zdroje nebo být odhadnuty z nastavené kapacity nádrže; odhady jsou označeny.",
  sk: "Tankovania sa zisťujú podľa výrazného zvýšenia hladiny paliva. Litre môžu pochádzať priamo zo zdroja alebo byť odhadnuté z nastavenej kapacity nádrže; odhady sú označené.",
  hu: "A tankolásokat az üzemanyagszint egyértelmű emelkedése alapján észleljük. A litermennyiség származhat közvetlenül a forrásból vagy a beállított tankkapacitásból becsülhető; a becsült értékeket jelöljük.",
  ro: "Alimentările sunt detectate din creșteri clare ale nivelului de combustibil. Litrii pot proveni direct din sursă sau pot fi estimați din capacitatea configurată a rezervorului; estimările sunt marcate.",
  sl: "Točenja se zaznajo iz jasnih povečanj ravni goriva. Litri so lahko podani neposredno ali ocenjeni iz nastavljene prostornine rezervoarja; ocene so označene.",
  hr: "Točenja se prepoznaju po jasnom porastu razine goriva. Litre može dati izvor izravno ili se mogu procijeniti iz konfiguriranog kapaciteta spremnika; procjene su označene.",
};
for (const [language, hint] of Object.entries(FUEL_HISTORY_HINTS)) {
  FRONTEND_TEXT.fuelHistory[language] = {
    ...FRONTEND_TEXT.fuelHistory.en,
    ...FRONTEND_TEXT.fuelHistory[language],
    hint,
  };
}
// The French tester correctly noted that a refuelling event does not imply a
// completely full tank. Use neutral "ravitaillement" wording throughout.
Object.assign(FRONTEND_TEXT.fuelHistory.fr, {
  cardName: "Historique SV des ravitaillements",
  cardDescription: "Ravitaillements détectés à partir du niveau de carburant",
  title: "Historique des ravitaillements",
  empty: "Aucun ravitaillement détecté sur la période sélectionnée.",
  loading: "Chargement de l’historique des ravitaillements…",
  error: "Impossible de charger l’historique des ravitaillements :",
});

export { FRONTEND_TEXT, languageFor, localeFor, textFor };
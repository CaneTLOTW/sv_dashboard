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

export { FRONTEND_TEXT, languageFor, localeFor, textFor };
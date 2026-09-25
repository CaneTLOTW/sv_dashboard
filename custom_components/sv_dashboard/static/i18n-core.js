/* Shared localisation primitives for the bundled Lovelace modules.
 *
 * HA's translation loader is available to config/options flows, but custom
 * browser modules are rendered independently for every user. They therefore
 * use this small package-owned catalog and honour the browser/UI language (or
 * an explicit card ``language`` option) without relying on global HA state.
 */
import { EXTRA_FRONTEND_TEXT as WESTERN_TEXT } from "./i18n-extra-west.js?v=0.6.0-beta.7";
import { EXTRA_FRONTEND_TEXT as NORTHERN_TEXT } from "./i18n-extra-north.js?v=0.6.0-beta.7";
import { EXTRA_FRONTEND_TEXT as EASTERN_TEXT } from "./i18n-extra-east.js?v=0.6.0-beta.7";

export const FRONTEND_TEXT = {
  tripHistory: {
    de: {
      title: "Fahrtenhistorie", loading: "Fahrtenhistorie wird geladen …",
      error: "Historie konnte nicht geladen werden:", empty: "Keine Fahrten im gewählten Zeitraum.",
      scroll: "Fahrtenhistorie vertikal scrollen", date: "Datum", duration: "Dauer",
      distance: "Strecke", average: "Ø km/h", energy: "kWh", consumption: "kWh/100 km", maximum: "Max. km/h", startMileage: "Startkilometer", endMileage: "Endkilometer",
      invalidServerTrip: "Unplausibler Serverdatensatz – Rohwerte bleiben im Archiv, werden aber nicht für Strecke, Geschwindigkeit, Verbrauch oder Statistik verwendet.",
      compactFilterNote: "Letzte 30 Tage; Kurzstrecken ≤ 1 km und 0-km-Ereignisse ausgeblendet.", period: "Zeitraum", all: "Alle", days: "Tage",
      hideShort: "≤ 1 km ausblenden", consumptionOnly: "nur Verbrauch", zeroEvents: "0-km-Ereignisse", socStart: "SOC Start", socEnd: "SOC Ende",
      visibleTrips: "{visible} von {total} Fahrten sichtbar", loadMore: "Weitere Fahrten laden",
    },
    en: {
      title: "Trip history", loading: "Loading trip history …",
      error: "Could not load history:", empty: "No trips in the selected period.",
      scroll: "Scroll trip history vertically", date: "Date", duration: "Duration",
      distance: "Distance", average: "Avg. km/h", energy: "kWh", consumption: "kWh/100 km", maximum: "Max. km/h", startMileage: "Start mileage", endMileage: "End mileage",
      invalidServerTrip: "Implausible server record – raw values remain archived but are not used for distance, speed, consumption or statistics.",
      compactFilterNote: "Last 30 days; trips ≤ 1 km and 0 km events are hidden.", period: "Period", all: "All", days: "days",
      hideShort: "Hide ≤ 1 km", consumptionOnly: "Consumption only", zeroEvents: "0 km events", socStart: "SOC start", socEnd: "SOC end",
      visibleTrips: "{visible} of {total} trips visible", loadMore: "Load more trips",
    },
    fr: {
      title: "Historique des trajets", loading: "Chargement de l’historique des trajets…",
      error: "Impossible de charger l’historique :", empty: "Aucun trajet sur la période sélectionnée.",
      scroll: "Faire défiler verticalement l’historique des trajets", date: "Date", duration: "Durée",
      distance: "Distance", average: "Moy. km/h", energy: "kWh", consumption: "kWh/100 km", maximum: "Max. km/h", startMileage: "Kilométrage au départ", endMileage: "Kilométrage à l’arrivée",
      invalidServerTrip: "Enregistrement serveur non plausible : les valeurs brutes restent archivées mais ne sont pas utilisées pour la distance, la vitesse, la consommation ou les statistiques.",
      compactFilterNote: "30 derniers jours ; trajets ≤ 1 km et événements à 0 km masqués.", period: "Période", all: "Tous", days: "jours",
      hideShort: "Masquer ≤ 1 km", consumptionOnly: "Consommation uniquement", zeroEvents: "Événements à 0 km", socStart: "SOC départ", socEnd: "SOC arrivée",
      visibleTrips: "{visible} trajets visibles sur {total}", loadMore: "Charger plus de trajets",
    },
  },
  chargeHistory: {
    de: {
      title: "Ladehistorie", loading: "Ladehistorie wird geladen …",
      error: "Historie konnte nicht geladen werden:", empty: "Keine abgeschlossenen Ladevorgänge im gewählten Zeitraum.",
      start: "Start", duration: "Dauer", energy: "kWh", average: "Ø kW", maximum: "Max. kW", type: "Typ",
      hint: "Energie und Leistung sind batterie-seitige SOC-Näherungen. Rekonstruierte Ladefenster enthalten bewusst keine Ladezeit, Leistung oder Ladeart.",
      curve: "Ladekurve", active: "● lädt", latest: "letzter Ladevorgang",
      curveLoading: "Ladekurve wird geladen …", curveError: "Ladekurve konnte nicht geladen werden:",
      selectionNotFound: "Der ausgewählte Ladevorgang ist im geladenen Recorder-Zeitraum nicht verfügbar.",
      notEnoughPoints: "Für diesen Ladevorgang liegen nicht genug SOC-Schritte vor.",
      powerOverSoc: "Ladeleistung über SOC", power: "Ø Leistung", sessions: "Vorgänge",
      selectSession: "Ladevorgang auswählen",
      curveHint: "Leistung je SOC-Schritt, batterieseitig aus SOC und Zeit abgeleitet. Die Kurve bleibt bis zum nächsten bestätigten Fahrtbeginn sichtbar.",
      browserHint: "batterieseitig aus SOC und Zeit abgeleitet. Verfügbar im Recorder-Zeitraum.",
      batteryEnergy: "Geladen", chargeStartDetail: "Ladebeginn", chargeEndDetail: "Ladeende", chargeDurationDetail: "Ladedauer", averagePowerDetail: "Ø Leistung",
      standstill: "Standzeit", chargingDuration: "Ladezeit", showCurve: "Ladekurve anzeigen",
      reconstructedHint: "Dieser Ladevorgang wurde aus der SOC-Änderung zwischen zwei Fahrten rekonstruiert. Eine Ladezeit oder Ladekurve ist nicht verfügbar.",
    },
    en: {
      title: "Charging history", loading: "Loading charging history …",
      error: "Could not load history:", empty: "No completed charging sessions in the selected period.",
      start: "Start", duration: "Duration", energy: "kWh", average: "Avg. kW", maximum: "Max. kW", type: "Type",
      hint: "Energy and power are battery-side SOC estimates. Reconstructed parking windows deliberately have no charging duration, power or type.",
      curve: "Charge curve", active: "● charging", latest: "most recent charge",
      curveLoading: "Charge curve is loading …", curveError: "Could not load charge curve:",
      selectionNotFound: "The selected charging session is not available in the loaded Recorder period.",
      notEnoughPoints: "Not enough usable SOC steps are available for this charging session.",
      powerOverSoc: "Charging power over SOC", power: "Avg. power", sessions: "sessions",
      selectSession: "Select charging session",
      curveHint: "Power per SOC step, derived on the battery side from SOC and time. The curve remains visible until the next confirmed trip starts.",
      browserHint: "derived on the battery side from SOC and time. Available within the Recorder retention period.",
      batteryEnergy: "Battery energy", chargeStartDetail: "Start", chargeEndDetail: "End", chargeDurationDetail: "Duration", averagePowerDetail: "Average power",
      standstill: "Standstill", chargingDuration: "Charging duration", showCurve: "Show charge curve",
      reconstructedHint: "This event was reconstructed from the SOC change between two trips. Charging duration and curve are unavailable.",
    },
    fr: {
      title: "Historique de recharge", loading: "Chargement de l’historique de recharge…",
      error: "Impossible de charger l’historique :", empty: "Aucune recharge terminée sur la période sélectionnée.",
      start: "Début", duration: "Durée", energy: "kWh", average: "Moy. kW", maximum: "Max. kW", type: "Type",
      hint: "L’énergie et la puissance sont des estimations côté batterie basées sur le SOC. Les fenêtres reconstruites n’indiquent volontairement ni durée de recharge, ni puissance, ni type de recharge.",
      curve: "Courbe de recharge", active: "● en charge", latest: "dernière recharge",
      curveLoading: "Chargement de la courbe de recharge…", curveError: "Impossible de charger la courbe de recharge :",
      selectionNotFound: "La recharge sélectionnée n’est pas disponible dans la période chargée du Recorder.",
      notEnoughPoints: "Cette recharge ne comporte pas assez de pas de SOC exploitables.",
      powerOverSoc: "Puissance de recharge selon le SOC", power: "Puissance moy.", sessions: "recharges",
      selectSession: "Sélectionner une recharge",
      curveHint: "Puissance par pas de SOC, dérivée côté batterie du SOC et du temps. La courbe reste visible jusqu’au prochain début de trajet confirmé.",
      browserHint: "dérivée côté batterie du SOC et du temps. Disponible dans la période de conservation du Recorder.",
      batteryEnergy: "Énergie batterie", chargeStartDetail: "Début de recharge", chargeEndDetail: "Fin de recharge", chargeDurationDetail: "Durée de recharge", averagePowerDetail: "Puissance moyenne",
      standstill: "Temps d’arrêt", chargingDuration: "Durée de recharge", showCurve: "Afficher la courbe de recharge",
      reconstructedHint: "Cette recharge a été reconstruite à partir de la variation du SOC entre deux trajets. La durée de recharge et la courbe ne sont pas disponibles.",
    },
  },
  vehicleOverview: {
    de: {
      heading: "Mobilität", chargingUntil: "bis {time}", charging: "Wird geladen", driving: "In Fahrt", battery: "Batterie", fuel: "Kraftstoff",
      multipleVehicles: "SV Dashboard: mehrere Fahrzeuge gefunden. Bitte im Karteneditor ein Fahrzeug auswählen.",
      configuredUnavailable: "SV Dashboard: das konfigurierte Fahrzeug ist nicht verfügbar.", noUniqueVehicle: "SV Dashboard: kein eindeutig zugeordnetes Fahrzeug gefunden.",
      noInstance: "Keine SV Dashboard-Instanz verfügbar.", vehicleAuto: "Fahrzeug: automatisch · {vehicle}", vehicle: "Fahrzeug", selectVehicle: "Fahrzeug auswählen …",
      selectionHint: "Die Auswahl wird als SV-Config-Entry gespeichert und bleibt fest diesem Fahrzeug zugeordnet.", vehicleFallback: "Fahrzeug {number}",
      cardName: "SV Fahrzeugübersicht", cardDescription: "Kompakte SV Live-Karte für die Home-Assistant-Startseite",
    },
    en: {
      heading: "Mobility", chargingUntil: "until {time}", charging: "Charging", driving: "Driving", battery: "Battery", fuel: "Fuel",
      multipleVehicles: "SV Dashboard: multiple vehicles found. Select a vehicle in the card editor.",
      configuredUnavailable: "SV Dashboard: the configured vehicle is unavailable.", noUniqueVehicle: "SV Dashboard: no uniquely assigned vehicle was found.",
      noInstance: "No SV Dashboard instance is available.", vehicleAuto: "Vehicle: automatic · {vehicle}", vehicle: "Vehicle", selectVehicle: "Select vehicle …",
      selectionHint: "The selection is stored as an SV config entry and remains assigned to this vehicle.", vehicleFallback: "Vehicle {number}",
      cardName: "SV vehicle overview", cardDescription: "Compact SV live card for the Home Assistant home page",
    },
    fr: {
      heading: "Mobilité", chargingUntil: "jusqu’à {time}", charging: "En charge", driving: "En trajet", battery: "Batterie", fuel: "Carburant",
      multipleVehicles: "SV Dashboard : plusieurs véhicules ont été trouvés. Sélectionnez un véhicule dans l’éditeur de carte.",
      configuredUnavailable: "SV Dashboard : le véhicule configuré n’est pas disponible.", noUniqueVehicle: "SV Dashboard : aucun véhicule attribué de manière unique n’a été trouvé.",
      noInstance: "Aucune instance SV Dashboard n’est disponible.", vehicleAuto: "Véhicule : automatique · {vehicle}", vehicle: "Véhicule", selectVehicle: "Sélectionner un véhicule…",
      selectionHint: "La sélection est enregistrée comme entrée de configuration SV et reste attribuée à ce véhicule.", vehicleFallback: "Véhicule {number}",
      cardName: "Vue d’ensemble du véhicule SV", cardDescription: "Carte SV Live compacte pour la page d’accueil de Home Assistant",
    },
  },
  vehicleAudit: {
    de: {
      title: "Fahrzeug-API-Audit", hint: "Liest unterstützte Fahrzeug- und API-Daten nur lesend aus und erzeugt einen datenschutzbereinigten Export. Es werden keine Fahrzeugbefehle gesendet.",
      run: "Audit starten", running: "Audit läuft …", download: "JSON herunterladen", copy: "Markdown kopieren", copied: "Kopiert",
      error: "Audit fehlgeschlagen", notRun: "Noch kein Audit ausgeführt.", noVehicle: "Kein eindeutig zugeordnetes SV-Fahrzeug verfügbar.",
      auditId: "Audit-ID", generated: "Erstellt", privacyReady: "Export bereinigt: keine VIN, Fahrzeug-/Kontokennung, Tokens oder exakten GPS-Koordinaten.",
    },
    en: {
      title: "Vehicle API audit", hint: "Reads supported vehicle/API data in read-only mode and creates a privacy-sanitized export. No vehicle commands are sent.",
      run: "Run audit", running: "Audit running …", download: "Download JSON", copy: "Copy Markdown", copied: "Copied",
      error: "Audit failed", notRun: "No audit has been run yet.", noVehicle: "No uniquely assigned SV vehicle is available.",
      auditId: "Audit ID", generated: "Generated", privacyReady: "Export sanitized: no VIN, vehicle/account identifiers, tokens or exact GPS coordinates.",
    },
    fr: {
      title: "Audit API du véhicule", hint: "Lit en mode lecture seule les données véhicule/API prises en charge et crée un export anonymisé. Aucune commande véhicule n’est envoyée.",
      run: "Lancer l’audit", running: "Audit en cours…", download: "Télécharger le JSON", copy: "Copier le Markdown", copied: "Copié",
      error: "Échec de l’audit", notRun: "Aucun audit n’a encore été exécuté.", noVehicle: "Aucun véhicule SV attribué de façon unique n’est disponible.",
      auditId: "ID d’audit", generated: "Créé", privacyReady: "Export anonymisé : aucun VIN, identifiant véhicule/compte, jeton ou coordonnée GPS exacte.",
    },
    it: {
      title: "Audit API veicolo", hint: "Legge in sola lettura i dati veicolo/API supportati e crea un export anonimizzato. Non vengono inviati comandi al veicolo.",
      run: "Avvia audit", running: "Audit in corso…", download: "Scarica JSON", copy: "Copia Markdown", copied: "Copiato",
      error: "Audit non riuscito", notRun: "Nessun audit ancora eseguito.", noVehicle: "Nessun veicolo SV assegnato in modo univoco disponibile.",
      auditId: "ID audit", generated: "Creato", privacyReady: "Export anonimizzato: nessun VIN, identificatore veicolo/account, token o coordinata GPS esatta.",
    },
    es: {
      title: "Auditoría API del vehículo", hint: "Lee en modo de solo lectura los datos compatibles del vehículo/API y crea una exportación anonimizada. No se envían comandos al vehículo.",
      run: "Iniciar auditoría", running: "Auditoría en curso…", download: "Descargar JSON", copy: "Copiar Markdown", copied: "Copiado",
      error: "La auditoría falló", notRun: "Aún no se ha ejecutado ninguna auditoría.", noVehicle: "No hay disponible un vehículo SV asignado de forma única.",
      auditId: "ID de auditoría", generated: "Creado", privacyReady: "Exportación anonimizada: sin VIN, identificadores de vehículo/cuenta, tokens ni coordenadas GPS exactas.",
    },
    pt: {
      title: "Auditoria da API do veículo", hint: "Lê em modo apenas de leitura os dados suportados do veículo/API e cria uma exportação anonimizada. Não são enviados comandos ao veículo.",
      run: "Iniciar auditoria", running: "Auditoria em curso…", download: "Transferir JSON", copy: "Copiar Markdown", copied: "Copiado",
      error: "Falha na auditoria", notRun: "Ainda não foi executada nenhuma auditoria.", noVehicle: "Não está disponível nenhum veículo SV atribuído de forma única.",
      auditId: "ID da auditoria", generated: "Criado", privacyReady: "Exportação anonimizada: sem VIN, identificadores de veículo/conta, tokens ou coordenadas GPS exatas.",
    },
    nl: {
      title: "Voertuig-API-audit", hint: "Leest ondersteunde voertuig-/API-gegevens alleen-lezen uit en maakt een privacygeschoonde export. Er worden geen voertuigopdrachten verzonden.",
      run: "Audit starten", running: "Audit wordt uitgevoerd…", download: "JSON downloaden", copy: "Markdown kopiëren", copied: "Gekopieerd",
      error: "Audit mislukt", notRun: "Er is nog geen audit uitgevoerd.", noVehicle: "Er is geen eenduidig toegewezen SV-voertuig beschikbaar.",
      auditId: "Audit-ID", generated: "Aangemaakt", privacyReady: "Export geschoond: geen VIN, voertuig-/account-ID’s, tokens of exacte GPS-coördinaten.",
    },
    da: {
      title: "Køretøjs-API-audit", hint: "Læser understøttede køretøjs-/API-data skrivebeskyttet og opretter en privatlivsrenset eksport. Der sendes ingen køretøjskommandoer.",
      run: "Start audit", running: "Audit kører…", download: "Download JSON", copy: "Kopiér Markdown", copied: "Kopieret",
      error: "Audit mislykkedes", notRun: "Der er endnu ikke kørt en audit.", noVehicle: "Intet entydigt tildelt SV-køretøj er tilgængeligt.",
      auditId: "Audit-ID", generated: "Oprettet", privacyReady: "Eksport renset: ingen VIN, køretøjs-/konto-id’er, tokens eller nøjagtige GPS-koordinater.",
    },
    nb: {
      title: "Kjøretøy-API-audit", hint: "Leser støttede kjøretøy-/API-data skrivebeskyttet og lager en personvernrenset eksport. Ingen kjøretøykommandoer sendes.",
      run: "Start audit", running: "Audit kjører…", download: "Last ned JSON", copy: "Kopier Markdown", copied: "Kopiert",
      error: "Audit mislyktes", notRun: "Ingen audit er kjørt ennå.", noVehicle: "Ingen entydig tilordnet SV-bil er tilgjengelig.",
      auditId: "Audit-ID", generated: "Opprettet", privacyReady: "Eksport renset: ingen VIN, kjøretøy-/konto-ID-er, tokens eller eksakte GPS-koordinater.",
    },
    sv: {
      title: "Fordonets API-granskning", hint: "Läser stödda fordons-/API-data skrivskyddat och skapar en integritetssanerad export. Inga fordonskommandon skickas.",
      run: "Starta granskning", running: "Granskning pågår…", download: "Hämta JSON", copy: "Kopiera Markdown", copied: "Kopierat",
      error: "Granskningen misslyckades", notRun: "Ingen granskning har körts ännu.", noVehicle: "Inget entydigt tilldelat SV-fordon är tillgängligt.",
      auditId: "Gransknings-ID", generated: "Skapad", privacyReady: "Export sanerad: inget VIN, fordons-/konto-ID, token eller exakta GPS-koordinater.",
    },
    fi: {
      title: "Ajoneuvon API-auditointi", hint: "Lukee tuetut ajoneuvo-/API-tiedot vain luku -tilassa ja luo yksityisyyssuojatun viennin. Ajoneuvolle ei lähetetä komentoja.",
      run: "Käynnistä auditointi", running: "Auditointi käynnissä…", download: "Lataa JSON", copy: "Kopioi Markdown", copied: "Kopioitu",
      error: "Auditointi epäonnistui", notRun: "Auditointia ei ole vielä suoritettu.", noVehicle: "Yksilöllisesti määritettyä SV-ajoneuvoa ei ole saatavilla.",
      auditId: "Auditointi-ID", generated: "Luotu", privacyReady: "Vienti suojattu: ei VIN-numeroa, ajoneuvo-/tilitunnisteita, tokeneita tai tarkkoja GPS-koordinaatteja.",
    },
    pl: {
      title: "Audyt API pojazdu", hint: "Odczytuje obsługiwane dane pojazdu/API tylko do odczytu i tworzy zanonimizowany eksport. Nie wysyła żadnych poleceń do pojazdu.",
      run: "Uruchom audyt", running: "Audyt trwa…", download: "Pobierz JSON", copy: "Kopiuj Markdown", copied: "Skopiowano",
      error: "Audyt nie powiódł się", notRun: "Nie wykonano jeszcze audytu.", noVehicle: "Brak jednoznacznie przypisanego pojazdu SV.",
      auditId: "ID audytu", generated: "Utworzono", privacyReady: "Eksport zanonimizowany: bez VIN, identyfikatorów pojazdu/konta, tokenów i dokładnych współrzędnych GPS.",
    },
    cs: {
      title: "Audit API vozidla", hint: "Načte podporovaná data vozidla/API pouze pro čtení a vytvoří anonymizovaný export. Vozidlu nejsou odesílány žádné příkazy.",
      run: "Spustit audit", running: "Audit probíhá…", download: "Stáhnout JSON", copy: "Kopírovat Markdown", copied: "Zkopírováno",
      error: "Audit selhal", notRun: "Audit ještě nebyl spuštěn.", noVehicle: "Není dostupné jednoznačně přiřazené vozidlo SV.",
      auditId: "ID auditu", generated: "Vytvořeno", privacyReady: "Export anonymizován: bez VIN, identifikátorů vozidla/účtu, tokenů a přesných GPS souřadnic.",
    },
    sk: {
      title: "Audit API vozidla", hint: "Načíta podporované údaje vozidla/API iba na čítanie a vytvorí anonymizovaný export. Vozidlu sa neposielajú žiadne príkazy.",
      run: "Spustiť audit", running: "Audit prebieha…", download: "Stiahnuť JSON", copy: "Kopírovať Markdown", copied: "Skopírované",
      error: "Audit zlyhal", notRun: "Audit ešte nebol spustený.", noVehicle: "Nie je dostupné jednoznačne priradené vozidlo SV.",
      auditId: "ID auditu", generated: "Vytvorené", privacyReady: "Export anonymizovaný: bez VIN, identifikátorov vozidla/účtu, tokenov a presných GPS súradníc.",
    },
    hu: {
      title: "Jármű API-audit", hint: "Csak olvasható módban beolvassa a támogatott jármű-/API-adatokat, és adatvédelmi szempontból tisztított exportot készít. Nem küld járműparancsot.",
      run: "Audit indítása", running: "Audit folyamatban…", download: "JSON letöltése", copy: "Markdown másolása", copied: "Másolva",
      error: "Az audit sikertelen", notRun: "Még nem futott audit.", noVehicle: "Nem érhető el egyértelműen hozzárendelt SV-jármű.",
      auditId: "Auditazonosító", generated: "Létrehozva", privacyReady: "Tisztított export: nincs VIN, jármű-/fiókazonosító, token vagy pontos GPS-koordináta.",
    },
    ro: {
      title: "Audit API vehicul", hint: "Citește doar în modul read-only datele acceptate ale vehiculului/API și creează un export anonimizat. Nu sunt trimise comenzi către vehicul.",
      run: "Pornește auditul", running: "Audit în curs…", download: "Descarcă JSON", copy: "Copiază Markdown", copied: "Copiat",
      error: "Audit eșuat", notRun: "Nu a fost rulat încă niciun audit.", noVehicle: "Nu este disponibil niciun vehicul SV atribuit în mod unic.",
      auditId: "ID audit", generated: "Creat", privacyReady: "Export anonimizat: fără VIN, identificatori vehicul/cont, tokenuri sau coordonate GPS exacte.",
    },
    sl: {
      title: "Revizija API vozila", hint: "V načinu samo za branje prebere podprte podatke vozila/API in ustvari zasebnostno očiščen izvoz. Ukazi vozilu se ne pošiljajo.",
      run: "Zaženi revizijo", running: "Revizija poteka…", download: "Prenesi JSON", copy: "Kopiraj Markdown", copied: "Kopirano",
      error: "Revizija ni uspela", notRun: "Revizija še ni bila izvedena.", noVehicle: "Ni na voljo enolično dodeljenega vozila SV.",
      auditId: "ID revizije", generated: "Ustvarjeno", privacyReady: "Izvoz očiščen: brez VIN, identifikatorjev vozila/računa, žetonov ali natančnih GPS-koordinat.",
    },
    hr: {
      title: "Revizija API-ja vozila", hint: "U načinu samo za čitanje dohvaća podržane podatke vozila/API-ja i stvara privatnosno očišćen izvoz. Ne šalju se naredbe vozilu.",
      run: "Pokreni reviziju", running: "Revizija traje…", download: "Preuzmi JSON", copy: "Kopiraj Markdown", copied: "Kopirano",
      error: "Revizija nije uspjela", notRun: "Revizija još nije pokrenuta.", noVehicle: "Nije dostupno jednoznačno dodijeljeno SV vozilo.",
      auditId: "ID revizije", generated: "Stvoreno", privacyReady: "Izvoz očišćen: bez VIN-a, identifikatora vozila/računa, tokena ili točnih GPS koordinata.",
    },
  },
  dashboard: {
    en: {
      name: "SV Dashboard", description: "Vehicle dashboard for Stellantis Vehicles",
      setup: "Setup required", noVehicle: "No SV Dashboard vehicle is configured yet.",
      configure: "Set up SV Dashboard in Settings → Devices & services, then reopen this dashboard.",
      dependencies: "Required dashboard cards are missing", install: "Install these HACS dependencies, restart Home Assistant, then refresh this page:",
      status: "Connection and setup status", vehicle: "Vehicle", overview: "Overview", live: "Live", fuel: "Fuel", fuelRange: "Fuel range", fuelConsumption: "Fuel consumption",
      consumptionUsage: "Consumption & usage", quickActions: "Quick actions", chargingRange: "Charging & range", longTermStatistics: "Long-term statistics", longTermStatisticsIntro: "These charts use Home Assistant long-term statistics. Older hourly values remain available as long as the source entity provides a supported state class.", sohCapacityHistory: "SOH capacity", sohResistanceHistory: "SOH resistance", mileageHistory: "Odometer", drivenDistanceHistory: "Distance driven per month", consumptionHistory: "Average consumption (500 km)",
      chargeLimit: "Charging limit", chargeStart: "Charging start", highVoltageBattery: "High-voltage battery", lastCharge: "Last charge",
      batteryHealthCapacity: "SOH capacity", batteryHealthResistance: "SOH resistance", position: "Position", vehicleDetails: "Vehicle",
      batteryHealth: "Battery health", latestActivities: "Latest activity", settings: "Settings", commandStatus: "Last remote command",
      battery: "Battery", range: "Range", mileage: "Odometer", temperature: "Vehicle temperature", doors: "Doors",
      alarm: "Alarm system", privacy: "Data privacy", remote: "Remote connection", climate: "Preconditioning", cable: "Charging cable",
      chargeStatus: "Charging status", startCharging: "Start charging", stopCharging: "Stop charging", startClimate: "Start climate", stopClimate: "Stop climate",
      lastTrip: "Last trip", trailingConsumption: "Avg. consumption (500 km)", distanceSinceCharge: "Distance since last charge", currentTripEnergy: "Current trip energy",
      tripHistory: "Trip history", chargeHistory: "Charging history", chargeCurves: "Charging curves", chargeCurve: "Charge curve", historicalChargeCurves: "Historical charging curves", selectChargeCurve: "Select charge curve",
      chargeCurvesIntro: "Select a completed AC or DC charging session from the last {days} days. Power is derived on the battery side from integer SOC reports and time.",
      interpretation: "Interpretation", chargeCurvesNotes: "- **AC** is shown in blue, **DC** in green.\n- Gaps or decreasing SOC reports are ignored.\n- Power is not a measurement from the charging station and excludes charging losses.\n- The live curve for the current or most recent charge remains in the **Vehicle** view.",
      recentTrack: "Recent route", currentPosition: "Current position", gpsIntro: "Select the desired period above. The map combines GPS points stored by the Home Assistant Recorder with historical Stellantis trip positions. Server lines connect the recorded trip start and stop points only; they are not a complete route unless intermediate points are available.",
      currentVehiclePosition: "Current vehicle position", coordinates: "Coordinates", latitude: "Latitude", longitude: "Longitude", gpsAccuracy: "GPS accuracy", positionUpdate: "Position update", noGpsCoordinates: "No GPS coordinates available.",
      manualWakeup: "Wake vehicle now", hourlyWakeup: "Hourly wake-up", availabilityProbe: "Availability wake-up probe", chargeWakeup: "Wake-up while charging", system: "System", mappedEntities: "Mapped upstream entities", trips: "Trips", charging: "Charging", gps: "GPS history", wakeup: "Wake-up", notifications: "Notifications", vehicleAlerts: "Vehicle alerts", tripReports: "Trip reports", chargeReports: "Charge reports", testNotification: "Test notification", notificationRecipients: "Recipients", manageRecipients: "Manage recipients", recipientsHint: "Choose the available Notify targets in the SV Dashboard integration options. Only selected targets can be enabled here.", notificationSettings: "Notification settings", notificationDiagnostics: "Notification diagnostics", notificationSettingsUnavailable: "Notification settings are still being published. Reload this dashboard once if they do not appear shortly.", notificationWarningThresholds: "Warning thresholds", notificationTimingAvailability: "Timing & availability", notificationQuietHours: "Quiet hours", rangeWarning: "Range · warn", rangeReset: "Range · reset", homeSocWarning: "Charge advice · warn", homeSocReset: "Charge advice · reset", battery12Warning: "12 V · warn", battery12Reset: "12 V · reset", homeWarningDelay: "Charge advice · delay", staleAtHome: "Reachability · home", staleAway: "Reachability · away", probeWait: "Probe wait", chargeStartDelay: "Charge start · delay", quietStart: "Quiet hours start", quietEnd: "Quiet hours end", lastNotificationType: "Last notification type", lastNotificationTime: "Last notification time", lastNotificationMessage: "Last notification message", heartbeatSource: "Heartbeat source", heartbeatTime: "Heartbeat time", heartbeatSourceUpstream: "Upstream source timestamp", heartbeatSourceHa: "Home Assistant timestamp", outageStatus: "Outage status", outageSince: "Outage since", outageActive: "Active", probeStatus: "Probe status", probeTime: "Last probe", probePending: "Pending",
      help: "Functions & usage", helpContent: "## Using this dashboard\n\n### Trip history\n- Completed trips come from Stellantis server history. Tap a row for mileage and SOC details.\n- Implausible server records remain archived for diagnostics, but distance, speed, consumption and rolling statistics are suppressed.\n- A missing or unchanged whole-percent SOC is shown as **—**, not as zero consumption. Implausible source speed values are replaced by a distance/time fallback and flagged internally.\n\n### Charging history\n- Tap a row to expand its details. Observed sessions show real Home-Assistant on/off boundaries and can open their charge curve.\n- Reconstructed entries only identify a SOC rise between trips. Their standstill window is not a charging duration; power, type and curve remain unavailable.\n\n### Notifications\n- Choose one or more Notify recipients in the integration options. Recipient switches and notification controls are opt-in.\n\n### Controls\n- Use Quick actions for preconditioning.\n- Use Charging & range for charging status, charging type, charge end, charging power, cable state, charge limit and charging start.\n\n### GPS and data quality\n- The GPS view shows Recorder-stored positions for the selected period. Sparse points and straight connections between trips are expected when the vehicle API reports only occasional positions.\n- The System view shows the mapped upstream entities and the integration status.",
      noRecipients: "Select Notify recipients in the SV Dashboard integration options. All notification and wake-up switches are off after installation.",
      trackerUnavailable: "The selected Stellantis device currently has no usable vehicle tracker.", multipleVehicles: "More than one SV Dashboard setup was found. Dashboard selection will be added with the multi-vehicle module.", upstreamIncompatible: "Stellantis Vehicles is not compatible. Required: {minimum}; installed: {installed}.",
      vehicleMaintenanceData: "Vehicle and maintenance data", maintenance: "Maintenance", daysRemaining: "Days remaining", mileageRemaining: "Mileage remaining", updated: "Updated",
      justNow: "just now", minutesAgo: "{value} min ago", hoursAgo: "{value} hr ago", daysAgo: "{value} days ago",
      ageUnknown: "time unknown", sinceJustNow: "since just now", sinceMinutes: "for {value} min", sinceHours: "for {value} hr", sinceDays: "for {value} days", connected: "Connected", disconnected: "Disconnected", unknown: "Unknown",
      brand: "Brand", powertrain: "Powertrain", chargeLimitEnabled: "Charging limit enabled", chargeEndShort: "End", serviceBattery: "12 V battery",
      tripHistoryIntro: "Completed trips come from Stellantis server history and can be older than 90 days. Energy and consumption are SOC-based estimates; unreliable values are shown as **—**. Older entries load as you scroll.", syncServerHistory: "Update server history",
      privacySharing: "Privacy & sharing", privacyDataSharing: "Privacy / data sharing", unrestricted: "Unrestricted", restricted: "Restricted",
      refreshInterval: "Refresh interval", correctBatteryValues: "Correct battery values", abrpLiveData: "ABRP live data",
      strategyEditorDescription: "This dashboard uses the previously configured SV Dashboard integration. Creating it does not change existing vehicle dashboards or entities.",
    },
    de: {
      name: "SV Dashboard", description: "Fahrzeug-Dashboard für Stellantis Vehicles",
      setup: "Einrichtung erforderlich", noVehicle: "Es ist noch kein SV Dashboard-Fahrzeug eingerichtet.",
      configure: "Richte SV Dashboard unter Einstellungen → Geräte & Dienste ein und öffne dieses Dashboard danach erneut.",
      dependencies: "Erforderliche Dashboard-Karten fehlen", install: "Installiere diese HACS-Abhängigkeiten, starte Home Assistant neu und lade diese Seite anschließend neu:",
      status: "Verbindungs- und Einrichtungsstatus", vehicle: "KFZ", overview: "Übersicht", live: "Live", fuel: "Kraftstoff", fuelRange: "Kraftstoffreichweite", fuelConsumption: "Kraftstoffverbrauch",
      consumptionUsage: "Verbrauch & Nutzung", quickActions: "Schnellaktionen", chargingRange: "Laden & Reichweite", longTermStatistics: "Langzeitstatistik", longTermStatisticsIntro: "Diese Diagramme verwenden die Home-Assistant-Langzeitstatistik. Ältere Stundenwerte bleiben verfügbar, solange die Quell-Entity eine unterstützte state_class besitzt.", sohCapacityHistory: "SOH Kapazität", sohResistanceHistory: "SOH Widerstand", mileageHistory: "Kilometerstand", drivenDistanceHistory: "Gefahrene Strecke pro Monat", consumptionHistory: "Ø Verbrauch (500 km)",
      chargeLimit: "Ladelimit", chargeStart: "Ladebeginn", highVoltageBattery: "Hochvoltbatterie", lastCharge: "Letzte Ladung",
      batteryHealthCapacity: "SOH Kapazität", batteryHealthResistance: "SOH Widerstand", position: "Position", vehicleDetails: "Fahrzeug",
      batteryHealth: "Batteriegesundheit", latestActivities: "Letzte Aktivitäten", settings: "Einstellungen", commandStatus: "Letzter Fernbefehl",
      battery: "Batterie", range: "Reichweite", mileage: "Kilometerstand", temperature: "Fahrzeugtemperatur", doors: "Türen",
      alarm: "Alarmanlage", privacy: "Datenschutz", remote: "Remote-Verbindung", climate: "Vorklimatisierung", cable: "Ladekabel",
      chargeStatus: "Ladestatus", startCharging: "Laden starten", stopCharging: "Laden stoppen", startClimate: "Klima starten", stopClimate: "Klima stoppen",
      lastTrip: "Letzte Fahrt", trailingConsumption: "Ø Verbrauch 500 km", distanceSinceCharge: "Seit letzter Ladung", currentTripEnergy: "Aktuelle Fahrtenergie",
      tripHistory: "Fahrtenhistorie", chargeHistory: "Ladehistorie", chargeCurves: "Ladekurven", chargeCurve: "Ladekurve", historicalChargeCurves: "Historische Ladekurven", selectChargeCurve: "Ladekurve auswählen",
      chargeCurvesIntro: "Wähle einen abgeschlossenen AC- oder DC-Ladevorgang aus den letzten {days} Tagen. Die Leistung ist batterieseitig aus den ganzzahligen SOC-Meldungen und der Zeit abgeleitet.",
      interpretation: "Einordnung", chargeCurvesNotes: "- **AC** wird blau, **DC** grün dargestellt.\n- Lücken oder rückläufige SOC-Meldungen werden ignoriert.\n- Die Leistung ist keine Messung der Ladesäule und enthält keine Ladeverluste.\n- Für den jeweils aktuellen beziehungsweise letzten Ladevorgang bleibt die Live-Kurve im View **KFZ** zuständig.",
      recentTrack: "Letzte Route", currentPosition: "Aktuelle Position", gpsIntro: "Wähle oben den gewünschten Zeitraum. Die Karte kombiniert GPS-Punkte aus dem HA-Recorder mit historischen Stellantis-Fahrtpositionen. Serverlinien verbinden nur die aufgezeichneten Start- und Endpunkte einer Fahrt; ohne Zwischenpunkte sind sie keine vollständige Route.",
      currentVehiclePosition: "Aktuelle Fahrzeugposition", coordinates: "Koordinaten", latitude: "Breitengrad", longitude: "Längengrad", gpsAccuracy: "GPS-Genauigkeit", positionUpdate: "Positionsupdate", noGpsCoordinates: "Keine GPS-Koordinaten verfügbar.",
      manualWakeup: "Fahrzeug jetzt aufwecken", hourlyWakeup: "Stündlicher Wake-up", availabilityProbe: "Erreichbarkeitsprobe mit Wake-up", chargeWakeup: "Wake-up beim Laden", system: "System", mappedEntities: "Zugeordnete Upstream-Entitäten", trips: "Fahrten", charging: "Laden", gps: "GPS-Historie", wakeup: "Wake-up", notifications: "Benachrichtigungen", vehicleAlerts: "Fahrzeugwarnungen", tripReports: "Fahrtberichte", chargeReports: "Ladeberichte", testNotification: "Testbenachrichtigung", notificationRecipients: "Empfänger", manageRecipients: "Empfänger verwalten", recipientsHint: "Wähle die verfügbaren Notify-Ziele in den Optionen der SV Dashboard-Integration. Nur ausgewählte Ziele können hier aktiviert werden.", notificationSettings: "Benachrichtigungseinstellungen", notificationDiagnostics: "Benachrichtigungsdiagnose", notificationSettingsUnavailable: "Die Benachrichtigungseinstellungen werden noch veröffentlicht. Falls sie nicht gleich erscheinen, dieses Dashboard einmal neu laden.", notificationWarningThresholds: "Warnschwellen", notificationTimingAvailability: "Zeiten & Erreichbarkeit", notificationQuietHours: "Ruhezeit", rangeWarning: "Reichweite · Warnung", rangeReset: "Reichweite · Reset", homeSocWarning: "Ladeempfehlung · Warnung", homeSocReset: "Ladeempfehlung · Reset", battery12Warning: "12 V · Warnung", battery12Reset: "12 V · Reset", homeWarningDelay: "Ladeempfehlung · Verzögerung", staleAtHome: "Erreichbarkeit · zuhause", staleAway: "Erreichbarkeit · unterwegs", probeWait: "Probe-Wartezeit", chargeStartDelay: "Ladebeginn · Verzögerung", quietStart: "Ruhezeit Beginn", quietEnd: "Ruhezeit Ende", lastNotificationType: "Letzter Meldungstyp", lastNotificationTime: "Letzte Meldungszeit", lastNotificationMessage: "Letzter Meldungstext", heartbeatSource: "Heartbeat-Quelle", heartbeatTime: "Heartbeat-Zeit", heartbeatSourceUpstream: "Upstream-Quellzeit", heartbeatSourceHa: "Home-Assistant-Zeit", outageStatus: "Offline-Status", outageSince: "Offline seit", outageActive: "Aktiv", probeStatus: "Probe-Status", probeTime: "Letzte Probe", probePending: "Ausstehend",
      help: "Funktionen & Bedienung", helpContent: "## Bedienung dieses Dashboards\n\n### Fahrtenhistorie\n- Abgeschlossene Fahrten stammen aus der Stellantis-Serverhistorie. Eine Fahrtzeile öffnet Kilometer- und SOC-Details.\n- Unplausible Serverdatensätze bleiben zur Diagnose im Archiv, Strecke, Geschwindigkeit, Verbrauch und rollierende Statistik werden dafür aber unterdrückt.\n- Fehlender oder unveränderter ganzzahliger SOC wird als **—** angezeigt, nicht als Nullverbrauch. Unplausible Quellgeschwindigkeiten werden durch eine Berechnung aus Strecke und Dauer ersetzt und intern markiert.\n\n### Ladehistorie\n- Eine Ladezeile antippen, um Details zu öffnen. Beobachtete Sessions zeigen die echten Home-Assistant-ON/OFF-Grenzen und können ihre Ladekurve öffnen.\n- Rekonstruierte Einträge erkennen nur einen SOC-Anstieg zwischen Fahrten. Ihr Standfenster ist keine Ladezeit; Leistung, Typ und Kurve bleiben unbekannt.\n\n### Benachrichtigungen\n- Wähle in den Optionen der Integration einen oder mehrere Notify-Empfänger. Empfänger und Benachrichtigungsschalter sind ausdrücklich opt-in.\n\n### Steuerungen\n- Über **Schnellaktionen** lässt sich die Vorklimatisierung starten oder stoppen.\n- Unter **Laden & Reichweite** stehen Ladestatus, Ladeart, Ladeende, Ladeleistung, Kabelstatus, Ladelimit und Ladebeginn zur Verfügung.\n\n### GPS und Datenqualität\n- Der GPS-View zeigt die im HA-Recorder gespeicherten Positionen für den ausgewählten Zeitraum. Wenige Punkte und gerade Verbindungen zwischen Fahrten sind erwartbar, wenn die Fahrzeug-API nur gelegentliche Positionen meldet.\n- Der System-View zeigt die zugeordneten Upstream-Entitäten und den Integrationsstatus.",
      noRecipients: "Wähle Notify-Empfänger in den Optionen der SV Dashboard-Integration aus. Nach der Installation sind alle Benachrichtigungs- und Wake-up-Schalter ausgeschaltet.",
      trackerUnavailable: "Das ausgewählte Stellantis-Gerät besitzt derzeit keinen nutzbaren Fahrzeug-Tracker.", multipleVehicles: "Es wurden mehrere SV Dashboard-Einrichtungen gefunden. Die Auswahl folgt mit dem Mehrfahrzeug-Modul.", upstreamIncompatible: "Stellantis Vehicles ist nicht kompatibel. Erforderlich: {minimum}; installiert: {installed}.",
      vehicleMaintenanceData: "Fahrzeug- und Wartungsdaten", maintenance: "Wartung", daysRemaining: "Verbleibende Tage", mileageRemaining: "Verbleibende Kilometer", updated: "Aktualisiert",
      justNow: "gerade eben", minutesAgo: "vor {value} Min.", hoursAgo: "vor {value} Std.", daysAgo: "vor {value} Tagen",
      ageUnknown: "Zeit unbekannt", sinceJustNow: "seit gerade eben", sinceMinutes: "seit {value} Min.", sinceHours: "seit {value} Std.", sinceDays: "seit {value} Tagen", connected: "Verbunden", disconnected: "Getrennt", unknown: "Unbekannt",
      brand: "Marke", powertrain: "Antrieb", chargeLimitEnabled: "Ladelimit aktiv", chargeEndShort: "Ende", serviceBattery: "12-V-Batterie",
      tripHistoryIntro: "Abgeschlossene Fahrten stammen aus der Stellantis-Serverhistorie und können älter als 90 Tage sein. Energie- und Verbrauchswerte sind SOC-basierte Näherungen; nicht belastbare Werte werden als **—** angezeigt. Beim Scrollen werden ältere Einträge nachgeladen.", syncServerHistory: "Serverhistorie aktualisieren",
      privacySharing: "Datenschutz & Freigabe", privacyDataSharing: "Datenschutz / Datenfreigabe", unrestricted: "Uneingeschränkt", restricted: "Eingeschränkt",
      refreshInterval: "Aktualisierungsintervall", correctBatteryValues: "Korrektur Batteriewerte", abrpLiveData: "ABRP Live-Daten",
      strategyEditorDescription: "Dieses Dashboard verwendet die zuvor eingerichtete SV Dashboard-Integration. Beim Erstellen werden keine vorhandenen Fahrzeug-Dashboards oder Entitäten verändert.",
    },
    fr: {
      name: "SV Dashboard", description: "Tableau de bord véhicule pour Stellantis Vehicles",
      setup: "Configuration requise", noVehicle: "Aucun véhicule SV Dashboard n’est encore configuré.",
      configure: "Configurez SV Dashboard dans Paramètres → Appareils et services, puis rouvrez ce tableau de bord.",
      dependencies: "Des cartes requises sont manquantes", install: "Installez ces dépendances HACS, redémarrez Home Assistant puis actualisez cette page :",
      status: "État de la connexion et de la configuration", vehicle: "Véhicule", overview: "Vue d’ensemble", live: "En direct", fuel: "Carburant", fuelRange: "Autonomie carburant", fuelConsumption: "Consommation carburant",
      consumptionUsage: "Consommation et utilisation", quickActions: "Actions rapides", chargingRange: "Recharge et autonomie", longTermStatistics: "Statistiques à long terme", longTermStatisticsIntro: "Ces graphiques utilisent les statistiques à long terme de Home Assistant. Les anciennes valeurs horaires restent disponibles tant que l’entité source fournit une state_class prise en charge.", sohCapacityHistory: "Capacité SOH", sohResistanceHistory: "Résistance SOH", mileageHistory: "Compteur kilométrique", drivenDistanceHistory: "Distance parcourue par mois", consumptionHistory: "Consommation moyenne (500 km)",
      chargeLimit: "Limite de charge", chargeStart: "Début de recharge", highVoltageBattery: "Batterie haute tension", lastCharge: "Dernière recharge",
      batteryHealthCapacity: "Capacité SOH", batteryHealthResistance: "Résistance SOH", position: "Position", vehicleDetails: "Véhicule",
      batteryHealth: "État de la batterie", latestActivities: "Dernière activité", settings: "Paramètres", commandStatus: "Dernière commande à distance",
      battery: "Batterie", range: "Autonomie", mileage: "Compteur kilométrique", temperature: "Température du véhicule", doors: "Portes",
      alarm: "Système d’alarme", privacy: "Confidentialité des données", remote: "Connexion à distance", climate: "Préconditionnement", cable: "Câble de recharge",
      chargeStatus: "État de la recharge", startCharging: "Démarrer la recharge", stopCharging: "Arrêter la recharge", startClimate: "Démarrer la climatisation", stopClimate: "Arrêter la climatisation",
      lastTrip: "Dernier trajet", trailingConsumption: "Consommation moy. (500 km)", distanceSinceCharge: "Distance depuis la dernière recharge", currentTripEnergy: "Énergie du trajet en cours",
      tripHistory: "Historique des trajets", chargeHistory: "Historique de recharge", chargeCurves: "Courbes de recharge", chargeCurve: "Courbe de recharge", historicalChargeCurves: "Courbes de recharge historiques", selectChargeCurve: "Sélectionner une courbe de recharge",
      chargeCurvesIntro: "Sélectionnez une recharge AC ou DC terminée au cours des {days} derniers jours. La puissance est dérivée côté batterie des valeurs entières de SOC et du temps.",
      interpretation: "Interprétation", chargeCurvesNotes: "- **AC** est affiché en bleu, **DC** en vert.\n- Les lacunes ou diminutions du SOC sont ignorées.\n- La puissance n’est pas une mesure de la borne de recharge et n’inclut pas les pertes de charge.\n- La courbe Live de la recharge en cours ou la plus récente reste disponible dans la vue **Véhicule**.",
      recentTrack: "Trajet récent", currentPosition: "Position actuelle", gpsIntro: "Sélectionnez la période souhaitée ci-dessus. La carte combine les points GPS enregistrés par le Recorder Home Assistant avec les positions historiques des trajets Stellantis. Les lignes serveur relient uniquement les points de départ et d’arrivée enregistrés ; elles ne constituent pas un itinéraire complet sans points intermédiaires.",
      currentVehiclePosition: "Position actuelle du véhicule", coordinates: "Coordonnées", latitude: "Latitude", longitude: "Longitude", gpsAccuracy: "Précision GPS", positionUpdate: "Mise à jour de la position", noGpsCoordinates: "Aucune coordonnée GPS disponible.",
      manualWakeup: "Réveiller le véhicule maintenant", hourlyWakeup: "Réveil horaire", availabilityProbe: "Test de disponibilité avec réveil", chargeWakeup: "Réveil pendant la recharge", system: "Système", mappedEntities: "Entités upstream associées", trips: "Trajets", charging: "Recharge", gps: "Historique GPS", wakeup: "Réveil", notifications: "Notifications", vehicleAlerts: "Alertes véhicule", tripReports: "Rapports de trajet", chargeReports: "Rapports de recharge", testNotification: "Notification de test", notificationRecipients: "Destinataires", manageRecipients: "Gérer les destinataires", recipientsHint: "Choisissez les cibles Notify disponibles dans les options de l’intégration SV Dashboard. Seules les cibles sélectionnées peuvent être activées ici.", notificationSettings: "Paramètres des notifications", notificationDiagnostics: "Diagnostic des notifications", notificationSettingsUnavailable: "Les paramètres de notification sont encore en cours de publication. Rechargez ce tableau de bord s’ils n’apparaissent pas rapidement.", notificationWarningThresholds: "Seuils d’alerte", notificationTimingAvailability: "Temporisation et disponibilité", notificationQuietHours: "Heures silencieuses", rangeWarning: "Autonomie · alerte", rangeReset: "Autonomie · réarmement", homeSocWarning: "Conseil de recharge · alerte", homeSocReset: "Conseil de recharge · réarmement", battery12Warning: "12 V · alerte", battery12Reset: "12 V · réarmement", homeWarningDelay: "Conseil de recharge · délai", staleAtHome: "Disponibilité · domicile", staleAway: "Disponibilité · absent", probeWait: "Attente du test", chargeStartDelay: "Début recharge · délai", quietStart: "Début des heures silencieuses", quietEnd: "Fin des heures silencieuses", lastNotificationType: "Type de la dernière notification", lastNotificationTime: "Heure de la dernière notification", lastNotificationMessage: "Texte de la dernière notification", heartbeatSource: "Source du heartbeat", heartbeatTime: "Heure du heartbeat", heartbeatSourceUpstream: "Horodatage source upstream", heartbeatSourceHa: "Horodatage Home Assistant", outageStatus: "État hors ligne", outageSince: "Hors ligne depuis", outageActive: "Actif", probeStatus: "État du test", probeTime: "Dernier test", probePending: "En attente",
      help: "Fonctions et utilisation", helpContent: "## Utilisation de ce tableau de bord\n\n### Historique des trajets\n- Les trajets terminés proviennent de l’historique serveur Stellantis. Touchez une ligne pour afficher les détails de kilométrage et de SOC.\n- Les enregistrements serveur non plausibles restent archivés pour le diagnostic, mais leur distance, leur vitesse, leur consommation et les statistiques glissantes sont ignorées.\n- Un SOC entier manquant ou inchangé est affiché comme **—**, et non comme une consommation nulle. Les vitesses source non plausibles sont remplacées par un calcul distance/temps et signalées en interne.\n\n### Historique de recharge\n- Touchez une ligne de recharge pour afficher les détails. Les sessions observées montrent les vraies limites ON/OFF de Home Assistant et peuvent ouvrir leur courbe de recharge.\n- Les entrées reconstruites identifient seulement une hausse du SOC entre deux trajets. Leur fenêtre d’arrêt n’est pas une durée de recharge ; puissance, type et courbe restent indisponibles.\n\n### Notifications\n- Choisissez un ou plusieurs destinataires Notify dans les options de l’intégration. Les destinataires et les interrupteurs de notification sont explicitement opt-in.\n\n### Commandes\n- Utilisez **Actions rapides** pour démarrer ou arrêter le préconditionnement.\n- La section **Recharge et autonomie** affiche l’état et le type de recharge, la fin estimée, la puissance, l’état du câble, la limite et le démarrage de la recharge.\n\n### GPS et qualité des données\n- La vue GPS affiche les positions enregistrées dans le Recorder HA pour la période sélectionnée. Des points rares et des lignes droites entre les trajets sont attendus lorsque l’API du véhicule ne publie des positions qu’occasionnellement.\n- La vue Système affiche les entités upstream associées et l’état de l’intégration.",
      noRecipients: "Sélectionnez des destinataires Notify dans les options de l’intégration SV Dashboard. Après l’installation, tous les interrupteurs de notification et de réveil sont désactivés.",
      trackerUnavailable: "L’appareil Stellantis sélectionné ne dispose actuellement d’aucun tracker véhicule exploitable.", multipleVehicles: "Plusieurs configurations SV Dashboard ont été trouvées. La sélection sera ajoutée avec le module multi-véhicules.", upstreamIncompatible: "Stellantis Vehicles n’est pas compatible. Requis : {minimum} ; installé : {installed}.",
      vehicleMaintenanceData: "Données du véhicule et d’entretien", maintenance: "Entretien", daysRemaining: "Jours restants", mileageRemaining: "Kilométrage restant", updated: "Mis à jour",
      justNow: "à l’instant", minutesAgo: "il y a {value} min", hoursAgo: "il y a {value} h", daysAgo: "il y a {value} jours",
      ageUnknown: "heure inconnue", sinceJustNow: "depuis un instant", sinceMinutes: "depuis {value} min", sinceHours: "depuis {value} h", sinceDays: "depuis {value} jours", connected: "Connecté", disconnected: "Déconnecté", unknown: "Inconnu",
      brand: "Marque", powertrain: "Motorisation", chargeLimitEnabled: "Limite de recharge activée", chargeEndShort: "Fin", serviceBattery: "Batterie 12 V",
      tripHistoryIntro: "Les trajets terminés proviennent de l’historique serveur Stellantis et peuvent dater de plus de 90 jours. L’énergie et la consommation sont des estimations basées sur le SOC ; les valeurs non fiables sont affichées comme **—**. Les entrées plus anciennes se chargent pendant le défilement.", syncServerHistory: "Mettre à jour l’historique serveur",
      privacySharing: "Confidentialité et partage", privacyDataSharing: "Confidentialité / partage des données", unrestricted: "Sans restriction", restricted: "Restreint",
      refreshInterval: "Intervalle d’actualisation", correctBatteryValues: "Corriger les valeurs de batterie", abrpLiveData: "Données Live ABRP",
      strategyEditorDescription: "Ce tableau de bord utilise l’intégration SV Dashboard configurée auparavant. Sa création ne modifie aucun tableau de bord véhicule ni aucune entité existante.",
    },
  },
  dualEnergyOverview: {
  de: { cardName: "SV Dual-Energy-Fahrzeugübersicht", cardDescription: "Breite Fahrzeugkarte für Batterie und Kraftstoff", battery: "Batterie", fuel: "Kraftstoff", electricRange: "E-Reichweite", fuelRange: "Kraftstoffreichweite", tripEnergy: "Verbraucht", chargePower: "Ladeleistung", fuelConsumption: "Kraftstoffverbrauch", charging: "Lädt", driving: "In Fahrt", plugged: "Eingesteckt", vehicle: "Fahrzeug", selectVehicle: "Fahrzeug auswählen …", noInstance: "Keine SV Dashboard-Instanz verfügbar.", multipleVehicles: "Mehrere Fahrzeuge gefunden. Bitte im Karteneditor ein Fahrzeug auswählen.", unavailable: "Das konfigurierte Fahrzeug ist nicht verfügbar.", auto: "Fahrzeug: automatisch · {vehicle}" },
  en: { cardName: "SV dual-energy vehicle overview", cardDescription: "Wide vehicle card for battery and fuel", battery: "Battery", fuel: "Fuel", electricRange: "EV range", fuelRange: "Fuel range", tripEnergy: "Energy used", chargePower: "Charge power", fuelConsumption: "Fuel consumption", charging: "Charging", driving: "Driving", plugged: "Plugged in", vehicle: "Vehicle", selectVehicle: "Select vehicle …", noInstance: "No SV Dashboard instance is available.", multipleVehicles: "Multiple vehicles found. Select a vehicle in the card editor.", unavailable: "The configured vehicle is unavailable.", auto: "Vehicle: automatic · {vehicle}" },
  fr: { cardName: "Vue véhicule SV double énergie", cardDescription: "Carte véhicule large pour batterie et carburant", battery: "Batterie", fuel: "Carburant", electricRange: "Autonomie électrique", fuelRange: "Autonomie carburant", tripEnergy: "Énergie consommée", chargePower: "Puissance de recharge", fuelConsumption: "Consommation carburant", charging: "En charge", driving: "En trajet", plugged: "Branché", vehicle: "Véhicule", selectVehicle: "Sélectionner un véhicule…", noInstance: "Aucune instance SV Dashboard n’est disponible.", multipleVehicles: "Plusieurs véhicules ont été trouvés. Sélectionnez un véhicule dans l’éditeur de carte.", unavailable: "Le véhicule configuré n’est pas disponible.", auto: "Véhicule : automatique · {vehicle}" },
  it: { cardName: "Panoramica veicolo SV doppia energia", cardDescription: "Scheda veicolo ampia per batteria e carburante", battery: "Batteria", fuel: "Carburante", electricRange: "Autonomia elettrica", fuelRange: "Autonomia carburante", tripEnergy: "Energia usata", chargePower: "Potenza di ricarica", fuelConsumption: "Consumo carburante", charging: "In carica", driving: "In marcia", plugged: "Collegato", vehicle: "Veicolo", selectVehicle: "Seleziona veicolo…", noInstance: "Nessuna istanza SV Dashboard disponibile.", multipleVehicles: "Sono stati trovati più veicoli. Selezionane uno nell’editor della scheda.", unavailable: "Il veicolo configurato non è disponibile.", auto: "Veicolo: automatico · {vehicle}" },
  es: { cardName: "Vista de vehículo SV de doble energía", cardDescription: "Tarjeta ancha para batería y combustible", battery: "Batería", fuel: "Combustible", electricRange: "Autonomía eléctrica", fuelRange: "Autonomía combustible", tripEnergy: "Energía consumida", chargePower: "Potencia de carga", fuelConsumption: "Consumo de combustible", charging: "Cargando", driving: "En marcha", plugged: "Conectado", vehicle: "Vehículo", selectVehicle: "Seleccionar vehículo…", noInstance: "No hay ninguna instancia de SV Dashboard disponible.", multipleVehicles: "Se encontraron varios vehículos. Selecciona uno en el editor de la tarjeta.", unavailable: "El vehículo configurado no está disponible.", auto: "Vehículo: automático · {vehicle}" },
  pt: { cardName: "Visão do veículo SV de energia dupla", cardDescription: "Cartão largo para bateria e combustível", battery: "Bateria", fuel: "Combustível", electricRange: "Autonomia elétrica", fuelRange: "Autonomia combustível", tripEnergy: "Energia consumida", chargePower: "Potência de carregamento", fuelConsumption: "Consumo de combustível", charging: "A carregar", driving: "Em andamento", plugged: "Ligado", vehicle: "Veículo", selectVehicle: "Selecionar veículo…", noInstance: "Nenhuma instância do SV Dashboard disponível.", multipleVehicles: "Foram encontrados vários veículos. Selecione um no editor do cartão.", unavailable: "O veículo configurado não está disponível.", auto: "Veículo: automático · {vehicle}" },
  nl: { cardName: "SV voertuigoverzicht met dubbele energie", cardDescription: "Brede voertuigkaart voor accu en brandstof", battery: "Accu", fuel: "Brandstof", electricRange: "Elektrisch bereik", fuelRange: "Brandstofbereik", tripEnergy: "Energieverbruik", chargePower: "Laadvermogen", fuelConsumption: "Brandstofverbruik", charging: "Laden", driving: "Rijdt", plugged: "Aangesloten", vehicle: "Voertuig", selectVehicle: "Voertuig selecteren…", noInstance: "Geen SV Dashboard-instantie beschikbaar.", multipleVehicles: "Meerdere voertuigen gevonden. Selecteer een voertuig in de kaarteditor.", unavailable: "Het geconfigureerde voertuig is niet beschikbaar.", auto: "Voertuig: automatisch · {vehicle}" },
  da: { cardName: "SV køretøjsoversigt med dobbelt energi", cardDescription: "Bredt køretøjskort til batteri og brændstof", battery: "Batteri", fuel: "Brændstof", electricRange: "El-rækkevidde", fuelRange: "Brændstofrækkevidde", tripEnergy: "Energiforbrug", chargePower: "Ladeeffekt", fuelConsumption: "Brændstofforbrug", charging: "Oplader", driving: "Kører", plugged: "Tilsluttet", vehicle: "Køretøj", selectVehicle: "Vælg køretøj…", noInstance: "Ingen SV Dashboard-instans er tilgængelig.", multipleVehicles: "Flere køretøjer fundet. Vælg et køretøj i korteditoren.", unavailable: "Det konfigurerede køretøj er ikke tilgængeligt.", auto: "Køretøj: automatisk · {vehicle}" },
  nb: { cardName: "SV kjøretøyoversikt med dobbel energi", cardDescription: "Bredt kjøretøykort for batteri og drivstoff", battery: "Batteri", fuel: "Drivstoff", electricRange: "El-rekkevidde", fuelRange: "Drivstoffrekkevidde", tripEnergy: "Energiforbruk", chargePower: "Ladeeffekt", fuelConsumption: "Drivstofforbruk", charging: "Lader", driving: "Kjører", plugged: "Tilkoblet", vehicle: "Kjøretøy", selectVehicle: "Velg kjøretøy…", noInstance: "Ingen SV Dashboard-instans er tilgjengelig.", multipleVehicles: "Flere kjøretøy funnet. Velg et kjøretøy i korteditoren.", unavailable: "Det konfigurerte kjøretøyet er ikke tilgjengelig.", auto: "Kjøretøy: automatisk · {vehicle}" },
  sv: { cardName: "SV fordonsöversikt med dubbel energi", cardDescription: "Brett fordonskort för batteri och bränsle", battery: "Batteri", fuel: "Bränsle", electricRange: "Elräckvidd", fuelRange: "Bränsleräckvidd", tripEnergy: "Energiförbrukning", chargePower: "Laddningseffekt", fuelConsumption: "Bränsleförbrukning", charging: "Laddar", driving: "Kör", plugged: "Ansluten", vehicle: "Fordon", selectVehicle: "Välj fordon…", noInstance: "Ingen SV Dashboard-instans är tillgänglig.", multipleVehicles: "Flera fordon hittades. Välj ett fordon i kortredigeraren.", unavailable: "Det konfigurerade fordonet är inte tillgängligt.", auto: "Fordon: automatiskt · {vehicle}" },
  fi: { cardName: "SV-ajoneuvon kaksoisenergia-näkymä", cardDescription: "Leveä ajoneuvokortti akulle ja polttoaineelle", battery: "Akku", fuel: "Polttoaine", electricRange: "Sähköinen toimintasäde", fuelRange: "Polttoaineen toimintasäde", tripEnergy: "Kulutettu energia", chargePower: "Latausteho", fuelConsumption: "Polttoaineenkulutus", charging: "Lataa", driving: "Ajossa", plugged: "Kytketty", vehicle: "Ajoneuvo", selectVehicle: "Valitse ajoneuvo…", noInstance: "SV Dashboard -instanssia ei ole käytettävissä.", multipleVehicles: "Useita ajoneuvoja löytyi. Valitse ajoneuvo korttieditorissa.", unavailable: "Määritetty ajoneuvo ei ole käytettävissä.", auto: "Ajoneuvo: automaattinen · {vehicle}" },
  pl: { cardName: "Widok pojazdu SV z dwoma źródłami energii", cardDescription: "Szeroka karta pojazdu dla akumulatora i paliwa", battery: "Akumulator", fuel: "Paliwo", electricRange: "Zasięg elektryczny", fuelRange: "Zasięg paliwa", tripEnergy: "Zużyta energia", chargePower: "Moc ładowania", fuelConsumption: "Zużycie paliwa", charging: "Ładowanie", driving: "W ruchu", plugged: "Podłączony", vehicle: "Pojazd", selectVehicle: "Wybierz pojazd…", noInstance: "Brak dostępnej instancji SV Dashboard.", multipleVehicles: "Znaleziono wiele pojazdów. Wybierz pojazd w edytorze karty.", unavailable: "Skonfigurowany pojazd jest niedostępny.", auto: "Pojazd: automatycznie · {vehicle}" },
  cs: { cardName: "Přehled vozidla SV se dvěma zdroji energie", cardDescription: "Široká karta vozidla pro baterii a palivo", battery: "Baterie", fuel: "Palivo", electricRange: "Elektrický dojezd", fuelRange: "Dojezd na palivo", tripEnergy: "Spotřebovaná energie", chargePower: "Nabíjecí výkon", fuelConsumption: "Spotřeba paliva", charging: "Nabíjení", driving: "V jízdě", plugged: "Připojeno", vehicle: "Vozidlo", selectVehicle: "Vybrat vozidlo…", noInstance: "Není dostupná žádná instance SV Dashboard.", multipleVehicles: "Bylo nalezeno více vozidel. Vyberte vozidlo v editoru karty.", unavailable: "Nakonfigurované vozidlo není dostupné.", auto: "Vozidlo: automaticky · {vehicle}" },
  sk: { cardName: "Prehľad vozidla SV s dvoma zdrojmi energie", cardDescription: "Široká karta vozidla pre batériu a palivo", battery: "Batéria", fuel: "Palivo", electricRange: "Elektrický dojazd", fuelRange: "Dojazd na palivo", tripEnergy: "Spotrebovaná energia", chargePower: "Nabíjací výkon", fuelConsumption: "Spotreba paliva", charging: "Nabíja", driving: "V jazde", plugged: "Pripojené", vehicle: "Vozidlo", selectVehicle: "Vybrať vozidlo…", noInstance: "Nie je dostupná žiadna inštancia SV Dashboard.", multipleVehicles: "Bolo nájdených viac vozidiel. Vyberte vozidlo v editore karty.", unavailable: "Nakonfigurované vozidlo nie je dostupné.", auto: "Vozidlo: automaticky · {vehicle}" },
  hu: { cardName: "SV kettős energiájú járműáttekintés", cardDescription: "Széles járműkártya akkumulátorhoz és üzemanyaghoz", battery: "Akkumulátor", fuel: "Üzemanyag", electricRange: "Elektromos hatótáv", fuelRange: "Üzemanyag-hatótáv", tripEnergy: "Felhasznált energia", chargePower: "Töltési teljesítmény", fuelConsumption: "Üzemanyag-fogyasztás", charging: "Töltés", driving: "Menetben", plugged: "Csatlakoztatva", vehicle: "Jármű", selectVehicle: "Jármű kiválasztása…", noInstance: "Nincs elérhető SV Dashboard-példány.", multipleVehicles: "Több jármű található. Válasszon járművet a kártyaszerkesztőben.", unavailable: "A beállított jármű nem érhető el.", auto: "Jármű: automatikus · {vehicle}" },
  ro: { cardName: "Prezentare vehicul SV cu energie dublă", cardDescription: "Card lat pentru baterie și combustibil", battery: "Baterie", fuel: "Combustibil", electricRange: "Autonomie electrică", fuelRange: "Autonomie combustibil", tripEnergy: "Energie consumată", chargePower: "Putere de încărcare", fuelConsumption: "Consum combustibil", charging: "Se încarcă", driving: "În mers", plugged: "Conectat", vehicle: "Vehicul", selectVehicle: "Selectați vehiculul…", noInstance: "Nu este disponibilă nicio instanță SV Dashboard.", multipleVehicles: "Au fost găsite mai multe vehicule. Selectați un vehicul în editorul cardului.", unavailable: "Vehiculul configurat nu este disponibil.", auto: "Vehicul: automat · {vehicle}" },
  sl: { cardName: "SV pregled vozila z dvojno energijo", cardDescription: "Široka kartica vozila za baterijo in gorivo", battery: "Baterija", fuel: "Gorivo", electricRange: "Električni doseg", fuelRange: "Doseg z gorivom", tripEnergy: "Porabljena energija", chargePower: "Moč polnjenja", fuelConsumption: "Poraba goriva", charging: "Polnjenje", driving: "V vožnji", plugged: "Priključeno", vehicle: "Vozilo", selectVehicle: "Izberite vozilo…", noInstance: "Nobena instanca SV Dashboard ni na voljo.", multipleVehicles: "Najdenih je več vozil. Izberite vozilo v urejevalniku kartice.", unavailable: "Konfigurirano vozilo ni na voljo.", auto: "Vozilo: samodejno · {vehicle}" },
  hr: { cardName: "SV pregled vozila s dvostrukom energijom", cardDescription: "Široka kartica vozila za bateriju i gorivo", battery: "Baterija", fuel: "Gorivo", electricRange: "Električni doseg", fuelRange: "Doseg goriva", tripEnergy: "Potrošena energija", chargePower: "Snaga punjenja", fuelConsumption: "Potrošnja goriva", charging: "Punjenje", driving: "U vožnji", plugged: "Priključeno", vehicle: "Vozilo", selectVehicle: "Odaberite vozilo…", noInstance: "Nema dostupne instance SV Dashboarda.", multipleVehicles: "Pronađeno je više vozila. Odaberite vozilo u uređivaču kartice.", unavailable: "Konfigurirano vozilo nije dostupno.", auto: "Vozilo: automatski · {vehicle}" },
},
  fuelHistory: {
  de: { cardName: "SV Tankhistorie", cardDescription: "Erkannte Tankvorgänge aus dem Tankfüllstand", title: "Tankhistorie", empty: "Keine Tankvorgänge im gewählten Zeitraum erkannt.", loading: "Tankhistorie wird geladen …", error: "Tankhistorie konnte nicht geladen werden:", date: "Datum", liters: "Getankt", level: "Füllstand", hint: "Tankvorgänge werden aus deutlichen Füllstandsanstiegen erkannt; geschätzte Literwerte sind mit ≈ markiert.", estimated: "geschätzt", vehicle: "Fahrzeug", selectVehicle: "Fahrzeug auswählen …", noInstance: "Keine SV Dashboard-Instanz verfügbar.", multipleVehicles: "Mehrere Fahrzeuge gefunden. Bitte im Karteneditor ein Fahrzeug auswählen.", unavailable: "Das konfigurierte Fahrzeug ist nicht verfügbar.", auto: "Fahrzeug: automatisch · {vehicle}" },
  en: { cardName: "SV refuel history", cardDescription: "Detected refuelling events from fuel level", title: "Refuel history", empty: "No refuelling events detected in the selected period.", loading: "Loading refuel history …", error: "Could not load refuel history:", date: "Date", liters: "Fuel added", level: "Level before / after", hint: "Refuelling events are detected from clear fuel-level increases. Litres may come directly from the source or be estimated from the configured tank capacity; estimates are marked.", estimated: "estimated", vehicle: "Vehicle", selectVehicle: "Select vehicle …", noInstance: "No SV Dashboard instance is available.", multipleVehicles: "Multiple vehicles found. Select a vehicle in the card editor.", unavailable: "The configured vehicle is unavailable.", auto: "Vehicle: automatic · {vehicle}" },
  fr: { cardName: "Historique SV des ravitaillements", cardDescription: "Ravitaillements détectés à partir du niveau de carburant", title: "Historique des ravitaillements", empty: "Aucun ravitaillement détecté sur la période sélectionnée.", loading: "Chargement de l’historique des ravitaillements…", error: "Impossible de charger l’historique des ravitaillements :", date: "Date", liters: "Carburant ajouté", level: "Niveau avant / après", hint: "Les ravitaillements sont détectés par une hausse nette du niveau de carburant. La quantité peut provenir directement de la source ou être estimée à partir de la capacité configurée du réservoir ; les estimations sont signalées.", estimated: "estimé", vehicle: "Véhicule", selectVehicle: "Sélectionner un véhicule…", noInstance: "Aucune instance SV Dashboard n’est disponible.", multipleVehicles: "Plusieurs véhicules ont été trouvés. Sélectionnez un véhicule dans l’éditeur de carte.", unavailable: "Le véhicule configuré n’est pas disponible.", auto: "Véhicule : automatique · {vehicle}" },
  it: { cardName: "Cronologia rifornimenti SV", cardDescription: "Rifornimenti rilevati dal livello carburante", title: "Cronologia rifornimenti", empty: "Nessun rifornimento rilevato nel periodo selezionato.", loading: "Caricamento cronologia rifornimenti…", error: "Impossibile caricare la cronologia rifornimenti:", date: "Data", liters: "Carburante aggiunto", level: "Livello prima / dopo", hint: "I rifornimenti vengono rilevati da chiari aumenti del livello carburante. I litri possono provenire direttamente dalla fonte o essere stimati dalla capacità del serbatoio configurata; le stime sono indicate.", estimated: "stimato", vehicle: "Veicolo", selectVehicle: "Seleziona veicolo…", noInstance: "Nessuna istanza SV Dashboard disponibile.", multipleVehicles: "Sono stati trovati più veicoli. Selezionane uno nell’editor della scheda.", unavailable: "Il veicolo configurato non è disponibile.", auto: "Veicolo: automatico · {vehicle}" },
  es: { cardName: "Historial SV de repostajes", cardDescription: "Repostajes detectados por el nivel de combustible", title: "Historial de repostajes", empty: "No se detectaron repostajes en el período seleccionado.", loading: "Cargando historial de repostajes…", error: "No se pudo cargar el historial de repostajes:", date: "Fecha", liters: "Combustible añadido", level: "Nivel antes / después", hint: "Los repostajes se detectan por aumentos claros del nivel de combustible. Los litros pueden proceder directamente de la fuente o estimarse con la capacidad de depósito configurada; las estimaciones se indican.", estimated: "estimado", vehicle: "Vehículo", selectVehicle: "Seleccionar vehículo…", noInstance: "No hay ninguna instancia de SV Dashboard disponible.", multipleVehicles: "Se encontraron varios vehículos. Selecciona uno en el editor de la tarjeta.", unavailable: "El vehículo configurado no está disponible.", auto: "Vehículo: automático · {vehicle}" },
  pt: { cardName: "Histórico SV de abastecimentos", cardDescription: "Abastecimentos detetados pelo nível de combustível", title: "Histórico de abastecimentos", empty: "Nenhum abastecimento detetado no período selecionado.", loading: "A carregar histórico de abastecimentos…", error: "Não foi possível carregar o histórico de abastecimentos:", date: "Data", liters: "Combustível adicionado", level: "Nível antes / depois", hint: "Os abastecimentos são detetados por aumentos claros do nível de combustível. Os litros podem vir diretamente da fonte ou ser estimados pela capacidade configurada do depósito; as estimativas são assinaladas.", estimated: "estimado", vehicle: "Veículo", selectVehicle: "Selecionar veículo…", noInstance: "Nenhuma instância do SV Dashboard disponível.", multipleVehicles: "Foram encontrados vários veículos. Selecione um no editor do cartão.", unavailable: "O veículo configurado não está disponível.", auto: "Veículo: automático · {vehicle}" },
  nl: { cardName: "SV tankgeschiedenis", cardDescription: "Getankte gebeurtenissen uit brandstofniveau", title: "Tankgeschiedenis", empty: "Geen tankbeurten gedetecteerd in de gekozen periode.", loading: "Tankgeschiedenis laden …", error: "Tankgeschiedenis kon niet worden geladen:", date: "Datum", liters: "Bijgetankt", level: "Niveau voor / na", hint: "Tankbeurten worden herkend aan duidelijke stijgingen van het brandstofniveau. Liters kunnen rechtstreeks uit de bron komen of worden geschat op basis van de ingestelde tankinhoud; schattingen zijn gemarkeerd.", estimated: "geschat", vehicle: "Voertuig", selectVehicle: "Voertuig selecteren…", noInstance: "Geen SV Dashboard-instantie beschikbaar.", multipleVehicles: "Meerdere voertuigen gevonden. Selecteer een voertuig in de kaarteditor.", unavailable: "Het geconfigureerde voertuig is niet beschikbaar.", auto: "Voertuig: automatisch · {vehicle}" },
  da: { cardName: "SV tankhistorik", cardDescription: "Registrerede tankninger fra brændstofniveau", title: "Tankhistorik", empty: "Ingen tankninger registreret i den valgte periode.", loading: "Indlæser tankhistorik …", error: "Tankhistorik kunne ikke indlæses:", date: "Dato", liters: "Påfyldt", level: "Niveau før / efter", hint: "Tankninger registreres ud fra tydelige stigninger i brændstofniveauet. Liter kan komme direkte fra kilden eller estimeres ud fra den konfigurerede tankkapacitet; estimater markeres.", estimated: "estimeret", vehicle: "Køretøj", selectVehicle: "Vælg køretøj…", noInstance: "Ingen SV Dashboard-instans er tilgængelig.", multipleVehicles: "Flere køretøjer fundet. Vælg et køretøj i korteditoren.", unavailable: "Det konfigurerede køretøj er ikke tilgængeligt.", auto: "Køretøj: automatisk · {vehicle}" },
  nb: { cardName: "SV tankhistorikk", cardDescription: "Registrerte fyllinger fra drivstoffnivå", title: "Tankhistorikk", empty: "Ingen fyllinger registrert i valgt periode.", loading: "Laster tankhistorikk …", error: "Tankhistorikk kunne ikke lastes:", date: "Dato", liters: "Påfylt", level: "Nivå før / etter", hint: "Fyllinger registreres fra tydelige økninger i drivstoffnivået. Liter kan komme direkte fra kilden eller beregnes fra konfigurert tankkapasitet; estimater merkes.", estimated: "estimert", vehicle: "Kjøretøy", selectVehicle: "Velg kjøretøy…", noInstance: "Ingen SV Dashboard-instans er tilgjengelig.", multipleVehicles: "Flere kjøretøy funnet. Velg et kjøretøy i korteditoren.", unavailable: "Det konfigurerte kjøretøyet er ikke tilgjengelig.", auto: "Kjøretøy: automatisk · {vehicle}" },
  sv: { cardName: "SV tankhistorik", cardDescription: "Identifierade tankningar från bränslenivå", title: "Tankhistorik", empty: "Inga tankningar identifierades under vald period.", loading: "Läser in tankhistorik …", error: "Tankhistoriken kunde inte läsas in:", date: "Datum", liters: "Påfyllt", level: "Nivå före / efter", hint: "Tankningar identifieras genom tydliga ökningar av bränslenivån. Liter kan komma direkt från källan eller uppskattas från konfigurerad tankvolym; uppskattningar markeras.", estimated: "uppskattat", vehicle: "Fordon", selectVehicle: "Välj fordon…", noInstance: "Ingen SV Dashboard-instans är tillgänglig.", multipleVehicles: "Flera fordon hittades. Välj ett fordon i kortredigeraren.", unavailable: "Det konfigurerade fordonet är inte tillgängligt.", auto: "Fordon: automatiskt · {vehicle}" },
  fi: { cardName: "SV-tankkaushistoria", cardDescription: "Polttoainetason nousuista havaitut tankkaukset", title: "Tankkaushistoria", empty: "Valitulla ajanjaksolla ei havaittu tankkauksia.", loading: "Ladataan tankkaushistoriaa …", error: "Tankkaushistoriaa ei voitu ladata:", date: "Päivä", liters: "Lisätty polttoaine", level: "Taso ennen / jälkeen", hint: "Tankkaukset havaitaan selkeistä polttoainetason nousuista. Litramäärä voi tulla suoraan lähteestä tai se voidaan arvioida määritetyn säiliötilavuuden perusteella; arviot merkitään.", estimated: "arvioitu", vehicle: "Ajoneuvo", selectVehicle: "Valitse ajoneuvo…", noInstance: "SV Dashboard -instanssia ei ole käytettävissä.", multipleVehicles: "Useita ajoneuvoja löytyi. Valitse ajoneuvo korttieditorissa.", unavailable: "Määritetty ajoneuvo ei ole käytettävissä.", auto: "Ajoneuvo: automaattinen · {vehicle}" },
  pl: { cardName: "Historia tankowań SV", cardDescription: "Tankowania wykryte na podstawie poziomu paliwa", title: "Historia tankowań", empty: "Nie wykryto tankowań w wybranym okresie.", loading: "Ładowanie historii tankowań …", error: "Nie udało się wczytać historii tankowań:", date: "Data", liters: "Dolane paliwo", level: "Poziom przed / po", hint: "Tankowania są wykrywane na podstawie wyraźnych wzrostów poziomu paliwa. Litry mogą pochodzić bezpośrednio ze źródła lub być oszacowane z ustawionej pojemności zbiornika; wartości szacowane są oznaczone.", estimated: "szacowane", vehicle: "Pojazd", selectVehicle: "Wybierz pojazd…", noInstance: "Brak dostępnej instancji SV Dashboard.", multipleVehicles: "Znaleziono wiele pojazdów. Wybierz pojazd w edytorze karty.", unavailable: "Skonfigurowany pojazd jest niedostępny.", auto: "Pojazd: automatycznie · {vehicle}" },
  cs: { cardName: "Historie tankování SV", cardDescription: "Tankování zjištěná z úrovně paliva", title: "Historie tankování", empty: "Ve vybraném období nebylo zjištěno žádné tankování.", loading: "Načítání historie tankování …", error: "Historii tankování se nepodařilo načíst:", date: "Datum", liters: "Doplněné palivo", level: "Úroveň před / po", hint: "Tankování se zjišťuje podle výrazného nárůstu hladiny paliva. Litry mohou pocházet přímo ze zdroje nebo být odhadnuty z nastavené kapacity nádrže; odhady jsou označeny.", estimated: "odhad", vehicle: "Vozidlo", selectVehicle: "Vybrat vozidlo…", noInstance: "Není dostupná žádná instance SV Dashboard.", multipleVehicles: "Bylo nalezeno více vozidel. Vyberte vozidlo v editoru karty.", unavailable: "Nakonfigurované vozidlo není dostupné.", auto: "Vozidlo: automaticky · {vehicle}" },
  sk: { cardName: "História tankovaní SV", cardDescription: "Tankovania zistené z úrovne paliva", title: "História tankovaní", empty: "Vo vybranom období nebolo zistené žiadne tankovanie.", loading: "Načítava sa história tankovaní …", error: "Históriu tankovaní sa nepodarilo načítať:", date: "Dátum", liters: "Doplnené palivo", level: "Úroveň pred / po", hint: "Tankovania sa zisťujú podľa výrazného zvýšenia hladiny paliva. Litre môžu pochádzať priamo zo zdroja alebo byť odhadnuté z nastavenej kapacity nádrže; odhady sú označené.", estimated: "odhad", vehicle: "Vozidlo", selectVehicle: "Vybrať vozidlo…", noInstance: "Nie je dostupná žiadna inštancia SV Dashboard.", multipleVehicles: "Bolo nájdených viac vozidiel. Vyberte vozidlo v editore karty.", unavailable: "Nakonfigurované vozidlo nie je dostupné.", auto: "Vozidlo: automaticky · {vehicle}" },
  hu: { cardName: "SV tankolási előzmények", cardDescription: "Üzemanyagszintből felismert tankolások", title: "Tankolási előzmények", empty: "A kiválasztott időszakban nem észlelhető tankolás.", loading: "Tankolási előzmények betöltése …", error: "A tankolási előzmények nem tölthetők be:", date: "Dátum", liters: "Betöltött üzemanyag", level: "Szint előtte / utána", hint: "A tankolásokat az üzemanyagszint egyértelmű emelkedése alapján észleljük. A litermennyiség származhat közvetlenül a forrásból vagy a beállított tankkapacitásból becsülhető; a becsült értékeket jelöljük.", estimated: "becsült", vehicle: "Jármű", selectVehicle: "Jármű kiválasztása…", noInstance: "Nincs elérhető SV Dashboard-példány.", multipleVehicles: "Több jármű található. Válasszon járművet a kártyaszerkesztőben.", unavailable: "A beállított jármű nem érhető el.", auto: "Jármű: automatikus · {vehicle}" },
  ro: { cardName: "Istoric alimentări SV", cardDescription: "Alimentări detectate din nivelul combustibilului", title: "Istoric alimentări", empty: "Nu au fost detectate alimentări în perioada selectată.", loading: "Se încarcă istoricul alimentărilor …", error: "Istoricul alimentărilor nu a putut fi încărcat:", date: "Data", liters: "Combustibil adăugat", level: "Nivel înainte / după", hint: "Alimentările sunt detectate din creșteri clare ale nivelului de combustibil. Litrii pot proveni direct din sursă sau pot fi estimați din capacitatea configurată a rezervorului; estimările sunt marcate.", estimated: "estimat", vehicle: "Vehicul", selectVehicle: "Selectați vehiculul…", noInstance: "Nu este disponibilă nicio instanță SV Dashboard.", multipleVehicles: "Au fost găsite mai multe vehicule. Selectați un vehicul în editorul cardului.", unavailable: "Vehiculul configurat nu este disponibil.", auto: "Vehicul: automat · {vehicle}" },
  sl: { cardName: "SV zgodovina točenj", cardDescription: "Točenja zaznana iz ravni goriva", title: "Zgodovina točenj", empty: "V izbranem obdobju ni bilo zaznanih točenj.", loading: "Nalaganje zgodovine točenj …", error: "Zgodovine točenj ni bilo mogoče naložiti:", date: "Datum", liters: "Dodano gorivo", level: "Raven prej / potem", hint: "Točenja se zaznajo iz jasnih povečanj ravni goriva. Litri so lahko podani neposredno ali ocenjeni iz nastavljene prostornine rezervoarja; ocene so označene.", estimated: "ocenjeno", vehicle: "Vozilo", selectVehicle: "Izberite vozilo…", noInstance: "Nobena instanca SV Dashboard ni na voljo.", multipleVehicles: "Najdenih je več vozil. Izberite vozilo v urejevalniku kartice.", unavailable: "Konfigurirano vozilo ni na voljo.", auto: "Vozilo: samodejno · {vehicle}" },
  hr: { cardName: "SV povijest točenja", cardDescription: "Točenja otkrivena iz razine goriva", title: "Povijest točenja", empty: "U odabranom razdoblju nije otkriveno točenje.", loading: "Učitavanje povijesti točenja …", error: "Povijest točenja nije se mogla učitati:", date: "Datum", liters: "Dodano gorivo", level: "Razina prije / poslije", hint: "Točenja se prepoznaju po jasnom porastu razine goriva. Litre može dati izvor izravno ili se mogu procijeniti iz konfiguriranog kapaciteta spremnika; procjene su označene.", estimated: "procijenjeno", vehicle: "Vozilo", selectVehicle: "Odaberite vozilo…", noInstance: "Nema dostupne instance SV Dashboarda.", multipleVehicles: "Pronađeno je više vozila. Odaberite vozilo u uređivaču kartice.", unavailable: "Konfigurirano vozilo nije dostupno.", auto: "Vozilo: automatski · {vehicle}" },
},
};

const SUPPORTED_LANGUAGES = new Set([
  "de", "en", "fr", "it", "es", "pt", "nl", "da", "nb", "sv", "fi", "pl", "cs", "sk", "hu", "ro", "sl", "hr",
]);
const LOCALE_BY_LANGUAGE = {
  de: "de-DE", en: "en-US", fr: "fr-FR", it: "it-IT", es: "es-ES", pt: "pt-PT", nl: "nl-NL", da: "da-DK",
  nb: "nb-NO", sv: "sv-SE", fi: "fi-FI", pl: "pl-PL", cs: "cs-CZ", sk: "sk-SK", hu: "hu-HU", ro: "ro-RO", sl: "sl-SI", hr: "hr-HR",
};

for (const catalog of [WESTERN_TEXT, NORTHERN_TEXT, EASTERN_TEXT]) {
  for (const [language, namespaces] of Object.entries(catalog)) {
    for (const [namespace, translated] of Object.entries(namespaces)) {
      FRONTEND_TEXT[namespace][language] = { ...FRONTEND_TEXT[namespace].en, ...translated };
    }
  }
}

const CAPABILITY_LABELS = {
  de: ["Kraftstoff", "Kraftstoffreichweite", "Kraftstoffverbrauch"], en: ["Fuel", "Fuel range", "Fuel consumption"],
  fr: ["Carburant", "Autonomie carburant", "Consommation carburant"], it: ["Carburante", "Autonomia carburante", "Consumo carburante"],
  es: ["Combustible", "Autonomía de combustible", "Consumo de combustible"], pt: ["Combustível", "Autonomia de combustível", "Consumo de combustível"],
  nl: ["Brandstof", "Brandstofbereik", "Brandstofverbruik"], da: ["Brændstof", "Brændstofrækkevidde", "Brændstofforbrug"],
  nb: ["Drivstoff", "Drivstoffrekkevidde", "Drivstofforbruk"], sv: ["Bränsle", "Bränsleräckvidd", "Bränsleförbrukning"],
  fi: ["Polttoaine", "Polttoaineen toimintamatka", "Polttoaineenkulutus"], pl: ["Paliwo", "Zasięg na paliwie", "Zużycie paliwa"],
  cs: ["Palivo", "Dojezd na palivo", "Spotřeba paliva"], sk: ["Palivo", "Dojazd na palivo", "Spotreba paliva"],
  hu: ["Üzemanyag", "Üzemanyag-hatótáv", "Üzemanyag-fogyasztás"], ro: ["Combustibil", "Autonomie combustibil", "Consum combustibil"],
  sl: ["Gorivo", "Doseg z gorivom", "Poraba goriva"], hr: ["Gorivo", "Doseg goriva", "Potrošnja goriva"],
};
for (const [language, [fuel, fuelRange, fuelConsumption]] of Object.entries(CAPABILITY_LABELS)) {
  FRONTEND_TEXT.vehicleOverview[language] = { ...FRONTEND_TEXT.vehicleOverview.en, ...FRONTEND_TEXT.vehicleOverview[language], fuel };
  FRONTEND_TEXT.dashboard[language] = { ...FRONTEND_TEXT.dashboard.en, ...FRONTEND_TEXT.dashboard[language], fuel, fuelRange, fuelConsumption };
}

function normalizeLanguage(value) {
  const normalized = String(value || "").trim().toLowerCase().replaceAll("_", "-");
  if (!normalized) return "";
  const base = normalized.split("-")[0];
  if (base === "no") return "nb";
  return base;
}

export function languageFor(context) {
  const explicit = normalizeLanguage(context?.language);
  if (SUPPORTED_LANGUAGES.has(explicit)) return explicit;
  const requested = normalizeLanguage(context?.locale?.language || (typeof navigator !== "undefined" ? navigator.language : "en") || "en");
  return SUPPORTED_LANGUAGES.has(requested) ? requested : "en";
}

export function localeFor(context) {
  return LOCALE_BY_LANGUAGE[languageFor(context)] || "en-US";
}

export function textFor(context, namespace) {
  return FRONTEND_TEXT[namespace][languageFor(context)] || FRONTEND_TEXT[namespace].en;
}

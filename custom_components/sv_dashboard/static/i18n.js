/* Runtime composition layer for the bundled Lovelace localisation catalogs.
 *
 * Keep the established DE/EN/FR + base extra-language catalog in i18n-core.js,
 * then overlay the reviewed advanced completion catalogs. Browser-facing imports use explicit content cache keys; the changed core catalog is cache-busted for beta.10.
 */
import {
  FRONTEND_TEXT,
  languageFor,
  localeFor,
  textFor,
} from "./i18n-core.js?v=0.6.0-beta.10";
import { ADVANCED_FRONTEND_TEXT as WESTERN_ADVANCED } from "./i18n-advanced-west.js?v=0.6.0-beta.7";
import { ADVANCED_FRONTEND_TEXT as NORTHERN_ADVANCED } from "./i18n-advanced-north.js?v=0.6.0-beta.7";
import { ADVANCED_FRONTEND_TEXT as EASTERN_ADVANCED } from "./i18n-advanced-east.js?v=0.6.0-beta.7";

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

// Capability labels are owned by the per-language catalogs.

export { FRONTEND_TEXT, languageFor, localeFor, textFor };
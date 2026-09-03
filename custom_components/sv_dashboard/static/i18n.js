/* Runtime composition layer for the bundled Lovelace localisation catalogs.
 *
 * Keep the established DE/EN/FR + base extra-language catalog in i18n-core.js,
 * then overlay the reviewed advanced completion catalogs. All browser-facing
 * imports use the same 0.6.0-beta.6 cache key as the release candidate resources.
 */
import {
  FRONTEND_TEXT,
  languageFor,
  localeFor,
  textFor,
} from "./i18n-core.js?v=0.6.0-beta.6";
import { ADVANCED_FRONTEND_TEXT as WESTERN_ADVANCED } from "./i18n-advanced-west.js?v=0.6.0-beta.6";
import { ADVANCED_FRONTEND_TEXT as NORTHERN_ADVANCED } from "./i18n-advanced-north.js?v=0.6.0-beta.6";
import { ADVANCED_FRONTEND_TEXT as EASTERN_ADVANCED } from "./i18n-advanced-east.js?v=0.6.0-beta.6";

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

// Capability labels are owned by the per-language catalogs.

export { FRONTEND_TEXT, languageFor, localeFor, textFor };

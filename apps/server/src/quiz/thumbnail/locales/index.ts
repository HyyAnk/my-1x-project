import type { SupportedLanguage, ThumbnailLocalization } from "./types.js";
import { daLocale } from "./da.js";
import { deLocale } from "./de.js";
import { enLocale } from "./en.js";
import { esLocale } from "./es.js";
import { fiLocale } from "./fi.js";
import { frLocale } from "./fr.js";
import { jaLocale } from "./ja.js";
import { koLocale } from "./ko.js";
import { nlLocale } from "./nl.js";
import { noLocale } from "./no.js";
import { svLocale } from "./sv.js";

export const THUMBNAIL_LOCALIZATIONS: Record<SupportedLanguage, ThumbnailLocalization> = {
  nl: nlLocale,
  no: noLocale,
  sv: svLocale,
  da: daLocale,
  fi: fiLocale,
  de: deLocale,
  fr: frLocale,
  ja: jaLocale,
  ko: koLocale,
  es: esLocale,
  en: enLocale,
};

export * from "./types.js";
export * from "./curiosityBadges.js";
export * from "./topicHooks.js";
export * from "./da.js";
export * from "./de.js";
export * from "./en.js";
export * from "./es.js";
export * from "./fi.js";
export * from "./fr.js";
export * from "./ja.js";
export * from "./ko.js";
export * from "./nl.js";
export * from "./no.js";
export * from "./sv.js";

import type { SupportedLanguage } from "./types.js";
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

const QUESTION_COUNT_LOCALES = {
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

export const CURIOSITY_BADGE_LOCALIZATIONS: Record<string, Record<SupportedLanguage, string>> = {
  "99_percent_fail": {
    en: "99% FAIL! 🔥",
    ja: "99%が間違える! 🔥",
    ko: "99%가 틀리는 퀴즈! 🔥",
    de: "99% SCHEITERN! 🔥",
    fr: "99% ÉCHOUENT ! 🔥",
    nl: "99% FAALT! 🔥",
    no: "99% MISSLYKKES! 🔥",
    sv: "99% MISSLYCKAS! 🔥",
    da: "99% FEJLER! 🔥",
    fi: "99% EPÄONNISTUU! 🔥",
    es: "¡99% FALLA! 🔥",
  },
  genius_only: {
    en: "GENIUS ONLY 🧠",
    ja: "天才専用 🧠",
    ko: "천재 전용 🧠",
    de: "NUR FÜR GENIES 🧠",
    fr: "RÉSERVÉ AUX GÉNIES 🧠",
    nl: "ALLEEN VOOR GENIEËN 🧠",
    no: "KUN FOR GENIER 🧠",
    sv: "ENDAST FÖR GENIER 🧠",
    da: "KUN FOR GENIER 🧠",
    fi: "VAIN NEROILLE 🧠",
    es: "SOLO PARA GENIOS 🧠",
  },
  iq_test: {
    en: "IQ 140+ TEST ⚡",
    ja: "IQ140+ 診断 ⚡",
    ko: "IQ 140+ 테스트 ⚡",
    de: "IQ 140+ TEST ⚡",
    fr: "TEST DE QI 140+ ⚡",
    nl: "IQ 140+ TEST ⚡",
    no: "IQ 140+ TEST ⚡",
    sv: "IQ 140+ TEST ⚡",
    da: "IQ 140+ TEST ⚡",
    fi: "IQ 140+ TESTI ⚡",
    es: "TEST DE CI 140+ ⚡",
  },
  can_you_pass: {
    en: "CAN YOU PASS? 🎯",
    ja: "全問正解できる？ 🎯",
    ko: "만점 가능할까? 🎯",
    de: "SCHAFFST DU ES? 🎯",
    fr: "PEUX-TU RÉUSSIR ? 🎯",
    nl: "KUN JIJ DIT? 🎯",
    no: "KLARER DU DET? 🎯",
    sv: "KLARAR DU DET? 🎯",
    da: "KAN DU KLARE DET? 🎯",
    fi: "PÄRJÄÄTKÖ? 🎯",
    es: "¿PUEDES PASARLO? 🎯",
  },
  only_1_percent: {
    en: "ONLY 1% KNOW! 🏆",
    ja: "正解率1% 🏆",
    ko: "정답률 1% 🏆",
    de: "NUR 1% WEISS ES! 🏆",
    fr: "SEULEMENT 1% SAIT ! 🏆",
    nl: "SLECHTS 1% WEET HET! 🏆",
    no: "KUN 1% VET DET! 🏆",
    sv: "ENDAST 1% VET! 🏆",
    da: "KUN 1% VED DET! 🏆",
    fi: "VAIN 1% TIETÄÄ! 🏆",
    es: "¡SOLO EL 1% LO SABE! 🏆",
  },
};

export const AUTO_CURIOSITY_BADGE_PRESETS = [
  "layout_default",
  "99_percent_fail",
  "genius_only",
  "iq_test",
  "can_you_pass",
  "only_1_percent",
  "question_count",
] as const;

/**
 * Randomly picks from available curiosity badge presets (or layout default) in the target language.
 */
export function getRandomCuriosityBadge(
  count: number,
  language: SupportedLanguage,
  defaultBadge: string,
  rng: () => number = Math.random,
): string {
  const idx = Math.floor(rng() * AUTO_CURIOSITY_BADGE_PRESETS.length);
  const picked = AUTO_CURIOSITY_BADGE_PRESETS[idx];

  if (picked === "layout_default") {
    return defaultBadge;
  }
  if (picked === "question_count") {
    const locale = QUESTION_COUNT_LOCALES[language] || QUESTION_COUNT_LOCALES.en;
    return locale.badgeTemplate.mega_grid(count);
  }
  const preset = CURIOSITY_BADGE_LOCALIZATIONS[picked];
  if (preset) {
    return preset[language] || preset.en;
  }
  return defaultBadge;
}

/**
 * Resolves curiosity-triggering badge text based on preset ID, stochastic auto mode, or fallback.
 */
export function getCuriosityBadgeText(
  badgeType: string | undefined,
  count: number,
  language: SupportedLanguage,
  defaultBadge: string,
  rng: () => number = Math.random,
): string {
  if (!badgeType) {
    return defaultBadge;
  }
  if (badgeType === "auto") {
    return getRandomCuriosityBadge(count, language, defaultBadge, rng);
  }
  if (badgeType === "question_count") {
    const locale = QUESTION_COUNT_LOCALES[language] || QUESTION_COUNT_LOCALES.en;
    return locale.badgeTemplate.mega_grid(count);
  }
  const preset = CURIOSITY_BADGE_LOCALIZATIONS[badgeType];
  if (preset) {
    return preset[language] || preset.en;
  }
  return badgeType;
}

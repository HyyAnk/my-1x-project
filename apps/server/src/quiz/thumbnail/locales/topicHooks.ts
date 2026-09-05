import type { SupportedLanguage } from "./types.js";

const SPACE_HOOKS: Record<SupportedLanguage, string> = {
  en: "SOLAR SYSTEM QUIZ",
  ja: "宇宙クイズ",
  ko: "우주 퀴즈",
  de: "PLANETEN QUIZ",
  fr: "QUIZ ESPACE",
  nl: "RUIMTE QUIZ",
  no: "ROMMET QUIZ",
  sv: "RYMDEN QUIZ",
  da: "RUMMET QUIZ",
  fi: "AVARUUSVISA",
  es: "QUIZ DEL ESPACIO",
};

const ANIMAL_HOOKS: Record<SupportedLanguage, string> = {
  en: "ANIMAL QUIZ",
  ja: "動物クイズ",
  ko: "동물 퀴즈",
  de: "TIER QUIZ",
  fr: "QUIZ ANIMAUX",
  nl: "DIEREN QUIZ",
  no: "DYRE QUIZ",
  sv: "DJUR QUIZ",
  da: "DYRE QUIZ",
  fi: "ELÄINVISA",
  es: "QUIZ DE ANIMALES",
};

const FLAG_HOOKS: Record<SupportedLanguage, string> = {
  en: "WORLD FLAG QUIZ",
  ja: "国旗クイズ",
  ko: "국기 퀴즈",
  de: "FLAGGEN QUIZ",
  fr: "QUIZ DRAPEAUX",
  nl: "VLAGGEN QUIZ",
  no: "FLAGG QUIZ",
  sv: "FLAGG QUIZ",
  da: "FLAG QUIZ",
  fi: "LIPPUVISA",
  es: "QUIZ DE BANDERAS",
};

const COOKIE_HOOKS: Record<SupportedLanguage, string> = {
  en: "WORLD COOKIE TOUR!",
  ja: "世界のお菓子クイズ！",
  ko: "세계 쿠키 퀴즈!",
  de: "WELT KEKS QUIZ!",
  fr: "QUIZ GÂTEAUX DU MONDE !",
  nl: "WERELD KOEKJES QUIZ!",
  no: "VERDENS KJEKS QUIZ!",
  sv: "VÄRLDENS KAKOR QUIZ!",
  da: "VERDENS SMÅKAGER QUIZ!",
  fi: "MAAILMAN KEKSIT VISA!",
  es: "¡QUIZ DE GALLETAS DEL MUNDO!",
};

const CAR_HOOKS: Record<SupportedLanguage, string> = {
  en: "SUPERCARS SPEED QUIZ!",
  ja: "スーパーカークイズ！",
  ko: "슈퍼카 스피드 퀴즈!",
  de: "SUPERCARS QUIZ!",
  fr: "QUIZ SUPERCARS !",
  nl: "SUPERCARS QUIZ!",
  no: "SUPERCARS QUIZ!",
  sv: "SUPERCARS QUIZ!",
  da: "SUPERCARS QUIZ!",
  fi: "SUPERAUTOT VISA!",
  es: "¡QUIZ DE SUPERCARS!",
};

/**
 * Resolves topic-specific high-CTR hook headline if applicable (e.g. Solar System -> SOLAR SYSTEM QUIZ).
 */
export function resolveTopicSpecificHook(topicText: string, language: SupportedLanguage): string | null {
  const lower = topicText.toLowerCase();

  // 1. Space & Solar System
  if (
    lower.includes("solar system") ||
    lower.includes("planet") ||
    lower.includes("space") ||
    lower.includes("astronomy") ||
    lower.includes("mars") ||
    lower.includes("jupiter") ||
    lower.includes("saturn") ||
    lower.includes("宇宙") ||
    lower.includes("惑星")
  ) {
    return SPACE_HOOKS[language] || SPACE_HOOKS.en;
  }

  // 2. Animals
  if (
    lower.includes("animal") ||
    lower.includes("wildlife") ||
    lower.includes("creature") ||
    lower.includes("動物")
  ) {
    return ANIMAL_HOOKS[language] || ANIMAL_HOOKS.en;
  }

  // 3. Flags & Geography
  if (
    lower.includes("flag") ||
    lower.includes("country") ||
    lower.includes("geography") ||
    lower.includes("国旗")
  ) {
    return FLAG_HOOKS[language] || FLAG_HOOKS.en;
  }

  // 4. Food, Bakery & Cookies
  if (
    lower.includes("bake") ||
    lower.includes("cookie") ||
    lower.includes("biscuit") ||
    lower.includes("pastry") ||
    lower.includes("dessert") ||
    lower.includes("cake") ||
    lower.includes("culinary") ||
    lower.includes("スイーツ") ||
    lower.includes("お菓子")
  ) {
    return COOKIE_HOOKS[language] || COOKIE_HOOKS.en;
  }

  // 5. Supercars & Racing
  if (
    lower.includes("supercar") ||
    lower.includes("hypercar") ||
    lower.includes("racing")
  ) {
    return CAR_HOOKS[language] || CAR_HOOKS.en;
  }

  return null;
}

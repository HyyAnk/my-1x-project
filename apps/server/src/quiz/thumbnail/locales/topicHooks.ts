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

const SPACE_KEYWORDS = ["solar system", "planet", "space", "astronomy", "mars", "jupiter", "saturn", "宇宙", "惑星"];
const ANIMAL_KEYWORDS = ["animal", "wildlife", "creature", "動物"];
const FLAG_KEYWORDS = ["flag", "country", "geography", "国旗"];
const COOKIE_KEYWORDS = ["bake", "cookie", "biscuit", "pastry", "dessert", "cake", "culinary", "スイーツ", "お菓子"];
const CAR_KEYWORDS = ["supercar", "hypercar", "racing"];

function matchesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

/**
 * Resolves topic-specific high-CTR hook headline if applicable (e.g. Solar System -> SOLAR SYSTEM QUIZ).
 */
export function resolveTopicSpecificHook(topicText: string, language: SupportedLanguage): string | null {
  const lower = topicText.toLowerCase();

  if (matchesAny(lower, SPACE_KEYWORDS)) {
    return SPACE_HOOKS[language] || SPACE_HOOKS.en;
  }
  if (matchesAny(lower, ANIMAL_KEYWORDS)) {
    return ANIMAL_HOOKS[language] || ANIMAL_HOOKS.en;
  }
  if (matchesAny(lower, FLAG_KEYWORDS)) {
    return FLAG_HOOKS[language] || FLAG_HOOKS.en;
  }
  if (matchesAny(lower, COOKIE_KEYWORDS)) {
    return COOKIE_HOOKS[language] || COOKIE_HOOKS.en;
  }
  if (matchesAny(lower, CAR_KEYWORDS)) {
    return CAR_HOOKS[language] || CAR_HOOKS.en;
  }

  return null;
}

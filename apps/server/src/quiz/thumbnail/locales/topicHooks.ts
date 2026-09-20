import type { SupportedLanguage } from "./types.js";

const SPACE_HOOKS: Record<SupportedLanguage, string> = {
  en: "SOLAR SYSTEM QUIZ",
  ja: "宇宙クイズ",
  ko: "우주 퀴즈",
  zh: "\u592a\u9633\u7cfb\u95ee\u7b54",
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
  zh: "\u52a8\u7269\u95ee\u7b54",
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
  zh: "\u4e16\u754c\u56fd\u65d7\u95ee\u7b54",
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
  zh: "\u4e16\u754c\u751c\u70b9\u95ee\u7b54\uff01",
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
  zh: "\u8d85\u7ea7\u8dd1\u8f66\u95ee\u7b54\uff01",
  de: "SUPERCARS QUIZ!",
  fr: "QUIZ SUPERCARS !",
  nl: "SUPERCARS QUIZ!",
  no: "SUPERCARS QUIZ!",
  sv: "SUPERCARS QUIZ!",
  da: "SUPERCARS QUIZ!",
  fi: "SUPERAUTOT VISA!",
  es: "¡QUIZ DE SUPERCARS!",
};

const SPACE_KEYWORDS = [
  "solar system",
  "planet",
  "space",
  "astronomy",
  "mars",
  "jupiter",
  "saturn",
  "宇宙",
  "惑星",
  "\u592a\u7a7a",
  "\u884c\u661f",
  "\u592a\u9633\u7cfb",
];
const ANIMAL_KEYWORDS = ["animal", "wildlife", "creature", "動物", "\u52a8\u7269", "\u91ce\u751f\u52a8\u7269"];
const FLAG_KEYWORDS = ["flag", "country", "geography", "国旗", "\u56fd\u65d7", "\u5730\u7406"];
const COOKIE_KEYWORDS = [
  "bake",
  "cookie",
  "biscuit",
  "pastry",
  "dessert",
  "cake",
  "culinary",
  "スイーツ",
  "お菓子",
  "\u997c\u5e72",
  "\u751c\u70b9",
  "\u86cb\u7cd5",
  "\u70d8\u7119",
];
const CAR_KEYWORDS = ["supercar", "hypercar", "racing", "\u8d85\u7ea7\u8dd1\u8f66", "\u8d5b\u8f66", "\u6c7d\u8f66"];

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

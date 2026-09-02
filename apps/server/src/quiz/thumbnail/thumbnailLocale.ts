import type { ThumbnailLayoutType } from "@studio/shared";

export type SupportedLanguage =
  | "en"
  | "ja"
  | "vi"
  | "ko"
  | "es"
  | "de"
  | "fr"
  | "nl"
  | "no"
  | "sv"
  | "da"
  | "fi";

export type ThumbnailLocalization = {
  hookText: Record<ThumbnailLayoutType, string>;
  badgeTemplate: Record<ThumbnailLayoutType, (count: number) => string>;
};

export const THUMBNAIL_LOCALIZATIONS: Record<SupportedLanguage, ThumbnailLocalization> = {
  nl: {
    hookText: {
      mega_grid: "ALGEMENE KENNIS",
      split_vs: "WAT ZOU JIJ KIEZEN?",
      mystery_silhouette: "WIE IS DIT?",
      odd_one_out: "ZOEK DE FOUT!",
      difficulty_tier: "KAN JIJ LEVEL 4 AAN?",
      true_false: "WAAR OF NIET WAAR?",
    },
    badgeTemplate: {
      mega_grid: (count) => `${count > 0 ? count : 100} VRAGEN`,
      split_vs: () => "KIES ER ÉÉN! ⚡",
      mystery_silhouette: () => "SLECHTS 1% WEET HET! 🔥",
      odd_one_out: () => "10 SECONDEN! ⏱️",
      difficulty_tier: () => "ALLEEN IQ 140+ 🔥",
      true_false: () => "FEIT OF FABEL? ⚡",
    },
  },
  no: {
    hookText: {
      mega_grid: "GENERELL KUNNSKAP",
      split_vs: "HVA VILLE DU VALGT?",
      mystery_silhouette: "HVEM ER DETTE?",
      odd_one_out: "FINN DEN SOM IKKE PASSER!",
      difficulty_tier: "KLARER DU NIVÅ 4?",
      true_false: "SANT ELLER USANT?",
    },
    badgeTemplate: {
      mega_grid: (count) => `${count > 0 ? count : 100} SPØRSMÅL`,
      split_vs: () => "VELG ÉN! ⚡",
      mystery_silhouette: () => "KUN 1% VET DET! 🔥",
      odd_one_out: () => "10 SEKUNDER! ⏱️",
      difficulty_tier: () => "KUN FOR IQ 140+ 🔥",
      true_false: () => "FAKTA ELLER MYTE? ⚡",
    },
  },
  sv: {
    hookText: {
      mega_grid: "ALLMÄNBILDNING",
      split_vs: "VAD SKULLE DU VÄLJA?",
      mystery_silhouette: "VEM ÄR DET HÄR?",
      odd_one_out: "HITTA DEN SOM SKILJER SIG!",
      difficulty_tier: "KLARAR DU NIVÅ 4?",
      true_false: "SANT ELLER FALSKT?",
    },
    badgeTemplate: {
      mega_grid: (count) => `${count > 0 ? count : 100} FRÅGOR`,
      split_vs: () => "VÄLJ EN! ⚡",
      mystery_silhouette: () => "BARA 1% VET! 🔥",
      odd_one_out: () => "10 SEKUNDER! ⏱️",
      difficulty_tier: () => "ENDAST FÖR IQ 140+ 🔥",
      true_false: () => "FAKTA ELLER MYT? ⚡",
    },
  },
  da: {
    hookText: {
      mega_grid: "ALMEN VIDEN",
      split_vs: "HVAD VILLE DU VÆLGE?",
      mystery_silhouette: "HVEM ER DETTE?",
      odd_one_out: "FIND DEN DER SKILLER SIG UD!",
      difficulty_tier: "KAN DU KLARE NIVEAU 4?",
      true_false: "SANDT ELLER FALSKT?",
    },
    badgeTemplate: {
      mega_grid: (count) => `${count > 0 ? count : 100} SPØRGSMÅL`,
      split_vs: () => "VÆLG ÉN! ⚡",
      mystery_silhouette: () => "KUN 1% VED DET! 🔥",
      odd_one_out: () => "10 SEKUNDER! ⏱️",
      difficulty_tier: () => "KUN FOR IQ 140+ 🔥",
      true_false: () => "FAKTA ELLER MYTE? ⚡",
    },
  },
  fi: {
    hookText: {
      mega_grid: "YLEISTIETO",
      split_vs: "KUMMAN VALITSISIT?",
      mystery_silhouette: "KUKA TÄMÄ ON?",
      odd_one_out: "ETSI ERILAINEN!",
      difficulty_tier: "LÄPÄISETKÖ TASON 4?",
      true_false: "TOTTA VAI TARUA?",
    },
    badgeTemplate: {
      mega_grid: (count) => `${count > 0 ? count : 100} KYSYMYSTÄ`,
      split_vs: () => "VALITSE YKSI! ⚡",
      mystery_silhouette: () => "VAIN 1% TIETÄÄ! 🔥",
      odd_one_out: () => "10 SEKUNTIA! ⏱️",
      difficulty_tier: () => "VAIN IQ 140+ 🔥",
      true_false: () => "FAKTA VAI MYYTTI? ⚡",
    },
  },
  de: {
    hookText: {
      mega_grid: "ALLGEMEINWISSEN",
      split_vs: "WAS WÜRDEST DU WÄHLEN?",
      mystery_silhouette: "WER IST DAS?",
      odd_one_out: "FINDE DEN FEHLER!",
      difficulty_tier: "SCHAFFST DU LEVEL 4?",
      true_false: "WAHR ODER FALSCH?",
    },
    badgeTemplate: {
      mega_grid: (count) => `${count > 0 ? count : 100} FRAGEN`,
      split_vs: () => "WÄHLE EINS! ⚡",
      mystery_silhouette: () => "NUR 1% WEISS ES! 🔥",
      odd_one_out: () => "10 SEKUNDEN! ⏱️",
      difficulty_tier: () => "NUR FÜR IQ 140+ 🔥",
      true_false: () => "FAKT ODER MYTHOS? ⚡",
    },
  },
  fr: {
    hookText: {
      mega_grid: "CULTURE GÉNÉRALE",
      split_vs: "QUE CHOISIRAIS-TU ?",
      mystery_silhouette: "QUI EST-CE ?",
      odd_one_out: "TROUVE L'INTRUS !",
      difficulty_tier: "RÉUSSIRAS-TU LE NIVEAU 4 ?",
      true_false: "VRAI OU FAUX ?",
    },
    badgeTemplate: {
      mega_grid: (count) => `${count > 0 ? count : 100} QUESTIONS`,
      split_vs: () => "CHOISIS UN ! ⚡",
      mystery_silhouette: () => "SEULEMENT 1% SAIT ! 🔥",
      odd_one_out: () => "10 SECONDES ! ⏱️",
      difficulty_tier: () => "SEULEMENT IQ 140+ 🔥",
      true_false: () => "MYTHE OU RÉALITÉ ? ⚡",
    },
  },
  ja: {
    hookText: {
      mega_grid: "一般常識クイズ",
      split_vs: "どっちを選ぶ？",
      mystery_silhouette: "この人は誰？",
      odd_one_out: "間違い探し！",
      difficulty_tier: "レベル4解ける？",
      true_false: "ウソ？ホント？",
    },
    badgeTemplate: {
      mega_grid: (count) => `全${count > 0 ? count : 100}問`,
      split_vs: () => "究極の２択！⚡",
      mystery_silhouette: () => "正解率1%！🔥",
      odd_one_out: () => "10秒で見つけて！⏱️",
      difficulty_tier: () => "IQ140以上のみ🔥",
      true_false: () => "○か✕か！？✅",
    },
  },
  vi: {
    hookText: {
      mega_grid: "KIẾN THỨC CHUNG",
      split_vs: "BẠN SẼ CHỌN GÌ?",
      mystery_silhouette: "ĐÂY LÀ AI?",
      odd_one_out: "TÌM ĐIỂM KHÁC BIỆT!",
      difficulty_tier: "VƯỢT QUA LEVEL 4?",
      true_false: "ĐÚNG HAY SAI?",
    },
    badgeTemplate: {
      mega_grid: (count) => `${count > 0 ? count : 100} CÂU HỎI`,
      split_vs: () => "CHỌN 1 TRONG 2! ⚡",
      mystery_silhouette: () => "CHỈ 1% BIẾT! 🔥",
      odd_one_out: () => "10 GIÂY! ⏱️",
      difficulty_tier: () => "CHỈ DÀNH CHO IQ 140+ 🔥",
      true_false: () => "SỰ THẬT HAY LẦM TƯỞNG? ⚡",
    },
  },
  ko: {
    hookText: {
      mega_grid: "상식 퀴즈",
      split_vs: "당신의 선택은?",
      mystery_silhouette: "이 사람은 누구?",
      odd_one_out: "다른 그림 찾기!",
      difficulty_tier: "레벨 4 풀 수 있을까?",
      true_false: "O vs X 퀴즈",
    },
    badgeTemplate: {
      mega_grid: (count) => `총 ${count > 0 ? count : 100}문제`,
      split_vs: () => "하나만 골라봐! ⚡",
      mystery_silhouette: () => "정답률 1%! 🔥",
      odd_one_out: () => "10초 도전! ⏱️",
      difficulty_tier: () => "IQ 140 이상만🔥",
      true_false: () => "진실 혹은 거짓? ⚡",
    },
  },
  es: {
    hookText: {
      mega_grid: "CULTURA GENERAL",
      split_vs: "¿CUÁL ELIGES?",
      mystery_silhouette: "¿QUIÉN ES?",
      odd_one_out: "¡ENCUENTRA EL DISTINTO!",
      difficulty_tier: "¿PUEDES SUPERAR EL NIVEL 4?",
      true_false: "¿VERDADERO O FALSO?",
    },
    badgeTemplate: {
      mega_grid: (count) => `${count > 0 ? count : 100} PREGUNTAS`,
      split_vs: () => "¡ELIGE UNO! ⚡",
      mystery_silhouette: () => "¡SOLO EL 1% SABE! 🔥",
      odd_one_out: () => "¡10 SEGUNDOS! ⏱️",
      difficulty_tier: () => "SOLO IQ 140+ 🔥",
      true_false: () => "¿MITO O REALIDAD? ⚡",
    },
  },
  en: {
    hookText: {
      mega_grid: "GENERAL KNOWLEDGE",
      split_vs: "WHICH WOULD YOU CHOOSE?",
      mystery_silhouette: "WHO IS THIS?",
      odd_one_out: "FIND THE ODD ONE!",
      difficulty_tier: "CAN YOU SOLVE LEVEL 4?",
      true_false: "TRUE OR FALSE?",
    },
    badgeTemplate: {
      mega_grid: (count) => `${count > 0 ? count : 100} QUESTIONS`,
      split_vs: () => "PICK ONE! ⚡",
      mystery_silhouette: () => "ONLY 1% KNOW! 🔥",
      odd_one_out: () => "10 SECONDS! ⏱️",
      difficulty_tier: () => "IQ 140+ ONLY 🔥",
      true_false: () => "FACT OR MYTH? ⚡",
    },
  },
};

/**
 * Resolves the target language code from channel settings and text analysis.
 */
export function resolveThumbnailLanguage(input: {
  language?: string;
  topicTitle?: string;
  topicSummary?: string;
}): SupportedLanguage {
  const lang = (input.language || "").toLowerCase().trim();

  // 1. Direct language code / name matching
  if (lang.includes("nl") || lang.includes("dutch") || lang.includes("nederland") || lang.includes("hà lan")) {
    return "nl";
  }
  if (lang.includes("no") || lang.includes("norw") || lang.includes("norsk") || lang.includes("na uy")) {
    return "no";
  }
  if (lang.includes("sv") || lang.includes("swed") || lang.includes("svensk") || lang.includes("thụy điển")) {
    return "sv";
  }
  if (lang.includes("da") || lang.includes("dan") || lang.includes("dansk") || lang.includes("đan mạch")) {
    return "da";
  }
  if (lang.includes("fi") || lang.includes("finn") || lang.includes("suom") || lang.includes("phần lan")) {
    return "fi";
  }
  if (lang.includes("de") || lang.includes("german") || lang.includes("deutsch") || lang.includes("tiếng đức")) {
    return "de";
  }
  if (lang.includes("fr") || lang.includes("french") || lang.includes("français") || lang.includes("francais") || lang.includes("tiếng pháp")) {
    return "fr";
  }
  if (lang.includes("ja") || lang.includes("japan") || lang.includes("nihon") || lang.includes("tiếng nhật")) {
    return "ja";
  }
  if (lang.includes("vi") || lang.includes("viet") || lang.includes("tiếng việt")) {
    return "vi";
  }
  if (lang.includes("ko") || lang.includes("korea") || lang.includes("hangul") || lang.includes("tiếng hàn")) {
    return "ko";
  }
  if (lang.includes("es") || lang.includes("span") || lang.includes("tiếng tây ban nha")) {
    return "es";
  }

  // 2. Character Script Heuristics if language is unset or ambiguous
  const combinedText = `${input.topicTitle || ""} ${input.topicSummary || ""}`;

  // Japanese Hiragana/Katakana/Kanji check
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(combinedText)) {
    return "ja";
  }

  // Korean Hangul check
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(combinedText)) {
    return "ko";
  }

  // Vietnamese accent check
  if (
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(combinedText) &&
    !lang.includes("eng")
  ) {
    return "vi";
  }

  return "en";
}

/**
 * Gets localized hook headline and badge template for a given layout and language.
 */
export function getThumbnailLocalizedTexts(
  layout: ThumbnailLayoutType,
  count: number,
  language: SupportedLanguage,
): { hookText: string; badgeText: string } {
  const locale = THUMBNAIL_LOCALIZATIONS[language] || THUMBNAIL_LOCALIZATIONS.en;
  return {
    hookText: locale.hookText[layout] || THUMBNAIL_LOCALIZATIONS.en.hookText[layout],
    badgeText: (locale.badgeTemplate[layout] || THUMBNAIL_LOCALIZATIONS.en.badgeTemplate[layout])(count),
  };
}

export const CURIOSITY_BADGE_LOCALIZATIONS: Record<string, Record<SupportedLanguage, string>> = {
  "99_percent_fail": {
    en: "99% FAIL! 🔥",
    vi: "99% TRẢ LỜI SAI! 🔥",
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
    vi: "CHỈ DÀNH CHO THIÊN TÀI 🧠",
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
    vi: "THỬ THÁCH IQ 140+ ⚡",
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
    vi: "BẠN VƯỢT QUA ĐƯỢC KHÔNG? 🎯",
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
    vi: "CHỈ 1% BIẾT ĐÁP ÁN! 🏆",
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

/**
 * Resolves curiosity-triggering badge text based on preset ID or fallback.
 */
export function getCuriosityBadgeText(
  badgeType: string | undefined,
  count: number,
  language: SupportedLanguage,
  defaultBadge: string,
): string {
  if (!badgeType || badgeType === "auto") {
    return defaultBadge;
  }
  if (badgeType === "question_count") {
    const locale = THUMBNAIL_LOCALIZATIONS[language] || THUMBNAIL_LOCALIZATIONS.en;
    return locale.badgeTemplate.mega_grid(count);
  }
  const preset = CURIOSITY_BADGE_LOCALIZATIONS[badgeType];
  if (preset) {
    return preset[language] || preset.en;
  }
  return badgeType;
}

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
    lower.includes("hành tinh") ||
    lower.includes("vũ trụ") ||
    lower.includes("宇宙") ||
    lower.includes("惑星")
  ) {
    const spaceHooks: Record<SupportedLanguage, string> = {
      en: "SOLAR SYSTEM QUIZ",
      vi: "ĐỐ VUI VŨ TRỤ",
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
    return spaceHooks[language] || spaceHooks.en;
  }

  // 2. Animals
  if (
    lower.includes("animal") ||
    lower.includes("wildlife") ||
    lower.includes("creature") ||
    lower.includes("động vật") ||
    lower.includes("thú cưng") ||
    lower.includes("動物")
  ) {
    const animalHooks: Record<SupportedLanguage, string> = {
      en: "ANIMAL QUIZ",
      vi: "ĐỐ VUI ĐỘNG VẬT",
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
    return animalHooks[language] || animalHooks.en;
  }

  // 3. Flags & Geography
  if (
    lower.includes("flag") ||
    lower.includes("country") ||
    lower.includes("geography") ||
    lower.includes("quốc kỳ") ||
    lower.includes("địa lý") ||
    lower.includes("国旗")
  ) {
    const flagHooks: Record<SupportedLanguage, string> = {
      en: "WORLD FLAG QUIZ",
      vi: "ĐỐ VUI QUỐC KỲ",
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
    return flagHooks[language] || flagHooks.en;
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
    lower.includes("ẩm thực") ||
    lower.includes("bánh") ||
    lower.includes("スイーツ") ||
    lower.includes("お菓子")
  ) {
    const cookieHooks: Record<SupportedLanguage, string> = {
      en: "WORLD COOKIE TOUR!",
      vi: "ĐỐ VUI BÁNH NGỌT!",
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
    return cookieHooks[language] || cookieHooks.en;
  }

  // 5. Supercars & Racing
  if (
    lower.includes("supercar") ||
    lower.includes("hypercar") ||
    lower.includes("racing") ||
    lower.includes("siêu xe") ||
    lower.includes("đua xe")
  ) {
    const carHooks: Record<SupportedLanguage, string> = {
      en: "SUPERCARS SPEED QUIZ!",
      vi: "ĐỐ VUI SIÊU XE TỐC ĐỘ!",
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
    return carHooks[language] || carHooks.en;
  }

  return null;
}





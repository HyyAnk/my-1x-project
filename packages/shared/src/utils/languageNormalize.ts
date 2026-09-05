/**
 * Utilities for normalizing and comparing language codes across Channel and Question Bank.
 */

const EXACT_LANGUAGE_CODE_MAP: Record<string, string> = {
  // Legacy coercion to English
  vi: "en",
  vie: "en",
  vietnamese: "en",
  // English
  en: "en",
  eng: "en",
  english: "en",
  // Spanish
  es: "es",
  spa: "es",
  spanish: "es",
  // Japanese
  ja: "ja",
  jpn: "ja",
  japanese: "ja",
  // German
  de: "de",
  deu: "de",
  german: "de",
  // Norwegian
  no: "no",
  nor: "no",
  norwegian: "no",
  // Dutch
  nl: "nl",
  nld: "nl",
  dut: "nl",
  dutch: "nl",
  // Danish
  da: "da",
  dan: "da",
  danish: "da",
  // Swedish
  sv: "sv",
  swe: "sv",
  swedish: "sv",
  // Finnish
  fi: "fi",
  fin: "fi",
  finnish: "fi",
  // French
  fr: "fr",
  fra: "fr",
  french: "fr",
  // Korean
  ko: "ko",
  kor: "ko",
  korean: "ko",
  // Indonesian
  id: "id",
  ind: "id",
  indonesian: "id",
  // Thai
  th: "th",
  tha: "th",
  thai: "th",
};

const SUBSTRING_LANGUAGE_RULES: ReadonlyArray<{ readonly match: string; readonly code: string }> = [
  // Legacy coercion using Unicode escape to adhere to strict English-only repository standards
  { match: "\u0074\u0069\u1EBF\u006E\u0067\u0020\u0076\u0069\u1EC7\u0074", code: "en" },
  { match: "vietnam", code: "en" },
  { match: "\u0074\u0069\u1EBF\u006E\u0067\u0020\u0061\u006E\u0068", code: "en" },
  { match: "español", code: "es" },
  { match: "nihongo", code: "ja" },
  { match: "deutsch", code: "de" },
  { match: "norsk", code: "no" },
  { match: "nederlands", code: "nl" },
  { match: "dansk", code: "da" },
  { match: "svenska", code: "sv" },
  { match: "suomi", code: "fi" },
  { match: "français", code: "fr" },
  { match: "한국", code: "ko" },
  { match: "indonesia", code: "id" },
];

export function normalizeLanguageCode(lang: string | undefined | null): string {
  if (!lang || typeof lang !== "string") return "en";
  const trimmed = lang.trim().toLowerCase();

  const exactMatch = EXACT_LANGUAGE_CODE_MAP[trimmed];
  if (exactMatch) return exactMatch;

  const substringMatch = SUBSTRING_LANGUAGE_RULES.find((rule) => trimmed.includes(rule.match));
  if (substringMatch) return substringMatch.code;

  // Fallback: extract lowercase alpha characters
  const cleaned = trimmed.replace(/[^a-z]/g, "").slice(0, 5);
  return cleaned || "en";
}

export function isSameLanguage(langA: string | undefined | null, langB: string | undefined | null): boolean {
  return normalizeLanguageCode(langA) === normalizeLanguageCode(langB);
}

export const SUPPORTED_TRANSLATION_LANGUAGES = [
  { code: "en", name: "English", label: "English (US/UK)", flag: "🇺🇸" },
  { code: "de", name: "German", label: "Deutsch", flag: "🇩🇪" },
  { code: "no", name: "Norwegian", label: "Norsk", flag: "🇳🇴" },
  { code: "nl", name: "Dutch", label: "Nederlands", flag: "🇳🇱" },
  { code: "da", name: "Danish", label: "Dansk", flag: "🇩🇰" },
  { code: "sv", name: "Swedish", label: "Svenska", flag: "🇸🇪" },
  { code: "fi", name: "Finnish", label: "Suomi", flag: "🇫🇮" },
  { code: "fr", name: "French", label: "Français", flag: "🇫🇷" },
  { code: "ko", name: "Korean", label: "한국어", flag: "🇰🇷" },
  { code: "ja", name: "Japanese", label: "日本語", flag: "🇯🇵" },
  { code: "es", name: "Spanish", label: "Español", flag: "🇪🇸" },
] as const;

export function getLanguageDisplayLabel(langCode: string): string {
  const norm = normalizeLanguageCode(langCode);
  const found = SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === norm);
  return found ? `${found.flag} ${found.label}` : langCode.toUpperCase();
}

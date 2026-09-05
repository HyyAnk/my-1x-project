/**
 * Utilities for normalizing and comparing language codes across Channel and Question Bank.
 */

export function normalizeLanguageCode(lang: string | undefined | null): string {
  if (!lang || typeof lang !== "string") return "en";
  const trimmed = lang.trim().toLowerCase();

  // Legacy Vietnamese inputs are coerced to English
  if (
    trimmed === "vi" ||
    trimmed === "vie" ||
    trimmed === "vietnamese" ||
    trimmed.includes("tiếng việt") ||
    trimmed.includes("vietnam")
  ) {
    return "en";
  }
  if (
    trimmed === "en" ||
    trimmed === "eng" ||
    trimmed === "english" ||
    trimmed.includes("tiếng anh")
  ) {
    return "en";
  }
  if (
    trimmed === "es" ||
    trimmed === "spa" ||
    trimmed === "spanish" ||
    trimmed.includes("español")
  ) {
    return "es";
  }
  if (
    trimmed === "ja" ||
    trimmed === "jpn" ||
    trimmed === "japanese" ||
    trimmed.includes("nihongo")
  ) {
    return "ja";
  }
  if (
    trimmed === "de" ||
    trimmed === "deu" ||
    trimmed === "german" ||
    trimmed.includes("deutsch")
  ) {
    return "de";
  }
  if (
    trimmed === "no" ||
    trimmed === "nor" ||
    trimmed === "norwegian" ||
    trimmed.includes("norsk")
  ) {
    return "no";
  }
  if (
    trimmed === "nl" ||
    trimmed === "nld" ||
    trimmed === "dut" ||
    trimmed === "dutch" ||
    trimmed.includes("nederlands")
  ) {
    return "nl";
  }
  if (
    trimmed === "da" ||
    trimmed === "dan" ||
    trimmed === "danish" ||
    trimmed.includes("dansk")
  ) {
    return "da";
  }
  if (
    trimmed === "sv" ||
    trimmed === "swe" ||
    trimmed === "swedish" ||
    trimmed.includes("svenska")
  ) {
    return "sv";
  }
  if (
    trimmed === "fi" ||
    trimmed === "fin" ||
    trimmed === "finnish" ||
    trimmed.includes("suomi")
  ) {
    return "fi";
  }
  if (
    trimmed === "fr" ||
    trimmed === "fra" ||
    trimmed === "french" ||
    trimmed.includes("français")
  ) {
    return "fr";
  }
  if (
    trimmed === "ko" ||
    trimmed === "kor" ||
    trimmed === "korean" ||
    trimmed.includes("한국")
  ) {
    return "ko";
  }
  if (
    trimmed === "ja" ||
    trimmed === "jpn" ||
    trimmed === "japanese" ||
    trimmed.includes("nihongo")
  ) {
    return "ja";
  }
  if (
    trimmed === "es" ||
    trimmed === "spa" ||
    trimmed === "spanish" ||
    trimmed.includes("español")
  ) {
    return "es";
  }
  if (
    trimmed === "id" ||
    trimmed === "ind" ||
    trimmed === "indonesian" ||
    trimmed.includes("indonesia")
  ) {
    return "id";
  }
  if (
    trimmed === "th" ||
    trimmed === "tha" ||
    trimmed === "thai"
  ) {
    return "th";
  }

  // Fallback: extract lowercase alpha characters
  const cleaned = trimmed.replace(/[^a-z]/g, "").slice(0, 5);
  return cleaned || "en";
}

export function isSameLanguage(
  langA: string | undefined | null,
  langB: string | undefined | null,
): boolean {
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

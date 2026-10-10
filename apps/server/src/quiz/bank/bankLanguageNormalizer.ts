const LANGUAGE_ALIASES: Record<string, string> = {
  en: "en",
  eng: "en",
  english: "en",
  es: "es",
  spa: "es",
  spanish: "es",
  ja: "ja",
  jpn: "ja",
  japanese: "ja",
  de: "de",
  deu: "de",
  german: "de",
  no: "no",
  nor: "no",
  norwegian: "no",
  nl: "nl",
  nld: "nl",
  dut: "nl",
  dutch: "nl",
  da: "da",
  dan: "da",
  danish: "da",
  sv: "sv",
  swe: "sv",
  swedish: "sv",
  fi: "fi",
  fin: "fi",
  finnish: "fi",
  fr: "fr",
  fra: "fr",
  french: "fr",
  ko: "ko",
  kor: "ko",
  korean: "ko",
  id: "id",
  ind: "id",
  indonesian: "id",
  th: "th",
  tha: "th",
  thai: "th",
  vi: "vi",
  vie: "vi",
  vietnamese: "vi",
};

/** Maps free-form Bank language metadata ("English", "en-US", "eng") to a two-letter code, or null when unknown. */
export function normalizeBankLanguage(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const normalized = LANGUAGE_ALIASES[trimmed.replaceAll("_", "-")];
  if (normalized) return normalized;
  const regionalMatch = trimmed.match(/^([a-z]{2,3})[-_][a-z]{2,4}$/);
  return regionalMatch ? (LANGUAGE_ALIASES[regionalMatch[1]] ?? null) : null;
}

export const VIETNAMESE_LANGUAGE_CODES = new Set(["vi", "vie", "vietnamese"]);

/**
 * Resolves an explicit generation target to a persisted base language code.
 * Requires English generation and rejects Vietnamese generation targets.
 */
export function normalizeGenerationLanguage(language?: string): string | undefined {
  if (language === undefined || language.trim() === "") return "en";
  const normalizedInput = language.trim().toLowerCase().replaceAll("_", "-");
  const baseInput = normalizedInput.split("-", 1)[0];
  if (VIETNAMESE_LANGUAGE_CODES.has(normalizedInput) || VIETNAMESE_LANGUAGE_CODES.has(baseInput)) {
    throw new Error("Vietnamese generation targets are not supported");
  }
  if (normalizedInput === "en" || normalizedInput === "eng" || normalizedInput === "english" || baseInput === "en") {
    return "en";
  }
  throw new Error(`Bank generation requires English; received '${language}'`);
}

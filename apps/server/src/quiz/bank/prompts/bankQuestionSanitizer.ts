import type { BankGameplayArchetypeId } from "@studio/shared";

/**
 * Cleans formulaic redundancies from generated question text.
 * Specifically removes trailing ': Option A or Option B?' from versus_faceoff
 * where options match choice texts, removes robotic mismatch slogans,
 * and dynamically rewrites repetitive "odd one out" phrases in visual_spotting.
 */
export function sanitizeBankQuestionText(
  questionText: string,
  archetypeId?: BankGameplayArchetypeId,
  choices?: Array<{ text: string }>,
): string {
  if (!questionText || typeof questionText !== "string") return questionText;
  let cleaned = questionText.trim();

  if (archetypeId === "versus_faceoff" && choices && choices.length === 2) {
    const c0 = choices[0]?.text?.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const c1 = choices[1]?.text?.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (c0 && c1) {
      const trailingPattern = new RegExp(
        `[:\\-\\s]+(?:${c0}\\s*(?:or|vs\\.?|and)\\s*${c1}|${c1}\\s*(?:or|vs\\.?|and)\\s*${c0})\\s*\\??$`,
        "i",
      );
      if (trailingPattern.test(cleaned)) {
        cleaned = cleaned.replace(trailingPattern, "").trim();
        if (!cleaned.endsWith("?")) cleaned += "?";
      }
    }
  }

  if (archetypeId === "visual_spotting") {
    // 1. Remove robotic trailing slogans like '— spot the mismatch!'
    const trailingMismatchPattern = /[:\s—–-]+(?:spot|find)\s+the\s+mismatch\s*!?$/i;
    if (trailingMismatchPattern.test(cleaned)) {
      cleaned = cleaned.replace(trailingMismatchPattern, "").trim();
      if (!cleaned.endsWith("?") && !cleaned.endsWith("!")) {
        cleaned += "?";
      }
    }

    // 2. Rewrite formulaic opening 'Spot/Find the odd one out:' to 'Spot/Find the outlier:'
    cleaned = cleaned.replace(/^(Spot|Find)\s+the\s+odd\s+one\s+out\s*([:—–-])/i, "$1 the outlier$2");

    // 3. Rewrite formulaic trailing 'is the odd one out?' to 'is the outlier?'
    if (/(?:\s+is)?\s+the\s+odd\s+one\s+out\s*\??$/i.test(cleaned)) {
      cleaned = cleaned.replace(/(?:\s+is)?\s+the\s+odd\s+one\s+out\s*\??$/i, " is the outlier?").trim();
      cleaned = cleaned.replace(/\s+is\s+is\s+the\s+outlier\?$/i, " is the outlier?");
    }
  }

  return cleaned;
}

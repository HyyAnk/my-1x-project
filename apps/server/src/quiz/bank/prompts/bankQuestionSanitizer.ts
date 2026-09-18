import type { BankGameplayArchetypeId } from "@studio/shared";

/**
 * Cleans formulaic redundancies from generated question text.
 * Specifically removes trailing ': Option A or Option B?' from versus_faceoff
 * where options match choice texts, and removes robotic mismatch slogans
 * from visual_spotting questions.
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
    const trailingMismatchPattern = /[:\s—–-]+(?:spot|find)\s+the\s+mismatch\s*!?$/i;
    if (trailingMismatchPattern.test(cleaned)) {
      cleaned = cleaned.replace(trailingMismatchPattern, "").trim();
      if (!cleaned.endsWith("?") && !cleaned.endsWith("!")) {
        cleaned += "?";
      }
    }
  }

  return cleaned;
}

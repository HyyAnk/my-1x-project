const TRAILING_PUNCTUATION_REGEX = /[\s.,;:!?…。！？]+$/u;

/**
 * Normalizes question punctuation to guarantee that every quiz question
 * ends cleanly with a single question mark ('?').
 *
 * Handles:
 * - Trimming leading and trailing whitespace
 * - Stripping trailing periods, commas, colons, exclamation marks, or extra question marks
 * - Ensuring both multiple_choice and true_false questions end in '?'
 * - Preserving internal punctuation across multi-sentence prompts
 *
 * @param questionText - The raw question text from LLM generation, bank, or user input.
 * @param format - Optional quiz format ('multiple_choice', 'true_false', etc.).
 * @returns Cleaned question text ending with '?'.
 */
export function normalizeQuestionPunctuation(questionText: string, format?: string): string {
  if (typeof questionText !== "string") {
    return "";
  }

  const trimmed = questionText.trim();
  if (!trimmed) {
    return "";
  }

  const stripped = trimmed.replace(TRAILING_PUNCTUATION_REGEX, "").trim();
  if (!stripped) {
    return "?";
  }

  return `${stripped}?`;
}

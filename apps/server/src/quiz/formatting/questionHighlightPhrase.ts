export interface HighlightPhraseSpan {
  start: number;
  end: number;
}

export const HIGHLIGHT_PHRASE_MAX_LENGTH = 120;
export const HIGHLIGHT_PHRASE_MAX_WORDS = 6;

const WRAPPING_QUOTES = /^["'“”‘’«»]+|["'“”‘’«»]+$/gu;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitWords(value: string): string[] {
  return value.split(/\s+/u).filter(Boolean);
}

/** Whole-word, case-insensitive pattern that tolerates any whitespace run between the phrase's words. */
function phrasePattern(words: readonly string[]): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${words.map(escapeRegExp).join("\\s+")}(?![\\p{L}\\p{N}])`, "iu");
}

/**
 * Finds the first whole-word, case-insensitive occurrence of `phrase` inside `text`.
 * Returns null when the phrase is empty or never appears on word boundaries,
 * so "tea" never matches inside "steam".
 */
export function findHighlightPhraseSpan(text: string, phrase: string | undefined): HighlightPhraseSpan | null {
  const words = splitWords(phrase?.trim() ?? "");
  if (words.length === 0) return null;
  const match = phrasePattern(words).exec(text);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

/**
 * Validates an LLM-provided highlight phrase against the question it belongs to.
 * Returns the exact substring of `question` (original casing) or undefined when the
 * phrase is missing, too long, or not a contiguous whole-word span of the question.
 */
export function resolveQuestionHighlightPhrase(question: string, rawPhrase: unknown): string | undefined {
  if (typeof rawPhrase !== "string") return undefined;
  const phrase = rawPhrase.trim().replace(WRAPPING_QUOTES, "").trim();
  if (!phrase || phrase.length > HIGHLIGHT_PHRASE_MAX_LENGTH || splitWords(phrase).length > HIGHLIGHT_PHRASE_MAX_WORDS) return undefined;
  const span = findHighlightPhraseSpan(question, phrase);
  return span ? question.slice(span.start, span.end) : undefined;
}

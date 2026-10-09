const WORD_PATTERN = /[A-Za-z]+(?:'[A-Za-z]+)?/g;
const SENTENCE_END_PATTERN = /[.!?]+(?=\s|$)/g;

export function extractWords(text: string): string[] {
  return text.match(WORD_PATTERN) ?? [];
}

/** Heuristic English syllable count (vowel groups, silent trailing "e"). */
export function countSyllables(word: string): number {
  const lower = word.toLowerCase().replace(/'s$/, "");
  const vowelGroups = lower.match(/[aeiouy]+/g)?.length ?? 0;
  const silentE = lower.endsWith("e") && !lower.endsWith("le") && vowelGroups > 1 ? 1 : 0;
  return Math.max(1, vowelGroups - silentE);
}

/**
 * Flesch-Kincaid grade level: the US school grade whose readers typically understand the text.
 * Returns 0 for empty text.
 */
export function fleschKincaidGrade(text: string): number {
  const words = extractWords(text);
  if (words.length === 0) return 0;
  const sentences = Math.max(1, text.match(SENTENCE_END_PATTERN)?.length ?? 0);
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
}

export function countWords(text: string): number {
  return extractWords(text).length;
}

import type { SupportedLanguage } from "../../locales/types.js";
import { tokenizeHeadlineText } from "./headlineTokens.js";

/** Recent headlines checked for a repeated opening word. */
const OPENING_WORD_WINDOW = 4;
/** Recent headlines checked for a repeated sentence pattern. */
const PATTERN_WINDOW = 3;

/** English words that form a headline's skeleton; every other word becomes a slot. */
const PATTERN_FUNCTION_WORDS: ReadonlySet<string> = new Set([
  "this", "these", "that", "those", "your", "my", "our", "the", "a", "an", "it", "its", "you",
  "who", "whose", "what", "which", "where", "when", "why", "how",
  "can", "could", "is", "are", "was", "do", "doe", "does", "did", "will", "would",
  "of", "in", "on", "to", "for", "with", "or", "and",
]);

/** "CRACK THIS CLOCK" and "PULL THIS SWORD?" share the pattern "_ this _". */
export function headlinePattern(headline: string): string {
  return tokenizeHeadlineText(headline)
    .map((token) => (PATTERN_FUNCTION_WORDS.has(token) ? token : "_"))
    .join(" ");
}

function openingWord(headline: string): string | undefined {
  return tokenizeHeadlineText(headline)[0];
}

/**
 * Describes how a headline repeats the channel's recent headlines, or returns null.
 * The opening-word check works in any language; the pattern check relies on English function words.
 */
export function describeRecentRepetition(headline: string, recentHeadlines: readonly string[], languageCode: SupportedLanguage): string | null {
  const opening = openingWord(headline);
  const reusedOpening = recentHeadlines.slice(0, OPENING_WORD_WINDOW).find((recent) => opening && openingWord(recent) === opening);
  if (reusedOpening) return `Starts with the same word as a recent headline on this channel ("${reusedOpening}").`;
  if (languageCode !== "en") return null;
  const pattern = headlinePattern(headline);
  const reusedPattern = recentHeadlines.slice(0, PATTERN_WINDOW).find((recent) => headlinePattern(recent) === pattern);
  return reusedPattern ? `Uses the same sentence pattern as a recent headline on this channel ("${reusedPattern}").` : null;
}

import { normalizeHashtags } from "./descriptionFormatter.js";
import { stripAngleBrackets } from "./descriptionYouTubeSanitizer.js";
import { QUIZ_SHORT_REQUIRED_HASHTAGS } from "./quizShortDescriptionFallbackLocales.js";

/** Shorts descriptions are read on a phone; 600 characters keeps the CTA and hashtags visible. */
export const QUIZ_SHORT_DESCRIPTION_MAX_CHARS = 600;
export const QUIZ_SHORT_MIN_HASHTAGS = 3;
export const QUIZ_SHORT_MAX_HASHTAGS = 5;

export interface AssembleQuizShortDescriptionInput {
  hookLines: string;
  teaser: string;
  scoreCta: string;
  hashtags: string[];
}

export interface AssembledQuizShortDescription {
  fullText: string;
  charCount: number;
  hashtags: string[];
}

/**
 * Guarantees "#Shorts" and "#quiz" lead the tag list, then keeps three to five unique tags.
 * The required tags are placed first so they survive the cap.
 */
export function normalizeQuizShortHashtags(hashtags: string[]): string[] {
  const normalized = normalizeHashtags([...QUIZ_SHORT_REQUIRED_HASHTAGS, ...hashtags]);
  const padded = normalized.length < QUIZ_SHORT_MIN_HASHTAGS ? normalizeHashtags([...normalized, "#trivia", "#challenge"]) : normalized;
  return padded.slice(0, QUIZ_SHORT_MAX_HASHTAGS);
}

function truncateSentence(text: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  if (text.length <= maxChars) return text;
  const head = text.slice(0, maxChars);
  const boundary = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  return (boundary > maxChars / 2 ? head.slice(0, boundary + 1) : head.replace(/\s+\S*$/u, "")).trim();
}

/**
 * Assembles hook, teaser, score CTA and hashtags into one description of at most 600 characters.
 * The CTA and hashtags are never dropped; the teaser shrinks first, then the hook.
 */
export function assembleQuizShortDescription(input: AssembleQuizShortDescriptionInput): AssembledQuizShortDescription {
  const hashtags = normalizeQuizShortHashtags(input.hashtags);
  const tail = `${stripAngleBrackets(input.scoreCta).trim()}\n\n${hashtags.join(" ")}`;
  const hook = stripAngleBrackets(input.hookLines).trim();
  const teaser = stripAngleBrackets(input.teaser).trim();

  const budgetForBody = QUIZ_SHORT_DESCRIPTION_MAX_CHARS - tail.length - 2;
  const fittedHook = truncateSentence(hook, budgetForBody);
  const fittedTeaser = truncateSentence(teaser, budgetForBody - fittedHook.length - 2);

  const fullText = [fittedHook, fittedTeaser, tail].filter(Boolean).join("\n\n").trim();
  return { fullText, charCount: fullText.length, hashtags };
}

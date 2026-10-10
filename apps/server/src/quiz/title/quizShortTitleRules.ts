import type { TitleDraft } from "./videoTitle.types.js";

/** YouTube shows about 70 characters of a Shorts title on the mobile feed; the suffix is part of that budget. */
export const QUIZ_SHORT_TITLE_MAX_CHARS = 70;
export const QUIZ_SHORT_TITLE_SUFFIX = " #Shorts";

const TRAILING_SUFFIX = /\s*#shorts\s*$/iu;
const TRAILING_SEPARATORS = /[\s\-–—:|,.。]+$/u;

export function hasQuizShortTitleSuffix(title: string): boolean {
  return title.endsWith(QUIZ_SHORT_TITLE_SUFFIX);
}

function truncateAtWordBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxChars / 2 ? truncated.slice(0, lastSpace) : truncated).replace(TRAILING_SEPARATORS, "").trim();
}

/**
 * Normalizes a Quiz Short title: strips any model-written "#Shorts", trims the body so the whole
 * title fits in 70 characters, then appends exactly one " #Shorts".
 */
export function ensureQuizShortTitleSuffix(rawTitle: string): string {
  const body = rawTitle.replace(TRAILING_SUFFIX, "").replace(TRAILING_SEPARATORS, "").trim();
  const bodyBudget = QUIZ_SHORT_TITLE_MAX_CHARS - QUIZ_SHORT_TITLE_SUFFIX.length;
  const fitted = truncateAtWordBoundary(body, bodyBudget);
  return fitted ? `${fitted}${QUIZ_SHORT_TITLE_SUFFIX}` : "";
}

/** Applies the Quiz Short suffix rule to a parsed draft; the keyword is left untouched. */
export function finalizeQuizShortTitleDraft(draft: TitleDraft): TitleDraft {
  const title = ensureQuizShortTitleSuffix(draft.title);
  return { title, primaryKeyword: draft.primaryKeyword || title };
}

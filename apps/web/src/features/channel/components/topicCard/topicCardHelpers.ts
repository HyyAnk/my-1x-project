import {
  QUIZ_MAX_QUESTION_COUNT,
  QUIZ_MIN_QUESTION_COUNT,
  QUIZ_SECONDS_PER_QUESTION,
  QUIZ_SHORT_MAX_QUESTION_COUNT,
  QUIZ_SHORT_MIN_QUESTION_COUNT,
  QUIZ_SHORT_SECONDS_PER_QUESTION,
  formatCanonicalDomainName,
} from "@studio/shared";

/**
 * Formats a domain identifier into the canonical title case name.
 */
export function formatDomain(domainId: string): string {
  return formatCanonicalDomainName(domainId);
}

/**
 * Calculates estimated duration in minutes based on question count.
 */
export function calculateEstimatedDurationMinutes(questionCount: number): number {
  return Math.max(3, Math.round((questionCount * QUIZ_SECONDS_PER_QUESTION) / 60));
}

/**
 * Formats duration hint string based on question count validity.
 */
export function formatDurationHint(questionCount: number, isQuestionCountValid: boolean, maxAllowedQuestions: number): string {
  if (!isQuestionCountValid) {
    return `Choose ${QUIZ_MIN_QUESTION_COUNT}-${maxAllowedQuestions}`;
  }
  const minutes = calculateEstimatedDurationMinutes(questionCount);
  return `About ${minutes} min`;
}

/**
 * Formats the duration hint for a portrait Quiz Short, which runs well under a minute.
 */
export function formatQuizShortDurationHint(questionCount: number, isQuestionCountValid: boolean, maxAllowedQuestions: number): string {
  if (!isQuestionCountValid) {
    return `Choose ${QUIZ_SHORT_MIN_QUESTION_COUNT}-${maxAllowedQuestions}`;
  }
  return `About ${questionCount * QUIZ_SHORT_SECONDS_PER_QUESTION} s`;
}

/**
 * Minimum question count a product kind accepts.
 */
export function resolveMinQuestionCount(contentKind: string): number {
  if (contentKind === "short_reel") return 1;
  return contentKind === "quiz_short" ? QUIZ_SHORT_MIN_QUESTION_COUNT : QUIZ_MIN_QUESTION_COUNT;
}

/**
 * Calculates maximum allowed questions for a topic candidate. Quiz Shorts are capped by their
 * portrait budget and, once bound, by the number of bound sources.
 */
export function calculateMaxAllowedQuestions(contentKind: string, sourceCapacity: number, isBoundOrAvailable: boolean): number {
  if (contentKind === "short_reel") {
    return 1;
  }
  const [minCount, maxCount] =
    contentKind === "quiz_short"
      ? [QUIZ_SHORT_MIN_QUESTION_COUNT, QUIZ_SHORT_MAX_QUESTION_COUNT]
      : [QUIZ_MIN_QUESTION_COUNT, QUIZ_MAX_QUESTION_COUNT];
  return isBoundOrAvailable ? Math.min(maxCount, Math.max(minCount, sourceCapacity)) : maxCount;
}

/**
 * Validates whether the selected question count is within permissible boundaries.
 */
export function validateQuestionCount(
  questionCount: number,
  maxAllowedQuestions: number,
  isShortReel: boolean,
  sourceCapacity?: number,
  minQuestionCount: number = QUIZ_MIN_QUESTION_COUNT,
): boolean {
  if (isShortReel) {
    return true;
  }
  return (
    Number.isInteger(questionCount) &&
    questionCount >= minQuestionCount &&
    questionCount <= maxAllowedQuestions &&
    (sourceCapacity === undefined || questionCount <= sourceCapacity)
  );
}

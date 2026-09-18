import { QUIZ_MAX_QUESTION_COUNT, QUIZ_MIN_QUESTION_COUNT, QUIZ_SECONDS_PER_QUESTION } from "@studio/shared";

/**
 * Formats a domain identifier into title case with spaces.
 */
export function formatDomain(domainId: string): string {
  return domainId.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
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
 * Calculates maximum allowed questions for a topic candidate.
 */
export function calculateMaxAllowedQuestions(contentKind: string, sourceCapacity: number, isBoundOrAvailable: boolean): number {
  if (contentKind === "short_reel") {
    return 1;
  }
  return isBoundOrAvailable
    ? Math.min(QUIZ_MAX_QUESTION_COUNT, Math.max(QUIZ_MIN_QUESTION_COUNT, sourceCapacity))
    : QUIZ_MAX_QUESTION_COUNT;
}

/**
 * Validates whether the selected question count is within permissible boundaries.
 */
export function validateQuestionCount(
  questionCount: number,
  maxAllowedQuestions: number,
  isShortReel: boolean,
  sourceCapacity?: number,
): boolean {
  if (isShortReel) {
    return true;
  }
  return (
    Number.isInteger(questionCount) &&
    questionCount >= QUIZ_MIN_QUESTION_COUNT &&
    questionCount <= maxAllowedQuestions &&
    (sourceCapacity === undefined || questionCount <= sourceCapacity)
  );
}

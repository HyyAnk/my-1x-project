import type { BankQuestion, TopicSourceExclusionReasonCode } from "@studio/shared";

/** Portrait 9:16 text budget: choices must stay readable in about two seconds on a phone. */
export const QUIZ_SHORT_MAX_QUESTION_CHARS = 90;
export const QUIZ_SHORT_MAX_CHOICE_CHARS = 32;
export const QUIZ_SHORT_MIN_CHOICES = 2;
export const QUIZ_SHORT_MAX_CHOICES = 3;

export interface QuizShortRuleViolation {
  reason: TopicSourceExclusionReasonCode;
  detail: string;
}

function checkChoiceCount(question: BankQuestion): QuizShortRuleViolation | null {
  const count = question.choices.length;
  if (count < QUIZ_SHORT_MIN_CHOICES || count > QUIZ_SHORT_MAX_CHOICES) {
    return {
      reason: "INVALID_CHOICE_COUNT",
      detail: `Quiz Short questions need ${QUIZ_SHORT_MIN_CHOICES} to ${QUIZ_SHORT_MAX_CHOICES} choices, found ${count}`,
    };
  }
  return null;
}

function checkQuestionLength(question: BankQuestion): QuizShortRuleViolation | null {
  const length = question.question.trim().length;
  if (length > QUIZ_SHORT_MAX_QUESTION_CHARS) {
    return {
      reason: "TEXT_TOO_LONG_FOR_SHORT",
      detail: `Question text is ${length} characters, Quiz Short allows at most ${QUIZ_SHORT_MAX_QUESTION_CHARS}`,
    };
  }
  return null;
}

function checkChoiceLengths(question: BankQuestion): QuizShortRuleViolation | null {
  for (const choice of question.choices) {
    const length = choice.text.trim().length;
    if (length > QUIZ_SHORT_MAX_CHOICE_CHARS) {
      return {
        reason: "TEXT_TOO_LONG_FOR_SHORT",
        detail: `Choice "${choice.id}" is ${length} characters, Quiz Short allows at most ${QUIZ_SHORT_MAX_CHOICE_CHARS}`,
      };
    }
  }
  return null;
}

/** Returns the first portrait text-budget violation, or null when the question fits a Quiz Short. */
export function findQuizShortRuleViolation(question: BankQuestion): QuizShortRuleViolation | null {
  return checkChoiceCount(question) ?? checkQuestionLength(question) ?? checkChoiceLengths(question);
}

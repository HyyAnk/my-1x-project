import type { QuizAnswerKey } from "../description/description.types.js";

export type TitleIssueCode =
  | "EMPTY"
  | "TOO_LONG"
  | "SPOILER"
  | "DUPLICATE_OF_RECENT"
  | "KEYWORD_MISSING"
  | "KEYWORD_NOT_FRONT_LOADED"
  | "QUESTION_COUNT_MISSING"
  | "SHOUTING";

/**
 * Blockers make a draft unusable. Advisory issues trigger one corrective
 * rewrite but the draft is still accepted when the rewrite does not fix them.
 */
export type TitleIssueSeverity = "blocker" | "advisory";

export interface TitleIssue {
  code: TitleIssueCode;
  severity: TitleIssueSeverity;
  detail: string;
}

export interface TitleDraft {
  title: string;
  primaryKeyword: string;
}

export interface TitleReviewContext {
  questionCount: number;
  recentTitles: string[];
  answerKeys: QuizAnswerKey[];
}

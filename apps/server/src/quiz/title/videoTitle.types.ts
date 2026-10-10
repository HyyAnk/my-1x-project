import type { Episode, QuizProductKind } from "@studio/shared";
import type { QuizAnswerKey } from "../description/description.types.js";

export type TitleIssueCode =
  | "EMPTY"
  | "TOO_LONG"
  | "SPOILER"
  | "DUPLICATE_OF_RECENT"
  | "KEYWORD_MISSING"
  | "KEYWORD_NOT_FRONT_LOADED"
  | "QUESTION_COUNT_MISSING"
  | "SHORTS_SUFFIX_MISSING"
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
  /** Episodes follow the long-form SEO formula; Quiz Shorts follow the 70-character "#Shorts" rules. Defaults to episode. */
  productKind?: QuizProductKind;
}

/**
 * The slice of a quiz product record the title layer reads. Episodes and Quiz Shorts both
 * satisfy it, so one compiler and one fallback serve both kinds.
 */
export type TitleProductContext = Pick<Episode, "topic"> & {
  quiz_config?: Pick<Episode["quiz_config"], "age_band" | "channel_brand_name">;
};

import type { ThumbnailLayoutType } from "@studio/shared";
import type { SupportedLanguage } from "../../locales/types.js";

/** Episode facts a thumbnail headline is checked against. */
export interface EditorialHeadlineContext {
  topicTitle: string;
  topicSummary?: string;
  questions?: ReadonlyArray<{ question: string; choices?: string[] }>;
  questionFormat?: string;
  layout?: ThumbnailLayoutType;
  /** Semantic checks run for English only. */
  languageCode: SupportedLanguage;
  /** Headlines used recently by this episode and its channel, newest first. */
  recentHeadlines?: readonly string[];
}

/**
 * - generic_only: no word names the topic or subject ("CAN YOU SOLVE IT?").
 * - unsupported_claim: promises a challenge the episode does not contain ("CAN YOU TASTE IT?" on a vision quiz).
 * - echoes_title: repeats the video title instead of complementing it.
 * - ungrounded_subject: the pictured subject is not taken from any episode question.
 * - repeats_recent_pattern: reuses the opening word or sentence pattern of a recent channel headline.
 */
export type HeadlineIssueCode = "generic_only" | "unsupported_claim" | "echoes_title" | "ungrounded_subject" | "repeats_recent_pattern";

export interface HeadlineIssue {
  code: HeadlineIssueCode;
  /** Hard issues disqualify a headline whenever an alternative without them exists. */
  severity: "hard" | "soft";
  detail: string;
}

export interface HeadlineAssessment {
  headline: string;
  issues: HeadlineIssue[];
}

export interface HeadlineClaimFamily {
  id: string;
  triggers: readonly string[];
  evidence: readonly string[];
  supportingLayouts?: readonly ThumbnailLayoutType[];
  supportingFormats?: readonly string[];
}

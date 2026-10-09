import type { BankQuestion } from "@studio/shared";
import { estimateAudienceProfile } from "../audience/audienceProfile.js";
import type { KidSafetyFinding } from "./kidSafety.types.js";
import { detectKidSafetyIssue } from "./kidSafetyDetector.js";

/** Tag prefix recording why a question was hidden from the kids and family bank. */
export const KID_SAFETY_HIDDEN_TAG_PREFIX = "kid_safety_hidden:";

export interface KidAudienceReview {
  question: BankQuestion;
  /** Set when the question was archived because its content is unsuitable for children. */
  hiddenFinding: KidSafetyFinding | null;
  /** True when status, tags, age_band, or difficulty changed. */
  changed: boolean;
}

export interface KidAudienceReviewOptions {
  /** Returns the subject's rating when the question's Knowledge Base entity is curated as teen or mature. */
  restrictedEntityRating?: (entityId: string | undefined) => string | null;
}

/** Questions about a teen- or mature-rated subject are hidden even when their wording looks harmless. */
function restrictedSubjectFinding(question: BankQuestion, options: KidAudienceReviewOptions): KidSafetyFinding | null {
  const rating = options.restrictedEntityRating?.(question.entity_id) ?? null;
  return rating ? { category: "mature_franchise", term: `${question.entity_id} (${rating}-rated subject)`, field: "question" } : null;
}

function withHiddenTag(tags: readonly string[], finding: KidSafetyFinding): string[] {
  const kept = tags.filter((tag) => !tag.startsWith(KID_SAFETY_HIDDEN_TAG_PREFIX));
  return [...kept, `${KID_SAFETY_HIDDEN_TAG_PREFIX}${finding.category}`];
}

/**
 * Re-screens one bank question for a kids and family audience: approved questions with unsuitable content, or
 * about a teen- or mature-rated subject, are archived (hidden from every selection path) and every question gets an age band and difficulty measured from its text.
 * Pure: returns a new question and never mutates the input.
 */
export function reviewQuestionForKidAudience(question: BankQuestion, options: KidAudienceReviewOptions = {}): KidAudienceReview {
  const profile = estimateAudienceProfile({ question: question.question, explanation: question.explanation });
  const finding = question.status === "approved" ? (detectKidSafetyIssue(question) ?? restrictedSubjectFinding(question, options)) : null;
  const reviewed: BankQuestion = {
    ...question,
    age_band: profile.age_band,
    difficulty: profile.difficulty,
    ...(finding ? { status: "archived" as const, tags: withHiddenTag(question.tags ?? [], finding) } : {}),
  };
  const changed =
    reviewed.age_band !== question.age_band ||
    reviewed.difficulty !== question.difficulty ||
    reviewed.status !== question.status ||
    reviewed.tags.length !== (question.tags ?? []).length;
  return { question: reviewed, hiddenFinding: finding, changed };
}

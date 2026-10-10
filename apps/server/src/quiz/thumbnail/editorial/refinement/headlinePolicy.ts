import { sanitizeThumbnailHook } from "../../thumbnailHookGuardrail.js";
import { GENERIC_HEADLINE_WORDS, HEADLINE_CLAIM_FAMILIES } from "./headlineLexicon.js";
import { describeRecentRepetition } from "./headlinePattern.js";
import { stemHeadlineToken, tokenizeHeadlineText } from "./headlineTokens.js";
import type { EditorialHeadlineContext, HeadlineAssessment, HeadlineClaimFamily, HeadlineIssue } from "./headlineTypes.js";

export { stemHeadlineToken, tokenizeHeadlineText };

const TITLE_ECHO_MIN_TOKENS = 2;
const TITLE_ECHO_OVERLAP_RATIO = 0.8;

/** True when the headline shares at least one non-generic word with the reference text (e.g. the video title). */
export function sharesTopicWord(headline: string, referenceText: string): boolean {
  const referenceTokens = new Set(tokenizeHeadlineText(referenceText));
  return tokenizeHeadlineText(headline).some((token) => !GENERIC_HEADLINE_WORDS.has(token) && referenceTokens.has(token));
}

function episodeEvidenceText(context: EditorialHeadlineContext): string {
  const questionText = (context.questions ?? []).flatMap((question) => [question.question, ...(question.choices ?? [])]);
  return [context.topicTitle, context.topicSummary ?? "", ...questionText].join(" ");
}

function isClaimSupported(family: HeadlineClaimFamily, context: EditorialHeadlineContext, evidenceTokens: Set<string>): boolean {
  if (context.layout && family.supportingLayouts?.includes(context.layout)) return true;
  const format = context.questionFormat?.toLowerCase();
  if (format && family.supportingFormats?.includes(format)) return true;
  return family.evidence.some((word) => evidenceTokens.has(stemHeadlineToken(word)));
}

function findUnsupportedClaims(tokens: string[], context: EditorialHeadlineContext, headline: string): string[] {
  const evidenceTokens = new Set(tokenizeHeadlineText(episodeEvidenceText(context)));
  const unsupported = HEADLINE_CLAIM_FAMILIES.filter((family) => {
    const triggered = family.triggers.some((trigger) => tokens.includes(stemHeadlineToken(trigger)));
    return triggered && !isClaimSupported(family, context, evidenceTokens);
  }).map((family) => family.id);
  if (headline.includes("%")) unsupported.push("invented_score");
  return [...new Set(unsupported)];
}

function echoesTitle(tokens: string[], topicTitle: string): boolean {
  if (tokens.length < TITLE_ECHO_MIN_TOKENS) return false;
  const titleTokens = new Set(tokenizeHeadlineText(topicTitle));
  const overlapping = tokens.filter((token) => titleTokens.has(token)).length;
  return overlapping / tokens.length >= TITLE_ECHO_OVERLAP_RATIO;
}

function collectSemanticIssues(tokens: string[], headline: string, context: EditorialHeadlineContext): HeadlineIssue[] {
  const issues: HeadlineIssue[] = [];
  if (tokens.every((token) => GENERIC_HEADLINE_WORDS.has(token))) {
    issues.push({ code: "generic_only", severity: "hard", detail: "No word names the topic or the pictured subject." });
  }
  const unsupportedClaims = findUnsupportedClaims(tokens, context, headline);
  if (unsupportedClaims.length > 0) {
    issues.push({
      code: "unsupported_claim",
      severity: "hard",
      detail: `Promises a challenge the episode does not contain (${unsupportedClaims.join(", ")}).`,
    });
  }
  return issues;
}

/**
 * Checks a thumbnail headline against the episode. Topic and claim checks rely on an English
 * lexicon, so they only run for English episodes; the title-echo check is language-agnostic.
 */
export function assessEditorialHeadline(headline: string, context: EditorialHeadlineContext): HeadlineAssessment {
  const tokens = tokenizeHeadlineText(headline);
  const issues = context.languageCode === "en" ? collectSemanticIssues(tokens, headline, context) : [];
  if (echoesTitle(tokens, context.topicTitle)) {
    issues.push({ code: "echoes_title", severity: "soft", detail: "Repeats the video title instead of complementing it." });
  }
  const repetition = describeRecentRepetition(headline, context.recentHeadlines ?? [], context.languageCode);
  if (repetition) issues.push({ code: "repeats_recent_pattern", severity: "soft", detail: repetition });
  return { headline, issues };
}

/**
 * Picks the first candidate with no issues, otherwise the first with only soft issues,
 * otherwise the first candidate. Candidates are sanitized to the 2-6 word / 30 character contract.
 */
export function selectEditorialHeadline(candidates: ReadonlyArray<string | null | undefined>, context: EditorialHeadlineContext): HeadlineAssessment {
  const sanitized = [...new Set(candidates.filter((candidate): candidate is string => Boolean(candidate?.trim())).map((candidate) => sanitizeThumbnailHook(candidate)))];
  const assessments = sanitized.map((headline) => assessEditorialHeadline(headline, context));
  return (
    assessments.find((assessment) => assessment.issues.length === 0) ??
    assessments.find((assessment) => assessment.issues.every((issue) => issue.severity === "soft")) ??
    assessments[0] ??
    assessEditorialHeadline(sanitizeThumbnailHook(null), context)
  );
}

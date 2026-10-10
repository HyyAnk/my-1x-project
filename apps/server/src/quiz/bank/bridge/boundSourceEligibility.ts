import { isLegacyVerdictIdentifier, type BankQuestionWithCooldown, type TopicRunCandidate } from "@studio/shared";
import { RepositoryError } from "../../../repository.js";
import {
  evaluateEpisodeQuestionEligibility,
  evaluateQuizShortQuestionEligibility,
  evaluateShortReelQuestionEligibility,
  type BankQuestionEligibilityResult,
} from "../bankEligibility.js";
import { detectStemAnswerLeak } from "../autoQa/stemLeakDetector.js";

/** New topic suggestions never bind leaked questions; sources bound before screening are kept but reported. */
function warnGrandfatheredStemLeak(bankQuestion: BankQuestionWithCooldown): void {
  const leak = detectStemAnswerLeak(bankQuestion);
  if (leak) console.warn(`[BoundSourceResolver] Bound source "${bankQuestion.id}" predates answer-leak screening: ${leak.message}`);
}

function withCooldownOverride(bankQuestion: BankQuestionWithCooldown, force: boolean): BankQuestionWithCooldown {
  return force ? { ...bankQuestion, channel_cooldown: { is_cooldown: false, days_remaining: 0 } } : bankQuestion;
}

/** Maps an ineligible evaluation to the typed confirmation error the clients already handle. */
function throwBoundSourceIneligible(
  bankQuestion: BankQuestionWithCooldown,
  eligibility: Exclude<BankQuestionEligibilityResult, { eligible: true }>,
  force: boolean,
): never {
  if (!force && bankQuestion.channel_cooldown?.is_cooldown) {
    const days = bankQuestion.channel_cooldown?.days_remaining ?? 30;
    throw new RepositoryError(
      `SOURCE_QUESTION_IN_COOLDOWN: Bound source question "${bankQuestion.id}" entered channel cooldown (${days} days remaining). Re-suggest topics or set force=true to override.`,
      "SOURCE_QUESTION_IN_COOLDOWN",
    );
  }
  if (eligibility.reason === "NOT_APPROVED") {
    throw new RepositoryError(
      `SOURCE_QUESTION_NOT_APPROVED: Bound source question "${bankQuestion.id}" is not approved.`,
      "SOURCE_QUESTION_NOT_APPROVED",
    );
  }
  if (eligibility.reason === "MISSING_ENGLISH_SOURCE") {
    throw new RepositoryError(
      `SOURCE_QUESTION_NOT_ENGLISH: Bound source question "${bankQuestion.id}" must be explicitly English.`,
      "SOURCE_QUESTION_NOT_ENGLISH",
    );
  }
  if (eligibility.reason === "INCOMPATIBLE_FORMAT") {
    throw new RepositoryError(
      `SOURCE_QUESTION_FORMAT_MISMATCH: Bound source question "${bankQuestion.id}" format mismatch: ${eligibility.detail}`,
      "SOURCE_QUESTION_FORMAT_MISMATCH",
    );
  }
  throw new RepositoryError(
    `SOURCE_QUESTION_INELIGIBLE: Bound source question "${bankQuestion.id}" is ineligible: ${eligibility.detail}`,
    "SOURCE_QUESTION_INELIGIBLE",
  );
}

export function checkShortReelEligibility(candidate: TopicRunCandidate, bankQuestion: BankQuestionWithCooldown, force: boolean): void {
  const targetArchetype: "versus_faceoff" | "deep_trivia" =
    candidate.archetype === "versus_faceoff" || candidate.archetype === "deep_trivia"
      ? candidate.archetype
      : (bankQuestion.archetype_id as "versus_faceoff" | "deep_trivia");
  warnGrandfatheredStemLeak(bankQuestion);
  const eligibility = evaluateShortReelQuestionEligibility(withCooldownOverride(bankQuestion, force), {
    targetArchetype,
    allowStemLeak: true,
  });
  if (!eligibility.eligible) throwBoundSourceIneligible(bankQuestion, eligibility, force);
}

export function checkQuizShortEligibility(candidate: TopicRunCandidate, bankQuestion: BankQuestionWithCooldown, force: boolean): void {
  const targetArchetype = candidate.content_kind === "quiz_short" ? candidate.archetype : undefined;
  warnGrandfatheredStemLeak(bankQuestion);
  const eligibility = evaluateQuizShortQuestionEligibility(withCooldownOverride(bankQuestion, force), {
    targetArchetype,
    targetLanguage: "en",
    allowStemLeak: true,
  });
  if (!eligibility.eligible) throwBoundSourceIneligible(bankQuestion, eligibility, force);
}

function resolveExpectedEpisodeFormat(candidate: TopicRunCandidate): "yes_no" | "multiple_choice" | undefined {
  const candQuizFormat = (candidate as { quiz_format?: string; format?: string }).quiz_format ?? (candidate as { format?: string }).format;
  if (candQuizFormat === "yes_no" || isLegacyVerdictIdentifier(candQuizFormat)) return "yes_no";
  if (candQuizFormat === "multiple_choice" || candQuizFormat === "knowledge") return "multiple_choice";
  return undefined;
}

export function checkEpisodeEligibility(candidate: TopicRunCandidate, bankQuestion: BankQuestionWithCooldown, force: boolean): void {
  warnGrandfatheredStemLeak(bankQuestion);
  const eligibility = evaluateEpisodeQuestionEligibility(withCooldownOverride(bankQuestion, force), {
    targetLanguage: "en",
    expectedFormat: resolveExpectedEpisodeFormat(candidate),
    allowStemLeak: true,
  });
  if (!eligibility.eligible) throwBoundSourceIneligible(bankQuestion, eligibility, force);
}

/** Dispatches to the eligibility policy of the candidate kind. */
export function checkBoundSourceEligibility(candidate: TopicRunCandidate, bankQuestion: BankQuestionWithCooldown, force: boolean): void {
  if (candidate.content_kind === "short_reel") return checkShortReelEligibility(candidate, bankQuestion, force);
  if (candidate.content_kind === "quiz_short") return checkQuizShortEligibility(candidate, bankQuestion, force);
  return checkEpisodeEligibility(candidate, bankQuestion, force);
}

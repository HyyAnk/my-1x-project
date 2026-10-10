import {
  bankRequiredChoiceCountForArchetype,
  type BankGameplayArchetypeId,
  type BankQuestion,
  type BankQuestionWithCooldown,
  type QuizQuestionFormat,
  type QuizShortTopicArchetype,
  type ReelArchetype,
  type TopicSourceExclusionReasonCode,
} from "@studio/shared";
import { detectStemAnswerLeak } from "./autoQa/stemLeakDetector.js";
import { describeKidSafetyFinding, detectKidSafetyIssue } from "./kidSafety/kidSafetyDetector.js";
import { isEntityRestrictedForChannel } from "./knowledgeBaseLoader.js";
import { normalizeBankLanguage } from "./bankLanguageNormalizer.js";
import { findQuizShortRuleViolation } from "./quizShortEligibilityRules.js";

export interface EvaluatedBankQuestionCandidate {
  question: BankQuestion;
  sourceText: string;
  choices: Array<{ id: string; text: string; is_correct: boolean }>;
  correctChoiceId: string;
  explanation: string;
  selectedAnswerText: string;
  sourceLanguage: string | null;
  resolvedLanguage: string;
  translationKey: string | null;
  translationProvenance: "native" | "verified_translation";
}

export type BankQuestionEligibilityResult =
  | { eligible: true; candidate: EvaluatedBankQuestionCandidate }
  | { eligible: false; reason: TopicSourceExclusionReasonCode; detail: string };

interface SharedEligibilityOptions {
  targetArchetype?: BankGameplayArchetypeId;
  targetLanguage: string;
  expectedFormat?: QuizQuestionFormat | "knowledge";
  expectedChoiceCount?: number;
  /** Already-bound topic sources predate answer-leak screening and are grandfathered at confirmation. */
  allowStemLeak?: boolean;
}

export interface ShortReelEligibilityOptions {
  targetArchetype: ReelArchetype;
  allowStemLeak?: boolean;
}

export interface QuizShortEligibilityOptions {
  targetArchetype?: QuizShortTopicArchetype;
  targetLanguage?: string;
  allowStemLeak?: boolean;
}

export interface EpisodeEligibilityOptions extends SharedEligibilityOptions {
  policy: "episode";
}

export interface ShortReelBankEligibilityOptions extends SharedEligibilityOptions {
  policy: "short_reel";
  targetArchetype: ShortReelEligibilityOptions["targetArchetype"];
}

/** Quiz Short: portrait text budget, 2-3 choices, explanation optional. */
export interface QuizShortBankEligibilityOptions extends SharedEligibilityOptions {
  policy: "quiz_short";
  targetArchetype?: QuizShortTopicArchetype;
}

export type BankEligibilityOptions = EpisodeEligibilityOptions | ShortReelBankEligibilityOptions | QuizShortBankEligibilityOptions;

function reject(reason: TopicSourceExclusionReasonCode, detail: string): BankQuestionEligibilityResult {
  return { eligible: false, reason, detail };
}

function resolveExpectedChoiceCount(question: BankQuestion, options: BankEligibilityOptions): number | undefined {
  if (options.expectedChoiceCount !== undefined) return options.expectedChoiceCount;
  if (options.targetArchetype) return bankRequiredChoiceCountForArchetype(options.targetArchetype);
  return question.format === "yes_no" ? 2 : bankRequiredChoiceCountForArchetype(question.archetype_id);
}

function validateChoices(question: BankQuestion, options: BankEligibilityOptions): BankQuestionEligibilityResult | null {
  const expectedCount = resolveExpectedChoiceCount(question, options);
  if (expectedCount !== undefined && question.choices.length !== expectedCount) {
    return reject("INVALID_CHOICE_COUNT", `Question has ${question.choices.length} choices, expected ${expectedCount}`);
  }
  const ids = new Set(question.choices.map((choice) => choice.id));
  if (ids.size !== question.choices.length) return reject("DUPLICATE_CHOICE_IDS", "Question contains duplicate choice IDs");
  const flaggedChoices = question.choices.filter((choice) => choice.is_correct !== undefined);
  const flaggedCorrectChoices = flaggedChoices.filter((choice) => choice.is_correct === true);
  if (flaggedChoices.length > 0 && (flaggedCorrectChoices.length !== 1 || flaggedCorrectChoices[0].id !== question.correct_choice_id)) {
    return reject("INCOMPATIBLE_CHOICES", "Choice correctness flags must identify exactly correct_choice_id");
  }
  const correct = question.choices.find((choice) => choice.id === question.correct_choice_id);
  if (!correct?.text.trim()) return reject("CORRECT_CHOICE_NOT_FOUND", "Correct choice is missing or empty");
  return null;
}

function validateStructure(question: BankQuestionWithCooldown, options: BankEligibilityOptions): BankQuestionEligibilityResult | null {
  if (question.status !== "approved") return reject("NOT_APPROVED", `Question status is '${question.status}', expected 'approved'`);
  if (options.targetArchetype && question.archetype_id !== options.targetArchetype) {
    return reject("ARCHETYPE_MISMATCH", `Question archetype '${question.archetype_id}' does not match '${options.targetArchetype}'`);
  }
  if (question.channel_cooldown?.is_cooldown) return reject("IN_COOLDOWN", "Question is currently in channel cooldown");
  const choiceFailure = validateChoices(question, options);
  if (choiceFailure) return choiceFailure;
  const explanationRequired = options.policy !== "quiz_short";
  if (!question.question.trim() || (explanationRequired && !question.explanation.trim())) {
    return reject("EMPTY_QUESTION_OR_EXPLANATION", "Question text or explanation is empty");
  }
  if (
    options.expectedFormat &&
    (options.expectedFormat === "knowledge" ? question.format !== "multiple_choice" : question.format !== options.expectedFormat)
  ) {
    return reject(
      "INCOMPATIBLE_FORMAT",
      `Question format '${question.format}' is not losslessly compatible with '${options.expectedFormat}'`,
    );
  }
  return null;
}

function projectNative(question: BankQuestion): EvaluatedBankQuestionCandidate | null {
  const resolvedLanguage = normalizeBankLanguage(question.language);
  if (resolvedLanguage !== "en") return null;
  const correct = question.choices.find((choice) => choice.id === question.correct_choice_id)!;
  return {
    question,
    sourceText: question.question.trim(),
    choices: question.choices.map((choice) => ({
      id: choice.id,
      text: choice.text.trim(),
      is_correct: choice.id === question.correct_choice_id,
    })),
    correctChoiceId: question.correct_choice_id,
    explanation: question.explanation.trim(),
    selectedAnswerText: correct.text.trim(),
    sourceLanguage: question.language ?? null,
    resolvedLanguage: "en",
    translationKey: null,
    translationProvenance: "native",
  };
}

function validateKidSafety(question: BankQuestion): BankQuestionEligibilityResult | null {
  const kidSafetyFinding = detectKidSafetyIssue(question);
  if (kidSafetyFinding) return reject("KID_UNSAFE_CONTENT", describeKidSafetyFinding(kidSafetyFinding));
  if (isEntityRestrictedForChannel(question.entity_id)) {
    return reject(
      "KID_UNSAFE_CONTENT",
      `Subject ${question.entity_id} is curated as teen or mature and is not shown on the kids and family channel.`,
    );
  }
  return null;
}

export function evaluateBankQuestionEligibility(
  question: BankQuestionWithCooldown,
  options: BankEligibilityOptions,
): BankQuestionEligibilityResult {
  const structureFailure = validateStructure(question, options);
  if (structureFailure) return structureFailure;
  const native = projectNative(question);
  if (!native) {
    return reject(
      "MISSING_ENGLISH_SOURCE",
      question.language?.trim()
        ? "Bank source language must be explicitly 'en'"
        : "Bank source is missing explicit English language metadata",
    );
  }
  const kidSafetyFailure = validateKidSafety(question);
  if (kidSafetyFailure) return kidSafetyFailure;
  const stemLeak = options.allowStemLeak ? null : detectStemAnswerLeak(question);
  if (stemLeak) return reject("ANSWER_LEAKED_IN_STEM", stemLeak.message);
  if (options.policy === "quiz_short") {
    const violation = findQuizShortRuleViolation(question);
    if (violation) return reject(violation.reason, violation.detail);
  }
  return { eligible: true, candidate: native };
}

export function evaluateShortReelQuestionEligibility(
  question: BankQuestionWithCooldown,
  options: ShortReelEligibilityOptions = { targetArchetype: question.archetype_id as ShortReelEligibilityOptions["targetArchetype"] },
): BankQuestionEligibilityResult {
  return evaluateBankQuestionEligibility(question, {
    policy: "short_reel",
    targetLanguage: "en",
    targetArchetype: options.targetArchetype,
    allowStemLeak: options.allowStemLeak,
  });
}

export function evaluateQuizShortQuestionEligibility(
  question: BankQuestionWithCooldown,
  options: QuizShortEligibilityOptions = {},
): BankQuestionEligibilityResult {
  return evaluateBankQuestionEligibility(question, {
    policy: "quiz_short",
    targetLanguage: options.targetLanguage ?? "en",
    targetArchetype: options.targetArchetype,
    allowStemLeak: options.allowStemLeak,
  });
}

export function evaluateEpisodeQuestionEligibility(
  question: BankQuestionWithCooldown,
  options: Omit<EpisodeEligibilityOptions, "policy">,
): BankQuestionEligibilityResult {
  return evaluateBankQuestionEligibility(question, { policy: "episode", ...options });
}

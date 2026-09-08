import {
  bankRequiredChoiceCountForArchetype,
  type BankGameplayArchetypeId,
  type BankQuestion,
  type BankQuestionWithCooldown,
  type QuizQuestionFormat,
  type TopicSourceExclusionReasonCode,
} from "@studio/shared";

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
}

export interface ShortReelEligibilityOptions {
  targetArchetype: "versus_faceoff" | "deep_trivia";
}

export interface EpisodeEligibilityOptions extends SharedEligibilityOptions {
  policy: "episode";
}

export interface ShortReelBankEligibilityOptions extends SharedEligibilityOptions {
  policy: "short_reel";
  targetArchetype: ShortReelEligibilityOptions["targetArchetype"];
}

export type BankEligibilityOptions = EpisodeEligibilityOptions | ShortReelBankEligibilityOptions;

function normalizedLanguage(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const exact: Record<string, string> = {
    en: "en",
    eng: "en",
    english: "en",
    es: "es",
    spa: "es",
    spanish: "es",
    ja: "ja",
    jpn: "ja",
    japanese: "ja",
    de: "de",
    deu: "de",
    german: "de",
    no: "no",
    nor: "no",
    norwegian: "no",
    nl: "nl",
    nld: "nl",
    dut: "nl",
    dutch: "nl",
    da: "da",
    dan: "da",
    danish: "da",
    sv: "sv",
    swe: "sv",
    swedish: "sv",
    fi: "fi",
    fin: "fi",
    finnish: "fi",
    fr: "fr",
    fra: "fr",
    french: "fr",
    ko: "ko",
    kor: "ko",
    korean: "ko",
    id: "id",
    ind: "id",
    indonesian: "id",
    th: "th",
    tha: "th",
    thai: "th",
    vi: "vi",
    vie: "vi",
    vietnamese: "vi",
  };
  const normalized = exact[trimmed.replaceAll("_", "-")];
  if (normalized) return normalized;
  const regionalMatch = trimmed.match(/^([a-z]{2,3})[-_][a-z]{2,4}$/);
  return regionalMatch ? (exact[regionalMatch[1]] ?? null) : null;
}

function reject(reason: TopicSourceExclusionReasonCode, detail: string): BankQuestionEligibilityResult {
  return { eligible: false, reason, detail };
}

function validateStructure(question: BankQuestionWithCooldown, options: BankEligibilityOptions): BankQuestionEligibilityResult | null {
  if (question.status !== "approved") return reject("NOT_APPROVED", `Question status is '${question.status}', expected 'approved'`);
  if (options.targetArchetype && question.archetype_id !== options.targetArchetype) {
    return reject("ARCHETYPE_MISMATCH", `Question archetype '${question.archetype_id}' does not match '${options.targetArchetype}'`);
  }
  if (question.channel_cooldown?.is_cooldown) return reject("IN_COOLDOWN", "Question is currently in channel cooldown");
  const expectedCount =
    options.expectedChoiceCount ??
    (options.targetArchetype ? bankRequiredChoiceCountForArchetype(options.targetArchetype) : question.format === "true_false" ? 2 : 3);
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
  if (!question.question.trim() || !question.explanation.trim())
    return reject("EMPTY_QUESTION_OR_EXPLANATION", "Question text or explanation is empty");
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
  const resolvedLanguage = normalizedLanguage(question.language);
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

export function evaluateBankQuestionEligibility(
  question: BankQuestionWithCooldown,
  options: BankEligibilityOptions,
): BankQuestionEligibilityResult {
  const structureFailure = validateStructure(question, options);
  if (structureFailure) return structureFailure;
  const native = projectNative(question);
  if (native) return { eligible: true, candidate: native };
  return reject(
    "MISSING_ENGLISH_SOURCE",
    question.language?.trim()
      ? "Bank source language must be explicitly 'en'"
      : "Bank source is missing explicit English language metadata",
  );
}

export function evaluateShortReelQuestionEligibility(
  question: BankQuestionWithCooldown,
  options: ShortReelEligibilityOptions = { targetArchetype: question.archetype_id as ShortReelEligibilityOptions["targetArchetype"] },
): BankQuestionEligibilityResult {
  return evaluateBankQuestionEligibility(question, {
    policy: "short_reel",
    targetLanguage: "en",
    targetArchetype: options.targetArchetype,
  });
}

export function evaluateEpisodeQuestionEligibility(
  question: BankQuestionWithCooldown,
  options: Omit<EpisodeEligibilityOptions, "policy">,
): BankQuestionEligibilityResult {
  return evaluateBankQuestionEligibility(question, { policy: "episode", ...options });
}

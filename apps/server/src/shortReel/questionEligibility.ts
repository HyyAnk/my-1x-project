import { isEnglishLanguage, type BankQuestion, type BankQuestionWithCooldown, type ShortReelSourceChoice } from "@studio/shared";

export type QuestionExclusionReason =
  | "NOT_APPROVED"
  | "ARCHETYPE_MISMATCH"
  | "IN_COOLDOWN"
  | "INVALID_CHOICE_COUNT"
  | "DUPLICATE_CHOICE_IDS"
  | "CORRECT_CHOICE_NOT_FOUND"
  | "EMPTY_QUESTION_OR_EXPLANATION"
  | "MISSING_ENGLISH_METADATA"
  | "MISSING_ENGLISH_TRANSLATION"
  | "UNVERIFIED_TRANSLATION"
  | "WRONG_TRANSLATION_LANGUAGE"
  | "EMPTY_TRANSLATED_CONTENT"
  | "TRANSLATED_CHOICE_COUNT_MISMATCH"
  | "DUPLICATE_TRANSLATED_CHOICE_IDS"
  | "TRANSLATED_CHOICE_ID_MISMATCH"
  | "EMPTY_TRANSLATED_CHOICE";

export interface EvaluatedQuestionCandidate {
  question: BankQuestion;
  sourceText: string;
  choices: ShortReelSourceChoice[];
  correctChoiceId: string;
  explanation: string;
  selectedAnswerText: string;
  sourceLanguage: string | null;
  translationProvenance: "source" | "verified_translation";
}

export type QuestionEligibilityResult =
  | {
      eligible: true;
      candidate: EvaluatedQuestionCandidate;
    }
  | {
      eligible: false;
      reason: QuestionExclusionReason;
      detail: string;
    };

function validateBasicQuestionConstraints(
  question: BankQuestion,
  targetArchetype: "versus_faceoff" | "deep_trivia",
): { eligible: false; reason: QuestionExclusionReason; detail: string } | null {
  if (question.status !== "approved") {
    return {
      eligible: false,
      reason: "NOT_APPROVED",
      detail: `Question status is '${question.status}', expected 'approved'`,
    };
  }

  if (question.archetype_id !== targetArchetype) {
    return {
      eligible: false,
      reason: "ARCHETYPE_MISMATCH",
      detail: `Question archetype '${question.archetype_id}' does not match target '${targetArchetype}'`,
    };
  }

  const questionWithCooldown = question as BankQuestionWithCooldown;
  if (questionWithCooldown.channel_cooldown?.is_cooldown) {
    return {
      eligible: false,
      reason: "IN_COOLDOWN",
      detail: `Question is currently in channel cooldown (${questionWithCooldown.channel_cooldown.days_remaining} days remaining)`,
    };
  }

  const expectedChoiceCount = targetArchetype === "versus_faceoff" ? 2 : 3;
  if (!Array.isArray(question.choices) || question.choices.length !== expectedChoiceCount) {
    return {
      eligible: false,
      reason: "INVALID_CHOICE_COUNT",
      detail: `Question has ${question.choices?.length ?? 0} choices, expected ${expectedChoiceCount}`,
    };
  }

  const originalChoiceIds = new Set(question.choices.map((c) => c.id));
  if (originalChoiceIds.size !== question.choices.length) {
    return {
      eligible: false,
      reason: "DUPLICATE_CHOICE_IDS",
      detail: "Original question contains duplicate choice IDs",
    };
  }

  const correctChoice = question.choices.find((c) => c.id === question.correct_choice_id);
  if (!correctChoice || !correctChoice.text.trim()) {
    return {
      eligible: false,
      reason: "CORRECT_CHOICE_NOT_FOUND",
      detail: `Correct choice '${question.correct_choice_id}' not found or has empty text`,
    };
  }

  if (!question.question.trim() || !question.explanation.trim()) {
    return {
      eligible: false,
      reason: "EMPTY_QUESTION_OR_EXPLANATION",
      detail: "Original question text or explanation is empty",
    };
  }

  return null;
}

function evaluateVerifiedEnglishTranslation(question: BankQuestion): QuestionEligibilityResult {
  if (!question.language || !question.language.trim()) {
    const hasEnTranslation = Boolean(question.translations && question.translations.en);
    if (!hasEnTranslation) {
      return {
        eligible: false,
        reason: "MISSING_ENGLISH_METADATA",
        detail: "Question has missing/empty language metadata and lacks verified English translation",
      };
    }
  }

  if (!question.translations || !question.translations.en) {
    return {
      eligible: false,
      reason: "MISSING_ENGLISH_TRANSLATION",
      detail: `Non-English question (language '${question.language ?? "none"}') lacks 'en' translation`,
    };
  }

  const trans = question.translations.en;

  if (!trans.verified) {
    return {
      eligible: false,
      reason: "UNVERIFIED_TRANSLATION",
      detail: "English translation is not verified",
    };
  }

  if (trans.language && !isEnglishLanguage(trans.language)) {
    return {
      eligible: false,
      reason: "WRONG_TRANSLATION_LANGUAGE",
      detail: `Translation declared language '${trans.language}' is not English`,
    };
  }

  if (!trans.question?.trim() || !trans.explanation?.trim()) {
    return {
      eligible: false,
      reason: "EMPTY_TRANSLATED_CONTENT",
      detail: "Translated question text or explanation is empty",
    };
  }

  if (!Array.isArray(trans.choices) || trans.choices.length !== question.choices.length) {
    return {
      eligible: false,
      reason: "TRANSLATED_CHOICE_COUNT_MISMATCH",
      detail: `Translated choices count (${trans.choices?.length ?? 0}) does not match original choices count (${question.choices.length})`,
    };
  }

  const transChoiceIds = new Set(trans.choices.map((c) => c.id));
  if (transChoiceIds.size !== trans.choices.length) {
    return {
      eligible: false,
      reason: "DUPLICATE_TRANSLATED_CHOICE_IDS",
      detail: "Translated choices contain duplicate choice IDs",
    };
  }

  for (const origChoice of question.choices) {
    if (!transChoiceIds.has(origChoice.id)) {
      return {
        eligible: false,
        reason: "TRANSLATED_CHOICE_ID_MISMATCH",
        detail: `Translated choices missing original choice ID '${origChoice.id}'`,
      };
    }
  }

  for (const choice of trans.choices) {
    if (!choice.text?.trim()) {
      return {
        eligible: false,
        reason: "EMPTY_TRANSLATED_CHOICE",
        detail: `Translated choice '${choice.id}' has empty text`,
      };
    }
  }

  const transChoiceMap = new Map(trans.choices.map((c) => [c.id, c.text.trim()]));
  const sortedChoices: ShortReelSourceChoice[] = [...question.choices]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => ({
      id: c.id,
      text: transChoiceMap.get(c.id)!,
      is_correct: c.id === question.correct_choice_id,
    }));

  const translatedCorrectText = transChoiceMap.get(question.correct_choice_id);
  if (!translatedCorrectText) {
    return {
      eligible: false,
      reason: "CORRECT_CHOICE_NOT_FOUND",
      detail: `Correct choice '${question.correct_choice_id}' missing translated text`,
    };
  }

  return {
    eligible: true,
    candidate: {
      question,
      sourceText: trans.question.trim(),
      choices: sortedChoices,
      correctChoiceId: question.correct_choice_id,
      explanation: trans.explanation.trim(),
      selectedAnswerText: translatedCorrectText,
      sourceLanguage: question.language ?? null,
      translationProvenance: "verified_translation",
    },
  };
}

/**
 * Pure eligibility evaluation function against Question Bank question.
 */
export function evaluateQuestionEligibility(
  question: BankQuestion,
  targetArchetype: "versus_faceoff" | "deep_trivia",
): QuestionEligibilityResult {
  const basicCheck = validateBasicQuestionConstraints(question, targetArchetype);
  if (basicCheck) {
    return basicCheck;
  }

  const correctChoice = question.choices.find((c) => c.id === question.correct_choice_id)!;

  if (isEnglishLanguage(question.language)) {
    const sortedChoices: ShortReelSourceChoice[] = [...question.choices]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => ({
        id: c.id,
        text: c.text.trim(),
        is_correct: c.id === question.correct_choice_id,
      }));

    return {
      eligible: true,
      candidate: {
        question,
        sourceText: question.question.trim(),
        choices: sortedChoices,
        correctChoiceId: question.correct_choice_id,
        explanation: question.explanation.trim(),
        selectedAnswerText: correctChoice.text.trim(),
        sourceLanguage: question.language ?? null,
        translationProvenance: "source",
      },
    };
  }

  return evaluateVerifiedEnglishTranslation(question);
}

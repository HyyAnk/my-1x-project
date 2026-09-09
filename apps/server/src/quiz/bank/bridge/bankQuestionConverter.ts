import {
  QuizQuestionSchema,
  bankRequiredChoiceCountForArchetype,
  makeId,
  normalizeLanguageCode,
  type BankQuestion,
  type BankTranslationContent,
  type Channel,
  type QuizQuestion,
} from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { LLMClient } from "../../../utils/promptSanitizer.js";
import { transcreateBankQuestion } from "../transcreation/transcreationEngine.js";

export interface ConvertBankQuestionOptions {
  language?: string;
  translation?: BankTranslationContent | null;
}

/**
 * Resolves or dynamically transcreates a bank question translation for a target language.
 */
export async function resolveBankQuestionTranslation(
  bankQuestion: BankQuestion,
  targetLanguage: string,
  channel: Channel,
  repository: RepositoryService,
  llmClient?: LLMClient | null,
): Promise<BankTranslationContent | null> {
  const targetNormLang = normalizeLanguageCode(targetLanguage);
  const sourceNormLang = normalizeLanguageCode(bankQuestion.language);

  if (targetNormLang === sourceNormLang) {
    return null;
  }

  if (bankQuestion.translations && bankQuestion.translations[targetNormLang]) {
    return bankQuestion.translations[targetNormLang];
  }

  try {
    const transResult = await transcreateBankQuestion(bankQuestion, {
      targetLanguage: targetNormLang,
      channelTone: channel.display_name || channel.target_audience || undefined,
      llmClient,
    });
    const activeTranslation = transResult.content;
    return activeTranslation;
  } catch (transErr) {
    console.warn(
      `[QuestionBankBridge] Dynamic transcreation failed for ${bankQuestion.id} (${targetNormLang}), falling back to safe offline translation:`,
      transErr,
    );
    const fallbackResult = await transcreateBankQuestion(bankQuestion, {
      targetLanguage: targetNormLang,
      llmClient: null,
    });
    return fallbackResult.content;
  }
}

/**
 * Converts a BankQuestion into a fully validated QuizQuestion for QuizV2 format.
 */
function resolveLosslessChoices(bankQuestion: BankQuestion, translation?: ConvertBankQuestionOptions["translation"]) {
  const expectedCount = bankRequiredChoiceCountForArchetype(bankQuestion.archetype_id);
  if (bankQuestion.choices.length !== expectedCount) {
    throw new Error(
      `BOUND_SOURCE_INCOMPATIBLE: Question "${bankQuestion.id}" has ${bankQuestion.choices.length} choices; ${bankQuestion.format} requires exactly ${expectedCount}.`,
    );
  }

  const translatedById = new Map((translation?.choices ?? []).map((choice) => [choice.id, choice.text]));
  if (
    translation &&
    (translatedById.size !== bankQuestion.choices.length ||
      translation.choices.some((choice) => !bankQuestion.choices.some((source) => source.id === choice.id)))
  ) {
    throw new Error(`TRANSLATION_CHOICE_INTEGRITY_FAILED: Translation choices for "${bankQuestion.id}" do not preserve source IDs.`);
  }

  return bankQuestion.choices.map((choice) => ({
    id: choice.id,
    text: (translatedById.get(choice.id) ?? choice.text).trim(),
  }));
}

export function convertBankQuestionToQuizQuestionLossless(
  bankQuestion: BankQuestion,
  options: ConvertBankQuestionOptions = {},
): QuizQuestion {
  const translation = options.translation;
  const quizChoices = resolveLosslessChoices(bankQuestion, translation);
  if (!quizChoices.some((choice) => choice.id === bankQuestion.correct_choice_id)) {
    throw new Error(
      `BOUND_SOURCE_INCOMPATIBLE: Correct choice "${bankQuestion.correct_choice_id}" is not present in question "${bankQuestion.id}".`,
    );
  }

  const localizedQuestion = translation?.question || bankQuestion.question || "Engaging trivia challenge question";
  const localizedExplanation = translation?.explanation || bankQuestion.explanation || "Detailed explanation for the correct answer.";
  const localizedFunFact = translation?.fun_fact !== undefined ? translation.fun_fact : bankQuestion.fun_fact || "";

  const candidateQuestion = {
    id: (bankQuestion.id || makeId("bq")).slice(0, 80),
    number: 1,
    format: quizChoices.length === 2 ? "true_false" : (bankQuestion.format || "multiple_choice"),
    difficulty: Math.min(Math.max(1, Number(bankQuestion.difficulty) || 2), 5),
    question: localizedQuestion.trim(),
    choices: quizChoices,
    correct_choice_id: bankQuestion.correct_choice_id,
    explanation: localizedExplanation.trim(),
    fun_fact: localizedFunFact.trim(),
    source_ids: [],
    visual_opportunity: (bankQuestion.visual_spec?.prompt || "").trim(),
    validation: {
      semantic_status: "validated" as const,
      source_coverage: false,
      fact_locked: true,
    },
  };

  return QuizQuestionSchema.parse(candidateQuestion);
}

/**
 * Converts legacy and dynamically transcreated questions for the historical
 * non-bound flow. Bound products must use convertBankQuestionToQuizQuestionLossless.
 */
export function convertBankQuestionToQuizQuestion(bankQuestion: BankQuestion, options: ConvertBankQuestionOptions = {}): QuizQuestion {
  const sourceChoices =
    bankQuestion.choices.length > 0
      ? bankQuestion.choices
      : bankQuestion.format === "true_false"
        ? [
            { id: "true", text: "True", is_correct: true },
            { id: "false", text: "False", is_correct: false },
          ]
        : [
            { id: "a", text: "Option A", is_correct: true },
            { id: "b", text: "Option B", is_correct: false },
            { id: "c", text: "Option C", is_correct: false },
          ];
  const translated = options.translation?.choices ?? [];
  const choices = sourceChoices.map((choice, index) => ({
    source: choice,
    text:
      translated.find((item) => item.id.trim().toLowerCase() === choice.id.trim().toLowerCase())?.text ??
      translated[index]?.text ??
      choice.text,
  }));
  const correctIndex = Math.max(
    0,
    sourceChoices.findIndex((choice) => choice.id === bankQuestion.correct_choice_id) >= 0
      ? sourceChoices.findIndex((choice) => choice.id === bankQuestion.correct_choice_id)
      : sourceChoices.findIndex((choice) => choice.is_correct),
  );
  const requiredCount = bankQuestion.format === "true_false" ? 2 : 3;
  const visible = choices.slice(0, requiredCount);
  while (visible.length < requiredCount)
    visible.push({
      source: { id: `fallback_${visible.length}`, text: `Option ${visible.length + 1}`, is_correct: false },
      text: `Option ${visible.length + 1}`,
    });
  const ids = ["a", "b", "c"];
  const mapped = visible.map((choice, index) => ({
    id: ids[index],
    text: choice.text.trim().slice(0, 180) || `Option ${ids[index].toUpperCase()}`,
  }));
  const seenTexts = new Set<string>();
  mapped.forEach((choice, index) => {
    const normalized = choice.text.normalize("NFKC").trim().toLowerCase();
    if (seenTexts.has(normalized)) choice.text = `${choice.text} (${ids[index].toUpperCase()})`;
    seenTexts.add(choice.text.normalize("NFKC").trim().toLowerCase());
  });
  const mappedCorrectIndex = Math.min(Math.max(correctIndex, 0), requiredCount - 1);
  return QuizQuestionSchema.parse({
    id: (bankQuestion.id || makeId("bq")).slice(0, 80),
    number: 1,
    format: bankQuestion.format || "multiple_choice",
    difficulty: Math.min(Math.max(1, Number(bankQuestion.difficulty) || 2), 5),
    question: (options.translation?.question || bankQuestion.question || "Engaging trivia challenge question").slice(0, 320).trim(),
    choices: mapped,
    correct_choice_id: mapped[mappedCorrectIndex].id,
    explanation: (options.translation?.explanation || bankQuestion.explanation || "Detailed explanation for the correct answer.")
      .slice(0, 600)
      .trim(),
    fun_fact: (options.translation?.fun_fact ?? bankQuestion.fun_fact ?? "").slice(0, 600).trim(),
    source_ids: [],
    visual_opportunity: (bankQuestion.visual_spec?.prompt || "").slice(0, 1000).trim(),
    validation: { semantic_status: "validated", source_coverage: false, fact_locked: true },
  });
}

/**
 * Bounded concurrency for parallel transcreation so a 1-click topic confirm
 * does not serialize one LLM round-trip per question inside the HTTP request.
 */
const TRANSCREATION_CONCURRENCY = 3;

/**
 * Transcreates and converts a batch of BankQuestions into validated QuizQuestions.
 */
export async function transcreateAndConvertTopicQuestions(
  selectedQuestions: BankQuestion[],
  targetLanguage: string,
  channel: Channel,
  repository: RepositoryService,
  llmClient?: LLMClient | null,
): Promise<QuizQuestion[]> {
  const results = new Array<QuizQuestion | null>(selectedQuestions.length).fill(null);
  let cursor = 0;

  const runWorker = async (): Promise<void> => {
    while (cursor < selectedQuestions.length) {
      const index = cursor++;
      const bankQuestion = selectedQuestions[index];
      const activeTranslation = await resolveBankQuestionTranslation(bankQuestion, targetLanguage, channel, repository, llmClient);

      const quizQuestion = convertBankQuestionToQuizQuestion(bankQuestion, {
        language: targetLanguage,
        translation: activeTranslation,
      });
      quizQuestion.number = index + 1;
      results[index] = quizQuestion;
    }
  };

  const workerCount = Math.min(TRANSCREATION_CONCURRENCY, selectedQuestions.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return results.filter((question): question is QuizQuestion => question !== null);
}

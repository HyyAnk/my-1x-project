import {
  QuizQuestionSchema,
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
    await repository.saveQuestionBankTranslation(bankQuestion.id, activeTranslation).catch((err) => {
      console.warn(`[QuestionBankBridge] Failed to cache translation for ${bankQuestion.id}:`, err);
    });
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
function buildRawChoices(bankQuestion: BankQuestion, translation?: ConvertBankQuestionOptions["translation"]) {
  const isTrueFalse = bankQuestion.format === "true_false";
  if (Array.isArray(bankQuestion.choices) && bankQuestion.choices.length > 0) {
    return bankQuestion.choices.map((c, idx) => {
      if (!translation?.choices) return { ...c };
      const tc = translation.choices.find((item) => item.id.trim().toLowerCase() === c.id.trim().toLowerCase()) ?? translation.choices[idx];
      return {
        ...c,
        text: tc?.text || c.text,
      };
    });
  }
  if (isTrueFalse) {
    return [
      { id: "choice_tf_1", text: "True", is_correct: true },
      { id: "choice_tf_2", text: "False", is_correct: false },
    ];
  }
  return [
    { id: "choice_mc_1", text: "Option A", is_correct: true },
    { id: "choice_mc_2", text: "Option B", is_correct: false },
    { id: "choice_mc_3", text: "Option C", is_correct: false },
  ];
}

function buildFinalChoices(
  rawChoices: Array<{ id: string; text: string; is_correct?: boolean }>,
  correctRaw: { id: string; text: string; is_correct?: boolean },
  isTrueFalse: boolean,
): Array<{ text: string; isCorrect: boolean }> {
  const distractersRaw = rawChoices.filter((c) => c !== correctRaw);

  if (isTrueFalse) {
    if (distractersRaw.length >= 1) {
      const choices = [
        { text: (correctRaw.text || "True").trim(), isCorrect: true },
        { text: (distractersRaw[0].text || "False").trim(), isCorrect: false },
      ];
      if (rawChoices.indexOf(distractersRaw[0]) < rawChoices.indexOf(correctRaw)) {
        choices.reverse();
      }
      return choices;
    }
    const isCorrectTrue = (correctRaw.text || "").toLowerCase().includes("true");
    return [
      { text: "True", isCorrect: isCorrectTrue },
      { text: "False", isCorrect: !isCorrectTrue },
    ];
  }

  const neededDistracters = distractersRaw.slice(0, 2);
  if (neededDistracters.length === 0) {
    neededDistracters.push({ id: "fallback_1", text: "Other Option", is_correct: false });
    neededDistracters.push({ id: "fallback_2", text: "None of the Above", is_correct: false });
  } else if (neededDistracters.length === 1) {
    neededDistracters.push({ id: "fallback_1", text: "All of the Above", is_correct: false });
  }

  const originalCorrectIndex = rawChoices.indexOf(correctRaw);
  const targetCorrectIndex = Math.min(Math.max(0, originalCorrectIndex), 2);

  const finalChoices = [
    { text: (neededDistracters[0].text || "Option B").trim(), isCorrect: false },
    { text: (neededDistracters[1].text || "Option C").trim(), isCorrect: false },
  ];
  finalChoices.splice(targetCorrectIndex, 0, { text: (correctRaw.text || "Option A").trim(), isCorrect: true });
  return finalChoices;
}

function buildDeduplicatedQuizChoices(finalRawChoices: Array<{ text: string; isCorrect: boolean }>, requiredCount: number) {
  const letters = ["a", "b", "c", "d"];
  const quizChoices = finalRawChoices.slice(0, requiredCount).map((c, idx) => ({
    id: letters[idx],
    text: (c.text || "").slice(0, 180).trim() || `Option ${letters[idx].toUpperCase()}`,
  }));

  const seenTexts = new Set<string>();
  for (let i = 0; i < quizChoices.length; i++) {
    const norm = quizChoices[i].text.normalize("NFKC").trim().toLowerCase();
    if (seenTexts.has(norm) || !norm) {
      quizChoices[i].text = `${quizChoices[i].text || `Option ${letters[i].toUpperCase()}`} (${letters[i].toUpperCase()})`;
    }
    seenTexts.add(quizChoices[i].text.normalize("NFKC").trim().toLowerCase());
  }

  return quizChoices;
}

export function convertBankQuestionToQuizQuestion(bankQuestion: BankQuestion, options: ConvertBankQuestionOptions = {}): QuizQuestion {
  const isTrueFalse = bankQuestion.format === "true_false";
  const requiredCount = isTrueFalse ? 2 : 3;
  const translation = options.translation;

  const rawChoices = buildRawChoices(bankQuestion, translation);
  const correctRaw =
    rawChoices.find((c) => c.id === bankQuestion.correct_choice_id) ?? rawChoices.find((c) => c.is_correct) ?? rawChoices[0];

  const finalRawChoices = buildFinalChoices(rawChoices, correctRaw, isTrueFalse);
  const quizChoices = buildDeduplicatedQuizChoices(finalRawChoices, requiredCount);
  const correctChoice = quizChoices.find((_, idx) => finalRawChoices[idx].isCorrect) ?? quizChoices[0];

  const localizedQuestion = translation?.question || bankQuestion.question || "Engaging trivia challenge question";
  const localizedExplanation = translation?.explanation || bankQuestion.explanation || "Detailed explanation for the correct answer.";
  const localizedFunFact = translation?.fun_fact !== undefined ? translation.fun_fact : bankQuestion.fun_fact || "";

  const candidateQuestion = {
    id: (bankQuestion.id || makeId("bq")).slice(0, 80),
    number: 1,
    format: bankQuestion.format || "multiple_choice",
    difficulty: Math.min(Math.max(1, Number(bankQuestion.difficulty) || 2), 5),
    question: localizedQuestion.slice(0, 320).trim(),
    choices: quizChoices,
    correct_choice_id: correctChoice.id,
    explanation: localizedExplanation.slice(0, 600).trim(),
    fun_fact: localizedFunFact.slice(0, 600).trim(),
    source_ids: [],
    visual_opportunity: (bankQuestion.visual_spec?.prompt || "").slice(0, 1000).trim(),
    validation: {
      semantic_status: "validated" as const,
      source_coverage: false,
      fact_locked: true,
    },
  };

  return QuizQuestionSchema.parse(candidateQuestion);
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

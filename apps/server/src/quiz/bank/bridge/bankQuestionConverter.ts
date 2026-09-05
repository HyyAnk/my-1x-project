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
export function convertBankQuestionToQuizQuestion(
  bankQuestion: BankQuestion,
  options: ConvertBankQuestionOptions = {},
): QuizQuestion {
  const isTrueFalse = bankQuestion.format === "true_false";
  const requiredCount = isTrueFalse ? 2 : 3;
  const translation = options.translation;

  // Defensive fallback: ensure bankQuestion.choices is a non-empty array
  const rawChoices = Array.isArray(bankQuestion.choices) && bankQuestion.choices.length > 0
    ? bankQuestion.choices.map((c, idx) => {
        if (!translation?.choices) return { ...c };
        const tc =
          translation.choices.find(
            (item) => item.id.trim().toLowerCase() === c.id.trim().toLowerCase(),
          ) ?? translation.choices[idx];
        return {
          ...c,
          text: tc?.text || c.text,
        };
      })
    : isTrueFalse
      ? [
          { id: "choice_tf_1", text: "True", is_correct: true },
          { id: "choice_tf_2", text: "False", is_correct: false },
        ]
      : [
          { id: "choice_mc_1", text: "Option A", is_correct: true },
          { id: "choice_mc_2", text: "Option B", is_correct: false },
          { id: "choice_mc_3", text: "Option C", is_correct: false },
        ];

  // 1. Identify correct choice
  const correctRaw =
    rawChoices.find((c) => c.id === bankQuestion.correct_choice_id) ??
    rawChoices.find((c) => c.is_correct) ??
    rawChoices[0];

  const distractersRaw = rawChoices.filter((c) => c !== correctRaw);

  let finalRawChoices: Array<{ text: string; isCorrect: boolean }> = [];

  if (isTrueFalse) {
    if (distractersRaw.length >= 1) {
      finalRawChoices = [
        { text: (correctRaw.text || "True").trim(), isCorrect: true },
        { text: (distractersRaw[0].text || "False").trim(), isCorrect: false },
      ];
      // If original order had distracter first, keep that order
      if (rawChoices.indexOf(distractersRaw[0]) < rawChoices.indexOf(correctRaw)) {
        finalRawChoices.reverse();
      }
    } else {
      const isCorrectTrue = (correctRaw.text || "").toLowerCase().includes("true");
      finalRawChoices = [
        { text: "True", isCorrect: isCorrectTrue },
        { text: "False", isCorrect: !isCorrectTrue },
      ];
    }
  } else {
    // Requires exactly 3 choices
    const neededDistracters = distractersRaw.slice(0, 2);
    if (neededDistracters.length === 0) {
      neededDistracters.push({ id: "fallback_1", text: "Other Option", is_correct: false });
      neededDistracters.push({ id: "fallback_2", text: "None of the Above", is_correct: false });
    } else if (neededDistracters.length === 1) {
      neededDistracters.push({ id: "fallback_1", text: "All of the Above", is_correct: false });
    }

    // Place correct choice in natural position or middle
    const originalCorrectIndex = rawChoices.indexOf(correctRaw);
    const targetCorrectIndex = Math.min(Math.max(0, originalCorrectIndex), 2);

    finalRawChoices = [
      { text: (neededDistracters[0].text || "Option B").trim(), isCorrect: false },
      { text: (neededDistracters[1].text || "Option C").trim(), isCorrect: false },
    ];
    finalRawChoices.splice(targetCorrectIndex, 0, { text: (correctRaw.text || "Option A").trim(), isCorrect: true });
  }

  // Letters: a, b, c
  const letters = ["a", "b", "c", "d"];
  const quizChoices = finalRawChoices.slice(0, requiredCount).map((c, idx) => ({
    id: letters[idx],
    text: (c.text || "").slice(0, 180).trim() || `Option ${letters[idx].toUpperCase()}`,
  }));

  // Ensure unique normalized texts
  const seenTexts = new Set<string>();
  for (let i = 0; i < quizChoices.length; i++) {
    const norm = quizChoices[i].text.normalize("NFKC").trim().toLowerCase();
    if (seenTexts.has(norm) || !norm) {
      quizChoices[i].text = `${quizChoices[i].text || `Option ${letters[i].toUpperCase()}`} (${letters[i].toUpperCase()})`;
    }
    seenTexts.add(quizChoices[i].text.normalize("NFKC").trim().toLowerCase());
  }

  const correctChoice = quizChoices.find((_, idx) => finalRawChoices[idx].isCorrect) ?? quizChoices[0];

  const localizedQuestion = translation?.question || bankQuestion.question || "Engaging trivia challenge question";
  const localizedExplanation = translation?.explanation || bankQuestion.explanation || "Detailed explanation for the correct answer.";
  const localizedFunFact = translation?.fun_fact !== undefined ? translation.fun_fact : (bankQuestion.fun_fact || "");

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
 * Transcreates and converts a batch of BankQuestions into validated QuizQuestions.
 */
export async function transcreateAndConvertTopicQuestions(
  selectedQuestions: BankQuestion[],
  targetLanguage: string,
  channel: Channel,
  repository: RepositoryService,
  llmClient?: LLMClient | null,
): Promise<QuizQuestion[]> {
  const quizQuestions: QuizQuestion[] = [];

  for (let i = 0; i < selectedQuestions.length; i++) {
    const bankQuestion = selectedQuestions[i];
    const activeTranslation = await resolveBankQuestionTranslation(
      bankQuestion,
      targetLanguage,
      channel,
      repository,
      llmClient,
    );

    const quizQuestion = convertBankQuestionToQuizQuestion(bankQuestion, {
      language: targetLanguage,
      translation: activeTranslation,
    });
    quizQuestion.number = i + 1;
    quizQuestions.push(quizQuestion);
  }

  return quizQuestions;
}

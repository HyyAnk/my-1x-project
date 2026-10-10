import type { BankQuestion, QuizQuestion, QuizShortLayoutPair } from "@studio/shared";
import { resolveQuizShortLayoutPair } from "../../director/quizShortDirectorPlan.js";
import { applyStableChoiceOrder, spreadCorrectChoicePositions } from "../choiceOrder/index.js";
import { convertBankQuestionToQuizQuestionLossless } from "./bankQuestionConverter.js";
import { adaptQuizShortQuestions } from "./quizShortQuestionAdapter.js";

export interface PreparedQuizShortQuestions {
  questions: QuizQuestion[];
  layoutPair: QuizShortLayoutPair;
}

function convertBoundQuestion(bankQuestion: BankQuestion, index: number): QuizQuestion {
  const question = applyStableChoiceOrder(convertBankQuestionToQuizQuestionLossless(bankQuestion));
  question.number = index + 1;
  const claimId = `C${String(index + 1).padStart(2, "0")}`;
  question.source_ids = Array.from(new Set([claimId, ...(question.source_ids || []), bankQuestion.id].filter(Boolean)));
  question.validation.source_coverage = true;
  return question;
}

/**
 * Converts bound bank questions losslessly, balances the correct-choice positions, then adapts
 * any question whose portrait beat needs two choices. The layout pair is resolved before the
 * adaptation because it only depends on visual subjects and formats, which adaptation keeps.
 */
export function prepareQuizShortQuestions(
  bankQuestions: readonly BankQuestion[],
  requestedPair?: QuizShortLayoutPair,
): PreparedQuizShortQuestions {
  const converted = spreadCorrectChoicePositions(bankQuestions.map(convertBoundQuestion));
  const layoutPair = resolveQuizShortLayoutPair({ questions: converted }, { layout_pair: requestedPair });
  return { questions: adaptQuizShortQuestions(converted, layoutPair, bankQuestions), layoutPair };
}

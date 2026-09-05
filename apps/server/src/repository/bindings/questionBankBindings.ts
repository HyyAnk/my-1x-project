import {
  getQuestionBankPath,
  readQuestionBankTaxonomy,
  readQuestionBankIndex,
  listQuestionBankBatches,
  recalculateQuestionBankIndex,
  queryQuestionBankQuestions,
  getQuestionBankQuestion,
  saveQuestionBankQuestion,
  saveQuestionBankTranslation,
  deleteQuestionBankQuestion,
  getQuestionBankMatrixCoverage,
} from "../quiz/questionBankRepository.js";

export const questionBankBindings = {
  getQuestionBankPath,
  readQuestionBankTaxonomy,
  readQuestionBankIndex,
  listQuestionBankBatches,
  recalculateQuestionBankIndex,
  queryQuestionBankQuestions,
  getQuestionBankQuestion,
  saveQuestionBankQuestion,
  saveQuestionBankTranslation,
  deleteQuestionBankQuestion,
  getQuestionBankMatrixCoverage,
};

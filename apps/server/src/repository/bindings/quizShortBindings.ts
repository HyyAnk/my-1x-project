import { deleteQuizShort, getQuizShort, listQuizShorts, saveQuizShort } from "../quizShorts.js";
import { updateQuizShortSettings } from "../quizShortSettings.js";
import { locateQuizProduct, writeQuizProductRecordPatch } from "../quizProductLocator.js";

export const quizShortBindings = {
  listQuizShorts,
  getQuizShort,
  saveQuizShort,
  deleteQuizShort,
  updateQuizShortSettings,
  locateQuizProduct,
  writeQuizProductRecordPatch,
};

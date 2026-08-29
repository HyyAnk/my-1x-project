import { getQuizLayoutUiDefinition, QUIZ_LAYOUT_UI_DEFINITIONS } from "../quizLayouts/quizLayoutUiCatalog";
import type { StageQuestionLayout } from "./types";

export const STAGE_QUESTION_LAYOUTS = QUIZ_LAYOUT_UI_DEFINITIONS;

export function getStageQuestionLayoutDefinition(layoutId: StageQuestionLayout) {
  return getQuizLayoutUiDefinition(layoutId);
}

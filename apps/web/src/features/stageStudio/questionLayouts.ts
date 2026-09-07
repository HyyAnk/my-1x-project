import {
  QUIZ_LANDSCAPE_LAYOUT_IDS,
  QUIZ_PORTRAIT_LAYOUT_IDS,
  filterQuizLayoutsByAspectRatio,
  getCompatibleQuizLayout,
  type ResolvedQuizLayoutId,
} from "@studio/shared";
import {
  getQuizLayoutUiDefinition,
  getQuizLayoutUiDefinitions,
  QUIZ_LAYOUT_UI_DEFINITIONS,
  type QuizLayoutUiDefinition,
} from "../quizLayouts/quizLayoutUiCatalog";
import type { StageAspectRatio, StageQuestionLayout } from "./types";

export { filterQuizLayoutsByAspectRatio, getCompatibleQuizLayout };
export type { QuizLayoutUiDefinition };

export const STAGE_QUESTION_LAYOUTS: readonly QuizLayoutUiDefinition[] = QUIZ_LAYOUT_UI_DEFINITIONS;

export const STAGE_PORTRAIT_LAYOUT_IDS: readonly ResolvedQuizLayoutId[] = QUIZ_PORTRAIT_LAYOUT_IDS;

export const STAGE_LANDSCAPE_LAYOUT_IDS: readonly ResolvedQuizLayoutId[] = QUIZ_LANDSCAPE_LAYOUT_IDS;

export function getStageQuestionLayouts(aspectRatio?: StageAspectRatio): QuizLayoutUiDefinition[] {
  return getQuizLayoutUiDefinitions(aspectRatio);
}

export function getStageQuestionLayoutDefinition(layoutId: StageQuestionLayout): QuizLayoutUiDefinition {
  return getQuizLayoutUiDefinition(layoutId);
}

export function resolveInitialStageQuestionLayout(
  channelLayoutId: string | undefined | null,
  aspectRatio: StageAspectRatio = "16:9",
): StageQuestionLayout {
  if (!channelLayoutId) {
    return aspectRatio === "9:16" ? "portrait_hero_choices" : "media_left_choices_right";
  }
  return getCompatibleQuizLayout(channelLayoutId as ResolvedQuizLayoutId, aspectRatio);
}

export function getCompatibleStageQuestionLayout(
  currentLayoutId: StageQuestionLayout,
  targetAspectRatio: StageAspectRatio,
): StageQuestionLayout {
  return getCompatibleQuizLayout(currentLayoutId, targetAspectRatio);
}



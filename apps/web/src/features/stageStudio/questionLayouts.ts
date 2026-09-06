import { QUIZ_PORTRAIT_LAYOUT_IDS, type ResolvedQuizLayoutId } from "@studio/shared";
import {
  getQuizLayoutUiDefinition,
  QUIZ_LAYOUT_UI_DEFINITIONS,
  type QuizLayoutUiDefinition,
} from "../quizLayouts/quizLayoutUiCatalog";
import type { StageAspectRatio, StageQuestionLayout } from "./types";

export const STAGE_QUESTION_LAYOUTS: readonly QuizLayoutUiDefinition[] = QUIZ_LAYOUT_UI_DEFINITIONS;

export const STAGE_PORTRAIT_LAYOUT_IDS: readonly ResolvedQuizLayoutId[] = QUIZ_PORTRAIT_LAYOUT_IDS;

export const STAGE_LANDSCAPE_LAYOUT_IDS: readonly ResolvedQuizLayoutId[] = [
  "media_left_choices_right",
  "visual_choices_three",
  "visual_choices_three_pure",
  "split_versus_two",
  "verdict_true_false",
  "full_stack_list",
  "mystery_reveal",
  "clue_deduction",
];

export function getStageQuestionLayouts(aspectRatio?: StageAspectRatio): QuizLayoutUiDefinition[] {
  if (aspectRatio === "9:16") {
    return QUIZ_LAYOUT_UI_DEFINITIONS.filter((layout) =>
      STAGE_PORTRAIT_LAYOUT_IDS.includes(layout.id),
    );
  }
  return QUIZ_LAYOUT_UI_DEFINITIONS.filter((layout) =>
    STAGE_LANDSCAPE_LAYOUT_IDS.includes(layout.id),
  );
}

export function getStageQuestionLayoutDefinition(layoutId: StageQuestionLayout): QuizLayoutUiDefinition {
  return getQuizLayoutUiDefinition(layoutId);
}

export function resolveInitialStageQuestionLayout(
  channelLayoutId: string | undefined | null,
  aspectRatio: StageAspectRatio = "16:9",
): StageQuestionLayout {
  if (aspectRatio === "9:16") {
    if (channelLayoutId && STAGE_PORTRAIT_LAYOUT_IDS.includes(channelLayoutId as ResolvedQuizLayoutId)) {
      return channelLayoutId as StageQuestionLayout;
    }
    switch (channelLayoutId) {
      case "split_versus_two":
        return "portrait_split_versus";
      case "verdict_true_false":
        return "portrait_verdict_tf";
      case "full_stack_list":
        return "portrait_stack_list";
      default:
        return "portrait_hero_choices";
    }
  }

  if (channelLayoutId && STAGE_LANDSCAPE_LAYOUT_IDS.includes(channelLayoutId as ResolvedQuizLayoutId)) {
    return channelLayoutId as StageQuestionLayout;
  }
  switch (channelLayoutId) {
    case "portrait_split_versus":
      return "split_versus_two";
    case "portrait_verdict_tf":
      return "verdict_true_false";
    case "portrait_stack_list":
      return "full_stack_list";
    default:
      return "media_left_choices_right";
  }
}

export function getCompatibleStageQuestionLayout(
  currentLayoutId: StageQuestionLayout,
  targetAspectRatio: StageAspectRatio,
): StageQuestionLayout {
  return resolveInitialStageQuestionLayout(currentLayoutId, targetAspectRatio);
}


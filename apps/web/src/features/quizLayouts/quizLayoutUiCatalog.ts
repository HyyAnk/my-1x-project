import {
  QUIZ_LAYOUTS,
  QUIZ_LANDSCAPE_LAYOUT_IDS,
  filterQuizLayoutsByAspectRatio,
  getCompatibleQuizLayout,
  type QuizLandscapeLayoutId,
  type ResolvedQuizLayoutId,
} from "@studio/shared";

export { getCompatibleQuizLayout, filterQuizLayoutsByAspectRatio, QUIZ_LANDSCAPE_LAYOUT_IDS };

export type QuizLayoutUiDefinition = {
  id: QuizLandscapeLayoutId;
  labelKey: string;
  descriptionKey: string;
  sandboxLabelKey: string;
  sandboxDescriptionKey: string;
  preview: "media-left" | "visual-three" | "full-stack" | "mystery-reveal" | "split-versus" | "verdict";
  icon: "split" | "visual" | "stack";
};

const QUIZ_LAYOUT_UI_BY_ID = {
  media_left_choices_right: {
    id: "media_left_choices_right",
    labelKey: "stageStudio.layoutMediaLeft",
    descriptionKey: "stageStudio.layoutMediaLeftDesc",
    sandboxLabelKey: "stageStudio.layoutMediaLeft",
    sandboxDescriptionKey: "stageStudio.layoutMediaLeftDesc",
    preview: "media-left",
    icon: "split",
  },
  visual_choices_three: {
    id: "visual_choices_three",
    labelKey: "stageStudio.layoutVisualThree",
    descriptionKey: "stageStudio.layoutVisualThreeDesc",
    sandboxLabelKey: "stageStudio.layoutVisualThree",
    sandboxDescriptionKey: "stageStudio.layoutVisualThreeDesc",
    preview: "visual-three",
    icon: "visual",
  },
  visual_choices_three_pure: {
    id: "visual_choices_three_pure",
    labelKey: "stageStudio.layoutVisualThreePure",
    descriptionKey: "stageStudio.layoutVisualThreePureDesc",
    sandboxLabelKey: "stageStudio.layoutVisualThreePure",
    sandboxDescriptionKey: "stageStudio.layoutVisualThreePureDesc",
    preview: "visual-three",
    icon: "visual",
  },
  split_versus_two: {
    id: "split_versus_two",
    labelKey: "stageStudio.layoutSplitVersusTwo",
    descriptionKey: "stageStudio.layoutSplitVersusTwoDesc",
    sandboxLabelKey: "stageStudio.layoutSplitVersusTwo",
    sandboxDescriptionKey: "stageStudio.layoutSplitVersusTwoDesc",
    preview: "split-versus",
    icon: "split",
  },
  verdict_yes_no: {
    id: "verdict_yes_no",
    labelKey: "stageStudio.layoutVerdictYesNo",
    descriptionKey: "stageStudio.layoutVerdictYesNoDesc",
    sandboxLabelKey: "stageStudio.layoutVerdictYesNo",
    sandboxDescriptionKey: "stageStudio.layoutVerdictYesNoDesc",
    preview: "verdict",
    icon: "split",
  },
  full_stack_list: {
    id: "full_stack_list",
    labelKey: "stageStudio.layoutFullStack",
    descriptionKey: "stageStudio.layoutFullStackDesc",
    sandboxLabelKey: "stageStudio.layoutFullStack",
    sandboxDescriptionKey: "stageStudio.layoutFullStackDesc",
    preview: "full-stack",
    icon: "stack",
  },
  mystery_reveal: {
    id: "mystery_reveal",
    labelKey: "stageStudio.layoutMysteryReveal",
    descriptionKey: "stageStudio.layoutMysteryRevealDesc",
    sandboxLabelKey: "stageStudio.layoutMysteryReveal",
    sandboxDescriptionKey: "stageStudio.layoutMysteryRevealDesc",
    preview: "mystery-reveal",
    icon: "visual",
  },
} as const satisfies Record<QuizLandscapeLayoutId, QuizLayoutUiDefinition>;

export const QUIZ_LAYOUT_UI_DEFINITIONS = QUIZ_LAYOUTS.map((layout) => QUIZ_LAYOUT_UI_BY_ID[layout.id]);

/** Portrait layouts have no sandbox UI entry yet; they resolve to their landscape counterpart. */
export function getQuizLayoutUiDefinition(layoutId: ResolvedQuizLayoutId): QuizLayoutUiDefinition {
  return QUIZ_LAYOUT_UI_BY_ID[getCompatibleQuizLayout(layoutId, "16:9")];
}

export function getQuizLayoutUiDefinitions(aspectRatio?: "16:9" | "9:16"): QuizLayoutUiDefinition[] {
  const allowedIds: readonly ResolvedQuizLayoutId[] = filterQuizLayoutsByAspectRatio(aspectRatio);
  return QUIZ_LAYOUT_UI_DEFINITIONS.filter((layout) => allowedIds.includes(layout.id));
}

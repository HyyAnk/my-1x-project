import {
  QUIZ_LAYOUTS,
  QUIZ_LANDSCAPE_LAYOUT_IDS,
  QUIZ_PORTRAIT_LAYOUT_IDS,
  filterQuizLayoutsByAspectRatio,
  getCompatibleQuizLayout,
  type ResolvedQuizLayoutId,
} from "@studio/shared";

export {
  getCompatibleQuizLayout,
  filterQuizLayoutsByAspectRatio,
  QUIZ_LANDSCAPE_LAYOUT_IDS,
  QUIZ_PORTRAIT_LAYOUT_IDS,
};

export type QuizLayoutUiDefinition = {
  id: ResolvedQuizLayoutId;
  labelKey: string;
  descriptionKey: string;
  sandboxLabelKey: string;
  sandboxDescriptionKey: string;
  preview: "media-left" | "visual-three" | "full-stack" | "portrait-hero" | "portrait-versus" | "portrait-verdict" | "portrait-stack";
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
    preview: "media-left",
    icon: "split",
  },
  verdict_true_false: {
    id: "verdict_true_false",
    labelKey: "stageStudio.layoutVerdictTrueFalse",
    descriptionKey: "stageStudio.layoutVerdictTrueFalseDesc",
    sandboxLabelKey: "stageStudio.layoutVerdictTrueFalse",
    sandboxDescriptionKey: "stageStudio.layoutVerdictTrueFalseDesc",
    preview: "media-left",
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
    preview: "media-left",
    icon: "visual",
  },
  clue_deduction: {
    id: "clue_deduction",
    labelKey: "stageStudio.layoutClueDeduction",
    descriptionKey: "stageStudio.layoutClueDeductionDesc",
    sandboxLabelKey: "stageStudio.layoutClueDeduction",
    sandboxDescriptionKey: "stageStudio.layoutClueDeductionDesc",
    preview: "media-left",
    icon: "visual",
  },
  portrait_hero_choices: {
    id: "portrait_hero_choices",
    labelKey: "stageStudio.layoutPortraitHeroChoices",
    descriptionKey: "stageStudio.layoutPortraitHeroChoicesDesc",
    sandboxLabelKey: "stageStudio.layoutPortraitHeroChoices",
    sandboxDescriptionKey: "stageStudio.layoutPortraitHeroChoicesDesc",
    preview: "portrait-hero",
    icon: "split",
  },
  portrait_split_versus: {
    id: "portrait_split_versus",
    labelKey: "stageStudio.layoutPortraitSplitVersus",
    descriptionKey: "stageStudio.layoutPortraitSplitVersusDesc",
    sandboxLabelKey: "stageStudio.layoutPortraitSplitVersus",
    sandboxDescriptionKey: "stageStudio.layoutPortraitSplitVersusDesc",
    preview: "portrait-versus",
    icon: "split",
  },
  portrait_verdict_tf: {
    id: "portrait_verdict_tf",
    labelKey: "stageStudio.layoutPortraitVerdictTf",
    descriptionKey: "stageStudio.layoutPortraitVerdictTfDesc",
    sandboxLabelKey: "stageStudio.layoutPortraitVerdictTf",
    sandboxDescriptionKey: "stageStudio.layoutPortraitVerdictTfDesc",
    preview: "portrait-verdict",
    icon: "split",
  },
  portrait_stack_list: {
    id: "portrait_stack_list",
    labelKey: "stageStudio.layoutPortraitStackList",
    descriptionKey: "stageStudio.layoutPortraitStackListDesc",
    sandboxLabelKey: "stageStudio.layoutPortraitStackList",
    sandboxDescriptionKey: "stageStudio.layoutPortraitStackListDesc",
    preview: "portrait-stack",
    icon: "stack",
  },
} as const satisfies Record<ResolvedQuizLayoutId, QuizLayoutUiDefinition>;

export const QUIZ_LAYOUT_UI_DEFINITIONS = QUIZ_LAYOUTS.map((layout) => QUIZ_LAYOUT_UI_BY_ID[layout.id]);

export function getQuizLayoutUiDefinition(layoutId: ResolvedQuizLayoutId): QuizLayoutUiDefinition {
  return QUIZ_LAYOUT_UI_BY_ID[layoutId];
}

export function getQuizLayoutUiDefinitions(
  aspectRatio?: "16:9" | "9:16",
): QuizLayoutUiDefinition[] {
  const allowedIds = filterQuizLayoutsByAspectRatio(aspectRatio);
  return QUIZ_LAYOUT_UI_DEFINITIONS.filter((layout) =>
    (allowedIds as readonly ResolvedQuizLayoutId[]).includes(layout.id),
  );
}

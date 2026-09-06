import { QUIZ_LAYOUTS, type ResolvedQuizLayoutId } from "@studio/shared";

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
    sandboxLabelKey: "visualSandbox.layoutMediaLeftChoicesRight",
    sandboxDescriptionKey: "visualSandbox.layoutMediaLeftChoicesRightSub",
    preview: "media-left",
    icon: "split",
  },
  visual_choices_three: {
    id: "visual_choices_three",
    labelKey: "stageStudio.layoutVisualThree",
    descriptionKey: "stageStudio.layoutVisualThreeDesc",
    sandboxLabelKey: "visualSandbox.layoutVisualChoicesThree",
    sandboxDescriptionKey: "visualSandbox.layoutVisualChoicesThreeSub",
    preview: "visual-three",
    icon: "visual",
  },
  visual_choices_three_pure: {
    id: "visual_choices_three_pure",
    labelKey: "stageStudio.layoutVisualThreePure",
    descriptionKey: "stageStudio.layoutVisualThreePureDesc",
    sandboxLabelKey: "visualSandbox.layoutVisualChoicesThreePure",
    sandboxDescriptionKey: "visualSandbox.layoutVisualChoicesThreePureSub",
    preview: "visual-three",
    icon: "visual",
  },
  split_versus_two: {
    id: "split_versus_two",
    labelKey: "stageStudio.layoutSplitVersusTwo",
    descriptionKey: "stageStudio.layoutSplitVersusTwoDesc",
    sandboxLabelKey: "visualSandbox.layoutSplitVersusTwo",
    sandboxDescriptionKey: "visualSandbox.layoutSplitVersusTwoSub",
    preview: "media-left",
    icon: "split",
  },
  verdict_true_false: {
    id: "verdict_true_false",
    labelKey: "stageStudio.layoutVerdictTrueFalse",
    descriptionKey: "stageStudio.layoutVerdictTrueFalseDesc",
    sandboxLabelKey: "visualSandbox.layoutVerdictTrueFalse",
    sandboxDescriptionKey: "visualSandbox.layoutVerdictTrueFalseSub",
    preview: "media-left",
    icon: "split",
  },
  full_stack_list: {
    id: "full_stack_list",
    labelKey: "stageStudio.layoutFullStack",
    descriptionKey: "stageStudio.layoutFullStackDesc",
    sandboxLabelKey: "visualSandbox.layoutFullStackList",
    sandboxDescriptionKey: "visualSandbox.layoutFullStackListSub",
    preview: "full-stack",
    icon: "stack",
  },
  mystery_reveal: {
    id: "mystery_reveal",
    labelKey: "stageStudio.layoutMysteryReveal",
    descriptionKey: "stageStudio.layoutMysteryRevealDesc",
    sandboxLabelKey: "visualSandbox.layoutMysteryReveal",
    sandboxDescriptionKey: "visualSandbox.layoutMysteryRevealSub",
    preview: "media-left",
    icon: "visual",
  },
  clue_deduction: {
    id: "clue_deduction",
    labelKey: "stageStudio.layoutClueDeduction",
    descriptionKey: "stageStudio.layoutClueDeductionDesc",
    sandboxLabelKey: "visualSandbox.layoutClueDeduction",
    sandboxDescriptionKey: "visualSandbox.layoutClueDeductionSub",
    preview: "media-left",
    icon: "visual",
  },
  portrait_hero_choices: {
    id: "portrait_hero_choices",
    labelKey: "stageStudio.layoutPortraitHeroChoices",
    descriptionKey: "stageStudio.layoutPortraitHeroChoicesDesc",
    sandboxLabelKey: "visualSandbox.layoutPortraitHeroChoices",
    sandboxDescriptionKey: "visualSandbox.layoutPortraitHeroChoicesSub",
    preview: "portrait-hero",
    icon: "split",
  },
  portrait_split_versus: {
    id: "portrait_split_versus",
    labelKey: "stageStudio.layoutPortraitSplitVersus",
    descriptionKey: "stageStudio.layoutPortraitSplitVersusDesc",
    sandboxLabelKey: "visualSandbox.layoutPortraitSplitVersus",
    sandboxDescriptionKey: "visualSandbox.layoutPortraitSplitVersusSub",
    preview: "portrait-versus",
    icon: "split",
  },
  portrait_verdict_tf: {
    id: "portrait_verdict_tf",
    labelKey: "stageStudio.layoutPortraitVerdictTf",
    descriptionKey: "stageStudio.layoutPortraitVerdictTfDesc",
    sandboxLabelKey: "visualSandbox.layoutPortraitVerdictTf",
    sandboxDescriptionKey: "visualSandbox.layoutPortraitVerdictTfSub",
    preview: "portrait-verdict",
    icon: "split",
  },
  portrait_stack_list: {
    id: "portrait_stack_list",
    labelKey: "stageStudio.layoutPortraitStackList",
    descriptionKey: "stageStudio.layoutPortraitStackListDesc",
    sandboxLabelKey: "visualSandbox.layoutPortraitStackList",
    sandboxDescriptionKey: "visualSandbox.layoutPortraitStackListSub",
    preview: "portrait-stack",
    icon: "stack",
  },
} as const satisfies Record<ResolvedQuizLayoutId, QuizLayoutUiDefinition>;

export const QUIZ_LAYOUT_UI_DEFINITIONS = QUIZ_LAYOUTS.map((layout) => QUIZ_LAYOUT_UI_BY_ID[layout.id]);

export function getQuizLayoutUiDefinition(layoutId: ResolvedQuizLayoutId): QuizLayoutUiDefinition {
  return QUIZ_LAYOUT_UI_BY_ID[layoutId];
}

import { QUIZ_LAYOUTS, type ResolvedQuizLayoutId } from "@studio/shared";

export type QuizLayoutUiDefinition = {
  id: ResolvedQuizLayoutId;
  labelKey: string;
  descriptionKey: string;
  sandboxLabelKey: string;
  sandboxDescriptionKey: string;
  preview: "media-left" | "visual-three" | "full-stack";
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
    labelKey: "stageStudio.layoutVisualThree",
    descriptionKey: "stageStudio.layoutVisualThreeDesc",
    sandboxLabelKey: "visualSandbox.layoutVisualChoicesThreePure",
    sandboxDescriptionKey: "visualSandbox.layoutVisualChoicesThreePureSub",
    preview: "visual-three",
    icon: "visual",
  },
  split_versus_two: {
    id: "split_versus_two",
    labelKey: "stageStudio.layoutMediaLeft",
    descriptionKey: "stageStudio.layoutMediaLeftDesc",
    sandboxLabelKey: "visualSandbox.layoutSplitVersusTwo",
    sandboxDescriptionKey: "visualSandbox.layoutSplitVersusTwoSub",
    preview: "media-left",
    icon: "split",
  },
  verdict_true_false: {
    id: "verdict_true_false",
    labelKey: "stageStudio.layoutMediaLeft",
    descriptionKey: "stageStudio.layoutMediaLeftDesc",
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
    labelKey: "stageStudio.layoutMediaLeft",
    descriptionKey: "stageStudio.layoutMediaLeftDesc",
    sandboxLabelKey: "visualSandbox.layoutMysteryReveal",
    sandboxDescriptionKey: "visualSandbox.layoutMysteryRevealSub",
    preview: "media-left",
    icon: "visual",
  },
  clue_deduction: {
    id: "clue_deduction",
    labelKey: "stageStudio.layoutMediaLeft",
    descriptionKey: "stageStudio.layoutMediaLeftDesc",
    sandboxLabelKey: "visualSandbox.layoutClueDeduction",
    sandboxDescriptionKey: "visualSandbox.layoutClueDeductionSub",
    preview: "media-left",
    icon: "visual",
  },
} as const satisfies Record<ResolvedQuizLayoutId, QuizLayoutUiDefinition>;

export const QUIZ_LAYOUT_UI_DEFINITIONS = QUIZ_LAYOUTS.map((layout) => QUIZ_LAYOUT_UI_BY_ID[layout.id]);

export function getQuizLayoutUiDefinition(layoutId: ResolvedQuizLayoutId): QuizLayoutUiDefinition {
  return QUIZ_LAYOUT_UI_BY_ID[layoutId];
}

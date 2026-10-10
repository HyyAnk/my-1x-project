import type { QuizAssetPlan, QuizQuestion } from "@studio/shared";
import type { QUIZ_STYLE_CONTRACTS } from "./promptCompiler.js";

type QuizStyleContract = (typeof QUIZ_STYLE_CONTRACTS)[keyof typeof QUIZ_STYLE_CONTRACTS];

/** Portrait layouts show at most two answer images, so a portrait beat never plans three. */
export const QUIZ_PORTRAIT_MAX_CHOICE_IMAGES = 2;

const GRAPHIC_SET_TREATMENT = {
  style_family: "2D clean vector graphic emblem and symbol design",
  rendering_medium: "clean flat 2D graphic vector emblem, sharp silhouette, centered on solid background",
  lighting: "clean ambient studio lighting with zero shadows",
  framing: "one centered isolated vector mark, high contrast, clean white background",
  background_treatment: "pure solid clean white background",
  edge_treatment: "sharp, clean vector outlines",
  detail_level: "clean minimalist vector art designed for instant brand and symbol clarity",
  face_policy: "none",
} as const;

export function buildVisualAnswerSetGroup(input: {
  question: QuizQuestion;
  groupId: string;
  assetIds: string[];
  contract: QuizStyleContract;
  isGraphicQuestion: boolean;
}): QuizAssetPlan["consistency_groups"][number] {
  const { contract, isGraphicQuestion } = input;
  return {
    group_id: input.groupId,
    question_id: input.question.id,
    purpose: "visual_answer_set",
    style_family: isGraphicQuestion ? GRAPHIC_SET_TREATMENT.style_family : contract.styleFamily,
    rendering_medium: isGraphicQuestion ? GRAPHIC_SET_TREATMENT.rendering_medium : contract.renderingMedium,
    lighting: isGraphicQuestion ? GRAPHIC_SET_TREATMENT.lighting : contract.lighting,
    framing: isGraphicQuestion ? GRAPHIC_SET_TREATMENT.framing : "one centered subject, eye-level, full silhouette visible",
    background_treatment: isGraphicQuestion ? GRAPHIC_SET_TREATMENT.background_treatment : contract.optionBackground,
    subject_scale:
      "one large, clearly recognizable subject with a complete silhouette scaled to fill the card comfortably while keeping critical details within the layout-defined safe region, consistent in scale and lighting across every option in this set",
    contrast: "medium-high and matched across every option",
    saturation: "bright but matched across every option",
    edge_treatment: isGraphicQuestion ? GRAPHIC_SET_TREATMENT.edge_treatment : contract.edgeTreatment,
    detail_level: isGraphicQuestion ? GRAPHIC_SET_TREATMENT.detail_level : contract.detailLevel,
    face_policy: isGraphicQuestion ? GRAPHIC_SET_TREATMENT.face_policy : "natural_only",
    asset_ids: input.assetIds,
  };
}

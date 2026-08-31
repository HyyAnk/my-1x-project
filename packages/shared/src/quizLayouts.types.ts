import type { DirectorArchetype, QuizLayoutId, QuizQuestionFormat } from "./enums.js";
import type { MascotRenderAspectRatio } from "./mascot/renderTypes.js";

export type QuizChoicePresentation = "text" | "visual";
export type QuizLayoutMediaKind = "question" | "choice";

export type QuizLayoutRenderMetrics = {
  width: number;
  height: number;
  itemCount: number;
};

export type QuizLayoutAssetMetrics = {
  maxWidth: number;
  maxHeight: number;
};

export type QuizLayoutMetrics = {
  render: QuizLayoutRenderMetrics;
  assets: {
    question?: QuizLayoutAssetMetrics;
    choice?: QuizLayoutAssetMetrics;
  };
};

export type QuizLayoutCapability<LayoutId extends string> = {
  id: LayoutId;
  supportedPresentations: readonly QuizChoicePresentation[];
  supportedChoiceCounts: readonly number[];
  supportedFormats: readonly QuizQuestionFormat[];
  recommendedFormats: readonly QuizQuestionFormat[];
  media: {
    supported: readonly QuizLayoutMediaKind[];
    required: readonly QuizLayoutMediaKind[];
  };
  supportedAspectRatios: readonly MascotRenderAspectRatio[];
  metrics: QuizLayoutMetrics;
};

export type QuizLayoutResolutionInput = {
  requestedLayout: QuizLayoutId;
  archetype: DirectorArchetype;
  questionFormat: QuizQuestionFormat;
  choiceCount: number;
  aspectRatio?: MascotRenderAspectRatio;
  choicePresentation?: QuizChoicePresentation;
  media?: readonly QuizLayoutMediaKind[];
};

export type QuizLayoutCompatibilityInput<LayoutId extends string> = {
  layoutId: LayoutId;
  choicePresentation: QuizChoicePresentation;
  choiceCount: number;
  questionFormat: QuizQuestionFormat;
  aspectRatio: MascotRenderAspectRatio;
  media: readonly QuizLayoutMediaKind[];
};

export const QUIZ_LAYOUT_INCOMPATIBILITY_CODES = [
  "layout_choice_presentation_unsupported",
  "layout_choice_count_unsupported",
  "layout_question_format_unsupported",
  "layout_aspect_ratio_unsupported",
  "layout_media_unsupported",
  "layout_required_media_missing",
  "layout_no_compatible_candidate",
] as const;

export type QuizLayoutIncompatibilityCode = (typeof QUIZ_LAYOUT_INCOMPATIBILITY_CODES)[number];

export type QuizLayoutCapabilityField = "choicePresentation" | "choiceCount" | "questionFormat" | "aspectRatio" | "media" | "layout";

export type QuizLayoutIncompatibility = {
  code: QuizLayoutIncompatibilityCode;
  capability: QuizLayoutCapabilityField;
  actual: string | number | readonly string[];
  supported: readonly (string | number)[];
  message: string;
  nextAction: string;
};

export type QuizLayoutCompatibilityResult<LayoutId extends string> =
  | { compatible: true; layout: QuizLayoutCapability<LayoutId> }
  | { compatible: false; layout: QuizLayoutCapability<LayoutId>; issues: readonly QuizLayoutIncompatibility[] };

export type QuizLayoutResolutionResult<LayoutId extends string> =
  | { ok: true; layoutId: LayoutId; source: "auto" | "explicit"; capability: QuizLayoutCapability<LayoutId> }
  | {
      ok: false;
      requestedLayout: QuizLayoutId;
      source: "auto" | "explicit";
      issues: readonly QuizLayoutIncompatibility[];
    };

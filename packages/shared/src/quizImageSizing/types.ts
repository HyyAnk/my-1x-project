import type { QuizChoicePresentation, QuizLayoutAssetAspectRatio } from "../quizLayouts.types.js";
import type { ResolvedQuizLayoutId } from "../quizLayouts.catalog.js";

export type ImageSlotPurpose = "hero_question_image" | "answer_option";
export type ImageFit = "cover" | "contain";
export type ImageSize = Readonly<{ width: number; height: number }>;
export type ImageSlotViewport = ImageSize & Readonly<{ fit: ImageFit }>;

export type ImageSlotGeometry = Readonly<{
  layoutId: ResolvedQuizLayoutId;
  purpose: ImageSlotPurpose;
  canvas: ImageSize;
  viewports: readonly ImageSlotViewport[];
  geometryKey: string;
}>;

export type ImageSizingRecommendation = Readonly<{
  policyVersion: 1;
  geometry: ImageSlotGeometry;
  aspectRatio: QuizLayoutAssetAspectRatio;
  recommended: ImageSize;
  maxCropLoss: number;
  maxUnusedArea: number;
}>;

export type ImageSizingResult =
  { ok: true; value: ImageSizingRecommendation } | { ok: false; code: "invalid_geometry" | "unsupported_ratio_set" };

export interface GetQuizImageSlotGeometryInput {
  layoutId: ResolvedQuizLayoutId;
  purpose: ImageSlotPurpose;
  presentation: QuizChoicePresentation;
  choiceCount: number;
  canvasAspectRatio: "16:9";
}

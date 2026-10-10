import {
  getQuizImageSlotGeometry,
  getQuizPreviewLayoutCapability,
  recommendImageSizing,
  isQuizPortraitLayoutId,
  isResolvedQuizLayoutId,
  type ResolvedQuizLayoutId,
  QUIZ_DEFAULT_ASSET_METRICS,
  QUIZ_DEFAULT_CHOICE_ASSET_METRICS,
  type QuizLayoutAssetMetrics,
  type QuizPreviewLayoutId,
} from "@studio/shared";
import type { OptimizeRenderImageOptions } from "./imageOptimizer.js";

/**
 * Calculates optimal target dimensions based on asset purpose and visual layout,
 * delegating to layout-driven canonical sizing recommendations when layout is known.
 */
export function getOptimalAssetDimensions(
  purpose?: OptimizeRenderImageOptions["purpose"],
  layout?: QuizPreviewLayoutId,
): QuizLayoutAssetMetrics {
  if (purpose === "bridge_topic_item") {
    return { maxWidth: 640, maxHeight: 640, aspectRatio: "1:1" };
  }

  const isChoice = purpose === "choice_thumbnail" || purpose === "answer_option";

  if (layout && layout !== "baseline" && isResolvedQuizLayoutId(layout)) {
    const layoutId: ResolvedQuizLayoutId = layout;
    const purposeKind = isChoice ? "answer_option" : "hero_question_image";
    const geom = getQuizImageSlotGeometry({
      layoutId,
      purpose: purposeKind,
      presentation: "visual",
      choiceCount: 3,
      canvasAspectRatio: isQuizPortraitLayoutId(layoutId) ? "9:16" : "16:9",
    });
    if (geom) {
      const rec = recommendImageSizing(geom);
      if (rec.ok) {
        return {
          maxWidth: rec.value.recommended.width,
          maxHeight: rec.value.recommended.height,
          aspectRatio: rec.value.aspectRatio,
        };
      }
    }
  }

  // Documented compatibility defaults when layout context is missing
  if (!layout) {
    return isChoice ? QUIZ_DEFAULT_CHOICE_ASSET_METRICS : QUIZ_DEFAULT_ASSET_METRICS;
  }

  const capability = getQuizPreviewLayoutCapability(layout);
  if (isChoice) {
    return capability?.metrics?.assets?.choice ?? QUIZ_DEFAULT_CHOICE_ASSET_METRICS;
  }

  return capability?.metrics?.assets?.question ?? capability?.metrics?.assets?.choice ?? QUIZ_DEFAULT_ASSET_METRICS;
}

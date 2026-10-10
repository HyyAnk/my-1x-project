import type { BridgeSceneConfig, QuizPacingProfile } from "@studio/shared";
import type { PlanQuizAssetsOptions } from "../assets/assetPlanner.js";
import type { TimelineCompileInput } from "../timeline/compileTimeline.types.js";
import type { QuizProductView } from "./quizProductView.js";

/** Options derived from the product view that every timeline compile in the pipeline shares. */
export type ProductTimelineOptions = Required<Pick<TimelineCompileInput, "pacingProfile" | "productKind" | "outroCtaEnabled">>;

/** A missing view (legacy call sites without a product record) falls back to Episode behavior. */
export function productPacingProfile(view: QuizProductView | null): QuizPacingProfile {
  return view?.quiz_config.pacing_profile ?? "standard";
}

export function productTimelineOptions(view: QuizProductView | null): ProductTimelineOptions {
  return {
    pacingProfile: productPacingProfile(view),
    productKind: view?.kind ?? "episode",
    outroCtaEnabled: view?.quiz_config.outro_cta_enabled ?? true,
  };
}

/**
 * Quiz Shorts plan every asset against the portrait canvas and never carry the bridge showcase;
 * Episodes keep the beat-inferred landscape canvas and the bridge rules they had before.
 */
export function productAssetPlanOptions(view: QuizProductView | null, bridgeConfig?: BridgeSceneConfig): PlanQuizAssetsOptions {
  if (view?.kind === "quiz_short") return { aspectRatio: view.quiz_config.render_aspect_ratio, includeBridgeShowcase: false };
  return { bridgeConfig, includeBridgeShowcase: true };
}

/** Sizing reconciliation only needs the canvas override for portrait products. */
export function productSizingPlanOptions(view: QuizProductView | null): PlanQuizAssetsOptions | undefined {
  return view?.kind === "quiz_short" ? productAssetPlanOptions(view) : undefined;
}

import { QuizLayoutIdSchema } from "./enums.js";
import type {
  QuizLayoutAssetAspectRatio,
  QuizLayoutAssetMetrics,
  QuizLayoutCapability,
  ResolvedQuizLayoutId,
} from "./quizLayouts.types.js";
import { z } from "zod";
import { getQuizImageSlotGeometry, recommendImageSizing, type ImageSlotPurpose } from "./quizImageSizing/index.js";

export const ResolvedQuizLayoutIdSchema = QuizLayoutIdSchema.exclude(["auto"]);
export type { ResolvedQuizLayoutId };

export { QUIZ_LANDSCAPE_LAYOUT_IDS, type QuizLandscapeLayoutId } from "./quizLayoutGeometry/index.js";

export const QuizPreviewLayoutIdSchema = z.union([ResolvedQuizLayoutIdSchema, z.literal("baseline")]);
export type QuizPreviewLayoutId = z.infer<typeof QuizPreviewLayoutIdSchema>;

const supportedLandscapeAspectRatios = ["16:9"] as const;
export const QUIZ_DEFAULT_CHOICE_ASSET_METRICS = {
  maxWidth: 640,
  maxHeight: 640,
  aspectRatio: "1:1",
} as const satisfies QuizLayoutAssetMetrics;

export const QUIZ_LAYOUT_CATALOG = {
  media_left_choices_right: {
    id: "media_left_choices_right",
    supportedPresentations: ["text"],
    supportedChoiceCounts: [2, 3],
    supportedFormats: ["multiple_choice", "image_guess", "true_false", "odd_one_out"],
    recommendedFormats: ["multiple_choice", "image_guess", "true_false"],
    media: { supported: ["question"], required: ["question"] },
    supportedAspectRatios: supportedLandscapeAspectRatios,
    metrics: {
      render: { width: 720, height: 570, itemCount: 1 },
      assets: { question: { maxWidth: 1120, maxHeight: 840, aspectRatio: "4:3" } },
    },
  },
  visual_choices_three: {
    id: "visual_choices_three",
    supportedPresentations: ["visual"],
    supportedChoiceCounts: [3],
    supportedFormats: ["multiple_choice", "image_guess", "odd_one_out"],
    recommendedFormats: ["odd_one_out"],
    media: { supported: ["choice"], required: ["choice"] },
    supportedAspectRatios: supportedLandscapeAspectRatios,
    metrics: {
      render: { width: 452, height: 586, itemCount: 3 },
      assets: { choice: { maxWidth: 664, maxHeight: 664, aspectRatio: "1:1" } },
    },
  },
  visual_choices_three_pure: {
    id: "visual_choices_three_pure",
    supportedPresentations: ["visual"],
    supportedChoiceCounts: [3],
    supportedFormats: ["multiple_choice", "image_guess", "odd_one_out"],
    recommendedFormats: ["odd_one_out", "image_guess"],
    media: { supported: ["choice"], required: ["choice"] },
    supportedAspectRatios: supportedLandscapeAspectRatios,
    metrics: {
      render: { width: 452, height: 608, itemCount: 3 },
      assets: { choice: { maxWidth: 648, maxHeight: 864, aspectRatio: "3:4" } },
    },
  },
  split_versus_two: {
    id: "split_versus_two",
    supportedPresentations: ["visual", "text"],
    supportedChoiceCounts: [2],
    supportedFormats: ["multiple_choice", "image_guess", "true_false"],
    recommendedFormats: ["multiple_choice"],
    media: { supported: ["choice", "question"], required: [] },
    supportedAspectRatios: supportedLandscapeAspectRatios,
    metrics: {
      render: { width: 698, height: 578, itemCount: 2 },
      assets: {
        choice: { maxWidth: 1152, maxHeight: 648, aspectRatio: "16:9" },
        question: { maxWidth: 1080, maxHeight: 810, aspectRatio: "4:3" },
      },
    },
  },
  verdict_true_false: {
    id: "verdict_true_false",
    supportedPresentations: ["text"],
    supportedChoiceCounts: [2],
    supportedFormats: ["true_false"],
    recommendedFormats: ["true_false"],
    media: { supported: ["question"], required: ["question"] },
    supportedAspectRatios: supportedLandscapeAspectRatios,
    metrics: {
      render: { width: 820, height: 565, itemCount: 1 },
      assets: { question: { maxWidth: 1216, maxHeight: 912, aspectRatio: "4:3" } },
    },
  },
  full_stack_list: {
    id: "full_stack_list",
    supportedPresentations: ["text"],
    supportedChoiceCounts: [2, 3],
    supportedFormats: ["multiple_choice", "true_false"],
    recommendedFormats: ["multiple_choice", "true_false"],
    media: { supported: [], required: [] },
    supportedAspectRatios: supportedLandscapeAspectRatios,
    metrics: {
      render: { width: 1280, height: 528, itemCount: 1 },
      assets: {},
    },
  },
  mystery_reveal: {
    id: "mystery_reveal",
    supportedPresentations: ["text"],
    supportedChoiceCounts: [1],
    supportedFormats: ["multiple_choice", "image_guess"],
    recommendedFormats: ["image_guess"],
    media: { supported: ["question"], required: ["question"] },
    supportedAspectRatios: supportedLandscapeAspectRatios,
    metrics: {
      render: { width: 920, height: 540, itemCount: 1 },
      assets: { question: { maxWidth: 1408, maxHeight: 792, aspectRatio: "16:9" } },
    },
  },
} as const satisfies Record<ResolvedQuizLayoutId, QuizLayoutCapability<ResolvedQuizLayoutId>>;

export const QUIZ_LAYOUTS = Object.values(QUIZ_LAYOUT_CATALOG);

export const QUIZ_PREVIEW_BASELINE_CAPABILITY = {
  id: "baseline",
  supportedPresentations: ["text"],
  supportedChoiceCounts: [2, 3],
  supportedFormats: ["multiple_choice", "image_guess", "true_false", "odd_one_out"],
  recommendedFormats: [],
  media: { supported: ["question"], required: ["question"] },
  supportedAspectRatios: ["16:9"] as const,
  metrics: {
    render: { width: 800, height: 284, itemCount: 1 },
    assets: { question: { maxWidth: 1080, maxHeight: 608, aspectRatio: "16:9" } },
  },
} as const satisfies QuizLayoutCapability<"baseline">;

export const QUIZ_DEFAULT_ASSET_METRICS: QuizLayoutAssetMetrics = {
  maxWidth: 1280,
  maxHeight: 720,
  aspectRatio: "16:9",
};

export function getQuizLayoutCapability(layoutId: string): QuizLayoutCapability<ResolvedQuizLayoutId> {
  return QUIZ_LAYOUT_CATALOG[layoutId as ResolvedQuizLayoutId] ?? QUIZ_LAYOUT_CATALOG.media_left_choices_right;
}

export function getQuizPreviewLayoutCapability(layoutId: QuizPreviewLayoutId): QuizLayoutCapability<QuizPreviewLayoutId> {
  return layoutId === "baseline" ? QUIZ_PREVIEW_BASELINE_CAPABILITY : QUIZ_LAYOUT_CATALOG[layoutId];
}

export function isResolvedQuizLayoutId(layoutId: string): layoutId is ResolvedQuizLayoutId {
  return layoutId in QUIZ_LAYOUT_CATALOG;
}

export function resolveQuizLayoutAssetAspectRatio(
  layoutId: string,
  purpose: string,
  context?: { presentation?: "text" | "visual"; choiceCount?: number },
): QuizLayoutAssetAspectRatio {
  const normalizedPurpose: ImageSlotPurpose | null =
    purpose === "hero_question_image" || purpose === "question_illustration"
      ? "hero_question_image"
      : purpose === "answer_option" || purpose === "choice_illustration"
        ? "answer_option"
        : null;

  if (normalizedPurpose && isResolvedQuizLayoutId(layoutId)) {
    const presentation = context?.presentation ?? QUIZ_LAYOUT_CATALOG[layoutId]?.supportedPresentations[0] ?? "visual";
    const choiceCount = context?.choiceCount ?? QUIZ_LAYOUT_CATALOG[layoutId]?.supportedChoiceCounts[0] ?? 3;

    const geometry = getQuizImageSlotGeometry({
      layoutId,
      purpose: normalizedPurpose,
      presentation,
      choiceCount,
      canvasAspectRatio: "16:9",
    });

    if (geometry) {
      const rec = recommendImageSizing(geometry);
      if (rec.ok) {
        return rec.value.aspectRatio;
      }
    }
  }

  // Fallback compatibility behavior for baseline or unknown roles
  const capability: QuizLayoutCapability<string> | undefined =
    layoutId === "baseline"
      ? QUIZ_PREVIEW_BASELINE_CAPABILITY
      : (QUIZ_LAYOUT_CATALOG as Record<string, QuizLayoutCapability<string> | undefined>)[layoutId];

  if (purpose === "hero_question_image" || purpose === "question_illustration") {
    return capability?.metrics.assets.question?.aspectRatio ?? "16:9";
  }

  if (purpose === "answer_option" || purpose === "choice_illustration") {
    return capability?.metrics.assets.choice?.aspectRatio ?? "1:1";
  }

  return "16:9";
}

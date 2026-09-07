import {
  QUIZ_PORTRAIT_LAYOUT_IDS,
  QuizLayoutIdSchema,
  QuizPortraitLayoutIdSchema,
  type QuizPortraitLayoutId,
} from "./enums.js";
import type { QuizLayoutAssetMetrics, QuizLayoutCapability } from "./quizLayouts.types.js";
import { z } from "zod";

export const ResolvedQuizLayoutIdSchema = QuizLayoutIdSchema.exclude(["auto"]);
export type ResolvedQuizLayoutId = z.infer<typeof ResolvedQuizLayoutIdSchema>;

export const ResolvedQuizPortraitLayoutIdSchema = QuizPortraitLayoutIdSchema;
export type ResolvedQuizPortraitLayoutId = z.infer<typeof ResolvedQuizPortraitLayoutIdSchema>;

export { QUIZ_PORTRAIT_LAYOUT_IDS, QuizPortraitLayoutIdSchema, type QuizPortraitLayoutId };

export const QUIZ_LANDSCAPE_LAYOUT_IDS = [
  "media_left_choices_right",
  "visual_choices_three",
  "visual_choices_three_pure",
  "split_versus_two",
  "verdict_true_false",
  "full_stack_list",
  "mystery_reveal",
  "clue_deduction",
] as const;
export type QuizLandscapeLayoutId = (typeof QUIZ_LANDSCAPE_LAYOUT_IDS)[number];

export const QuizPreviewLayoutIdSchema = z.union([ResolvedQuizLayoutIdSchema, z.literal("baseline")]);
export type QuizPreviewLayoutId = z.infer<typeof QuizPreviewLayoutIdSchema>;

const supportedLandscapeAspectRatios = ["16:9"] as const;
const supportedPortraitAspectRatios = ["9:16"] as const;
export const QUIZ_DEFAULT_CHOICE_ASSET_METRICS = { maxWidth: 640, maxHeight: 480 } as const;

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
      render: { width: 840, height: 580, itemCount: 1 },
      assets: { question: { maxWidth: 1080, maxHeight: 810 } },
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
      render: { width: 501, height: 500, itemCount: 3 },
      assets: { choice: QUIZ_DEFAULT_CHOICE_ASSET_METRICS },
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
      render: { width: 501, height: 580, itemCount: 3 },
      assets: { choice: QUIZ_DEFAULT_CHOICE_ASSET_METRICS },
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
      render: { width: 720, height: 600, itemCount: 2 },
      assets: { choice: QUIZ_DEFAULT_CHOICE_ASSET_METRICS },
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
      render: { width: 920, height: 580, itemCount: 1 },
      assets: { question: { maxWidth: 1080, maxHeight: 810 } },
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
      render: { width: 1440, height: 720, itemCount: 1 },
      assets: {},
    },
  },
  mystery_reveal: {
    id: "mystery_reveal",
    supportedPresentations: ["text"],
    supportedChoiceCounts: [0, 1, 2, 3],
    supportedFormats: ["multiple_choice", "image_guess", "odd_one_out", "true_false"],
    recommendedFormats: ["image_guess"],
    media: { supported: ["question", "choice"], required: ["question"] },
    supportedAspectRatios: supportedLandscapeAspectRatios,
    metrics: {
      render: { width: 980, height: 620, itemCount: 1 },
      assets: { question: { maxWidth: 1080, maxHeight: 810 } },
    },
  },
  clue_deduction: {
    id: "clue_deduction",
    supportedPresentations: ["text"],
    supportedChoiceCounts: [0, 1, 2, 3],
    supportedFormats: ["multiple_choice", "image_guess", "odd_one_out", "true_false"],
    recommendedFormats: ["image_guess", "multiple_choice"],
    media: { supported: ["question", "choice"], required: ["question"] },
    supportedAspectRatios: supportedLandscapeAspectRatios,
    metrics: {
      render: { width: 980, height: 620, itemCount: 1 },
      assets: { question: { maxWidth: 1080, maxHeight: 810 } },
    },
  },
  portrait_hero_choices: {
    id: "portrait_hero_choices",
    supportedPresentations: ["text"],
    supportedChoiceCounts: [2, 3],
    supportedFormats: ["multiple_choice", "image_guess", "true_false"],
    recommendedFormats: ["multiple_choice", "image_guess"],
    media: { supported: ["question"], required: ["question"] },
    supportedAspectRatios: supportedPortraitAspectRatios,
    metrics: {
      render: { width: 860, height: 500, itemCount: 1 },
      assets: { question: { maxWidth: 860, maxHeight: 520 } },
    },
  },
  portrait_split_versus: {
    id: "portrait_split_versus",
    supportedPresentations: ["visual", "text"],
    supportedChoiceCounts: [2],
    supportedFormats: ["multiple_choice", "image_guess", "true_false"],
    recommendedFormats: ["multiple_choice"],
    media: { supported: ["choice", "question"], required: [] },
    supportedAspectRatios: supportedPortraitAspectRatios,
    metrics: {
      render: { width: 860, height: 360, itemCount: 2 },
      assets: { choice: { maxWidth: 860, maxHeight: 400 } },
    },
  },
  portrait_verdict_tf: {
    id: "portrait_verdict_tf",
    supportedPresentations: ["text"],
    supportedChoiceCounts: [2],
    supportedFormats: ["true_false"],
    recommendedFormats: ["true_false"],
    media: { supported: ["question"], required: ["question"] },
    supportedAspectRatios: supportedPortraitAspectRatios,
    metrics: {
      render: { width: 860, height: 540, itemCount: 1 },
      assets: { question: { maxWidth: 860, maxHeight: 540 } },
    },
  },
  portrait_stack_list: {
    id: "portrait_stack_list",
    supportedPresentations: ["text"],
    supportedChoiceCounts: [2, 3, 4],
    supportedFormats: ["multiple_choice", "true_false"],
    recommendedFormats: ["multiple_choice", "true_false"],
    media: { supported: [], required: [] },
    supportedAspectRatios: supportedPortraitAspectRatios,
    metrics: {
      render: { width: 860, height: 720, itemCount: 1 },
      assets: {},
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
  supportedAspectRatios: ["16:9", "9:16"] as const,
  metrics: {
    render: { width: 800, height: 284, itemCount: 1 },
    assets: { question: { maxWidth: 1080, maxHeight: 608 } },
  },
} as const satisfies QuizLayoutCapability<"baseline">;

export const QUIZ_DEFAULT_ASSET_METRICS: QuizLayoutAssetMetrics = { maxWidth: 1280, maxHeight: 720 };

export function getQuizLayoutCapability(layoutId: string): QuizLayoutCapability<ResolvedQuizLayoutId> {
  return QUIZ_LAYOUT_CATALOG[layoutId as ResolvedQuizLayoutId] ?? QUIZ_LAYOUT_CATALOG.media_left_choices_right;
}

export function getQuizPreviewLayoutCapability(layoutId: QuizPreviewLayoutId): QuizLayoutCapability<QuizPreviewLayoutId> {
  return layoutId === "baseline" ? QUIZ_PREVIEW_BASELINE_CAPABILITY : QUIZ_LAYOUT_CATALOG[layoutId];
}

export function isResolvedQuizLayoutId(layoutId: string): layoutId is ResolvedQuizLayoutId {
  return layoutId in QUIZ_LAYOUT_CATALOG;
}

import { z } from "zod";
import { EpisodeStageSchema, QuizLayoutIdSchema } from "../enums.js";
import { IsoDate, QUIZ_SHORT_DEFAULT_QUESTION_COUNT, QUIZ_SHORT_MAX_QUESTION_COUNT, QUIZ_SHORT_MIN_QUESTION_COUNT } from "./common.js";
import { EpisodeTopicSchema, QuizConfigSchema } from "./channel.js";
import { QuizProductMediaFieldsSchema } from "./quizProduct.js";
import { QUIZ_PORTRAIT_LAYOUT_IDS } from "../quizLayoutGeometry/types.js";

export const QuizPortraitLayoutIdSchema = z.enum(QUIZ_PORTRAIT_LAYOUT_IDS);

/** The two layouts a Quiz Short alternates between so viewers can keep up with the rhythm. */
export const QuizShortLayoutPairSchema = z
  .object({
    primary: QuizPortraitLayoutIdSchema,
    secondary: QuizPortraitLayoutIdSchema,
  })
  .strict();
export type QuizShortLayoutPair = z.infer<typeof QuizShortLayoutPairSchema>;

export const QuizPacingProfileSchema = z.enum(["standard", "short"]);
export type QuizPacingProfile = z.infer<typeof QuizPacingProfileSchema>;

export const QuizShortQuestionCountSchema = z
  .number()
  .int()
  .min(QUIZ_SHORT_MIN_QUESTION_COUNT)
  .max(QUIZ_SHORT_MAX_QUESTION_COUNT)
  .default(QUIZ_SHORT_DEFAULT_QUESTION_COUNT);

/**
 * Quiz Short config: the Episode config minus intro and bookend options, locked to portrait
 * and the short pacing profile.
 */
export const QuizShortConfigSchema = QuizConfigSchema.omit({
  question_count: true,
  render_aspect_ratio: true,
  thumbnail_aspect_ratio: true,
  target_layout: true,
  intro_outro_selection: true,
  intro_outro_snapshot: true,
  intro_outro_style_id: true,
  intro_enabled: true,
  outro_enabled: true,
}).extend({
  question_count: QuizShortQuestionCountSchema,
  render_aspect_ratio: z.literal("9:16").default("9:16"),
  thumbnail_aspect_ratio: z.literal("9:16").default("9:16"),
  pacing_profile: z.literal("short").default("short"),
  layout_pair: QuizShortLayoutPairSchema.optional(),
  /** Retained for director plans that request one explicit portrait layout for every beat. */
  target_layout: QuizLayoutIdSchema.optional(),
  outro_cta_enabled: z.boolean().default(true),
});
export type QuizShortConfig = z.infer<typeof QuizShortConfigSchema>;

export const QuizShortSchema = QuizProductMediaFieldsSchema.extend({
  quiz_short_id: z.string().min(1),
  channel_id: z.string().min(1),
  slug: z.string().min(1),
  topic: EpisodeTopicSchema,
  stage: EpisodeStageSchema,
  quiz_config: QuizShortConfigSchema.default({}),
  thumbnail_asset_path_9_16: z.string().nullable().default(null),
  created_at: IsoDate,
  updated_at: IsoDate,
});
export type QuizShort = z.infer<typeof QuizShortSchema>;

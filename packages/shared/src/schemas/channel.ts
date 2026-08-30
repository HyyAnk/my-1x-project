import { z } from "zod";
import {
  ChannelStatusSchema,
  QuizAnswerCardStyleSchema,
  QuizImageStyleSchema,
  QuizPaletteIdSchema,
  QuizQuestionBoxStyleSchema,
  QuizQuestionCounterStyleSchema,
  QuizThinkingBarStyleSchema,
  QuizVisualThemeSchema,
} from "../enums.js";
import { IsoDate, QUIZ_MAX_QUESTION_COUNT, QUIZ_MIN_QUESTION_COUNT } from "./common.js";
import { ChannelMascotConfigSchema } from "./mascot.js";
import { CHANNEL_BRAND_NAME_MAX_LENGTH } from "../branding.js";

export const ChannelSchema = z.object({
  channel_id: z.string().min(1),
  slug: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().default(""),
  target_audience: z.string().default(""),
  language: z.string().default("English"),
  country: z.string().default("GLOBAL"),
  market: z.string().default(""),
  channel_dna_path: z.string().min(1),
  style_guide_path: z.string().nullable().default(null),
  status: ChannelStatusSchema,
  created_at: IsoDate,
  updated_at: IsoDate,
  episode_count: z.number().int().nonnegative().default(0),
  voice_reference_path: z.string().nullable().default(null),
  group_id: z.enum(["quiz", "documentary"]).default("quiz"),
  engine: z.enum(["quiz", "documentary"]).default("quiz"),
  selected_styles: z.array(QuizImageStyleSchema).default(["pixar_3d", "flat_vector", "kawaii_chibi", "natural_realism", "plastic_toy"]),
  default_thinking_bar_style: QuizThinkingBarStyleSchema.optional().default("auto"),
  default_question_box_style: QuizQuestionBoxStyleSchema.optional().default("auto"),
  default_answer_card_style: QuizAnswerCardStyleSchema.optional().default("auto"),
  default_counter_style: QuizQuestionCounterStyleSchema.optional().default("auto"),
  default_palette_id: z.string().optional().default("auto"),
  mascot_id: z.string().nullable().default(null),
  mascot_config: ChannelMascotConfigSchema.default({ enabled: true, position: "bottom_left", scale: 1.0 }),
});

export type Channel = z.infer<typeof ChannelSchema>;

export const TopicCandidateSchema = z.object({
  topic_id: z.string().min(1),
  channel_id: z.string().min(1),
  title: z.string().min(1),
  premise: z.string().min(1),
  why_it_fits: z.string().min(1),
  hook: z.string().min(1),
  estimated_potential: z.string().min(1),
  generated_at: IsoDate,
  selected: z.boolean().default(false),
  quiz_format: z.enum(["knowledge", "image_guess", "multiple_choice", "true_false", "odd_one_out"]).default("knowledge"),
  question_count: z.number().int().min(QUIZ_MIN_QUESTION_COUNT).max(QUIZ_MAX_QUESTION_COUNT).default(8),
  age_band: z.enum(["4-6", "7-9", "10-12", "family"]).default("7-9"),
  visual_style: z.enum(["mixed", "pixar_3d", "flat_vector", "kawaii_chibi", "natural_realism", "plastic_toy"]).default("mixed"),
  theme_hint: z.string().optional(),
});

export type TopicCandidate = z.infer<typeof TopicCandidateSchema>;

export const EpisodeTopicSchema = z.object({
  title: z.string().min(1),
  premise: z.string().min(1),
  hook: z.string().min(1),
});

export const QuizConfigSchema = z.object({
  question_count: z.number().int().min(QUIZ_MIN_QUESTION_COUNT).max(QUIZ_MAX_QUESTION_COUNT).default(8),
  quiz_format: z.enum(["knowledge", "image_guess", "multiple_choice", "true_false", "odd_one_out"]).default("knowledge"),
  age_band: z.enum(["4-6", "7-9", "10-12", "family"]).default("7-9"),
  answer_mode: z.enum(["voice_and_reveal", "voice_only"]).default("voice_and_reveal"),
  visual_theme: QuizVisualThemeSchema.default("candy_arcade"),
  visual_style: z.enum(["mixed", "pixar_3d", "flat_vector", "kawaii_chibi", "natural_realism", "plastic_toy"]).default("mixed"),
  resolved_visual_style: QuizImageStyleSchema.default("pixar_3d"),
  thinking_bar_style: QuizThinkingBarStyleSchema.default("auto"),
  question_counter_style: QuizQuestionCounterStyleSchema.default("auto"),
  question_box_style: QuizQuestionBoxStyleSchema.default("auto"),
  answer_card_style: QuizAnswerCardStyleSchema.default("auto"),
  palette_id: QuizPaletteIdSchema.default("auto"),
  style_preset_id: z.string().optional().default("auto"),
  channel_brand_name: z.string().trim().max(CHANNEL_BRAND_NAME_MAX_LENGTH).default(""),
});

export type QuizConfig = z.infer<typeof QuizConfigSchema>;

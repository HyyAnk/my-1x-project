import { z } from "zod";
import {
  ChannelStatusSchema,
  QuizAnswerCardStyleSchema,
  QuizBackgroundStyleSchema,
  QuizImageStyleSchema,
  QuizPaletteIdSchema,
  QuizQuestionBoxStyleSchema,
  QuizQuestionCounterStyleSchema,
  QuizThinkingBarStyleSchema,
  QuizVisualThemeSchema,
} from "../enums.js";
import { ChannelMascotConfigSchema, QUIZ_MAX_QUESTION_COUNT, QUIZ_MIN_QUESTION_COUNT, QuestionHistorySettingsSchema } from "../schemas.js";
import { MascotRenderAspectRatioSchema } from "../mascot/renderSchema.js";
import { CHANNEL_BRAND_NAME_MAX_LENGTH } from "../branding.js";

export const SuggestTopicsInputSchema = z.object({
  topic_hint: z.string().optional(),
});

export type SuggestTopicsInput = z.infer<typeof SuggestTopicsInputSchema>;

export const RemixQuestionsInputSchema = z.object({
  question_ids: z.array(z.string()).optional(),
  mode: z.enum(["rephrase", "replace"]).default("rephrase").optional(),
});

export type RemixQuestionsInput = z.infer<typeof RemixQuestionsInputSchema>;

export const SaveHistorySettingsInputSchema = QuestionHistorySettingsSchema.partial();
export type SaveHistorySettingsInput = z.infer<typeof SaveHistorySettingsInputSchema>;

export const CreateChannelInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).default(""),
    target_audience: z.string().trim().max(240).default(""),
    language: z.string().trim().max(80).default("English"),
    country: z.string().trim().max(80).default("GLOBAL"),
    market: z.string().trim().max(120).default(""),
    dna_mode: z.enum(["example", "ai", "upload"]).default("example"),
    dna_content: z.string().optional(),
  })
  .strict();

export type CreateChannelInput = z.infer<typeof CreateChannelInputSchema>;

export const UpdateChannelInputSchema = z.object({
  display_name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  target_audience: z.string().trim().max(240).optional(),
  language: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  market: z.string().trim().max(120).optional(),
  status: ChannelStatusSchema.optional(),
  selected_styles: z.array(QuizImageStyleSchema).optional(),
  default_thinking_bar_style: QuizThinkingBarStyleSchema.optional(),
  default_question_box_style: QuizQuestionBoxStyleSchema.optional(),
  default_answer_card_style: QuizAnswerCardStyleSchema.optional(),
  default_counter_style: QuizQuestionCounterStyleSchema.optional(),
  default_background_style: QuizBackgroundStyleSchema.optional(),
  default_palette_id: z.string().optional(),
  mascot_id: z.string().nullable().optional(),
  mascot_config: ChannelMascotConfigSchema.optional(),
});

export const SaveTextInputSchema = z.object({ content: z.string() });

export const TopicConfirmInputSchema = z.object({
  topic_id: z.string().min(1),
  question_count: z.number().int().min(QUIZ_MIN_QUESTION_COUNT).max(QUIZ_MAX_QUESTION_COUNT).optional(),
  visual_style: z.enum(["mixed", "pixar_3d", "flat_vector", "kawaii_chibi", "natural_realism", "plastic_toy"]).optional(),
  auto_start_pipeline: z.boolean().optional(),
  render_aspect_ratio: z.enum(["9:16", "16:9"]).optional(),
});

export type TopicConfirmInput = z.infer<typeof TopicConfirmInputSchema>;

export const EpisodeSettingsInputSchema = z.object({
  target_duration_minutes: z.number().min(3).max(60).optional(),
  question_count: z.number().int().min(QUIZ_MIN_QUESTION_COUNT).max(QUIZ_MAX_QUESTION_COUNT).optional(),
  quiz_format: z.enum(["knowledge", "image_guess", "multiple_choice", "true_false", "odd_one_out"]).optional(),
  age_band: z.enum(["4-6", "7-9", "10-12", "family"]).optional(),
  answer_mode: z.enum(["voice_and_reveal", "voice_only"]).optional(),
  visual_theme: QuizVisualThemeSchema.optional(),
  visual_style: z.enum(["mixed", "pixar_3d", "flat_vector", "kawaii_chibi", "natural_realism", "plastic_toy"]).optional(),
  resolved_visual_style: QuizImageStyleSchema.optional(),
  thinking_bar_style: QuizThinkingBarStyleSchema.optional(),
  question_counter_style: QuizQuestionCounterStyleSchema.optional(),
  question_box_style: QuizQuestionBoxStyleSchema.optional(),
  answer_card_style: QuizAnswerCardStyleSchema.optional(),
  background_style: QuizBackgroundStyleSchema.optional(),
  palette_id: QuizPaletteIdSchema.optional(),
  style_preset_id: z.string().optional(),
  style_catalog_revision: z.string().trim().min(1).optional(),
  style_preset_revision: z.number().int().positive().optional(),
  channel_brand_name: z.string().trim().max(CHANNEL_BRAND_NAME_MAX_LENGTH).optional(),
  render_aspect_ratio: MascotRenderAspectRatioSchema.optional(),
  thumbnail_aspect_ratio: z.enum(["auto", "16:9", "9:16", "both"]).optional(),
});

export type EpisodeSettingsInput = z.infer<typeof EpisodeSettingsInputSchema>;

export const SceneUpdateInputSchema = z.object({
  scene_number: z.number().int().positive(),
  duration_seconds: z.number().positive(),
  dialogue: z.string(),
  visual_prompt: z.string(),
  transition_note: z.string().default(""),
  continuity_note: z.string().default(""),
});

export const ApprovalDecisionSchema = z.object({
  decision: z.enum(["accept", "acceptForSession", "decline", "cancel"]),
});

export type ApiError = { error: string; detail?: string };

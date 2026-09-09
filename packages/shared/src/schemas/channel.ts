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
  QuizLayoutIdSchema,
} from "../enums.js";
import { IsoDate, QUIZ_MAX_QUESTION_COUNT, QUIZ_MIN_QUESTION_COUNT } from "./common.js";
import { ChannelMascotConfigSchema } from "./mascot.js";
import { CHANNEL_BRAND_NAME_MAX_LENGTH } from "../branding.js";
import { TopicSourceBindingSetSchema } from "./topicSourceBinding.js";

export const ChannelSchema = z
  .object({
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
    selected_styles: z.array(QuizImageStyleSchema).default(["pixar_3d", "flat_vector", "kawaii_chibi", "natural_realism", "plastic_toy"]),
    default_thinking_bar_style: QuizThinkingBarStyleSchema.optional().default("auto"),
    default_question_box_style: QuizQuestionBoxStyleSchema.optional().default("auto"),
    default_answer_card_style: QuizAnswerCardStyleSchema.optional().default("auto"),
    default_counter_style: QuizQuestionCounterStyleSchema.optional().default("auto"),
    default_background_style: QuizBackgroundStyleSchema.optional().default("auto"),
    default_palette_id: z.string().optional().default("auto"),
    mascot_id: z.string().nullable().default(null),
    mascot_config: ChannelMascotConfigSchema.default({ enabled: true, position: "bottom_left", scale: 1.0 }),
    default_intro_outro_style_id: z.string().nullable().optional(),
  })
  .strict();

export type Channel = z.infer<typeof ChannelSchema>;

export const TopicGameplayArchetypeSchema = z.enum([
  "deep_trivia",
  "visual_spotting",
  "verdict_true_false",
  "verdict_fact_myth",
  "versus_faceoff",
  "visual_identification",
  "speed_blitz",
  "mystery_reveal",
  "clue_deduction",
]);

export type TopicGameplayArchetype = z.infer<typeof TopicGameplayArchetypeSchema>;

export const TopicProvenanceOriginSchema = z.enum(["keyword", "discovery"]);
export type TopicProvenanceOrigin = z.infer<typeof TopicProvenanceOriginSchema>;

const TopicCandidateBaseSchema = z.object({
  topic_id: z.string().min(1),
  channel_id: z.string().min(1),
  title: z.string().min(1),
  premise: z.string().min(1),
  why_it_fits: z.string().min(1),
  hook: z.string().min(1),
  estimated_potential: z.string().min(1),
  generated_at: IsoDate,
  selected: z.boolean().default(false),
  origin: TopicProvenanceOriginSchema.default("discovery"),
  theme_hint: z.string().optional(),
  domain_id: z.string().optional(),
  subtopic_id: z.string().optional(),
  slot_id: z.string().trim().min(1).optional(),
  run_id: z.string().trim().min(1).optional(),
  source_bindings: TopicSourceBindingSetSchema.optional(),
});

export const EpisodeTopicCandidateSchema = TopicCandidateBaseSchema.extend({
  content_kind: z.literal("episode"),
  quiz_format: z.enum(["knowledge", "image_guess", "multiple_choice", "true_false", "odd_one_out"]).default("knowledge"),
  question_count: z.number().int().min(QUIZ_MIN_QUESTION_COUNT).max(QUIZ_MAX_QUESTION_COUNT).default(8),
  age_band: z.enum(["4-6", "7-9", "10-12", "family"]).default("7-9"),
  visual_style: z.enum(["mixed", "pixar_3d", "flat_vector", "kawaii_chibi", "natural_realism", "plastic_toy"]).default("mixed"),
  archetype: TopicGameplayArchetypeSchema.optional(),
  suggested_layout: QuizLayoutIdSchema.optional(),
});

export type EpisodeTopicCandidate = z.infer<typeof EpisodeTopicCandidateSchema>;

export const ShortReelTopicCandidateSchema = TopicCandidateBaseSchema.extend({
  content_kind: z.literal("short_reel"),
  question_count: z.literal(1).default(1),
  aspect_ratio: z.literal("9:16").default("9:16"),
  archetype: z.enum(["versus_faceoff", "deep_trivia"]),
});

export type ShortReelTopicCandidate = z.infer<typeof ShortReelTopicCandidateSchema>;

export const TopicCandidateSchema = z.discriminatedUnion("content_kind", [EpisodeTopicCandidateSchema, ShortReelTopicCandidateSchema]);

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
  background_style: QuizBackgroundStyleSchema.default("auto"),
  palette_id: QuizPaletteIdSchema.default("auto"),
  style_preset_id: z.string().optional().default("auto"),
  style_catalog_revision: z.string().trim().min(1).optional(),
  style_preset_revision: z.number().int().positive().optional(),
  channel_brand_name: z.string().trim().max(CHANNEL_BRAND_NAME_MAX_LENGTH).default(""),
  render_aspect_ratio: z.literal("16:9").default("16:9"),
  thumbnail_aspect_ratio: z.enum(["auto", "16:9", "9:16", "both"]).default("auto"),
  archetype: TopicGameplayArchetypeSchema.optional(),
  target_layout: QuizLayoutIdSchema.optional(),
  mascot_style_id: z.string().optional(),
  intro_outro_style_id: z.string().nullable().optional(),
});

export type QuizConfig = z.infer<typeof QuizConfigSchema>;

export const IntroOutroClipMetaSchema = z.object({
  filename: z.string().min(1),
  duration_seconds: z.number().positive(),
  width: z.literal(1920),
  height: z.literal(1080),
  fps: z.number().positive(),
  has_audio: z.boolean(),
  thumbnail_filename: z.string().optional(),
});

export type IntroOutroClipMeta = z.infer<typeof IntroOutroClipMetaSchema>;

export const IntroOutroTransitionTypeSchema = z.enum(["stinger_swipe", "crossfade", "cut"]);
export type IntroOutroTransitionType = z.infer<typeof IntroOutroTransitionTypeSchema>;

export const IntroOutroStyleSchema = z.object({
  style_id: z.string().min(1),
  channel_id: z.string().min(1),
  name: z.string().min(1).max(50),
  intro: IntroOutroClipMetaSchema,
  outro: IntroOutroClipMetaSchema,
  transition_type: IntroOutroTransitionTypeSchema.default("stinger_swipe"),
  transition_duration_seconds: z.number().min(0.2).max(1.5).default(0.5),
  audio_mode: z.enum(["use_video_audio", "overlay_bgm"]).default("use_video_audio"),
  created_at: IsoDate,
  updated_at: IsoDate,
});

export type IntroOutroStyle = z.infer<typeof IntroOutroStyleSchema>;

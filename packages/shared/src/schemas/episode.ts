import { z } from "zod";
import { EpisodeStageSchema } from "../enums.js";
import { IsoDate, QUIZ_MAX_CHOICES_PER_QUESTION } from "./common.js";
import { EpisodeTopicSchema, QuizConfigSchema } from "./channel.js";

export const EditorialOverlaySchema = z
  .object({
    kind: z
      .enum(["none", "caption", "stat_card", "timeline", "bar_chart", "line_chart", "map_callout", "comparison", "quote"])
      .default("none"),
    text: z.string().default(""),
    motion: z.enum(["none", "fade_up", "slide_in", "draw_on", "count_up", "highlight"]).default("none"),
    placement: z.enum(["lower_third", "upper_left", "upper_right", "center", "side_panel"]).default("lower_third"),
    duration_seconds: z.number().positive().max(20).nullable().default(null),
    data: z.array(z.object({ label: z.string(), value: z.union([z.string(), z.number()]), unit: z.string().default("") })).default([]),
    source_ids: z.array(z.string()).default([]),
  })
  .default({ kind: "none", motion: "none", placement: "lower_third" });

export type EditorialOverlay = z.infer<typeof EditorialOverlaySchema>;

export const QuizSceneContentSchema = z.object({
  phase: z.enum(["intro", "question", "reveal", "explanation", "outro"]).default("question"),
  question_number: z.number().int().positive().nullable().default(null),
  question: z.string().default(""),
  choices: z.array(z.string()).max(QUIZ_MAX_CHOICES_PER_QUESTION).default([]),
  answer: z.string().default(""),
  explanation: z.string().default(""),
  image_prompt: z.string().default(""),
});

export type QuizSceneContent = z.infer<typeof QuizSceneContentSchema>;

export const SceneSchema = z.object({
  scene_id: z.string().min(1),
  episode_id: z.string().min(1),
  scene_number: z.number().int().positive(),
  duration_seconds: z.number().positive(),
  dialogue: z.string(),
  visual_prompt: z.string(),
  transition_note: z.string().default(""),
  continuity_note: z.string().default(""),
  sequence_id: z.string().default("sequence-1"),
  sequence_title: z.string().default("Sequence 1"),
  shot_id: z.string().default(""),
  asset_type: z
    .enum(["archive", "document", "map", "diagram", "ai_reconstruction", "contemporary", "transition"])
    .default("ai_reconstruction"),
  continuity_bundle_id: z.string().default(""),
  reference_asset_ids: z.array(z.string()).default([]),
  source_ids: z.array(z.string()).default([]),
  reconstruction: z.boolean().default(true),
  sound_cue: z.string().default(""),
  editorial_overlay: EditorialOverlaySchema,
  quiz: QuizSceneContentSchema.nullable().default(null),
  audio_asset_path: z.string().nullable().default(null),
  audio_generated_at: IsoDate.nullable().default(null),
  audio_duration_seconds: z.number().nonnegative().nullable().default(null),
});

export type Scene = z.infer<typeof SceneSchema>;

export const EpisodeSchema = z.object({
  episode_id: z.string().min(1),
  channel_id: z.string().min(1),
  slug: z.string().min(1),
  topic: EpisodeTopicSchema,
  stage: EpisodeStageSchema,
  script_path: z.string().min(1),
  research_path: z.string().nullable().default(null),
  treatment_path: z.string().nullable().default(null),
  visual_bible_path: z.string().nullable().default(null),
  scene_plan_path: z.string().min(1),
  dialogue_script_path: z.string().min(1),
  video_prompts_path: z.string().min(1),
  target_duration_minutes: z.number().min(3).max(60).default(8),
  target_word_count: z.number().int().positive().default(1050),
  narration_asset_path: z.string().nullable().default(null),
  narration_generated_at: IsoDate.nullable().default(null),
  narration_duration_seconds: z.number().positive().nullable().default(null),
  narration_segment_count: z.number().int().nonnegative().default(0),
  measured_narration_words_per_second: z.number().positive().nullable().default(null),
  quiz_config: QuizConfigSchema.default({}),
  video_asset_path: z.string().nullable().default(null),
  video_generated_at: IsoDate.nullable().default(null),
  video_duration_seconds: z.number().positive().nullable().default(null),
  render_manifest_path: z.string().nullable().default(null),
  thumbnail_asset_path_16_9: z.string().nullable().default(null),
  thumbnail_asset_path_9_16: z.string().nullable().default(null),
  created_at: IsoDate,
  updated_at: IsoDate,
});

export type Episode = z.infer<typeof EpisodeSchema>;

export const ProductionIssueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["blocker", "warning", "info"]),
  message: z.string().min(1),
  next_action: z.string().min(1),
  scene_numbers: z.array(z.number().int().positive()).default([]),
});

export const ProductionAssessmentSchema = z.object({
  score: z.number().min(0).max(100),
  rating: z.enum(["not_ready", "needs_work", "production_ready"]),
  assessed_at: IsoDate,
  metrics: z.object({
    target_duration_seconds: z.number().positive(),
    estimated_narration_seconds: z.number().nonnegative(),
    narration_word_count: z.number().int().nonnegative(),
    target_word_count: z.number().int().positive(),
    calibrated_word_target_count: z.number().int().positive().optional(),
    scene_count: z.number().int().nonnegative(),
    sequence_count: z.number().int().nonnegative(),
    unique_prompt_ratio: z.number().min(0).max(1),
    structured_prompt_ratio: z.number().min(0).max(1),
    continuity_coverage_ratio: z.number().min(0).max(1),
    source_coverage_ratio: z.number().min(0).max(1),
    narration_coverage_ratio: z.number().min(0).max(1),
    overlay_coverage_ratio: z.number().min(0).max(1).default(0),
    factual_anchor_count: z.number().int().nonnegative(),
    research_source_count: z.number().int().nonnegative(),
  }),
  issues: ProductionIssueSchema.array(),
});

export type ProductionAssessment = z.infer<typeof ProductionAssessmentSchema>;

import { z } from "zod";

import {
  ChannelStatusSchema,
  EngineIdSchema,
  ImageProviderIdSchema,
  MascotActionTypeSchema,
  QuizAnswerCardStyleSchema,
  QuizImageStyleSchema,
  QuizPaletteIdSchema,
  QuizQuestionBoxStyleSchema,
  QuizQuestionCounterStyleSchema,
  QuizThinkingBarStyleSchema,
  QuizVisualThemeSchema,
} from "./enums.js";

import {
  ChannelMascotConfigSchema,
  MascotPlacementPresetSchema,
  MascotProfileSchema,
  QUIZ_MAX_CHOICES_PER_QUESTION,
  QUIZ_MAX_QUESTION_COUNT,
  QUIZ_MIN_CHOICES_PER_QUESTION,
  QUIZ_MIN_QUESTION_COUNT,
  QuestionHistorySettingsSchema,
} from "./schemas.js";
import { MascotRenderAspectRatioSchema } from "./mascot/renderSchema.js";
import { CHANNEL_BRAND_NAME_MAX_LENGTH } from "./branding.js";
import { QuizPreviewLayoutIdSchema } from "./quizLayouts.js";

export const CalibrateMascotActionInputSchema = z.object({
  offset_x: z.number().min(-5000).max(5000).optional().default(0),
  offset_y: z.number().min(-5000).max(5000).optional().default(0),
  motion_preset: z.enum(["breathe", "sway", "jump", "shake", "wave", "point", "pulse", "float", "none"]).optional(),
  motion_speed: z.number().min(0.1).max(5).optional(),
  motion_intensity: z.enum(["subtle", "normal", "dynamic"]).optional(),
  fps: z.number().min(1).max(60).optional(),
  loop: z.boolean().optional(),
});

export type CalibrateMascotActionInput = z.infer<typeof CalibrateMascotActionInputSchema>;
export type CalibrateMascotActionRequest = z.input<typeof CalibrateMascotActionInputSchema>;

export const CreateMascotInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  visual_style: QuizImageStyleSchema.optional().default("pixar_3d"),
  master_prompt: z.string().optional().default(""),
  color_theme: z.string().optional().default("#06b6d4"),
});

export type CreateMascotInput = z.infer<typeof CreateMascotInputSchema>;

export const UpdateMascotInputSchema = MascotProfileSchema.partial();

export type UpdateMascotInput = z.infer<typeof UpdateMascotInputSchema>;

export const GenerateMascotConceptInputSchema = z.object({
  prompt: z.string().optional(),
  style: QuizImageStyleSchema.optional(),
});

export type GenerateMascotConceptInput = z.infer<typeof GenerateMascotConceptInputSchema>;

export const GenerateMascotSpriteInputSchema = z.object({
  action: MascotActionTypeSchema,
  prompt: z.string().optional(),
  frames_count: z.number().int().min(1).max(16).optional().default(1),
  fps: z.number().min(1).max(30).optional().default(8),
  loop: z.boolean().optional().default(true),
});

export type GenerateMascotSpriteInput = z.infer<typeof GenerateMascotSpriteInputSchema>;

export const UploadMascotSpriteInputSchema = z.object({
  action: MascotActionTypeSchema,
  data: z.string().min(1),
  frames_count: z.number().int().min(1).max(32).default(1),
  fps: z.number().min(1).max(30).default(8),
  loop: z.boolean().default(true),
  frame_width: z.number().int().min(32).max(2048).default(512),
  frame_height: z.number().int().min(32).max(2048).default(512),
  motion_preset: z.enum(["breathe", "sway", "jump", "shake", "wave", "point", "none"]).optional(),
});

export type UploadMascotSpriteInput = z.infer<typeof UploadMascotSpriteInputSchema>;

export const MascotMigrationInputSchema = z.object({
  mode: z.enum(["dry_run", "apply", "rollback"]).default("dry_run"),
  migration_id: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/)
    .optional(),
  mascot_id: z.string().trim().min(1).optional(),
});

export type MascotMigrationInput = z.infer<typeof MascotMigrationInputSchema>;

export const RemoveMascotBackgroundInputSchema = z.object({
  target: z.enum(["master", "all", "wave", "idle", "thinking", "point", "celebrate", "oops", "outro"]).optional().default("all"),
});

export type RemoveMascotBackgroundInput = z.infer<typeof RemoveMascotBackgroundInputSchema>;

export const AssignMascotInputSchema = z.object({
  mascot_id: z.string().nullable(),
  config: ChannelMascotConfigSchema.partial().optional(),
});

export type AssignMascotInput = z.infer<typeof AssignMascotInputSchema>;

export const SandboxPreviewInputSchema = z
  .object({
    aspect_ratio: MascotRenderAspectRatioSchema.optional().default("16:9"),
    theme: QuizVisualThemeSchema.optional().default("candy_arcade"),
    palette_id: z.string().optional().default("lime"),
    layout_id: QuizPreviewLayoutIdSchema.optional().default("media_left_choices_right"),
    thinking_bar_style: QuizThinkingBarStyleSchema.optional().default("star_slider"),
    question_box_style: QuizQuestionBoxStyleSchema.optional().default("candy_pop"),
    answer_card_style: QuizAnswerCardStyleSchema.optional().default("glossy_arcade"),
    counter_style: QuizQuestionCounterStyleSchema.optional().default("hanging_woodsign"),
    phase: z.enum(["question", "choices", "thinking", "reveal", "explain"]).optional().default("thinking"),
    timeline_time_seconds: z.number().min(0).max(15).optional(),
    question_text: z.string().optional().default("Which planet in our solar system has the most prominent rings?"),
    choices: z
      .array(z.string().trim().min(1))
      .min(QUIZ_MIN_CHOICES_PER_QUESTION)
      .max(QUIZ_MAX_CHOICES_PER_QUESTION)
      .optional()
      .default(["Jupiter", "Saturn", "Uranus"]),
    correct_choice_index: z
      .number()
      .int()
      .min(0)
      .max(QUIZ_MAX_CHOICES_PER_QUESTION - 1)
      .optional()
      .default(1),
    question_number: z.number().int().min(1).optional().default(1),
    total_questions: z.number().int().min(1).optional().default(10),
    countdown_progress: z.number().min(0).max(1).optional().default(0.5), // 0 to 1
    fact_card_title: z.string().optional().default("BẠN CÓ BIẾT?"),
    fact_card_text: z.string().optional().default("Hành tinh này có các đặc điểm kỳ thú và hệ thống vành đai ấn tượng nhất trong vũ trụ!"),
    mascot_id: z.string().nullable().optional(),
    mascot_enabled: z.boolean().optional().default(true),
    mascot_action: MascotActionTypeSchema.optional().default("thinking"),
    mascot_position: z.enum(["bottom_left", "bottom_right"]).optional().default("bottom_left"),
    mascot_scale: z.number().optional().default(1.0),
    mascot_offset_x: z.number().optional().default(0),
    mascot_offset_y: z.number().optional().default(0),
    mascot_flip_x: z.boolean().optional().default(false),
    mascot_phase: z.enum(["intro", "question", "choices", "thinking", "reveal", "explain", "outro"]).optional(),
    mascot_reveal_outcome: z.enum(["correct", "wrong", "timeout"]).optional().default("correct"),
    mascot_timeline_time_seconds: z.number().min(0).max(3600).optional(),
    mascot_playing: z.boolean().optional().default(false),
    mascot_show_in_intro: z.boolean().optional().default(true),
    mascot_show_in_outro: z.boolean().optional().default(true),
    mascot_show_in_question: z.boolean().optional().default(true),
    channel_brand_name: z.string().trim().max(CHANNEL_BRAND_NAME_MAX_LENGTH).optional().default(""),
  })
  .superRefine((input, ctx) => {
    if (input.correct_choice_index >= input.choices.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correct_choice_index"],
        message: "Correct choice must reference a visible choice",
      });
    }
  });

export type SandboxPreviewInput = z.infer<typeof SandboxPreviewInputSchema>;
export type SandboxPreviewRequest = z.input<typeof SandboxPreviewInputSchema>;

export const SandboxPreviewResponseSchema = z.object({
  html: z.string(),
  css: z.string(),
  contrast_report: z.object({
    ok: z.boolean(),
    ratio: z.number().optional(),
    required_ratio: z.number().optional(),
    message: z.string().optional(),
  }),
});

export type SandboxPreviewResponse = z.infer<typeof SandboxPreviewResponseSchema>;

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

export const CreateVoiceInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  data: z.string().min(1).max(50_000_000),
});

export type CreateVoiceInput = z.infer<typeof CreateVoiceInputSchema>;

export const AssignVoiceInputSchema = z.object({ voice_id: z.string().trim().min(1).nullable() });

export type AssignVoiceInput = z.infer<typeof AssignVoiceInputSchema>;

export const GenerateAllAudioInputSchema = z.object({ force: z.boolean().default(false) });

export type GenerateAllAudioInput = z.infer<typeof GenerateAllAudioInputSchema>;

export const GenerateAllBundleImagesInputSchema = z.object({ force: z.boolean().default(false) });

export type GenerateAllBundleImagesInput = z.infer<typeof GenerateAllBundleImagesInputSchema>;

export const ImageSettingsInputSchema = z.object({
  enabled: z.boolean().optional(),
  images_per_bundle: z.number().int().min(1).max(2).optional(),
  provider: ImageProviderIdSchema.optional(),
  base_url: z.string().trim().max(2000).optional(),
  model: z.string().trim().max(160).optional(),
  api_key: z.string().max(4000).optional(),
  quality: z.enum(["low", "medium", "high"]).optional(),
  max_concurrent_tasks: z.number().int().positive().max(16).optional(),
});

export type ImageSettingsInput = z.infer<typeof ImageSettingsInputSchema>;

export const AudioSettingsInputSchema = z.object({
  provider: z.string().trim().max(80).optional(),
  service_url: z.string().trim().url().max(2000).optional(),
  exaggeration: z.number().min(0).max(1).optional(),
  cfg_weight: z.number().min(0).max(1).optional(),
  max_concurrent_tasks: z.number().int().positive().max(16).optional(),
  merge_gap_ms: z.number().int().nonnegative().max(10_000).optional(),
  match_target_duration: z.boolean().optional(),
});

export type AudioSettingsInput = z.infer<typeof AudioSettingsInputSchema>;

export const VideoSettingsInputSchema = z.object({
  max_scene_duration_seconds: z.number().positive().max(120).optional(),
  narration_words_per_second: z.number().positive().max(20).optional(),
  aspect_ratio: MascotRenderAspectRatioSchema.optional(),
  max_concurrent_tasks: z.number().int().min(1).max(10).optional(),
  render_workers: z.number().int().min(1).max(16).optional(),
  render_quality: z.enum(["draft", "standard", "high"]).optional(),
  fps: z.number().int().min(24).max(60).optional(),
  fast_render_mode: z.boolean().optional(),
});

export type VideoSettingsInput = z.infer<typeof VideoSettingsInputSchema>;

export const MascotStageSettingsInputSchema = z.object({
  default_placement: MascotPlacementPresetSchema,
});

export type MascotStageSettingsInput = z.infer<typeof MascotStageSettingsInputSchema>;

export const VoiceReferenceUploadSchema = z.object({
  data: z.string().min(1).max(50_000_000),
});

export type VoiceReferenceUpload = z.infer<typeof VoiceReferenceUploadSchema>;

export const CodexSettingsInputSchema = z.object({
  transport: z.enum(["app_server", "openai_compatible"]).optional(),
  model: z.string().trim().max(160).optional(),
  api_base_url: z.string().trim().max(2000).optional(),
  api_key: z.string().max(4000).optional(),
  app_server_endpoint: z.string().trim().max(2000).optional(),
  command: z.string().trim().max(500).optional(),
});

export type CodexSettingsInput = z.infer<typeof CodexSettingsInputSchema>;

export const CodexModelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export type CodexModel = z.infer<typeof CodexModelSchema>;

export const CodexSettingsSchema = z.object({
  transport: z.enum(["app_server", "openai_compatible"]),
  model: z.string(),
  api_base_url: z.string(),
  has_api_key: z.boolean(),
  app_server_endpoint: z.string(),
  command: z.string(),
});

export type CodexSettings = z.infer<typeof CodexSettingsSchema>;

export const CodexSettingsResponseSchema = z.object({
  settings: CodexSettingsSchema,
  models: CodexModelSchema.array(),
  installation: z.object({
    installed: z.boolean(),
    command: z.string(),
    version: z.string().nullable(),
    error: z.string().optional(),
  }),
});

export type CodexSettingsResponse = z.infer<typeof CodexSettingsResponseSchema>;

export const AntigravitySettingsInputSchema = z.object({
  model: z.string().trim().max(160).optional(),
  command: z.string().trim().max(500).optional(),
  api_base_url: z.string().trim().max(2000).optional(),
  api_key: z.string().max(4000).optional(),
});

export type AntigravitySettingsInput = z.infer<typeof AntigravitySettingsInputSchema>;

export const AntigravityModelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export type AntigravityModel = z.infer<typeof AntigravityModelSchema>;

export const AntigravitySettingsSchema = z.object({
  model: z.string(),
  command: z.string(),
  api_base_url: z.string(),
  has_api_key: z.boolean(),
});

export type AntigravitySettings = z.infer<typeof AntigravitySettingsSchema>;

export const AntigravitySettingsResponseSchema = z.object({
  settings: AntigravitySettingsSchema,
  models: AntigravityModelSchema.array(),
  installation: z.object({
    installed: z.boolean(),
    command: z.string(),
    version: z.string().nullable(),
    authenticated: z.boolean().default(false),
    error: z.string().optional(),
  }),
});

export type AntigravitySettingsResponse = z.infer<typeof AntigravitySettingsResponseSchema>;

export const EngineSettingsInputSchema = z.object({
  active_engine: EngineIdSchema,
  model: z.string().trim().max(160).optional(),
});

export type EngineSettingsInput = z.infer<typeof EngineSettingsInputSchema>;

export const StorageInfoSchema = z.object({
  path: z.string().min(1),
  default_path: z.string().min(1),
  channel_path: z.string().min(1),
  configured: z.boolean(),
});

export type StorageInfo = z.infer<typeof StorageInfoSchema>;

export const StoragePathInputSchema = z.object({
  path: z.string().trim().min(1).max(2000),
});

export const CreateChannelInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(""),
  target_audience: z.string().trim().max(240).default(""),
  language: z.string().trim().max(80).default("English"),
  country: z.string().trim().max(80).default("GLOBAL"),
  market: z.string().trim().max(120).default(""),
  dna_mode: z.enum(["example", "ai", "upload"]).default("example"),
  dna_content: z.string().optional(),
  group_id: z.string().default("quiz"),
});

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
  default_counter_style: QuizQuestionCounterStyleSchema.optional(),
  default_palette_id: z.string().optional(),
  mascot_id: z.string().nullable().optional(),
  mascot_config: ChannelMascotConfigSchema.optional(),
});

export const SaveTextInputSchema = z.object({ content: z.string() });

export const TopicConfirmInputSchema = z.object({
  topic_id: z.string().min(1),
  question_count: z.number().int().min(QUIZ_MIN_QUESTION_COUNT).max(QUIZ_MAX_QUESTION_COUNT).optional(),
  visual_style: z.enum(["mixed", "pixar_3d", "flat_vector", "kawaii_chibi", "natural_realism", "plastic_toy"]).optional(),
});

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
  palette_id: QuizPaletteIdSchema.optional(),
  style_preset_id: z.string().optional(),
  channel_brand_name: z.string().trim().max(CHANNEL_BRAND_NAME_MAX_LENGTH).optional(),
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

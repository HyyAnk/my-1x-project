import { z } from "zod";
import { EngineIdSchema, TaskTypeSchema } from "../enums.js";
import { MascotRenderAspectRatioSchema } from "../mascot/renderSchema.js";
import { MascotStageSettingsSchema } from "./mascot.js";
import { IsoDate, QUIZ_MAX_CHOICES_PER_QUESTION } from "./common.js";

export const AppConfigSchema = z.object({
  active_engine: EngineIdSchema.default("codex"),
  mascot_stage: MascotStageSettingsSchema.default({}),
  video_generation: z.object({
    provider: z.string().default("hyperframes"),
    model: z.string().default(""),
    hyperframes_command: z.string().default("npx hyperframes"),
    render_quality: z.enum(["draft", "standard", "high"]).default("draft"),
    fps: z.number().int().min(24).max(60).default(30),
    max_scene_duration_seconds: z.number().positive().default(8),
    default_scene_duration_seconds: z.number().positive().default(6),
    narration_words_per_second: z.number().positive().default(2.3),
    aspect_ratio: MascotRenderAspectRatioSchema.default("16:9"),
    max_concurrent_tasks: z.number().int().min(1).max(10).default(1),
    render_workers: z.number().int().min(1).max(16).optional(),
    fast_render_mode: z.boolean().default(false),
  }),
  image_generation: z.object({
    enabled: z.boolean().default(true),
    images_per_bundle: z.number().int().min(1).max(2).default(1),
    provider: z.enum(["gpti2", "shopaikey", "custom"]).default("gpti2"),
    base_url: z.string().default(""),
    model: z.string().default("gpt-image-2"),
    api_key: z.string().default(""),
    has_api_key: z.boolean().optional(),
    quality: z.string().default("low"),
    max_concurrent_tasks: z.number().int().positive().default(3),
  }),
  codex: z.object({
    max_concurrent_tasks: z.number().int().positive().default(3),
    transport: z.enum(["app_server", "openai_compatible"]).default("app_server"),
    app_server_endpoint: z.string().default("stdio://"),
    command: z.string().default("codex"),
    model: z.string().default(""),
    experimental_api: z.boolean().default(false),
    api_base_url: z.string().default(""),
    api_key: z.string().default(""),
  }),
  antigravity: z.object({
    max_concurrent_tasks: z.number().int().positive().default(3),
    command: z.string().default("agy"),
    model: z.string().default("gemini-2.5-pro"),
    api_base_url: z.string().default(""),
    api_key: z.string().default(""),
  }),
  audio_generation: z.object({
    provider: z.string().default("chatterbox"),
    service_url: z.string().default("http://127.0.0.1:8890"),
    exaggeration: z.number().min(0).max(1).default(0.5),
    cfg_weight: z.number().min(0).max(1).default(0.5),
    max_concurrent_tasks: z.number().int().positive().default(2),
    merge_gap_ms: z.number().int().nonnegative().default(300),
    match_target_duration: z.boolean().default(true),
  }),
  question_history: z
    .object({
      enabled: z.boolean().default(true),
      pass_threshold: z.number().int().min(0).max(50).default(2),
      ttl_days: z.number().int().min(1).max(365).default(30),
      auto_remix: z.boolean().default(false),
    })
    .default({}),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const QuestionHistorySettingsSchema = z.object({
  enabled: z.boolean().default(true),
  pass_threshold: z.number().int().min(0).max(50).default(2),
  ttl_days: z.number().int().min(1).max(365).default(30),
  auto_remix: z.boolean().default(false),
});

export type QuestionHistorySettings = z.infer<typeof QuestionHistorySettingsSchema>;

export const QuestionHistoryEntrySchema = z.object({
  question_id: z.string().min(1),
  question_text: z.string().min(1),
  normalized_question: z.string().default(""),
  choices: z.array(z.string()).max(QUIZ_MAX_CHOICES_PER_QUESTION).default([]),
  correct_answer: z.string().default(""),
  episode_id: z.string().min(1),
  episode_title: z.string().min(1),
  channel_id: z.string().min(1),
  render_task_id: z.string().min(1).optional(),
  rendered_at: IsoDate,
});

export type QuestionHistoryEntry = z.infer<typeof QuestionHistoryEntrySchema>;

export const BgmHistoryEntrySchema = z.object({
  track_id: z.string().min(1),
  filename: z.string().min(1),
  episode_id: z.string().min(1),
  episode_title: z.string().min(1),
  channel_id: z.string().min(1),
  used_at: IsoDate,
});

export type BgmHistoryEntry = z.infer<typeof BgmHistoryEntrySchema>;

export const QuestionHistoryCheckItemSchema = z.object({
  current_question_id: z.string().min(1),
  current_question_text: z.string().min(1),
  current_choices: z.array(z.string()).max(QUIZ_MAX_CHOICES_PER_QUESTION).default([]),
  current_correct_answer: z.string().default(""),
  matched_entry: QuestionHistoryEntrySchema.nullable().default(null),
  similarity_score: z.number().min(0).max(1).default(0),
  match_reason: z.string().default(""),
  status: z.enum(["duplicate", "remixed", "passed"]).default("passed"),
});

export type QuestionHistoryCheckItem = z.infer<typeof QuestionHistoryCheckItemSchema>;

export const QuestionHistoryCheckResultSchema = z.object({
  episode_id: z.string().min(1),
  checked_at: IsoDate,
  total_questions: z.number().int().nonnegative().default(0),
  duplicate_count: z.number().int().nonnegative().default(0),
  pass_threshold: z.number().int().nonnegative().default(2),
  passed: z.boolean().default(true),
  items: z.array(QuestionHistoryCheckItemSchema).default([]),
});

export type QuestionHistoryCheckResult = z.infer<typeof QuestionHistoryCheckResultSchema>;

export const VoiceProfileSchema = z.object({
  voice_id: z.string().min(1),
  name: z.string().min(1).max(80),
  reference_path: z.string().min(1),
  sample_path: z.string().min(1),
  created_at: IsoDate,
  is_builtin: z.boolean().optional().default(false),
});

export type VoiceProfile = z.infer<typeof VoiceProfileSchema>;

export const ContextManifestSchema = z.object({
  task_type: TaskTypeSchema,
  scope: z.object({ channel_id: z.string(), episode_id: z.string().nullable() }),
  included_files: z.array(z.object({ path: z.string(), reason: z.string(), bytes: z.number().int().nonnegative() })),
  excluded_categories: z.array(z.string()),
  approximate_bytes: z.number().int().nonnegative(),
  prompt: z.string(),
});

export type ContextManifest = z.infer<typeof ContextManifestSchema>;

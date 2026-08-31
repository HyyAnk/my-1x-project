import { z } from "zod";
import { EngineIdSchema, ImageProviderIdSchema } from "../enums.js";
import { MascotRenderAspectRatioSchema } from "../mascot/renderSchema.js";

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

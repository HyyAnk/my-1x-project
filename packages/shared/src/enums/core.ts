import { z } from "zod";

export const ChannelStatusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]);
export type ChannelStatus = z.infer<typeof ChannelStatusSchema>;

export const EpisodeStageSchema = z.enum([
  "IDEA",
  "SELECTED",
  "RESEARCH",
  "RESEARCH_READY",
  "TREATMENT",
  "TREATMENT_READY",
  "SCRIPT",
  "SCRIPT_READY",
  "VISUAL_BIBLE",
  "VISUAL_BIBLE_READY",
  "SCENE_BREAKDOWN",
  "SCENE_READY",
  "NARRATION_READY",
  "READY_FOR_GENERATION",
  "VIDEO_RENDERING",
  "VIDEO_READY",
]);
export type EpisodeStage = z.infer<typeof EpisodeStageSchema>;

export const TaskStatusSchema = z.enum(["QUEUED", "RUNNING", "WAITING_APPROVAL", "COMPLETED", "FAILED", "CANCELLED"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskTypeSchema = z.enum([
  "GENERATE_DNA",
  "SUGGEST_TOPICS",
  "GENERATE_RESEARCH",
  "GENERATE_TREATMENT",
  "GENERATE_SCRIPT",
  "GENERATE_VISUAL_BIBLE",
  "GENERATE_SCENES",
  "GENERATE_SEQUENCE_SCENES",
  "GENERATE_PIPELINE",
  "REGENERATE_DIALOGUE",
  "REGENERATE_PROMPT",
  "REGENERATE_BOTH",
  "GENERATE_AUDIO",
  "GENERATE_BUNDLE_IMAGE",
  "GENERATE_VIDEO",
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const EngineIdSchema = z.enum(["codex", "antigravity"]);
export type EngineId = z.infer<typeof EngineIdSchema>;

export const ImageProviderIdSchema = z.enum(["gpti2", "shopaikey", "custom"]);
export type ImageProviderId = z.infer<typeof ImageProviderIdSchema>;

export const ImageModelIdSchema = z.enum(["gpt-image-2", "nano-banana-2"]);
export type ImageModelId = z.infer<typeof ImageModelIdSchema>;

export const ImageAspectRatioSchema = z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"]);
export type ImageAspectRatio = z.infer<typeof ImageAspectRatioSchema>;

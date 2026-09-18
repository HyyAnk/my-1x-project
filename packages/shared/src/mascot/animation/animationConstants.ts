/**
 * Shared Mascot Animation Constants
 *
 * Core specifications for twelve-frame mascot animation rows.
 */

export const REQUIRED_FRAME_COUNT = 12 as const;
export const REQUIRED_FPS = 8 as const;
export const FRAME_DURATION_MS = 125 as const;
export const ANIMATION_CYCLE_SECONDS = 1.5 as const;

export const DEFAULT_REQUIRED_FRAME_COUNT = 12 as const;
export const DEFAULT_REQUIRED_FPS = 8 as const;
export const MIN_VIDEO_DURATION_MS = 500 as const;
export const MAX_VIDEO_DURATION_MS = 15000 as const;
export const MIN_FPS = 8 as const;
export const MAX_FPS = 60 as const;
export const MIN_FRAME_COUNT = 1 as const;
export const MAX_FRAME_COUNT = 900 as const;

export const ALPHA_CODECS = ["vp9_alpha", "raw_rgba", "none"] as const;
export type AlphaCodec = (typeof ALPHA_CODECS)[number];

export const SLOTS_PER_STATE = 10 as const;
export const TOTAL_ANIMATION_SLOTS = 20 as const;

export const ANIMATION_STATES = ["thinking", "celebrate"] as const;
export type AnimationState = (typeof ANIMATION_STATES)[number];

export const ANIMATION_SLOT_STATUSES = [
  "not_started",
  "queued",
  "generating",
  "curating",
  "qa_failed",
  "ready",
  "error",
  "cancelled",
] as const;
export type MascotSlotStatus = (typeof ANIMATION_SLOT_STATUSES)[number];

export const ANIMATION_LOOP_POLICIES = ["loop", "one_shot_rest"] as const;
export type AnimationLoopPolicy = (typeof ANIMATION_LOOP_POLICIES)[number];

export const DEFAULT_LOOP_POLICY_BY_STATE: Record<AnimationState, AnimationLoopPolicy> = {
  thinking: "loop",
  celebrate: "one_shot_rest",
};

export const PROHIBITED_PROMPT_ELEMENTS = [
  "no text",
  "no background scenery",
  "no multiple characters",
  "no detached effects",
  "no motion lines",
  "no model-generated atlas",
] as const;

export const DEFAULT_CHROMA_KEY = {
  color: "#00FF00",
  description: "pure solid flat green chroma key background",
} as const;

export const SOURCE_IMAGE_CANVAS_ASPECT_RATIO = "16:9" as const;
export const SOURCE_IMAGE_DIMENSIONS = { width: 1280, height: 720 } as const;
export const SOURCE_IMAGE_CANVAS_SAFE_MARGINS = { top: 40, bottom: 0, left: 80, right: 80 } as const;

export const ANIMATION_CANVAS_DIMENSIONS = SOURCE_IMAGE_DIMENSIONS;
export const ANIMATION_DURATION_MS = 1500 as const;

export const MASCOT_PROCESSING_JOB_STATUSES = ["queued", "uploading", "processing", "qa_failed", "ready", "cancelled"] as const;
export type MascotProcessingJobStatus = (typeof MASCOT_PROCESSING_JOB_STATUSES)[number];

export const MASCOT_SLOT_STATE_MACHINE_STATUSES = [
  "empty",
  "uploading",
  "queued",
  "processing",
  "ready",
  "failed",
  "retrying",
  "replacing",
  "cancelled",
  "qa_failed",
] as const;
export type MascotSlotState = (typeof MASCOT_SLOT_STATE_MACHINE_STATUSES)[number];

export const ALLOWED_SLOT_STATE_TRANSITIONS: Record<MascotSlotState, readonly MascotSlotState[]> = {
  empty: ["uploading", "queued"],
  uploading: ["queued", "processing", "failed", "cancelled"],
  queued: ["processing", "failed", "cancelled", "ready"],
  processing: ["ready", "qa_failed", "failed", "cancelled"],
  qa_failed: ["retrying", "uploading", "queued"],
  failed: ["retrying", "uploading", "queued"],
  retrying: ["queued", "processing", "failed", "cancelled"],
  ready: ["replacing", "uploading"],
  replacing: ["queued", "processing", "failed", "cancelled"],
  cancelled: ["retrying", "uploading", "queued"],
};

export function isValidSlotStateTransition(from: MascotSlotState, to: MascotSlotState): boolean {
  return ALLOWED_SLOT_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

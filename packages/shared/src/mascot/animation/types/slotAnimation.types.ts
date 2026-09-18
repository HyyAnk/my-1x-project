import type { MascotBounds, MascotCanvasSize, MascotPoint } from "../../renderTypes.js";
import type {
  AlphaCodec,
  AnimationLoopPolicy,
  AnimationState,
  MascotProcessingJobStatus,
  MascotSlotState,
  MascotSlotStatus,
} from "../animationConstants.js";
import type { MascotPublishedAnimationAsset } from "./manifest.types.js";
import type { MascotAnimationRevision } from "./videoJob.types.js";

export type { AlphaCodec, AnimationLoopPolicy, AnimationState, MascotProcessingJobStatus, MascotSlotState, MascotSlotStatus };

export interface MascotSourceVariant {
  style_id: string;
  state: AnimationState;
  slot_index: number;
  image_url: string;
  raw_image_url?: string | null;
  transparent_image_url?: string | null;
  canvas: MascotCanvasSize;
  content_bounds: MascotBounds;
  pivot: MascotPoint;
  source_fingerprint: string;
  status: MascotSlotState | MascotSlotStatus;
}

export interface MascotSlotProjection {
  style_id: string;
  state: AnimationState;
  slot_index: number;
  status: MascotSlotState;
  active_job_id?: string | null;
  active_attempt?: number | null;
  active_revision_id?: string | null;
  active_revision?: MascotAnimationRevision | null;
  source_video_url?: string | null;
  source_video_fingerprint?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  updated_at: string;
}

export interface MascotAnimatedStateVariant {
  id: string;
  slot_index: number;
  image_url: string;
  raw_image_url?: string | null;
  transparent_image_url?: string | null;
  canvas?: MascotCanvasSize;
  content_bounds?: MascotBounds;
  pivot?: MascotPoint;
  source_fingerprint?: string;
  prompt_modifier?: string;
  status?: MascotSlotStatus | MascotSlotState;
  generation_revision?: number;
  animation?: MascotPublishedAnimationAsset;
  created_at?: string;
}

export interface AnimationPromptContext {
  characterName?: string;
  characterDescription: string;
  visualStyle?: string;
  anchorKeyword?: string;
  chromaKeyColor?: string;
}

export interface AnimationFingerprintInput {
  styleAnchorIdOrUrl: string;
  recipeId: string;
  prompt: string;
  frameCount: number;
  fps: number;
  providerRevision?: string;
  toolVersion?: string;
  additionalParams?: Record<string, unknown>;
}

import type { MascotAssetRegistration, MascotBounds, MascotCanvasSize, MascotPoint } from "../../renderTypes.js";
import type { AlphaCodec, AnimationLoopPolicy, AnimationState, MascotProcessingJobStatus } from "../animationConstants.js";
import type { MascotFrameRect } from "./manifest.types.js";

export interface MascotVideoProcessingJob {
  id: string;
  mascot_id: string;
  style_id: string;
  state: AnimationState;
  slot_index: number;
  attempt: number;
  source_video_url: string;
  source_video_fingerprint: string;
  status: MascotProcessingJobStatus;
  progress: number;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MascotAnimationQaGateResult {
  passed: boolean;
  name: string;
  details?: string;
  metric_value?: number | string | boolean;
  threshold_value?: number | string | boolean;
}

export interface MascotAnimationQaReport {
  overall_pass: boolean;
  fingerprint: string;
  gates: Record<string, MascotAnimationQaGateResult>;
  metrics: {
    frame_count: number;
    expected_frames: number;
    matted_frames: number;
    matting_success_rate: number;
    alpha_cleanliness: {
      hidden_rgb_detected: boolean;
      residual_background_ratio: number;
    };
    visual_stability: {
      alpha_flicker_score: number;
      holes_detected: boolean;
      edge_clipping_detected: boolean;
    };
    registration: {
      common_bounds: MascotBounds;
      common_pivot: MascotPoint;
      max_drift_px: number;
    };
    loop_policy: {
      policy: AnimationLoopPolicy;
      passed: boolean;
      seam_difference?: number;
      rest_held?: boolean;
    };
  };
  checked_at: string;
}

export interface MascotAttemptMetadata {
  job_id: string;
  mascot_id: string;
  style_id: string;
  state: AnimationState;
  slot_index: number;
  attempt: number;
  source_video_url: string;
  source_video_fingerprint: string;
  processing_fingerprint?: string;
  status: MascotProcessingJobStatus;
  progress: number;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  qa_report?: MascotAnimationQaReport;
  manifest_url?: string;
  atlas_url?: string;
  transparent_video_url?: string;
  alpha_codec?: AlphaCodec;
  duration_ms?: number;
  frame_count?: number;
  fps?: number;
}

export interface MascotProcessedAnimation {
  version: 1;
  style_id: string;
  state: AnimationState;
  slot_index: number;
  source_video_url: string;
  atlas_url?: string;
  manifest_url: string;
  frame_urls?: string[];
  frame_count: number;
  source_fps: number;
  playback_fps: number;
  duration_ms: number;
  loop_mode: AnimationLoopPolicy;
  canvas: MascotCanvasSize;
  content_bounds: MascotBounds;
  pivot: MascotPoint;
  registration: MascotAssetRegistration;
  source_fingerprint: string;
  processing_fingerprint: string;
  qa_report_url?: string | null;
  qa_report?: MascotAnimationQaReport;
  status: "ready" | "qa_failed";
  transparent_video_url?: string;
  alpha_codec?: AlphaCodec;
}

export interface MascotAnimationRevision extends MascotProcessedAnimation {
  id: string;
  attempt: number;
  created_at: string;
}

export interface VideoSourceFingerprintInput {
  videoSha256: string;
  durationMs: number;
  width: number;
  height: number;
  fps?: number;
  fileSizeBytes?: number;
}

export interface VideoProcessingFingerprintInput {
  sourceVideoFingerprint: string;
  frameCount: number;
  playbackFps: number;
  loopMode: string;
  registration: MascotAssetRegistration;
  frames?: MascotFrameRect[];
  atlasChecksum?: string;
  transparentVideoUrl?: string;
  alphaCodec?: AlphaCodec;
}

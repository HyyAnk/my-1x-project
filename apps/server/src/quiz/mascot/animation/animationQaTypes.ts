import type { AnimationState, MascotFrameRect } from "@studio/shared";

export type AnimationQaCheckName =
  "frame_count" | "bounds" | "alpha_coverage" | "duplicate_pose" | "motion_difference" | "seam" | "fingerprint_consistency";

export interface AnimationQaCheckResult {
  passed: boolean;
  score: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface AnimationQaThresholds {
  minAlphaRatio: number;
  maxDuplicateRatio: number;
  duplicatePixelDiffThreshold: number;
  minMotionDifference: number;
  maxSeamDifference: number;
}

export const DEFAULT_QA_THRESHOLDS: AnimationQaThresholds = {
  minAlphaRatio: 0.02,
  maxDuplicateRatio: 0.25,
  duplicatePixelDiffThreshold: 0.015,
  minMotionDifference: 0.02,
  maxSeamDifference: 0.4,
};

export interface AnimationQaReportSummary {
  state: AnimationState;
  recipe_id?: string;
  frame_count: number;
  fps: number;
  average_alpha_ratio: number;
  duplicate_ratio: number;
  motion_score: number;
  seam_difference: number;
  content_fingerprint?: string;
}

export interface AnimationQaReport {
  version: 1;
  job_id?: string;
  passed: boolean;
  score: number;
  timestamp: string;
  checks: Record<AnimationQaCheckName, AnimationQaCheckResult>;
  summary?: AnimationQaReportSummary;
}

export interface ValidateAnimationInput {
  jobId?: string;
  state: AnimationState;
  recipeId: string;
  frames: MascotFrameRect[];
  atlas: {
    width: number;
    height: number;
    buffer?: Buffer;
    filePath?: string;
  };
  expectedContentFingerprint?: string;
  declaredFingerprint?: string;
  thresholds?: Partial<AnimationQaThresholds>;
}

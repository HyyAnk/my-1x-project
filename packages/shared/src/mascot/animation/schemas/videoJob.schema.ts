import { z } from "zod";
import {
  MascotAssetRegistrationSchema,
  MascotBoundsSchema,
  MascotCanvasSizeSchema,
  MascotPointSchema,
} from "../../renderRegistrationSchema.js";
import { MASCOT_PROCESSING_JOB_STATUSES, SLOTS_PER_STATE } from "../animationConstants.js";
import { AlphaCodecSchema, AnimationLoopPolicySchema, AnimationStateSchema } from "./manifest.schema.js";

export const MascotProcessingJobStatusSchema = z.enum(MASCOT_PROCESSING_JOB_STATUSES);

export const MascotVideoProcessingJobSchema = z.object({
  id: z.string().trim().min(1, "Job ID cannot be empty"),
  mascot_id: z.string().trim().min(1, "Mascot ID cannot be empty"),
  style_id: z.string().trim().min(1, "Style ID cannot be empty"),
  state: AnimationStateSchema,
  slot_index: z.number().int().min(1).max(SLOTS_PER_STATE),
  attempt: z.number().int().min(1, "Attempt must be at least 1"),
  source_video_url: z.string().trim().min(1, "Source video URL cannot be empty"),
  source_video_fingerprint: z.string().trim().min(1, "Source video fingerprint cannot be empty"),
  status: MascotProcessingJobStatusSchema,
  progress: z.number().min(0).max(100),
  error_code: z.string().trim().nullable().optional(),
  error_message: z.string().trim().nullable().optional(),
  created_at: z.string().trim().min(1),
  updated_at: z.string().trim().min(1),
});

export const MascotAnimationQaGateResultSchema = z.object({
  passed: z.boolean(),
  name: z.string().trim().min(1),
  details: z.string().optional(),
  metric_value: z.union([z.number(), z.string(), z.boolean()]).optional(),
  threshold_value: z.union([z.number(), z.string(), z.boolean()]).optional(),
});

export const MascotAnimationQaReportSchema = z.object({
  overall_pass: z.boolean(),
  fingerprint: z.string().trim().min(1),
  gates: z.record(z.string(), MascotAnimationQaGateResultSchema),
  metrics: z.object({
    frame_count: z.number().int().min(0),
    expected_frames: z.number().int().min(1),
    matted_frames: z.number().int().min(0),
    matting_success_rate: z.number().min(0).max(1),
    alpha_cleanliness: z.object({
      hidden_rgb_detected: z.boolean(),
      residual_background_ratio: z.number().min(0).max(1),
    }),
    visual_stability: z.object({
      alpha_flicker_score: z.number().min(0),
      holes_detected: z.boolean(),
      edge_clipping_detected: z.boolean(),
    }),
    registration: z.object({
      common_bounds: MascotBoundsSchema,
      common_pivot: MascotPointSchema,
      max_drift_px: z.number().min(0),
    }),
    loop_policy: z.object({
      policy: AnimationLoopPolicySchema,
      passed: z.boolean(),
      seam_difference: z.number().optional(),
      rest_held: z.boolean().optional(),
    }),
  }),
  checked_at: z.string().trim().min(1),
});

export const BaseMascotProcessedAnimationObject = z.object({
  version: z.literal(1),
  style_id: z.string().trim().min(1),
  state: AnimationStateSchema,
  slot_index: z.number().int().min(1).max(SLOTS_PER_STATE),
  source_video_url: z.string().trim().min(1),
  atlas_url: z.string().trim().optional(),
  manifest_url: z.string().trim().min(1),
  frame_urls: z.array(z.string().trim().min(1)).optional(),
  frame_count: z.number().int().min(1),
  source_fps: z.number().positive(),
  playback_fps: z.number().positive(),
  duration_ms: z.number().positive(),
  loop_mode: AnimationLoopPolicySchema,
  canvas: MascotCanvasSizeSchema,
  content_bounds: MascotBoundsSchema,
  pivot: MascotPointSchema,
  registration: MascotAssetRegistrationSchema,
  source_fingerprint: z.string().trim().min(1),
  processing_fingerprint: z.string().trim().min(1),
  qa_report_url: z.string().trim().nullable().optional(),
  qa_report: MascotAnimationQaReportSchema.optional(),
  status: z.enum(["ready", "qa_failed"]),
  transparent_video_url: z.string().trim().optional(),
  alpha_codec: AlphaCodecSchema.optional(),
});

export function refineProcessedAnimationDimensions<
  T extends {
    registration: { source_width: number; source_height: number };
    canvas: { width: number; height: number };
    frame_urls?: string[];
    frame_count: number;
    transparent_video_url?: string;
    atlas_url?: string;
  },
>(anim: T, ctx: z.RefinementCtx): void {
  if (anim.registration.source_width !== anim.canvas.width) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["registration", "source_width"],
      message: "Registration source_width must match canvas width",
    });
  }
  if (anim.registration.source_height !== anim.canvas.height) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["registration", "source_height"],
      message: "Registration source_height must match canvas height",
    });
  }
  if (anim.frame_urls !== undefined) {
    if (anim.frame_urls.length !== anim.frame_count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["frame_urls"],
        message: `frame_urls length (${anim.frame_urls.length}) must match frame_count (${anim.frame_count})`,
      });
    }
  } else if (!anim.transparent_video_url && !anim.atlas_url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["frame_urls"],
      message: "frame_urls is required when transparent_video_url and atlas_url are not provided",
    });
  }
}

export const MascotProcessedAnimationSchema = BaseMascotProcessedAnimationObject.superRefine(refineProcessedAnimationDimensions);

export const MascotAnimationRevisionSchema = BaseMascotProcessedAnimationObject.extend({
  id: z.string().trim().min(1),
  attempt: z.number().int().min(1),
  created_at: z.string().trim().min(1),
}).superRefine(refineProcessedAnimationDimensions);

export const MascotAttemptMetadataSchema = z.object({
  job_id: z.string().trim().min(1),
  mascot_id: z.string().trim().min(1),
  style_id: z.string().trim().min(1),
  state: AnimationStateSchema,
  slot_index: z.number().int().min(1).max(SLOTS_PER_STATE),
  attempt: z.number().int().positive(),
  source_video_url: z.string().trim().min(1),
  source_video_fingerprint: z.string().trim().min(1),
  processing_fingerprint: z.string().trim().optional(),
  status: MascotProcessingJobStatusSchema,
  progress: z.number().min(0).max(100),
  error_code: z.string().trim().nullable().optional(),
  error_message: z.string().trim().nullable().optional(),
  created_at: z.string().trim().min(1),
  updated_at: z.string().trim().min(1),
  qa_report: MascotAnimationQaReportSchema.optional(),
  manifest_url: z.string().trim().optional(),
  atlas_url: z.string().trim().optional(),
  transparent_video_url: z.string().trim().optional(),
  alpha_codec: AlphaCodecSchema.optional(),
  duration_ms: z.number().positive().optional(),
  frame_count: z.number().int().positive().optional(),
  fps: z.number().positive().optional(),
});

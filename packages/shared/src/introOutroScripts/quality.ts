import { z } from "zod";

export const ScriptProductionDirectionsSchema = z
  .object({
    reference_mode: z.enum(["character_reference", "first_frame"]),
    logo_mode: z.enum(["post_overlay", "supplied_reference", "none"]),
    voice_source: z.enum(["narrator", "mascot", "none"]),
    logo_placement: z.string().trim().min(1).max(400),
    opening_state: z.string().trim().min(1).max(600),
    closing_state: z.string().trim().min(1).max(600),
    end_hold_seconds: z.number().min(0.5).max(2),
  })
  .strict();

export const ScriptQualityFindingSchema = z
  .object({
    code: z.enum([
      "ACTION_OVERLOAD",
      "IDENTITY_DRIFT",
      "VISIBILITY_CONFLICT",
      "CAPABILITY_CONFLICT",
      "TIMING_CONFLICT",
      "CAMERA_CONFLICT",
      "SEED_DRIFT",
      "PAIR_CONTINUITY",
      "PRODUCTION_AMBIGUITY",
    ]),
    severity: z.enum(["error", "warning"]),
    path: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(500),
  })
  .strict();

export const ScriptQualityReviewSchema = z
  .object({
    version: z.literal("script-quality-v1"),
    requested_model: z.string().min(1),
    reviewed_at: z.string().datetime(),
    content_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    findings: z.array(ScriptQualityFindingSchema).max(20),
  })
  .strict();

export type ScriptQualityReview = z.infer<typeof ScriptQualityReviewSchema>;

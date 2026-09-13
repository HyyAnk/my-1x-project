import { z } from "zod";
import { SegmentIndexSchema } from "./reelSegment.schema.js";
import { ReelVisualContextSchema, type ReelVisualContext } from "../shortReelVisual.schema.js";

export { ReelVisualContextSchema, type ReelVisualContext };

export const ReelReferenceAssetSchema = z
  .object({
    asset_id: z.string().min(1),
    role: z.enum(["mascot", "style"]),
    path: z.string().min(1),
    mime_type: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    checksum: z.string().min(1),
  })
  .strict();

export type ReelReferenceAsset = z.infer<typeof ReelReferenceAssetSchema>;

export const ReelReferencesPayloadSchema = z
  .object({
    references: z.array(ReelReferenceAssetSchema),
  })
  .strict();

export type ReelReferencesPayload = z.infer<typeof ReelReferencesPayloadSchema>;

export const ReelCoverPayloadSchema = z
  .object({
    asset_id: z.string().min(1),
    path: z.string().min(1),
    mime_type: z.string().min(1),
    width: z.literal(1080),
    height: z.literal(1920),
    checksum: z.string().min(1),
  })
  .strict();

export type ReelCoverPayload = z.infer<typeof ReelCoverPayloadSchema>;

export const ShortReelDisplayProjectionSchema = z
  .object({
    question_text: z.string(),
    selected_answer_text: z.string(),
    explanation: z.string().optional(),
    video_description: z.string().optional(),
    thumbnail_text: z.string().optional(),
  })
  .strict();

export type ShortReelDisplayProjection = z.infer<typeof ShortReelDisplayProjectionSchema>;

export const CameraShotSchema = z
  .object({
    camera: z.string().min(1).max(300),
    action: z.string().min(1).max(300).optional(),
    environment: z.string().min(1).max(300).optional(),
    position: z.string().min(1).max(300).optional(),
  })
  .strict();

export type CameraShot = z.infer<typeof CameraShotSchema>;

export const ReelShotPlanSchema = z
  .object({
    segment_index: SegmentIndexSchema,
    camera_shot: CameraShotSchema,
    prompt_summary: z.string().optional(),
  })
  .strict();

export type ReelShotPlan = z.infer<typeof ReelShotPlanSchema>;

export const ReelVisualPlanSchema = z
  .object({
    visual_context: ReelVisualContextSchema.nullable().optional(),
    references: ReelReferencesPayloadSchema.optional(),
    cover: ReelCoverPayloadSchema.optional(),
    shot_plans: z.array(ReelShotPlanSchema).optional(),
  })
  .strict();

export type ReelVisualPlan = z.infer<typeof ReelVisualPlanSchema>;

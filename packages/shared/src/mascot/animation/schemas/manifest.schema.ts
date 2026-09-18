import { z } from "zod";
import {
  MascotAssetRegistrationSchema,
  MascotBoundsSchema,
  MascotCanvasSizeSchema,
  MascotPointSchema,
} from "../../renderRegistrationSchema.js";
import {
  ALPHA_CODECS,
  ANIMATION_LOOP_POLICIES,
  ANIMATION_STATES,
  FRAME_DURATION_MS,
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
  SLOTS_PER_STATE,
} from "../animationConstants.js";

export const AnimationStateSchema = z.enum(ANIMATION_STATES);
export const AnimationLoopPolicySchema = z.enum(ANIMATION_LOOP_POLICIES);
export const AlphaCodecSchema = z.enum(ALPHA_CODECS);

export const MascotFrameRectSchema = z.object({
  index: z.number().int().min(0),
  x: z.number().finite().min(0, "Frame x coordinate cannot be negative"),
  y: z.number().finite().min(0, "Frame y coordinate cannot be negative"),
  width: z.number().finite().positive("Frame width must be strictly positive"),
  height: z.number().finite().positive("Frame height must be strictly positive"),
  duration_ms: z.number().positive(),
});

export const MascotFrameRectV1Schema = MascotFrameRectSchema.extend({
  index: z
    .number()
    .int()
    .min(0)
    .max(REQUIRED_FRAME_COUNT - 1),
  duration_ms: z.literal(FRAME_DURATION_MS, {
    errorMap: () => ({ message: `Frame duration must be strictly ${FRAME_DURATION_MS}ms` }),
  }),
});

export const MascotAnimationAssetV1Schema = z
  .object({
    version: z.literal(1),
    state: AnimationStateSchema,
    atlas_url: z.string().trim().min(1, "Atlas URL cannot be empty"),
    manifest_url: z.string().trim().min(1, "Manifest URL cannot be empty"),
    frame_count: z.literal(REQUIRED_FRAME_COUNT, {
      errorMap: () => ({ message: `frame_count must be exactly ${REQUIRED_FRAME_COUNT}` }),
    }),
    fps: z.literal(REQUIRED_FPS, {
      errorMap: () => ({ message: `fps must be exactly ${REQUIRED_FPS}` }),
    }),
    loop: z.boolean(),
    loop_policy: AnimationLoopPolicySchema.optional(),
    frames: z.array(MascotFrameRectV1Schema).length(REQUIRED_FRAME_COUNT, `Animation must contain exactly ${REQUIRED_FRAME_COUNT} frames`),
    registration: MascotAssetRegistrationSchema,
    content_fingerprint: z.string().trim().min(1, "Content fingerprint cannot be empty"),
    source_fingerprint: z.string().trim().min(1, "Source fingerprint cannot be empty"),
    qa_report_url: z.string().trim().nullable().optional(),
    published_at: z.string().trim().nullable().optional(),
    slot_index: z.number().int().min(1).max(SLOTS_PER_STATE).optional(),
    recipe_id: z.string().trim().min(1).optional(),
    transparent_video_url: z.string().trim().optional(),
    alpha_codec: AlphaCodecSchema.optional(),
    duration_ms: z.number().positive().optional(),
  })
  .superRefine((asset, ctx) => {
    for (let i = 0; i < asset.frames.length; i += 1) {
      if (asset.frames[i].index !== i) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["frames", i, "index"],
          message: `Frame at position ${i} must have index ${i}`,
        });
      }
    }
  });

export const MascotAnimationManifestAtlasSchema = z.object({
  file_path: z.string().trim().optional(),
  url: z.string().trim().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  cols: z.number().int().positive().optional(),
  rows: z.number().int().positive().optional(),
});

export const MascotAnimationCurationMetadataSchema = z.object({
  reviewed: z.boolean(),
  approved: z.boolean(),
  reviewed_by: z.string().trim().nullable().optional(),
  reviewed_at: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  selection_tag: z.string().trim().nullable().optional(),
});

export const MascotAnimationManifestSchema = z
  .object({
    version: z.literal(1),
    state: AnimationStateSchema,
    recipe_id: z.string().trim().min(1),
    style_id: z.string().trim().min(1).optional(),
    slot_index: z.number().int().min(1).max(SLOTS_PER_STATE).optional(),
    frame_count: z.number().int().min(1),
    fps: z.number().positive(),
    duration_ms: z.number().positive().optional(),
    loop: z.boolean(),
    loop_policy: AnimationLoopPolicySchema,
    atlas: MascotAnimationManifestAtlasSchema.optional(),
    frames: z.array(MascotFrameRectSchema).optional(),
    registration: MascotAssetRegistrationSchema,
    fingerprint: z.string().trim().min(1),
    source_fingerprint: z.string().trim().min(1).optional(),
    processing_fingerprint: z.string().trim().min(1).optional(),
    qa_report_url: z.string().trim().nullable().optional(),
    curation: MascotAnimationCurationMetadataSchema.optional(),
    transparent_video_url: z.string().trim().optional(),
    alpha_codec: AlphaCodecSchema.optional(),
  })
  .superRefine((manifest, ctx) => {
    if (manifest.frames !== undefined) {
      if (manifest.frames.length !== manifest.frame_count) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["frames"],
          message: `frames length (${manifest.frames.length}) must match frame_count (${manifest.frame_count})`,
        });
      }
      for (let i = 0; i < manifest.frames.length; i += 1) {
        if (manifest.frames[i].index !== i) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["frames", i, "index"],
            message: `Frame at index ${i} has mismatched index ${manifest.frames[i].index}`,
          });
        }
      }
    }
  });

export const MascotVideoAnimationAssetSchema = z.object({
  version: z.literal(1),
  state: AnimationStateSchema,
  atlas_url: z.string().trim().optional(),
  manifest_url: z.string().trim().min(1),
  frame_count: z.number().int().min(1),
  fps: z.number().positive(),
  duration_ms: z.number().positive().optional(),
  loop: z.boolean(),
  loop_policy: AnimationLoopPolicySchema.optional(),
  frames: z.array(MascotFrameRectSchema).optional(),
  registration: MascotAssetRegistrationSchema,
  content_fingerprint: z.string().trim().min(1),
  source_fingerprint: z.string().trim().min(1),
  qa_report_url: z.string().trim().nullable().optional(),
  published_at: z.string().trim().nullable().optional(),
  slot_index: z.number().int().min(1).max(SLOTS_PER_STATE).optional(),
  recipe_id: z.string().trim().min(1).optional(),
  transparent_video_url: z.string().trim().optional(),
  alpha_codec: AlphaCodecSchema.optional(),
});

export const MascotPublishedAnimationAssetSchema = z.union([MascotAnimationAssetV1Schema, MascotVideoAnimationAssetSchema]);

export const MascotVideoAnimationManifestSchema = z
  .object({
    version: z.literal(1),
    style_id: z.string().trim().min(1),
    state: AnimationStateSchema,
    slot_index: z.number().int().min(1).max(SLOTS_PER_STATE),
    frame_count: z.number().int().min(1),
    source_fps: z.number().positive().optional(),
    playback_fps: z.number().positive(),
    duration_ms: z.number().positive(),
    loop: z.boolean(),
    loop_mode: AnimationLoopPolicySchema,
    atlas: MascotAnimationManifestAtlasSchema.optional(),
    frames: z.array(MascotFrameRectSchema).optional(),
    frame_urls: z.array(z.string().trim().min(1)).optional(),
    canvas: MascotCanvasSizeSchema,
    content_bounds: MascotBoundsSchema,
    pivot: MascotPointSchema,
    registration: MascotAssetRegistrationSchema,
    source_fingerprint: z.string().trim().min(1).optional(),
    processing_fingerprint: z.string().trim().min(1),
    qa_report_url: z.string().trim().nullable().optional(),
    curation: MascotAnimationCurationMetadataSchema.optional(),
    transparent_video_url: z.string().trim().optional(),
    alpha_codec: AlphaCodecSchema.optional(),
  })
  .superRefine((manifest, ctx) => {
    if (manifest.frames && manifest.frames.length > 0) {
      if (manifest.frames.length !== manifest.frame_count) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["frames"],
          message: `frames length (${manifest.frames.length}) must match frame_count (${manifest.frame_count})`,
        });
      }
      for (let i = 0; i < manifest.frames.length; i += 1) {
        if (manifest.frames[i].index !== i) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["frames", i, "index"],
            message: `Frame at index ${i} has mismatched index ${manifest.frames[i].index}`,
          });
        }
        const frame = manifest.frames[i];
        if (manifest.atlas) {
          if (frame.x + frame.width > manifest.atlas.width || frame.y + frame.height > manifest.atlas.height) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["frames", i],
              message: `Frame at index ${i} exceeds atlas dimensions (${manifest.atlas.width}x${manifest.atlas.height})`,
            });
          }
        }
      }
    }
    if (manifest.frame_urls && manifest.frame_urls.length > 0) {
      if (manifest.frame_urls.length !== manifest.frame_count) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["frame_urls"],
          message: `frame_urls length (${manifest.frame_urls.length}) must match frame_count (${manifest.frame_count})`,
        });
      }
    }
  });

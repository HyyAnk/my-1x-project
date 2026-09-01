import { z } from "zod";
import { IsoDate } from "./common.js";

export const ThumbnailLayoutTypeSchema = z.enum([
  "mega_grid",
  "split_vs",
  "mystery_silhouette",
  "odd_one_out",
  "difficulty_tier",
  "true_false",
]);

export type ThumbnailLayoutType = z.infer<typeof ThumbnailLayoutTypeSchema>;

export const ThumbnailAspectRatioSchema = z.enum(["16:9", "9:16"]);

export type ThumbnailAspectRatio = z.infer<typeof ThumbnailAspectRatioSchema>;

export const ThumbnailGenerationRequestSchema = z.object({
  episode_id: z.string().min(1),
  channel_id: z.string().optional(),
  layout_override: ThumbnailLayoutTypeSchema.optional(),
  aspect_ratio: z.union([ThumbnailAspectRatioSchema, z.literal("both")]).default("both"),
  custom_hook_text: z.string().optional(),
  cancellation_signal: z.any().optional(),
});

export type ThumbnailGenerationRequest = z.infer<typeof ThumbnailGenerationRequestSchema>;

export const ThumbnailManifestSchema = z.object({
  episode_id: z.string().min(1),
  channel_id: z.string().default(""),
  layout: ThumbnailLayoutTypeSchema,
  hook_text: z.string().default(""),
  mascot_persona: z.string().default(""),
  asset_path_16_9: z.string().nullable().default(null),
  asset_path_9_16: z.string().nullable().default(null),
  prompt_16_9: z.string().nullable().default(null),
  prompt_9_16: z.string().nullable().default(null),
  created_at: IsoDate,
  updated_at: IsoDate,
});

export type ThumbnailManifest = z.infer<typeof ThumbnailManifestSchema>;

import { z } from "zod";
import { IsoDate } from "./common.js";
import { acceptLegacyVerdictAliases } from "../enums/quiz/legacyVerdictAliases.js";

export const THUMBNAIL_LAYOUT_TYPES = ["mega_grid", "split_vs", "mystery_silhouette", "odd_one_out", "difficulty_tier", "yes_no"] as const;

export const ThumbnailLayoutTypeSchema = acceptLegacyVerdictAliases(z.enum(THUMBNAIL_LAYOUT_TYPES));

export type ThumbnailLayoutType = z.infer<typeof ThumbnailLayoutTypeSchema>;

export const ThumbnailAspectRatioSchema = z.enum(["16:9", "9:16"]);

export type ThumbnailAspectRatio = z.infer<typeof ThumbnailAspectRatioSchema>;

export const ThumbnailDesignTemplateSchema = z.enum(["big_object", "reaction", "comparison"]);
export type ThumbnailDesignTemplate = z.infer<typeof ThumbnailDesignTemplateSchema>;

/**
 * Where the mascot, hero subject and headline sit in a single-subject editorial thumbnail.
 * Rotated across a channel's episodes so the video grid does not repeat one layout.
 */
export const THUMBNAIL_COMPOSITIONS = ["mascot_left", "mascot_right", "hero_center", "reaction_closeup"] as const;
export const ThumbnailCompositionSchema = z.enum(THUMBNAIL_COMPOSITIONS);
export type ThumbnailComposition = z.infer<typeof ThumbnailCompositionSchema>;

/** Diegetic headline lettering styles, rotated across a channel like compositions. */
export const THUMBNAIL_HEADLINE_STYLES = [
  "brush_banner",
  "neon_sign",
  "hazard_plate",
  "carved_wood_sign",
  "comic_burst",
  "chalkboard",
  "chunky_3d_letters",
  "stone_tablet",
] as const;
export const ThumbnailHeadlineStyleSchema = z.enum(THUMBNAIL_HEADLINE_STYLES);
export type ThumbnailHeadlineStyle = z.infer<typeof ThumbnailHeadlineStyleSchema>;

export const ThumbnailRatioModeSchema = z.enum(["auto", "16:9", "9:16", "both"]).default("auto");

export type ThumbnailRatioMode = z.infer<typeof ThumbnailRatioModeSchema>;

export const ThumbnailGenerationRequestSchema = z.object({
  episode_id: z.string().min(1),
  channel_id: z.string().optional(),
  layout_override: ThumbnailLayoutTypeSchema.optional(),
  aspect_ratio: z.union([ThumbnailAspectRatioSchema, z.literal("both"), z.literal("auto")]).default("auto"),
  custom_hook_text: z.string().optional(),
  badge_override: z.string().optional(),
  cancellation_signal: z.any().optional(),
});

export type ThumbnailGenerationRequest = z.infer<typeof ThumbnailGenerationRequestSchema>;

export const ThumbnailHistoryItemSchema = z.object({
  design_template: ThumbnailDesignTemplateSchema.optional(),
  composition: ThumbnailCompositionSchema.optional(),
  headline_style: ThumbnailHeadlineStyleSchema.optional(),
  id: z.string(),
  aspect_ratio: ThumbnailAspectRatioSchema,
  layout: ThumbnailLayoutTypeSchema,
  hook_text: z.string().default(""),
  badge_text: z.string().default(""),
  prompt: z.string().optional(),
  file_path: z.string(),
  created_at: IsoDate,
  is_active: z.boolean().default(false),
});

export type ThumbnailHistoryItem = z.infer<typeof ThumbnailHistoryItemSchema>;

export const ThumbnailManifestSchema = z.object({
  design_template: ThumbnailDesignTemplateSchema.optional(),
  composition: ThumbnailCompositionSchema.optional(),
  headline_style: ThumbnailHeadlineStyleSchema.optional(),
  episode_id: z.string().min(1),
  channel_id: z.string().default(""),
  layout: ThumbnailLayoutTypeSchema,
  hook_text: z.string().default(""),
  badge_text: z.string().default(""),
  mascot_persona: z.string().default(""),
  asset_path_16_9: z.string().nullable().default(null),
  asset_path_9_16: z.string().nullable().default(null),
  prompt_16_9: z.string().nullable().default(null),
  prompt_9_16: z.string().nullable().default(null),
  active_16_9_id: z.string().optional(),
  active_9_16_id: z.string().optional(),
  history: z.array(ThumbnailHistoryItemSchema).default([]),
  created_at: IsoDate,
  updated_at: IsoDate,
});

export type ThumbnailManifest = z.infer<typeof ThumbnailManifestSchema>;

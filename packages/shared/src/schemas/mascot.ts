import { z } from "zod";
import {
  MascotActionTypeSchema,
  MascotMotionIntensitySchema,
  MascotMotionPresetSchema,
  QuizImageStyleSchema,
  type MascotMotionPreset,
} from "../enums.js";
import { MascotRenderBundleV2Schema } from "../mascot/renderSchema.js";
import type { MascotActionAssetV2 } from "../mascot/renderTypes.js";
import { MascotBoundsSchema, MascotCanvasSizeSchema, MascotPointSchema } from "../mascot/renderRegistrationSchema.js";
import { MascotPublishedAnimationAssetSchema, MascotSlotStateSchema, MascotSlotStatusSchema } from "../mascot/animation/animationSchema.js";
import { IsoDate } from "./common.js";

/**
 * @deprecated Legacy V1 sprite action schema. Use `MascotRenderBundleV2` or `MascotStateVariantSchema` instead.
 */
export const MascotSpriteActionSchema = z.object({
  action: MascotActionTypeSchema,
  sprite_url: z.string().default(""),
  frames_count: z.number().int().default(1),
  fps: z.number().default(8),
  loop: z.boolean().default(true),
  frame_width: z.number().default(512),
  frame_height: z.number().default(512),
  offset_x: z.number().default(0),
  offset_y: z.number().default(0),
  preview_url: z.string().optional(),
  motion_preset: z.enum(["breathe", "sway", "jump", "shake", "wave", "point", "pulse", "float", "none"]).optional(),
  motion_speed: z.number().default(1.0).optional(),
  motion_intensity: z.enum(["subtle", "normal", "dynamic"]).default("normal").optional(),
});

/**
 * @deprecated Legacy V1 sprite action definition. Use V2 render bundle actions or style variants instead.
 */
export type MascotSpriteAction = z.infer<typeof MascotSpriteActionSchema>;

export const MascotStateVariantSchema = z
  .object({
    id: z.string().min(1),
    slot_index: z.number().int().min(1).max(10),
    image_url: z.string().default(""),
    raw_image_url: z.string().optional(),
    transparent_image_url: z.string().optional(),
    canvas: MascotCanvasSizeSchema.optional(),
    content_bounds: MascotBoundsSchema.optional(),
    pivot: MascotPointSchema.optional(),
    source_fingerprint: z.string().optional(),
    prompt_modifier: z.string().optional(),
    motion_preset: MascotMotionPresetSchema.optional(),
    motion_speed: z.number().optional(),
    motion_intensity: MascotMotionIntensitySchema.optional(),
    status: z.union([MascotSlotStatusSchema, MascotSlotStateSchema]).optional(),
    generation_revision: z.number().int().positive().optional(),
    animation: MascotPublishedAnimationAssetSchema.optional(),
    created_at: z.string().optional(),
  })
  .superRefine((variant, ctx) => {
    if (variant.status === "ready" && !variant.animation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["animation"],
        message: "A ready animation slot must include a valid animation asset",
      });
    }
  });

export type MascotStateVariant = z.infer<typeof MascotStateVariantSchema>;

export const MascotStyleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  built_in_preset_id: z.string().min(1).optional(),
  style_revision: z.number().int().positive().optional(),
  keyword: z.string().default(""),
  anchor_image_url: z.string().nullable().default(null),
  raw_anchor_image_url: z.string().nullable().optional().default(null),
  is_default: z.boolean().default(false),
  states: z.object({
    thinking: z.array(MascotStateVariantSchema).default([]),
    celebrate: z.array(MascotStateVariantSchema).default([]),
  }),
  created_at: z.string(),
  updated_at: z.string(),
});

export type MascotStyle = Omit<z.infer<typeof MascotStyleSchema>, "anchor_image_url" | "raw_anchor_image_url"> & {
  anchor_image_url?: string | null;
  raw_anchor_image_url?: string | null;
};

export const MascotConceptOriginSchema = z.enum(["ai_generated", "user_uploaded"]);
export type MascotConceptOrigin = z.infer<typeof MascotConceptOriginSchema>;

export const MascotProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  visual_style: QuizImageStyleSchema.default("pixar_3d"),
  master_prompt: z.string().default(""),
  master_image_url: z.string().nullable().default(null),
  master_raw_image_url: z.string().nullable().optional().default(null),
  color_theme: z.string().default("#06b6d4"),
  concept_origin: MascotConceptOriginSchema.optional(),
  /**
   * @deprecated Legacy V1 sprite actions map. Retained for backwards compatibility.
   * Canonical V2 mascot assets reside in `render_bundle` and `styles`.
   */
  actions: z.record(MascotActionTypeSchema, MascotSpriteActionSchema.nullable().optional()).optional().default({}),
  /** Canonical V2 visual styles with state variants. */
  styles: z.array(MascotStyleSchema).default([]),
  active_style_id: z.string().optional(),
  /** Persisted V2 render data; absent on V1 manifests until migration. */
  schema_version: z.number().int().positive().optional(),
  /** Canonical V2 render bundle containing configurations and registered action/master assets. */
  render_bundle: MascotRenderBundleV2Schema.optional(),
  assigned_channel_ids: z.array(z.string()).default([]),
  created_at: IsoDate,
  updated_at: IsoDate,
});

export type MascotProfile = Omit<z.infer<typeof MascotProfileSchema>, "styles" | "master_image_url" | "master_raw_image_url"> & {
  master_image_url?: string | null;
  master_raw_image_url?: string | null;
  /** Canonical V2 visual styles with state variants. */
  styles?: MascotStyle[];
  concept_origin?: MascotConceptOrigin;
};

function buildSynthesizedStateVariant(
  bundleAction: MascotActionAssetV2 | null | undefined,
  legacyAction: MascotSpriteAction | null | undefined,
  defaultPreset: MascotMotionPreset,
  createdAt?: string,
): MascotStateVariant | null {
  if (!bundleAction && !legacyAction) return null;
  const imageUrl = bundleAction?.image_url || legacyAction?.preview_url || legacyAction?.sprite_url || "";
  return {
    id: "slot_1",
    slot_index: 1,
    image_url: imageUrl,
    motion_preset: bundleAction?.motion?.preset ?? legacyAction?.motion_preset ?? defaultPreset,
    motion_speed: bundleAction?.motion?.speed ?? legacyAction?.motion_speed ?? 1.0,
    motion_intensity: bundleAction?.motion?.intensity ?? legacyAction?.motion_intensity ?? "normal",
    content_bounds: bundleAction?.registration?.content_bounds,
    pivot: bundleAction?.registration?.pivot,
    animation: bundleAction?.animation,
    created_at: createdAt,
  };
}

/**
 * Synthesizes a fallback V2 core style from legacy V1 profile actions or V2 render bundle actions.
 * Prioritizes V2 render bundle assets when present, falling back to legacy actions.
 */
export function synthesizeLegacyCoreStyle(profile: Partial<MascotProfile> | MascotProfile): MascotStyle {
  const bundleActions = profile.render_bundle?.assets?.actions;
  const legacyActions = profile.actions;

  const thinkingVariant = buildSynthesizedStateVariant(bundleActions?.thinking, legacyActions?.thinking, "sway", profile.created_at);
  const celebrateVariant = buildSynthesizedStateVariant(bundleActions?.celebrate, legacyActions?.celebrate, "jump", profile.created_at);

  const timestamp = typeof profile.created_at === "string" && profile.created_at ? profile.created_at : new Date().toISOString();
  const updatedTimestamp = typeof profile.updated_at === "string" && profile.updated_at ? profile.updated_at : timestamp;
  const candidateAnchor = profile.master_image_url || profile.render_bundle?.assets?.master?.image_url || null;

  return {
    id: "core",
    name: "Core Style",
    built_in_preset_id: "preset_arcade_classic",
    style_revision: 1,
    keyword: "",
    anchor_image_url: candidateAnchor,
    raw_anchor_image_url: (profile as MascotProfile).master_raw_image_url || null,
    is_default: true,
    states: {
      thinking: thinkingVariant ? [thinkingVariant] : [],
      celebrate: celebrateVariant ? [celebrateVariant] : [],
    },
    created_at: timestamp,
    updated_at: updatedTimestamp,
  };
}

export function resolveMascotStyle(profile: MascotProfile, styleId?: string | null): MascotStyle {
  if (profile.styles && profile.styles.length > 0) {
    if (styleId) {
      const match = profile.styles.find((s) => s.id === styleId);
      if (match) return match;
    }
    if (profile.active_style_id) {
      const activeMatch = profile.styles.find((s) => s.id === profile.active_style_id);
      if (activeMatch) return activeMatch;
    }
    const defaultMatch = profile.styles.find((s) => s.is_default);
    if (defaultMatch) return defaultMatch;
    const coreMatch = profile.styles.find((s) => s.id === "core");
    if (coreMatch) return coreMatch;
    return profile.styles[0];
  }

  return synthesizeLegacyCoreStyle(profile);
}

export const RECOMMENDED_MASCOT_PLACEMENT_PRESET = {
  position: "bottom_left",
  scale: 2.31,
  offset_x: 127,
  offset_y: 119,
  flip_x: false,
} as const;

export const RECOMMENDED_MASCOT_PLACEMENT_PRESET_16_9 = { ...RECOMMENDED_MASCOT_PLACEMENT_PRESET };
export const RECOMMENDED_MASCOT_PLACEMENT_PRESET_9_16 = { ...RECOMMENDED_MASCOT_PLACEMENT_PRESET };

export const MascotPlacementPresetSchema = z.object({
  position: z.enum(["bottom_left", "bottom_right"]).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position),
  scale: z.number().min(0.3).max(10).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale),
  offset_x: z.number().int().min(-1500).max(1500).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x),
  offset_y: z.number().int().min(-1500).max(1500).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y),
  flip_x: z.boolean().default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.flip_x),
});

export type MascotPlacementPreset = z.infer<typeof MascotPlacementPresetSchema>;

export const RECOMMENDED_MASCOT_PLACEMENT_PRESETS: Record<"16:9" | "9:16", MascotPlacementPreset> = {
  "16:9": RECOMMENDED_MASCOT_PLACEMENT_PRESET_16_9,
  "9:16": RECOMMENDED_MASCOT_PLACEMENT_PRESET_9_16,
};

export const ChannelMascotConfigSchema = z.object({
  enabled: z.boolean().default(true),
  position: z.enum(["bottom_left", "bottom_right"]).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position),
  scale: z.number().default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale),
  offset_x: z.number().default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x),
  offset_y: z.number().default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y),
  flip_x: z.boolean().default(false),
  show_in_intro: z.boolean().default(false),
  show_in_outro: z.boolean().default(false),
  show_in_question: z.boolean().default(true),
  placements: z
    .object({
      "16:9": MascotPlacementPresetSchema.optional(),
    })
    .strict()
    .optional(),
  mascot_style_id: z.string().optional(),
});

export type ChannelMascotConfig = z.infer<typeof ChannelMascotConfigSchema>;

export function resolveChannelMascotPlacement(
  config: Partial<ChannelMascotConfig> | ChannelMascotConfig | null | undefined,
  aspectRatio: "16:9" | "9:16",
): MascotPlacementPreset {
  const explicit = aspectRatio === "16:9" ? config?.placements?.["16:9"] : undefined;
  if (explicit) {
    return {
      position: explicit.position,
      scale: explicit.scale,
      offset_x: explicit.offset_x,
      offset_y: explicit.offset_y,
      flip_x: explicit.flip_x,
    };
  }

  return {
    position: config?.position ?? RECOMMENDED_MASCOT_PLACEMENT_PRESET.position,
    scale: config?.scale ?? RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale,
    offset_x: config?.offset_x ?? RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x,
    offset_y: config?.offset_y ?? RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y,
    flip_x: config?.flip_x ?? false,
  };
}

export const MascotStageSettingsSchema = z.object({
  default_placement: MascotPlacementPresetSchema.default(RECOMMENDED_MASCOT_PLACEMENT_PRESET),
  default_placements: z.object({ "16:9": MascotPlacementPresetSchema.optional() }).strict().optional(),
});

export type MascotStageSettings = z.infer<typeof MascotStageSettingsSchema>;

export function resolveMascotStageDefaultPlacement(
  settings: Partial<MascotStageSettings> | MascotStageSettings | null | undefined,
  aspectRatio: "16:9",
): MascotPlacementPreset {
  const explicit = settings?.default_placements?.[aspectRatio];
  if (explicit) {
    return {
      position: explicit.position,
      scale: explicit.scale,
      offset_x: explicit.offset_x,
      offset_y: explicit.offset_y,
      flip_x: explicit.flip_x,
    };
  }

  if (settings?.default_placement && aspectRatio === "16:9") {
    return {
      position: settings.default_placement.position,
      scale: settings.default_placement.scale,
      offset_x: settings.default_placement.offset_x,
      offset_y: settings.default_placement.offset_y,
      flip_x: settings.default_placement.flip_x,
    };
  }

  return { ...RECOMMENDED_MASCOT_PLACEMENT_PRESETS[aspectRatio] };
}

export const MascotUploadMimeTypeSchema = z.enum(["image/png", "image/jpeg", "image/webp"]);
export type MascotUploadMimeType = z.infer<typeof MascotUploadMimeTypeSchema>;

export const UploadMascotConceptInputSchema = z.object({
  image_data: z.string().min(1),
  mime_type: MascotUploadMimeTypeSchema.optional(),
  auto_matting: z.boolean().default(true).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color_theme: z.string().optional(),
  visual_style: QuizImageStyleSchema.optional(),
});

export type UploadMascotConceptInput = z.infer<typeof UploadMascotConceptInputSchema>;
export type UploadMascotConceptRequest = z.input<typeof UploadMascotConceptInputSchema>;

export const UploadMascotConceptResponseSchema = z.object({
  mascot: MascotProfileSchema,
  master_image_url: z.string(),
  master_raw_image_url: z.string().optional().nullable(),
  extracted_color: z.string().optional(),
  extracted_tags: z.array(z.string()).optional(),
});

export type UploadMascotConceptResponse = z.infer<typeof UploadMascotConceptResponseSchema>;

export const MascotVisionAnalysisResultSchema = z.object({
  subject: z.string(),
  dominant_color: z.string(),
  palette: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  suggested_master_prompt: z.string().default(""),
  suggested_visual_style: QuizImageStyleSchema.default("pixar_3d"),
  source: z.enum(["ai_vision", "local_fallback"]),
  confidence: z.number().min(0).max(1).optional(),
});

export type MascotVisionAnalysisResult = z.infer<typeof MascotVisionAnalysisResultSchema>;

export const AnalyzeMascotConceptInputSchema = z
  .object({
    force_ai: z.boolean().optional(),
    save: z.boolean().optional(),
  })
  .optional();

export type AnalyzeMascotConceptInput = z.infer<typeof AnalyzeMascotConceptInputSchema>;

export const AnalyzeMascotConceptResponseSchema = z.object({
  mascot_id: z.string(),
  analysis: MascotVisionAnalysisResultSchema,
  extracted_color: z.string(),
  extracted_tags: z.array(z.string()),
});

export type AnalyzeMascotConceptResponse = z.infer<typeof AnalyzeMascotConceptResponseSchema>;

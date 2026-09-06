import { z } from "zod";
import {
  MascotActionTypeSchema,
  MascotMotionIntensity,
  MascotMotionIntensitySchema,
  MascotMotionPreset,
  MascotMotionPresetSchema,
  QuizImageStyleSchema,
} from "../enums.js";
import { MascotRenderBundleV2Schema } from "../mascot/renderSchema.js";
import { IsoDate } from "./common.js";

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

export type MascotSpriteAction = z.infer<typeof MascotSpriteActionSchema>;

export const MascotStateVariantSchema = z.object({
  id: z.string().min(1),
  slot_index: z.number().int().min(1).max(10),
  image_url: z.string().default(""),
  prompt_modifier: z.string().optional(),
  motion_preset: MascotMotionPresetSchema.optional(),
  motion_speed: z.number().optional(),
  motion_intensity: MascotMotionIntensitySchema.optional(),
  created_at: z.string().optional(),
});

export type MascotStateVariant = z.infer<typeof MascotStateVariantSchema>;

export const MascotStyleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  keyword: z.string().default(""),
  anchor_image_url: z.string().nullable().default(null),
  is_default: z.boolean().default(false),
  states: z.object({
    thinking: z.array(MascotStateVariantSchema).default([]),
    celebrate: z.array(MascotStateVariantSchema).default([]),
  }),
  created_at: z.string(),
  updated_at: z.string(),
});

export type MascotStyle = Omit<z.infer<typeof MascotStyleSchema>, "anchor_image_url"> & {
  anchor_image_url?: string | null;
};

export const MascotProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  visual_style: QuizImageStyleSchema.default("pixar_3d"),
  master_prompt: z.string().default(""),
  master_image_url: z.string().nullable().default(null),
  color_theme: z.string().default("#06b6d4"),
  actions: z.record(MascotActionTypeSchema, MascotSpriteActionSchema.nullable().optional()).default({}),
  styles: z.array(MascotStyleSchema).default([]),
  active_style_id: z.string().optional(),
  /** Persisted V2 render data; absent on V1 manifests until migration. */
  schema_version: z.number().int().positive().optional(),
  render_bundle: MascotRenderBundleV2Schema.optional(),
  assigned_channel_ids: z.array(z.string()).default([]),
  created_at: IsoDate,
  updated_at: IsoDate,
});

export type MascotProfile = Omit<z.infer<typeof MascotProfileSchema>, "styles"> & {
  styles?: MascotStyle[];
};

export function synthesizeLegacyCoreStyle(profile: Partial<MascotProfile> | MascotProfile): MascotStyle {
  const thinkingAction = profile.actions?.thinking;
  const celebrateAction = profile.actions?.celebrate;

  const thinkingVariants: MascotStateVariant[] = [];
  if (thinkingAction) {
    thinkingVariants.push({
      id: "slot_1",
      slot_index: 1,
      image_url: thinkingAction.preview_url || thinkingAction.sprite_url || "",
      motion_preset: thinkingAction.motion_preset ?? "sway",
      motion_speed: thinkingAction.motion_speed ?? 1.0,
      motion_intensity: thinkingAction.motion_intensity ?? "normal",
      created_at: profile.created_at,
    });
  }

  const celebrateVariants: MascotStateVariant[] = [];
  if (celebrateAction) {
    celebrateVariants.push({
      id: "slot_1",
      slot_index: 1,
      image_url: celebrateAction.preview_url || celebrateAction.sprite_url || "",
      motion_preset: celebrateAction.motion_preset ?? "jump",
      motion_speed: celebrateAction.motion_speed ?? 1.0,
      motion_intensity: celebrateAction.motion_intensity ?? "normal",
      created_at: profile.created_at,
    });
  }

  const timestamp = typeof profile.created_at === "string" && profile.created_at ? profile.created_at : new Date().toISOString();
  const updatedTimestamp = typeof profile.updated_at === "string" && profile.updated_at ? profile.updated_at : timestamp;

  return {
    id: "core",
    name: "Core Style",
    keyword: "",
    anchor_image_url: profile.master_image_url || null,
    is_default: true,
    states: {
      thinking: thinkingVariants,
      celebrate: celebrateVariants,
    },
    created_at: timestamp,
    updated_at: updatedTimestamp,
  };
}

export function resolveMascotStyle(
  profile: MascotProfile,
  styleId?: string | null,
): MascotStyle {
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
  scale: 1.84,
  offset_x: 67,
  offset_y: 90,
  flip_x: false,
} as const;

export const RECOMMENDED_MASCOT_PLACEMENT_PRESET_16_9 = { ...RECOMMENDED_MASCOT_PLACEMENT_PRESET };
export const RECOMMENDED_MASCOT_PLACEMENT_PRESET_9_16 = { ...RECOMMENDED_MASCOT_PLACEMENT_PRESET };

export const MascotPlacementPresetSchema = z.object({
  position: z.enum(["bottom_left", "bottom_right"]).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position),
  scale: z.number().min(0.3).max(3).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale),
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
  position: z.enum(["bottom_left", "bottom_right"]).default("bottom_left"),
  scale: z.number().default(1.0),
  offset_x: z.number().default(0),
  offset_y: z.number().default(0),
  flip_x: z.boolean().default(false),
  show_in_intro: z.boolean().default(false),
  show_in_outro: z.boolean().default(false),
  show_in_question: z.boolean().default(true),
  placements: z.record(z.enum(["16:9", "9:16"]), MascotPlacementPresetSchema).optional(),
  mascot_style_id: z.string().optional(),
});

export type ChannelMascotConfig = z.infer<typeof ChannelMascotConfigSchema>;

export function resolveChannelMascotPlacement(
  config: Partial<ChannelMascotConfig> | ChannelMascotConfig | null | undefined,
  aspectRatio: "16:9" | "9:16",
): MascotPlacementPreset {
  const explicit = config?.placements?.[aspectRatio];
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
    position: config?.position ?? "bottom_left",
    scale: config?.scale ?? 1.0,
    offset_x: config?.offset_x ?? 0,
    offset_y: config?.offset_y ?? 0,
    flip_x: config?.flip_x ?? false,
  };
}

export const MascotStageSettingsSchema = z.object({
  default_placement: MascotPlacementPresetSchema.default(RECOMMENDED_MASCOT_PLACEMENT_PRESET),
  default_placements: z.record(z.enum(["16:9", "9:16"]), MascotPlacementPresetSchema).optional(),
});

export type MascotStageSettings = z.infer<typeof MascotStageSettingsSchema>;

export function resolveMascotStageDefaultPlacement(
  settings: Partial<MascotStageSettings> | MascotStageSettings | null | undefined,
  aspectRatio: "16:9" | "9:16",
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

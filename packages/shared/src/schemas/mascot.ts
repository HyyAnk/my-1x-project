import { z } from "zod";
import { MascotActionTypeSchema, QuizImageStyleSchema } from "../enums.js";
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

export const MascotProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  visual_style: QuizImageStyleSchema.default("pixar_3d"),
  master_prompt: z.string().default(""),
  master_image_url: z.string().nullable().default(null),
  color_theme: z.string().default("#06b6d4"),
  actions: z.record(MascotActionTypeSchema, MascotSpriteActionSchema.nullable().optional()).default({}),
  /** Persisted V2 render data; absent on V1 manifests until migration. */
  schema_version: z.number().int().positive().optional(),
  render_bundle: MascotRenderBundleV2Schema.optional(),
  assigned_channel_ids: z.array(z.string()).default([]),
  created_at: IsoDate,
  updated_at: IsoDate,
});

export type MascotProfile = z.infer<typeof MascotProfileSchema>;

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
});

export type ChannelMascotConfig = z.infer<typeof ChannelMascotConfigSchema>;

export const RECOMMENDED_MASCOT_PLACEMENT_PRESET = {
  position: "bottom_left",
  scale: 1.84,
  offset_x: 67,
  offset_y: 90,
  flip_x: false,
} as const;

export const MascotPlacementPresetSchema = z.object({
  position: z.enum(["bottom_left", "bottom_right"]).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position),
  scale: z.number().min(0.3).max(3).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale),
  offset_x: z.number().int().min(-1500).max(1500).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x),
  offset_y: z.number().int().min(-1500).max(1500).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y),
  flip_x: z.boolean().default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.flip_x),
});

export type MascotPlacementPreset = z.infer<typeof MascotPlacementPresetSchema>;

export const MascotStageSettingsSchema = z.object({
  default_placement: MascotPlacementPresetSchema.default(RECOMMENDED_MASCOT_PLACEMENT_PRESET),
});

export type MascotStageSettings = z.infer<typeof MascotStageSettingsSchema>;

import { z } from "zod";
import { MascotActionTypeSchema, MascotMotionIntensitySchema, MascotMotionPresetSchema, QuizImageStyleSchema } from "../enums.js";
import { ChannelMascotConfigSchema, MascotPlacementPresetSchema, MascotProfileSchema, MascotStyleSchema } from "../schemas.js";

export const CalibrateMascotActionInputSchema = z.object({
  offset_x: z.number().min(-5000).max(5000).optional().default(0),
  offset_y: z.number().min(-5000).max(5000).optional().default(0),
  motion_preset: z.enum(["breathe", "sway", "jump", "shake", "wave", "point", "pulse", "float", "none"]).optional(),
  motion_speed: z.number().min(0.1).max(5).optional(),
  motion_intensity: z.enum(["subtle", "normal", "dynamic"]).optional(),
  fps: z.number().min(1).max(60).optional(),
  loop: z.boolean().optional(),
});

export type CalibrateMascotActionInput = z.infer<typeof CalibrateMascotActionInputSchema>;
export type CalibrateMascotActionRequest = z.input<typeof CalibrateMascotActionInputSchema>;

export const CreateMascotInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  visual_style: QuizImageStyleSchema.optional().default("pixar_3d"),
  master_prompt: z.string().optional().default(""),
  color_theme: z.string().optional().default("#06b6d4"),
});

export type CreateMascotInput = z.infer<typeof CreateMascotInputSchema>;

export const UpdateMascotInputSchema = MascotProfileSchema.partial();
export type UpdateMascotInput = z.infer<typeof UpdateMascotInputSchema>;

export const GenerateMascotConceptInputSchema = z.object({
  prompt: z.string().optional(),
  style: QuizImageStyleSchema.optional(),
});

export type GenerateMascotConceptInput = z.infer<typeof GenerateMascotConceptInputSchema>;

export const GenerateMascotSpriteInputSchema = z.object({
  action: MascotActionTypeSchema,
  prompt: z.string().optional(),
  frames_count: z.number().int().min(1).max(16).optional().default(1),
  fps: z.number().min(1).max(30).optional().default(8),
  loop: z.boolean().optional().default(true),
});

export type GenerateMascotSpriteInput = z.infer<typeof GenerateMascotSpriteInputSchema>;

export const UploadMascotSpriteInputSchema = z.object({
  action: MascotActionTypeSchema,
  data: z.string().min(1),
  frames_count: z.number().int().min(1).max(32).default(1),
  fps: z.number().min(1).max(30).default(8),
  loop: z.boolean().default(true),
  frame_width: z.number().int().min(32).max(2048).default(512),
  frame_height: z.number().int().min(32).max(2048).default(512),
  motion_preset: z.enum(["breathe", "sway", "jump", "shake", "wave", "point", "none"]).optional(),
});

export type UploadMascotSpriteInput = z.infer<typeof UploadMascotSpriteInputSchema>;

export const MascotMigrationInputSchema = z.object({
  mode: z.enum(["dry_run", "apply", "rollback"]).default("dry_run"),
  migration_id: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/)
    .optional(),
  mascot_id: z.string().trim().min(1).optional(),
});

export type MascotMigrationInput = z.infer<typeof MascotMigrationInputSchema>;

export const RemoveMascotBackgroundInputSchema = z.object({
  target: z.enum(["master", "all", "wave", "idle", "thinking", "point", "celebrate", "oops", "outro"]).optional().default("all"),
});

export type RemoveMascotBackgroundInput = z.infer<typeof RemoveMascotBackgroundInputSchema>;

export const AssignMascotInputSchema = z.object({
  mascot_id: z.string().nullable(),
  config: ChannelMascotConfigSchema.partial().optional(),
});

export type AssignMascotInput = z.infer<typeof AssignMascotInputSchema>;

export const MascotStageSettingsInputSchema = z.object({
  default_placement: MascotPlacementPresetSchema.optional(),
  default_placements: z.object({ "16:9": MascotPlacementPresetSchema.optional() }).strict().optional(),
});

export type MascotStageSettingsInput = z.infer<typeof MascotStageSettingsInputSchema>;

export const CreateMascotStyleInputSchema = z.object({
  name: z.string().min(1),
  keyword: z.string().default(""),
});

export type CreateMascotStyleInput = z.infer<typeof CreateMascotStyleInputSchema>;

export const UpdateMascotStyleInputSchema = z.object({
  name: z.string().optional(),
  keyword: z.string().optional(),
});

export type UpdateMascotStyleInput = z.infer<typeof UpdateMascotStyleInputSchema>;

export const GenerateMascotSlotInputSchema = z.object({
  style_id: z.string().min(1),
  state: z.enum(["thinking", "celebrate"]),
  slot_index: z.number().int().min(1).max(10),
  prompt_modifier: z.string().optional(),
});

export type GenerateMascotSlotInput = z.infer<typeof GenerateMascotSlotInputSchema>;

export const BatchGenerateStyleSlotsInputSchema = z.object({
  style_id: z.string().min(1),
  state: z.enum(["thinking", "celebrate", "all"]).default("all"),
});

export type BatchGenerateStyleSlotsInput = z.infer<typeof BatchGenerateStyleSlotsInputSchema>;

export const UpdateMascotSlotInputSchema = z.object({
  style_id: z.string().min(1),
  state: z.enum(["thinking", "celebrate"]),
  slot_index: z.number().int().min(1).max(10),
  image_url: z.string().optional(),
  prompt_modifier: z.string().optional(),
  motion_preset: MascotMotionPresetSchema.optional(),
  motion_speed: z.number().optional(),
  motion_intensity: MascotMotionIntensitySchema.optional(),
});

export type UpdateMascotSlotInput = z.infer<typeof UpdateMascotSlotInputSchema>;

export const GenerateMascotStyleConceptRequestSchema = z.object({
  prompt: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});

export type GenerateMascotStyleConceptRequest = z.infer<typeof GenerateMascotStyleConceptRequestSchema>;

export const GenerateMascotStyleConceptResponseSchema = z.object({
  style: MascotStyleSchema,
  mascot: MascotProfileSchema,
});

export type GenerateMascotStyleConceptResponse = z.infer<typeof GenerateMascotStyleConceptResponseSchema>;

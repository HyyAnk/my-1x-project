import { z } from "zod";

export const StylePresetSlotsSchema = z.object({
  thinking_bar_style: z.string().min(1),
  question_box_style: z.string().min(1),
  answer_card_style: z.string().min(1),
  counter_style: z.string().min(1),
  background_style: z.string().min(1),
});

export const StylePresetSchema = StylePresetSlotsSchema.extend({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1000),
  icon: z.string().max(16),
  theme: z.string().min(1),
  palette_id: z.string().min(1),
  preview_layout_id: z.string().optional(),
  mascot_id: z.string().nullable().optional(),
  mascot_position: z.enum(["bottom_left", "bottom_right"]).optional(),
  mascot_scale: z.number().finite().optional(),
  mascot_offset_x: z.number().finite().optional(),
  mascot_offset_y: z.number().finite().optional(),
  mascot_flip_x: z.boolean().optional(),
  channel_brand_name: z.string().max(200).optional(),
  revision: z.number().int().positive(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateStylePresetInputSchema = StylePresetSlotsSchema.extend({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1000).optional().default(""),
  icon: z.string().max(16).optional().default("🎨"),
  theme: z.string().min(1).default("candy_arcade"),
  palette_id: z.string().min(1),
  preview_layout_id: z.string().optional(),
  mascot_id: z.string().nullable().optional(),
  mascot_position: z.enum(["bottom_left", "bottom_right"]).optional(),
  mascot_scale: z.number().finite().optional(),
  mascot_offset_x: z.number().finite().optional(),
  mascot_offset_y: z.number().finite().optional(),
  mascot_flip_x: z.boolean().optional(),
  channel_brand_name: z.string().max(200).optional(),
});

export const UpdateStylePresetInputSchema = CreateStylePresetInputSchema.partial().extend({
  name: z.string().trim().min(1).max(120).optional(),
});

export type StylePresetSlots = z.infer<typeof StylePresetSlotsSchema>;
export type StylePreset = z.infer<typeof StylePresetSchema>;
export type CreateStylePresetInput = z.infer<typeof CreateStylePresetInputSchema>;
export type UpdateStylePresetInput = z.infer<typeof UpdateStylePresetInputSchema>;
export type StylePresetListResponse = { presets: StylePreset[] };
export type StylePresetResponse = { preset: StylePreset };

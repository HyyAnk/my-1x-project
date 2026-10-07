import { z } from "zod";
import {
  MotionTemplateIdSchema,
  MotionTemplateOptionsSchema,
  MotionTemplatePlacementSchema,
} from "../motionTemplates/motionTemplate.schemas.js";
import { MascotRenderAspectRatioSchema } from "../mascot/renderSchema.js";
import type { MascotRenderAspectRatio } from "../mascot/renderTypes.js";
import type {
  MotionTemplateDefinition,
  MotionTemplateId,
  MotionTemplateOptions,
  MotionTemplatePlacement,
} from "../motionTemplates/motionTemplate.types.js";

export const MotionPreviewMarkupRequestSchema = z.object({
  templateId: MotionTemplateIdSchema,
  options: MotionTemplateOptionsSchema.optional(),
  topicTitle: z.string().optional(),
  channelName: z.string().optional(),
  aspectRatio: MascotRenderAspectRatioSchema.optional().default("16:9"),
  durationSeconds: z.number().positive().optional(),
});

export type MotionPreviewMarkupRequest = z.infer<typeof MotionPreviewMarkupRequestSchema>;

export const MotionPreviewMarkupResponseSchema = z.object({
  html: z.string(),
  templateId: MotionTemplateIdSchema,
  durationSeconds: z.number(),
  aspectRatio: MascotRenderAspectRatioSchema,
});

export type MotionPreviewMarkupResponse = z.infer<typeof MotionPreviewMarkupResponseSchema>;

export const ChannelMotionPresetSchema = z.object({
  id: z.string().min(1),
  channelId: z.string().min(1),
  name: z.string().min(1),
  placement: MotionTemplatePlacementSchema,
  templateId: MotionTemplateIdSchema,
  options: MotionTemplateOptionsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChannelMotionPreset = z.infer<typeof ChannelMotionPresetSchema>;

export const SaveChannelMotionPresetRequestSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  placement: MotionTemplatePlacementSchema,
  templateId: MotionTemplateIdSchema,
  options: MotionTemplateOptionsSchema,
});

export type SaveChannelMotionPresetRequest = z.infer<typeof SaveChannelMotionPresetRequestSchema>;

export const ChannelMotionPresetsResponseSchema = z.object({
  channelId: z.string(),
  presets: z.array(ChannelMotionPresetSchema),
});

export type ChannelMotionPresetsResponse = z.infer<typeof ChannelMotionPresetsResponseSchema>;

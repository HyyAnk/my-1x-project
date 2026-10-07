import { z } from "zod";
import {
  MotionTemplateIdSchema,
  MotionTemplateOptionsSchema,
  MotionTemplatePlacementSchema,
} from "./motionTemplate.schemas.js";

export const MotionPromptStyleMoodSchema = z.enum([
  "cyberpunk",
  "high_energy",
  "minimal_luxury",
  "arcade_playful",
  "epic_cinematic",
  "educational_clean",
]);

export const MotionPromptRequestSchema = z.object({
  topicTitle: z.string().min(1),
  channelName: z.string().optional(),
  placement: MotionTemplatePlacementSchema.optional().default("intro"),
  mood: MotionPromptStyleMoodSchema.optional(),
  preferredTemplateId: MotionTemplateIdSchema.optional(),
  targetDurationSeconds: z.number().positive().optional(),
  audienceAgeBand: z.enum(["4-6", "7-9", "10-12", "family", "general"]).optional(),
  mascotName: z.string().optional(),
  hasCustomLogo: z.boolean().optional(),
});

export const MotionPromptOutputSchema = z.object({
  recommendedTemplateId: MotionTemplateIdSchema,
  placement: MotionTemplatePlacementSchema,
  mood: MotionPromptStyleMoodSchema,
  generatedOptions: MotionTemplateOptionsSchema,
  animationPhilosophy: z.string().min(1),
  llmPromptRecipe: z.string().min(1),
});

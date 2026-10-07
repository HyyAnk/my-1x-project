import { z } from "zod";
import type {
  MotionTemplateCategory,
  MotionTemplateDefinition,
  MotionTemplateId,
  MotionTemplateOptions,
  MotionTemplatePlacement,
} from "./motionTemplate.types.js";

export const MotionTemplatePlacementSchema: z.ZodType<MotionTemplatePlacement> = z.enum(["intro", "outro", "both"]);

export const MotionTemplateCategorySchema: z.ZodType<MotionTemplateCategory> = z.enum([
  "kinetic",
  "cyber",
  "minimal",
  "gamified",
]);

export const MotionTemplateIdSchema: z.ZodType<MotionTemplateId> = z.enum([
  "kinetic_punch",
  "cyber_neon",
  "minimal_sleek",
  "interactive_cta",
  "scorecard_recap",
]);

export const MotionTemplateOptionsSchema: z.ZodType<MotionTemplateOptions> = z.object({
  accentColor: z.string().trim().min(1).optional(),
  headlineText: z.string().trim().max(100).optional(),
  subheadlineText: z.string().trim().max(200).optional(),
  showMascot: z.boolean().optional(),
  showParticles: z.boolean().optional(),
  soundEffectCue: z.boolean().optional(),
  customParameters: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const MotionTemplateDefinitionSchema: z.ZodType<MotionTemplateDefinition> = z.object({
  id: MotionTemplateIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  placement: MotionTemplatePlacementSchema,
  category: MotionTemplateCategorySchema,
  defaultDurationSeconds: z.number().positive().max(10),
  minDurationSeconds: z.number().positive(),
  maxDurationSeconds: z.number().positive().max(15),
});

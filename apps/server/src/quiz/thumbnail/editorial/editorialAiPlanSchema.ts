import { z } from "zod";
import { ThumbnailLayoutTypeSchema } from "@studio/shared";

const text = z.string().trim().max(800);
const persona = z.object({
  role: text.optional(),
  costume: text.optional(),
  prop: text.optional(),
  expression: text.optional(),
  poseDescription: text.optional(),
  dramaticHook: text.optional(),
});

export const EditorialAiPlanSchema = z.object({
  hook_text: z.string().trim().max(200).optional(),
  badge_text: z.string().max(100).optional(),
  layout: ThumbnailLayoutTypeSchema.optional(),
  headline_style: z.string().trim().max(60).optional(),
  environment_atmosphere: text.optional(),
  mascot_persona: persona.optional(),
  mascot_persona_variations: z
    .array(persona.extend({ id: z.number().int().optional(), archetypeId: z.number().int().optional(), archetypeName: text.optional() }))
    .max(5)
    .optional(),
  subject_anchors: z
    .array(
      z.object({
        label: text.optional(),
        visualPrompt: text.min(1),
      }),
    )
    .min(1)
    .max(4),
});

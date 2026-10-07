import { z } from "zod";
import { ThumbnailLayoutTypeSchema } from "@studio/shared";

const text = z.string().trim().max(800);
export const EditorialAiPlanSchema = z.object({
  hook_text: z.string().trim().max(200).optional(),
  badge_text: z.string().max(100).optional(),
  layout: ThumbnailLayoutTypeSchema.optional(),
  mascot_persona: z
    .object({
      role: text.optional(),
      costume: text.optional(),
      prop: text.optional(),
      expression: text.optional(),
      poseDescription: text.optional(),
    })
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

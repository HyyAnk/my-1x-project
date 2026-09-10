import { z } from "zod";

export const TransitionCategorySchema = z.enum(["intro_outro", "scene", "universal"]);
export type TransitionCategory = z.infer<typeof TransitionCategorySchema>;

export const IntroOutroTransitionIdSchema = z.enum(["stinger_swipe", "crossfade", "cut"]);
export type IntroOutroTransitionId = z.infer<typeof IntroOutroTransitionIdSchema>;

export const SceneTransitionIdSchema = z.enum(["bubble_splash", "brush_wave", "lightning_brush"]);
export type SceneTransitionId = z.infer<typeof SceneTransitionIdSchema>;

export interface TransitionDefinition {
  id: string;
  name: string;
  description: string;
  category: TransitionCategory;
  defaultDuration: number;
  minDuration: number;
  maxDuration: number;
  cssClass: string;
  tag?: string;
  iconName?: string;
}

export const TransitionDefinitionSchema: z.ZodType<TransitionDefinition> = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    category: TransitionCategorySchema,
    defaultDuration: z.number().nonnegative(),
    minDuration: z.number().nonnegative(),
    maxDuration: z.number().nonnegative(),
    cssClass: z.string().min(1),
    tag: z.string().optional(),
    iconName: z.string().optional(),
  })
  .refine((data) => data.minDuration <= data.maxDuration, {
    message: "minDuration must be less than or equal to maxDuration",
  })
  .refine((data) => data.defaultDuration >= data.minDuration && data.defaultDuration <= data.maxDuration, {
    message: "defaultDuration must be within [minDuration, maxDuration]",
  });

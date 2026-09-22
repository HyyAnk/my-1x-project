import { z } from "zod";
import { MascotCapabilityIdSchema } from "./identity.js";

export const IntroOutroClipKindSchema = z.enum(["intro", "outro"]);
export type IntroOutroClipKind = z.infer<typeof IntroOutroClipKindSchema>;

export const CreativeSeedDimensionSchema = z.enum([
  "intro_entrance",
  "intro_brand_interaction",
  "intro_performance_tone",
  "intro_verbal_hook",
  "outro_recognition",
  "outro_invitation",
  "outro_farewell",
]);

export type CreativeSeedDimension = z.infer<typeof CreativeSeedDimensionSchema>;

export const CreativeSeedSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    revision: z.number().int().positive(),
    dimension: CreativeSeedDimensionSchema,
    clip_kind: IntroOutroClipKindSchema,
    name: z.string().trim().min(1).max(80),
    narrative_intent: z.string().trim().min(1).max(600),
    required_capabilities: z.array(MascotCapabilityIdSchema).max(6).default([]),
    style_tags: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
    allowed_props: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
    allowed_text: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
    forbidden_seed_ids: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    complexity: z.enum(["low", "medium", "high"]).default("low"),
    selection_weight: z.number().positive().max(100).default(1),
    origin: z.enum(["built_in", "custom"]),
    status: z.enum(["active", "archived"]).default("active"),
  })
  .strict();

export type CreativeSeed = z.infer<typeof CreativeSeedSchema>;

export const IntroOutroSeedSelectionSchema = z
  .object({
    randomization_seed: z.string().trim().min(1).max(120),
    selected_seed_ids: z.array(z.string().trim().min(1).max(80)).max(7),
    locked_dimensions: z.array(CreativeSeedDimensionSchema).max(7).default([]),
    algorithm_version: z.literal("1"),
  })
  .strict();

export type IntroOutroSeedSelection = z.infer<typeof IntroOutroSeedSelectionSchema>;

export const INTRO_SEED_DIMENSIONS = [
  "intro_entrance",
  "intro_brand_interaction",
  "intro_performance_tone",
  "intro_verbal_hook",
] as const satisfies readonly CreativeSeedDimension[];

export const OUTRO_SEED_DIMENSIONS = [
  "outro_recognition",
  "outro_invitation",
  "outro_farewell",
] as const satisfies readonly CreativeSeedDimension[];

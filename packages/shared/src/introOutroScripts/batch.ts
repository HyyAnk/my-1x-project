import { z } from "zod";
import { IntroOutroClipKindSchema } from "./seeds.js";

export const BatchGenerateIntroOutroScriptsInputSchema = z
  .object({
    style_preset_id: z.string().trim().min(1),
    mascot_style_id: z.string().trim().min(1).optional(),
    count: z.number().int().min(1).max(20).default(5),
    strategy: z.enum(["random_seeds", "locked_anchor"]).default("random_seeds"),
    locked_seed_ids: z.array(z.string().trim().min(1)).default([]),
    durations: z
      .object({
        intro: z.number().int().min(6).max(10).default(8),
        outro: z.number().int().min(6).max(10).default(8),
      })
      .default({ intro: 8, outro: 8 }),
    included_clips: z.array(IntroOutroClipKindSchema).min(1).default(["intro", "outro"]),
    logo_mode: z.enum(["supplied_reference", "post_overlay", "none"]).default("supplied_reference"),
    naming_prefix: z.string().trim().max(60).optional(),
  })
  .strict();

export type BatchGenerateIntroOutroScriptsInput = z.infer<typeof BatchGenerateIntroOutroScriptsInputSchema>;

export const BatchGenerateIntroOutroScriptsResponseSchema = z
  .object({
    batch_id: z.string().trim().min(1),
    channel_id: z.string().trim().min(1),
    style_preset_id: z.string().trim().min(1),
    total_jobs: z.number().int().nonnegative(),
    project_ids: z.array(z.string().trim().min(1)),
    job_ids: z.array(z.string().trim().min(1)),
  })
  .strict();

export type BatchGenerateIntroOutroScriptsResponse = z.infer<typeof BatchGenerateIntroOutroScriptsResponseSchema>;

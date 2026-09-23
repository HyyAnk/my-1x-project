import { z } from "zod";
import { ReelArchetypeSchema } from "../shortReelSource.schema.js";

export const ReelScriptSeedIdSchema = z.enum([
  // Versus Faceoff (2 options - duel / head-to-head)
  "vf_arena_clash",
  "vf_tale_of_the_tape",
  "vf_david_vs_goliath",
  "vf_simulation_challenge",
  // Deep Trivia (3 options - mystery / curious knowledge)
  "dt_mystery_investigation",
  "dt_counter_intuitive_trap",
  "dt_elimination_showdown",
  "dt_origin_flashback",
  // True / False (2 options - verdict fact vs myth)
  "tf_mythbusters_lab",
  "tf_everyday_deception",
  "tf_courtroom_verdict",
  "tf_extreme_fact_check",
]);

export type ReelScriptSeedId = z.infer<typeof ReelScriptSeedIdSchema>;

export const ReelScriptSeedBeatsSchema = z
  .object({
    segment_1: z.string().trim().min(1).max(500),
    segment_2: z.string().trim().min(1).max(500),
    segment_3: z.string().trim().min(1).max(500),
  })
  .strict();

export type ReelScriptSeedBeats = z.infer<typeof ReelScriptSeedBeatsSchema>;

export const ReelScriptSeedSchema = z
  .object({
    id: ReelScriptSeedIdSchema,
    archetype: ReelArchetypeSchema,
    name: z.string().trim().min(1).max(80),
    tagline: z.string().trim().min(1).max(120),
    narrative_intent: z.string().trim().min(1).max(600),
    visual_staging_guidance: z.string().trim().min(1).max(600),
    segment_beats: ReelScriptSeedBeatsSchema,
    pacing_tone: z.string().trim().min(1).max(300),
    preferred_ending_motifs: z.array(z.string().trim().min(1).max(80)).min(1).max(5),
  })
  .strict();

export type ReelScriptSeed = z.infer<typeof ReelScriptSeedSchema>;

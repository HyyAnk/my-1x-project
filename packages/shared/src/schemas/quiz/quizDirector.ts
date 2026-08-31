import { z } from "zod";
import {
  DirectorArchetypeSchema,
  DirectorAssetIntentSchema,
  DirectorBeatIntentSchema,
  DirectorEnergySchema,
  DirectorVisualDensitySchema,
  MascotStateSchema,
  QuizAnswerCardStyleSchema,
  QuizBackgroundStyleSchema,
  QuizLayoutIdSchema,
  QuizMotionIdSchema,
  QuizPaletteIdSchema,
  QuizQuestionBoxStyleSchema,
  QuizQuestionCounterStyleSchema,
  QuizThinkingBarStyleSchema,
  QuizTransitionIdSchema,
  RewardIntensitySchema,
  SfxIntentSchema,
  TransitionIntentSchema,
} from "../../enums.js";
import { QUIZ_MAX_QUESTION_COUNT } from "../common.js";

export const DirectorBeatSchema = z
  .object({
    question_id: z.string().min(1),
    archetype: DirectorArchetypeSchema,
    energy: DirectorEnergySchema,
    visual_density: DirectorVisualDensitySchema,
    palette_id: QuizPaletteIdSchema.default("auto"),
    layout_id: QuizLayoutIdSchema.default("auto"),
    motion_id: QuizMotionIdSchema.default("auto"),
    transition_id: QuizTransitionIdSchema.default("auto"),
    thinking_bar_style: QuizThinkingBarStyleSchema.default("auto"),
    question_counter_style: QuizQuestionCounterStyleSchema.default("auto"),
    question_box_style: QuizQuestionBoxStyleSchema.default("auto"),
    answer_card_style: QuizAnswerCardStyleSchema.default("auto"),
    background_style: QuizBackgroundStyleSchema.default("auto"),
    thinking_seconds: z.number().positive().max(30),
    beat_intents: DirectorBeatIntentSchema.array().min(1),
    asset_intents: DirectorAssetIntentSchema.array().default([]),
    mascot_state: MascotStateSchema.nullable().default(null),
    sfx_intents: SfxIntentSchema.array().default([]),
    transition_intent: TransitionIntentSchema,
    reward_intensity: RewardIntensitySchema,
  })
  .strict();

export type DirectorBeat = z.infer<typeof DirectorBeatSchema>;

export const DirectorPlanSchema = z
  .object({
    schema_version: z.literal(2),
    episode_id: z.string().min(1),
    archetype_family: z.string().min(1).max(80),
    beats: DirectorBeatSchema.array().min(1).max(QUIZ_MAX_QUESTION_COUNT),
    midpoint_question_id: z.string().nullable().default(null),
    final_challenge_question_id: z.string().nullable().default(null),
  })
  .superRefine((plan, ctx) => {
    const seen = new Set<string>();
    plan.beats.forEach((beat, index) => {
      if (seen.has(beat.question_id))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["beats", index, "question_id"],
          message: "Each question may have only one director beat",
        });
      seen.add(beat.question_id);
    });
  });

export type DirectorPlan = z.infer<typeof DirectorPlanSchema>;

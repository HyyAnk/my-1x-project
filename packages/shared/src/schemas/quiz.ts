import { z } from "zod";
import {
  DirectorArchetypeSchema,
  DirectorAssetIntentSchema,
  DirectorBeatIntentSchema,
  DirectorEnergySchema,
  DirectorVisualDensitySchema,
  MascotStateSchema,
  QuizAgeBandSchema,
  QuizAnswerCardStyleSchema,
  QuizAssetAspectRatioSchema,
  QuizAssetPurposeSchema,
  QuizAssetStyleSchema,
  QuizBackgroundStyleSchema,
  QuizIssueStageSchema,
  QuizLayoutIdSchema,
  QuizMotionIdSchema,
  QuizPaletteIdSchema,
  QuizQuestionBoxStyleSchema,
  QuizQuestionCounterStyleSchema,
  type QuizQuestionFormat,
  QuizQuestionFormatSchema,
  QuizThinkingBarStyleSchema,
  QuizTransitionIdSchema,
  RewardIntensitySchema,
  SfxIntentSchema,
  TransitionIntentSchema,
  VoicePauseClassSchema,
  VoicePhraseDeliverySchema,
  VoiceSegmentRoleSchema,
} from "../enums.js";
import {
  IsoDate,
  QUIZ_MAX_CHOICES_PER_QUESTION,
  QUIZ_MAX_QUESTION_COUNT,
  QUIZ_MIN_CHOICES_PER_QUESTION,
  QUIZ_STANDARD_CHOICES_PER_QUESTION,
  QUIZ_TRUE_FALSE_CHOICES_PER_QUESTION,
} from "./common.js";

export function quizChoiceCountForFormat(format: QuizQuestionFormat): number {
  return format === "true_false" ? QUIZ_TRUE_FALSE_CHOICES_PER_QUESTION : QUIZ_STANDARD_CHOICES_PER_QUESTION;
}

export const QuizChoiceSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,31}$/),
  text: z.string().trim().min(1).max(180),
});

export type QuizChoice = z.infer<typeof QuizChoiceSchema>;

export const QuizQuestionValidationSchema = z.object({
  semantic_status: z.enum(["pending", "validated"]).default("validated"),
  source_coverage: z.boolean().default(false),
  fact_locked: z.boolean().default(true),
});

export type QuizQuestionValidation = z.infer<typeof QuizQuestionValidationSchema>;

export const QuizQuestionSchema = z
  .object({
    id: z.string().min(1).max(80),
    number: z.number().int().positive(),
    format: QuizQuestionFormatSchema,
    difficulty: z.number().int().min(1).max(5),
    question: z.string().trim().min(1).max(320),
    choices: QuizChoiceSchema.array().min(QUIZ_MIN_CHOICES_PER_QUESTION).max(QUIZ_MAX_CHOICES_PER_QUESTION),
    correct_choice_id: z.string().min(1),
    explanation: z.string().trim().min(1).max(600),
    fun_fact: z.string().trim().max(600).default(""),
    source_ids: z.string().min(1).array().default([]),
    visual_opportunity: z.string().trim().max(1000).default(""),
    validation: QuizQuestionValidationSchema.default({}),
  })
  .superRefine((question, ctx) => {
    const choiceIds = new Set<string>();
    const choiceTexts = new Set<string>();
    for (const choice of question.choices) {
      if (choiceIds.has(choice.id))
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["choices"], message: `Choice ID ${choice.id} is duplicated` });
      choiceIds.add(choice.id);
      const normalizedText = choice.text.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
      if (choiceTexts.has(normalizedText))
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["choices"], message: "Visible choices must be unique after normalization" });
      choiceTexts.add(normalizedText);
    }
    if (!choiceIds.has(question.correct_choice_id))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correct_choice_id"],
        message: "Canonical answer must reference a visible choice",
      });
    const requiredChoiceCount = quizChoiceCountForFormat(question.format);
    if (question.choices.length !== requiredChoiceCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["choices"],
        message:
          question.format === "true_false"
            ? "True or false questions require exactly two choices"
            : "Quiz questions require exactly three choices: A, B, and C",
      });
    }
  });

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuizV2Schema = z
  .object({
    schema_version: z.literal(2),
    episode_id: z.string().min(1),
    age_band: QuizAgeBandSchema,
    language: z.string().trim().min(1).max(80),
    questions: QuizQuestionSchema.array().min(1).max(QUIZ_MAX_QUESTION_COUNT),
  })
  .superRefine((quiz, ctx) => {
    const ids = new Set<string>();
    const numbers = new Set<number>();
    quiz.questions.forEach((question, index) => {
      if (ids.has(question.id))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", index, "id"],
          message: `Question ID ${question.id} is duplicated`,
        });
      ids.add(question.id);
      if (numbers.has(question.number))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", index, "number"],
          message: `Question number ${question.number} is duplicated`,
        });
      numbers.add(question.number);
      if (question.number !== index + 1)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["questions", index, "number"], message: "Question numbers must be sequential" });
    });
  });

export type QuizV2 = z.infer<typeof QuizV2Schema>;

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

export const AssetConsistencyGroupSchema = z.object({
  group_id: z.string().min(1).max(120),
  question_id: z.string().min(1),
  purpose: z.literal("visual_answer_set"),
  style_family: z.string().min(1).max(240),
  rendering_medium: z.string().min(1).max(240),
  lighting: z.string().min(1).max(240),
  framing: z.string().min(1).max(240),
  background_treatment: z.string().min(1).max(240),
  subject_scale: z.string().min(1).max(240),
  contrast: z.string().min(1).max(240),
  saturation: z.string().min(1).max(240),
  edge_treatment: z.string().min(1).max(240),
  detail_level: z.string().min(1).max(240).default("medium, simplified child-friendly detail"),
  face_policy: z.enum(["none", "all", "natural_only"]).default("natural_only"),
  asset_ids: z.string().min(1).array().min(2),
});

export type AssetConsistencyGroup = z.infer<typeof AssetConsistencyGroupSchema>;

export const QuizAssetRequirementSchema = z.object({
  asset_id: z.string().min(1).max(120),
  question_id: z.string().nullable().default(null),
  subject: z.string().trim().min(1).max(180),
  purpose: QuizAssetPurposeSchema,
  style: QuizAssetStyleSchema,
  aspect_ratio: QuizAssetAspectRatioSchema,
  transparent_background: z.boolean(),
  required: z.boolean(),
  semantic_key: z.string().trim().min(1).max(180),
  consistency_group_id: z.string().min(1).max(120).nullable().default(null),
});

export type QuizAssetRequirement = z.infer<typeof QuizAssetRequirementSchema>;

export const QuizAssetPlanSchema = z
  .object({
    schema_version: z.literal(2),
    episode_id: z.string().min(1),
    assets: QuizAssetRequirementSchema.array(),
    consistency_groups: AssetConsistencyGroupSchema.array().default([]),
  })
  .superRefine((plan, ctx) => {
    const ids = new Set<string>();
    const semanticKeys = new Set<string>();
    plan.assets.forEach((asset, index) => {
      if (ids.has(asset.asset_id))
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["assets", index, "asset_id"], message: "Asset IDs must be unique" });
      if (semanticKeys.has(asset.semantic_key))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["assets", index, "semantic_key"],
          message: "Asset semantic keys must be unique",
        });
      ids.add(asset.asset_id);
      semanticKeys.add(asset.semantic_key);
    });
    const assetIds = new Set(plan.assets.map((asset) => asset.asset_id));
    const groupIds = new Set<string>();
    plan.consistency_groups.forEach((group, index) => {
      if (groupIds.has(group.group_id))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["consistency_groups", index, "group_id"],
          message: "Asset consistency group IDs must be unique",
        });
      groupIds.add(group.group_id);
      group.asset_ids.forEach((assetId, assetIndex) => {
        if (!assetIds.has(assetId))
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["consistency_groups", index, "asset_ids", assetIndex],
            message: "Consistency group references an unknown asset",
          });
      });
    });
    plan.assets.forEach((asset, index) => {
      if (asset.consistency_group_id && !groupIds.has(asset.consistency_group_id))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["assets", index, "consistency_group_id"],
          message: "Asset references an unknown consistency group",
        });
    });
  });

export type QuizAssetPlan = z.infer<typeof QuizAssetPlanSchema>;

export const QuizResolvedAssetSchema = QuizAssetRequirementSchema.extend({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  path: z.string().min(1),
  source: z.enum(["explicit_episode", "channel_reusable", "cache", "provider", "fallback", "demo"]),
  fallback_tier: z.number().int().positive().optional(),
  degraded: z.boolean().optional(),
});

export type QuizResolvedAsset = z.infer<typeof QuizResolvedAssetSchema>;

export const QuizAssetResolutionSchema = z.object({
  schema_version: z.literal(2),
  episode_id: z.string().min(1),
  template_id: z.string().min(1).max(80),
  assets: QuizResolvedAssetSchema.array(),
});

export type QuizAssetResolution = z.infer<typeof QuizAssetResolutionSchema>;

export const VoicePhraseSchema = z.object({
  text: z.string().trim().min(1),
  delivery: VoicePhraseDeliverySchema.default("normal"),
  pause_after: VoicePauseClassSchema.default("none"),
});

export type VoicePhrase = z.infer<typeof VoicePhraseSchema>;

export const VoiceSegmentSchema = z.object({
  segment_id: z.string().min(1),
  role: VoiceSegmentRoleSchema,
  question_id: z.string().nullable().default(null),
  text: z.string().trim().min(1),
  duration_seconds: z.number().nonnegative().nullable().default(null),
  phrases: VoicePhraseSchema.array().default([]),
});

export type VoiceSegment = z.infer<typeof VoiceSegmentSchema>;

export const VoicePlanSchema = z
  .object({ schema_version: z.literal(2), episode_id: z.string().min(1), segments: VoiceSegmentSchema.array().min(1) })
  .superRefine((plan, ctx) => {
    if (new Set(plan.segments.map((segment) => segment.segment_id)).size !== plan.segments.length)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["segments"], message: "Voice segment IDs must be unique" });
  });

export type VoicePlan = z.infer<typeof VoicePlanSchema>;

export const QuizIssueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["blocker", "warning", "info"]),
  message: z.string().min(1),
  next_action: z.string().min(1),
  question_ids: z.string().array().default([]),
  stage: QuizIssueStageSchema,
});

export type QuizIssue = z.infer<typeof QuizIssueSchema>;

export const QuizAssessmentSchema = z.object({
  schema_version: z.literal(2),
  episode_id: z.string().min(1),
  assessed_at: IsoDate,
  score: z.number().int().min(0).max(100),
  rating: z.enum(["production_ready", "needs_review", "not_ready"]),
  categories: z.object({
    semantic: z.number().int().min(0).max(100),
    visual: z.number().int().min(0).max(100),
    pacing: z.number().int().min(0).max(100),
    audio: z.number().int().min(0).max(100),
    variety: z.number().int().min(0).max(100),
    render_integrity: z.number().int().min(0).max(100),
  }),
  candy_arcade_visual: z
    .object({
      pacing: z.number().int().min(0).max(20),
      hierarchy: z.number().int().min(0).max(15),
      asset_consistency: z.number().int().min(0).max(15),
      motion: z.number().int().min(0).max(15),
      reveal: z.number().int().min(0).max(10),
      transition: z.number().int().min(0).max(10),
      readability: z.number().int().min(0).max(10),
      visual_variety: z.number().int().min(0).max(5),
      total: z.number().int().min(0).max(100),
    })
    .optional(),
  issues: QuizIssueSchema.array(),
});

export type QuizAssessment = z.infer<typeof QuizAssessmentSchema>;

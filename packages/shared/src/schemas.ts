import { z } from "zod";

import {
  ChannelStatusSchema,
  DirectorArchetypeSchema,
  DirectorAssetIntentSchema,
  DirectorBeatIntentSchema,
  DirectorEnergySchema,
  DirectorVisualDensitySchema,
  EngineIdSchema,
  EpisodeStageSchema,
  MascotActionTypeSchema,
  MascotStateSchema,
  QuizAgeBandSchema,
  QuizAnswerCardStyleSchema,
  QuizAssetAspectRatioSchema,
  QuizAssetPurposeSchema,
  QuizAssetStyleSchema,
  QuizImageStyleSchema,
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
  QuizVisualThemeSchema,
  RewardIntensitySchema,
  SfxIntentSchema,
  TaskTypeSchema,
  TransitionIntentSchema,
  VoicePauseClassSchema,
  VoicePhraseDeliverySchema,
  VoiceSegmentRoleSchema,
} from "./enums.js";
import { MascotRenderAspectRatioSchema, MascotRenderBundleV2Schema } from "./mascot/renderSchema.js";

const IsoDate = z.string().datetime({ offset: true });

export const QUIZ_MIN_QUESTION_COUNT = 3;

export const QUIZ_MAX_QUESTION_COUNT = 50;

export const MascotSpriteActionSchema = z.object({
  action: MascotActionTypeSchema,
  sprite_url: z.string().default(""),
  frames_count: z.number().int().default(1),
  fps: z.number().default(8),
  loop: z.boolean().default(true),
  frame_width: z.number().default(512),
  frame_height: z.number().default(512),
  offset_x: z.number().default(0),
  offset_y: z.number().default(0),
  preview_url: z.string().optional(),
  motion_preset: z.enum(["breathe", "sway", "jump", "shake", "wave", "point", "pulse", "float", "none"]).optional(),
  motion_speed: z.number().default(1.0).optional(),
  motion_intensity: z.enum(["subtle", "normal", "dynamic"]).default("normal").optional(),
});

export type MascotSpriteAction = z.infer<typeof MascotSpriteActionSchema>;

export const MascotProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  visual_style: QuizImageStyleSchema.default("pixar_3d"),
  master_prompt: z.string().default(""),
  master_image_url: z.string().nullable().default(null),
  color_theme: z.string().default("#06b6d4"),
  actions: z.record(MascotActionTypeSchema, MascotSpriteActionSchema.nullable().optional()).default({}),
  /** Persisted V2 render data; absent on V1 manifests until migration. */
  schema_version: z.number().int().positive().optional(),
  render_bundle: MascotRenderBundleV2Schema.optional(),
  assigned_channel_ids: z.array(z.string()).default([]),
  created_at: IsoDate,
  updated_at: IsoDate,
});

export type MascotProfile = z.infer<typeof MascotProfileSchema>;

export const ChannelMascotConfigSchema = z.object({
  enabled: z.boolean().default(true),
  position: z.enum(["bottom_left", "bottom_right"]).default("bottom_left"),
  scale: z.number().default(1.0),
  offset_x: z.number().default(0),
  offset_y: z.number().default(0),
  flip_x: z.boolean().default(false),
  show_in_intro: z.boolean().default(false),
  show_in_outro: z.boolean().default(false),
  show_in_question: z.boolean().default(true),
});

export type ChannelMascotConfig = z.infer<typeof ChannelMascotConfigSchema>;

export const RECOMMENDED_MASCOT_PLACEMENT_PRESET = {
  position: "bottom_left",
  scale: 1.84,
  offset_x: 21,
  offset_y: 90,
  flip_x: false,
} as const;

export const MascotPlacementPresetSchema = z.object({
  position: z.enum(["bottom_left", "bottom_right"]).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position),
  scale: z.number().min(0.3).max(3).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale),
  offset_x: z.number().int().min(-1500).max(1500).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x),
  offset_y: z.number().int().min(-1500).max(1500).default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y),
  flip_x: z.boolean().default(RECOMMENDED_MASCOT_PLACEMENT_PRESET.flip_x),
});

export type MascotPlacementPreset = z.infer<typeof MascotPlacementPresetSchema>;

export const MascotStageSettingsSchema = z.object({
  default_placement: MascotPlacementPresetSchema.default(RECOMMENDED_MASCOT_PLACEMENT_PRESET),
});

export type MascotStageSettings = z.infer<typeof MascotStageSettingsSchema>;

export const ChannelSchema = z.object({
  channel_id: z.string().min(1),
  slug: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().default(""),
  target_audience: z.string().default(""),
  language: z.string().default("English"),
  country: z.string().default("GLOBAL"),
  market: z.string().default(""),
  channel_dna_path: z.string().min(1),
  style_guide_path: z.string().nullable().default(null),
  status: ChannelStatusSchema,
  created_at: IsoDate,
  updated_at: IsoDate,
  episode_count: z.number().int().nonnegative().default(0),
  voice_reference_path: z.string().nullable().default(null),
  group_id: z.enum(["quiz", "documentary"]).default("quiz"),
  engine: z.enum(["quiz", "documentary"]).default("quiz"),
  selected_styles: z.array(QuizImageStyleSchema).default(["pixar_3d", "flat_vector", "kawaii_chibi", "voxel_lowpoly", "plastic_toy"]),
  default_thinking_bar_style: QuizThinkingBarStyleSchema.optional().default("auto"),
  default_question_box_style: QuizQuestionBoxStyleSchema.optional().default("auto"),
  default_answer_card_style: QuizAnswerCardStyleSchema.optional().default("auto"),
  default_counter_style: QuizQuestionCounterStyleSchema.optional().default("auto"),
  default_palette_id: z.string().optional().default("auto"),
  mascot_id: z.string().nullable().default(null),
  mascot_config: ChannelMascotConfigSchema.default({ enabled: true, position: "bottom_left", scale: 1.0 }),
});

export type Channel = z.infer<typeof ChannelSchema>;

export const TopicCandidateSchema = z.object({
  topic_id: z.string().min(1),
  channel_id: z.string().min(1),
  title: z.string().min(1),
  premise: z.string().min(1),
  why_it_fits: z.string().min(1),
  hook: z.string().min(1),
  estimated_potential: z.string().min(1),
  generated_at: IsoDate,
  selected: z.boolean().default(false),
  quiz_format: z.enum(["knowledge", "image_guess", "multiple_choice", "true_false", "odd_one_out"]).default("knowledge"),
  question_count: z.number().int().min(QUIZ_MIN_QUESTION_COUNT).max(QUIZ_MAX_QUESTION_COUNT).default(8),
  age_band: z.enum(["4-6", "7-9", "10-12", "family"]).default("7-9"),
  visual_style: z.enum(["mixed", "pixar_3d", "flat_vector", "kawaii_chibi", "voxel_lowpoly", "plastic_toy"]).default("mixed"),
  theme_hint: z.string().optional(),
});

export type TopicCandidate = z.infer<typeof TopicCandidateSchema>;

export const EpisodeTopicSchema = z.object({
  title: z.string().min(1),
  premise: z.string().min(1),
  hook: z.string().min(1),
});

export const QuizConfigSchema = z.object({
  question_count: z.number().int().min(QUIZ_MIN_QUESTION_COUNT).max(QUIZ_MAX_QUESTION_COUNT).default(8),
  quiz_format: z.enum(["knowledge", "image_guess", "multiple_choice", "true_false", "odd_one_out"]).default("knowledge"),
  age_band: z.enum(["4-6", "7-9", "10-12", "family"]).default("7-9"),
  answer_mode: z.enum(["voice_and_reveal", "voice_only"]).default("voice_and_reveal"),
  visual_theme: QuizVisualThemeSchema.default("candy_arcade"),
  visual_style: z.enum(["mixed", "pixar_3d", "flat_vector", "kawaii_chibi", "voxel_lowpoly", "plastic_toy"]).default("mixed"),
  resolved_visual_style: QuizImageStyleSchema.default("pixar_3d"),
  thinking_bar_style: QuizThinkingBarStyleSchema.default("auto"),
  question_counter_style: QuizQuestionCounterStyleSchema.default("auto"),
  question_box_style: QuizQuestionBoxStyleSchema.default("auto"),
  answer_card_style: QuizAnswerCardStyleSchema.default("auto"),
  palette_id: QuizPaletteIdSchema.default("auto"),
  style_preset_id: z.string().optional().default("auto"),
});

export type QuizConfig = z.infer<typeof QuizConfigSchema>;

// A child-friendly quiz needs reading, thinking, reveal, and explanation time.
// Keep this shared so topic selection and episode creation make the same promise.
export const QUIZ_SECONDS_PER_QUESTION = 33;

export const QUIZ_MIN_CHOICES_PER_QUESTION = 2;

export const QUIZ_STANDARD_CHOICES_PER_QUESTION = 3;

export const QUIZ_TRUE_FALSE_CHOICES_PER_QUESTION = 2;

export const QUIZ_MAX_CHOICES_PER_QUESTION = 3;

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

export const EditorialOverlaySchema = z
  .object({
    kind: z
      .enum(["none", "caption", "stat_card", "timeline", "bar_chart", "line_chart", "map_callout", "comparison", "quote"])
      .default("none"),
    text: z.string().default(""),
    motion: z.enum(["none", "fade_up", "slide_in", "draw_on", "count_up", "highlight"]).default("none"),
    placement: z.enum(["lower_third", "upper_left", "upper_right", "center", "side_panel"]).default("lower_third"),
    duration_seconds: z.number().positive().max(20).nullable().default(null),
    data: z.array(z.object({ label: z.string(), value: z.union([z.string(), z.number()]), unit: z.string().default("") })).default([]),
    source_ids: z.array(z.string()).default([]),
  })
  .default({ kind: "none", motion: "none", placement: "lower_third" });

export type EditorialOverlay = z.infer<typeof EditorialOverlaySchema>;

export const QuizSceneContentSchema = z.object({
  phase: z.enum(["intro", "question", "reveal", "explanation", "outro"]).default("question"),
  question_number: z.number().int().positive().nullable().default(null),
  question: z.string().default(""),
  choices: z.array(z.string()).max(QUIZ_MAX_CHOICES_PER_QUESTION).default([]),
  answer: z.string().default(""),
  explanation: z.string().default(""),
  image_prompt: z.string().default(""),
});

export type QuizSceneContent = z.infer<typeof QuizSceneContentSchema>;

export const SceneSchema = z.object({
  scene_id: z.string().min(1),
  episode_id: z.string().min(1),
  scene_number: z.number().int().positive(),
  duration_seconds: z.number().positive(),
  dialogue: z.string(),
  visual_prompt: z.string(),
  transition_note: z.string().default(""),
  continuity_note: z.string().default(""),
  sequence_id: z.string().default("sequence-1"),
  sequence_title: z.string().default("Sequence 1"),
  shot_id: z.string().default(""),
  asset_type: z
    .enum(["archive", "document", "map", "diagram", "ai_reconstruction", "contemporary", "transition"])
    .default("ai_reconstruction"),
  continuity_bundle_id: z.string().default(""),
  reference_asset_ids: z.array(z.string()).default([]),
  source_ids: z.array(z.string()).default([]),
  reconstruction: z.boolean().default(true),
  sound_cue: z.string().default(""),
  editorial_overlay: EditorialOverlaySchema,
  quiz: QuizSceneContentSchema.nullable().default(null),
  audio_asset_path: z.string().nullable().default(null),
  audio_generated_at: IsoDate.nullable().default(null),
  audio_duration_seconds: z.number().nonnegative().nullable().default(null),
});

export type Scene = z.infer<typeof SceneSchema>;

export const EpisodeSchema = z.object({
  episode_id: z.string().min(1),
  channel_id: z.string().min(1),
  slug: z.string().min(1),
  topic: EpisodeTopicSchema,
  stage: EpisodeStageSchema,
  script_path: z.string().min(1),
  research_path: z.string().nullable().default(null),
  treatment_path: z.string().nullable().default(null),
  visual_bible_path: z.string().nullable().default(null),
  scene_plan_path: z.string().min(1),
  dialogue_script_path: z.string().min(1),
  video_prompts_path: z.string().min(1),
  target_duration_minutes: z.number().min(3).max(60).default(8),
  target_word_count: z.number().int().positive().default(1050),
  narration_asset_path: z.string().nullable().default(null),
  narration_generated_at: IsoDate.nullable().default(null),
  narration_duration_seconds: z.number().positive().nullable().default(null),
  narration_segment_count: z.number().int().nonnegative().default(0),
  measured_narration_words_per_second: z.number().positive().nullable().default(null),
  quiz_config: QuizConfigSchema.default({}),
  video_asset_path: z.string().nullable().default(null),
  video_generated_at: IsoDate.nullable().default(null),
  video_duration_seconds: z.number().positive().nullable().default(null),
  render_manifest_path: z.string().nullable().default(null),
  created_at: IsoDate,
  updated_at: IsoDate,
});

export type Episode = z.infer<typeof EpisodeSchema>;

export const ProductionIssueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["blocker", "warning", "info"]),
  message: z.string().min(1),
  next_action: z.string().min(1),
  scene_numbers: z.array(z.number().int().positive()).default([]),
});

export const ProductionAssessmentSchema = z.object({
  score: z.number().min(0).max(100),
  rating: z.enum(["not_ready", "needs_work", "production_ready"]),
  assessed_at: IsoDate,
  metrics: z.object({
    target_duration_seconds: z.number().positive(),
    estimated_narration_seconds: z.number().nonnegative(),
    narration_word_count: z.number().int().nonnegative(),
    target_word_count: z.number().int().positive(),
    calibrated_word_target_count: z.number().int().positive().optional(),
    scene_count: z.number().int().nonnegative(),
    sequence_count: z.number().int().nonnegative(),
    unique_prompt_ratio: z.number().min(0).max(1),
    structured_prompt_ratio: z.number().min(0).max(1),
    continuity_coverage_ratio: z.number().min(0).max(1),
    source_coverage_ratio: z.number().min(0).max(1),
    narration_coverage_ratio: z.number().min(0).max(1),
    overlay_coverage_ratio: z.number().min(0).max(1).default(0),
    factual_anchor_count: z.number().int().nonnegative(),
    research_source_count: z.number().int().nonnegative(),
  }),
  issues: ProductionIssueSchema.array(),
});

export type ProductionAssessment = z.infer<typeof ProductionAssessmentSchema>;

export const AppConfigSchema = z.object({
  active_engine: EngineIdSchema.default("codex"),
  mascot_stage: MascotStageSettingsSchema.default({}),
  video_generation: z.object({
    provider: z.string().default("hyperframes"),
    model: z.string().default(""),
    hyperframes_command: z.string().default("npx hyperframes"),
    render_quality: z.enum(["draft", "standard", "high"]).default("draft"),
    fps: z.number().int().min(24).max(60).default(30),
    max_scene_duration_seconds: z.number().positive().default(8),
    default_scene_duration_seconds: z.number().positive().default(6),
    narration_words_per_second: z.number().positive().default(2.3),
    aspect_ratio: MascotRenderAspectRatioSchema.default("16:9"),
    max_concurrent_tasks: z.number().int().min(1).max(10).default(2),
  }),
  image_generation: z.object({
    enabled: z.boolean().default(true),
    images_per_bundle: z.number().int().min(1).max(2).default(1),
    provider: z.enum(["gpti2", "shopaikey", "custom"]).default("gpti2"),
    base_url: z.string().default(""),
    model: z.string().default("gpt-image-2"),
    api_key: z.string().default(""),
    has_api_key: z.boolean().optional(),
    quality: z.string().default("low"),
    max_concurrent_tasks: z.number().int().positive().default(3),
  }),
  codex: z.object({
    max_concurrent_tasks: z.number().int().positive().default(3),
    transport: z.enum(["app_server", "openai_compatible"]).default("app_server"),
    app_server_endpoint: z.string().default("stdio://"),
    command: z.string().default("codex"),
    model: z.string().default(""),
    experimental_api: z.boolean().default(false),
    api_base_url: z.string().default(""),
    api_key: z.string().default(""),
    auto_delete_threads: z.boolean().default(false),
    failed_thread_retention_days: z.number().int().nonnegative().default(7),
  }),
  antigravity: z.object({
    max_concurrent_tasks: z.number().int().positive().default(3),
    command: z.string().default("agy"),
    model: z.string().default("gemini-2.5-pro"),
    api_base_url: z.string().default(""),
    api_key: z.string().default(""),
    auto_delete_threads: z.boolean().default(false),
    failed_thread_retention_days: z.number().int().nonnegative().default(7),
  }),
  audio_generation: z.object({
    provider: z.string().default("chatterbox"),
    service_url: z.string().default("http://127.0.0.1:8890"),
    exaggeration: z.number().min(0).max(1).default(0.5),
    cfg_weight: z.number().min(0).max(1).default(0.5),
    max_concurrent_tasks: z.number().int().positive().default(2),
    merge_gap_ms: z.number().int().nonnegative().default(300),
    match_target_duration: z.boolean().default(true),
  }),
  question_history: z
    .object({
      enabled: z.boolean().default(true),
      pass_threshold: z.number().int().min(0).max(50).default(2),
      ttl_days: z.number().int().min(1).max(365).default(30),
      auto_remix: z.boolean().default(false),
    })
    .default({}),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const QuestionHistorySettingsSchema = z.object({
  enabled: z.boolean().default(true),
  pass_threshold: z.number().int().min(0).max(50).default(2),
  ttl_days: z.number().int().min(1).max(365).default(30),
  auto_remix: z.boolean().default(false),
});

export type QuestionHistorySettings = z.infer<typeof QuestionHistorySettingsSchema>;

export const QuestionHistoryEntrySchema = z.object({
  question_id: z.string().min(1),
  question_text: z.string().min(1),
  normalized_question: z.string().default(""),
  choices: z.array(z.string()).max(QUIZ_MAX_CHOICES_PER_QUESTION).default([]),
  correct_answer: z.string().default(""),
  episode_id: z.string().min(1),
  episode_title: z.string().min(1),
  channel_id: z.string().min(1),
  render_task_id: z.string().min(1).optional(),
  rendered_at: IsoDate,
});

export type QuestionHistoryEntry = z.infer<typeof QuestionHistoryEntrySchema>;

export const BgmHistoryEntrySchema = z.object({
  track_id: z.string().min(1),
  filename: z.string().min(1),
  episode_id: z.string().min(1),
  episode_title: z.string().min(1),
  channel_id: z.string().min(1),
  used_at: IsoDate,
});

export type BgmHistoryEntry = z.infer<typeof BgmHistoryEntrySchema>;

export const QuestionHistoryCheckItemSchema = z.object({
  current_question_id: z.string().min(1),
  current_question_text: z.string().min(1),
  current_choices: z.array(z.string()).max(QUIZ_MAX_CHOICES_PER_QUESTION).default([]),
  current_correct_answer: z.string().default(""),
  matched_entry: QuestionHistoryEntrySchema.nullable().default(null),
  similarity_score: z.number().min(0).max(1).default(0),
  match_reason: z.string().default(""),
  status: z.enum(["duplicate", "remixed", "passed"]).default("passed"),
});

export type QuestionHistoryCheckItem = z.infer<typeof QuestionHistoryCheckItemSchema>;

export const QuestionHistoryCheckResultSchema = z.object({
  episode_id: z.string().min(1),
  checked_at: IsoDate,
  total_questions: z.number().int().nonnegative().default(0),
  duplicate_count: z.number().int().nonnegative().default(0),
  pass_threshold: z.number().int().nonnegative().default(2),
  passed: z.boolean().default(true),
  items: z.array(QuestionHistoryCheckItemSchema).default([]),
});

export type QuestionHistoryCheckResult = z.infer<typeof QuestionHistoryCheckResultSchema>;

export const VoiceProfileSchema = z.object({
  voice_id: z.string().min(1),
  name: z.string().min(1).max(80),
  reference_path: z.string().min(1),
  sample_path: z.string().min(1),
  created_at: IsoDate,
});

export type VoiceProfile = z.infer<typeof VoiceProfileSchema>;

export const ContextManifestSchema = z.object({
  task_type: TaskTypeSchema,
  scope: z.object({ channel_id: z.string(), episode_id: z.string().nullable() }),
  included_files: z.array(z.object({ path: z.string(), reason: z.string(), bytes: z.number().int().nonnegative() })),
  excluded_categories: z.array(z.string()),
  approximate_bytes: z.number().int().nonnegative(),
  prompt: z.string(),
});

export type ContextManifest = z.infer<typeof ContextManifestSchema>;

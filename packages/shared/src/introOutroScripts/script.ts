import { z } from "zod";
import { IsoDate } from "../schemas/common.js";
import { IntroOutroReferenceAssetSchema, MascotStyleIdentityProfileSchema } from "./identity.js";
import { ScriptProductionDirectionsSchema, ScriptQualityReviewSchema } from "./quality.js";
import { CreativeSeedSchema, IntroOutroClipKindSchema, IntroOutroSeedSelectionSchema } from "./seeds.js";
import { ScriptChoreographySchema } from "./choreography.js";

export const IntroOutroValidationIssueSchema = z
  .object({
    code: z.string().trim().min(1),
    severity: z.enum(["error", "warning"]),
    path: z.string().trim().min(1),
    message: z.string().trim().min(1).max(500),
  })
  .strict();

export type IntroOutroValidationIssue = z.infer<typeof IntroOutroValidationIssueSchema>;

const ProductionLayerSchema = z
  .object({
    clip_kind: IntroOutroClipKindSchema,
    language: z.literal("English"),
    aspect_ratio: z.literal("16:9"),
    target_duration_seconds: z.number().min(4).max(60),
  })
  .strict();

const IdentityLayerSchema = z
  .object({
    profile_id: z.string().trim().min(1),
    mascot_id: z.string().trim().min(1),
    mascot_style_id: z.string().trim().min(1),
    required_feature_ids: z.array(z.string().trim().min(1)).max(40),
  })
  .strict();

const StyleLayerSchema = z
  .object({
    description: z.string().trim().min(1),
    palette: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
    staging: z.string().trim().min(1),
    motion_language: z.string().trim().min(1),
  })
  .strict();

const TimelineBeatSchema = z
  .object({
    beat: z.number().int().min(1),
    role: z.string().trim().min(1).max(80),
    start_seconds: z.number().min(0).max(60),
    end_seconds: z.number().positive().max(60),
    action: z.string().trim().min(1),
    choreography: ScriptChoreographySchema.optional(),
    capability_ids: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
    props: z.array(z.string().trim().min(1)).default([]),
    visible_feature_ids: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  })
  .strict();

const VoiceLineSchema = z
  .object({
    start_seconds: z.number().min(0).max(60),
    end_seconds: z.number().positive().max(60),
    text: z.string().trim().min(1),
    delivery: z.string().trim().min(1),
  })
  .strict();

const TimedDirectionSchema = z
  .object({
    at_seconds: z.number().min(0).max(60),
    direction: z.string().trim().min(1),
  })
  .strict();

const CameraDirectionSchema = z
  .object({
    start_seconds: z.number().min(0).max(60),
    end_seconds: z.number().positive().max(60),
    framing: z.string().trim().min(1),
    movement: z.string().trim().min(1),
  })
  .strict();

export const IntroOutroScriptContentSchema = z
  .object({
    production_policy: z.enum(["single-action-hero-hold-v1", "dynamic-micro-narrative-v2", "creative-performance-v3"]).optional(),
    dialogue_policy: z.literal("mascot-direct-speech-v1").optional(),
    production: ProductionLayerSchema,
    production_directions: ScriptProductionDirectionsSchema.optional(),
    identity: IdentityLayerSchema,
    style: StyleLayerSchema,
    timeline: z.array(TimelineBeatSchema).min(1),
    voiceover: z
      .object({
        enabled: z.boolean(),
        lines: z.array(VoiceLineSchema),
      })
      .strict(),
    audio: z
      .object({
        music_direction: z.string().trim().default(""),
        events: z.array(TimedDirectionSchema).default([]),
      })
      .strict(),
    camera: z.array(CameraDirectionSchema),
    consistency: z
      .object({
        preserve_feature_ids: z.array(z.string().trim().min(1)).max(40),
        allowed_visible_text: z.array(z.string().trim().min(1)).default([]),
        restrictions: z.array(z.string().trim().min(1)),
      })
      .strict(),
  })
  .strict();

export type IntroOutroScriptContent = z.infer<typeof IntroOutroScriptContentSchema>;

export const IntroOutroScriptRevisionSchema = z
  .object({
    schema_version: z.literal(1),
    revision_id: z.string().trim().min(1),
    project_id: z.string().trim().min(1),
    channel_id: z.string().trim().min(1),
    style_preset_id: z.string().trim().min(1),
    clip_kind: IntroOutroClipKindSchema,
    revision_number: z.number().int().positive(),
    origin: z.enum(["generated", "edited", "duplicated"]),
    content: IntroOutroScriptContentSchema,
    identity_snapshot: MascotStyleIdentityProfileSchema.optional(),
    quality_review: ScriptQualityReviewSchema.optional(),
    seed_selection: IntroOutroSeedSelectionSchema,
    seed_snapshot: z.array(CreativeSeedSchema).max(7),
    references: z.array(IntroOutroReferenceAssetSchema).min(1).max(4),
    context_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    template_version: z.string().trim().min(1),
    requested_model: z.string().trim().min(1),
    effective_model: z.string().trim().min(1).nullable(),
    validation_issues: z.array(IntroOutroValidationIssueSchema),
    warning_acknowledgements: z.array(z.string()).default([]),
    created_at: IsoDate,
  })
  .strict();

export type IntroOutroScriptRevision = z.infer<typeof IntroOutroScriptRevisionSchema>;

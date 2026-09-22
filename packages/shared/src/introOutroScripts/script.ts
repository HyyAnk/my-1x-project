import { z } from "zod";
import { IsoDate } from "../schemas/common.js";
import { IntroOutroReferenceAssetSchema, MascotStyleIdentityProfileSchema } from "./identity.js";
import { ScriptProductionDirectionsSchema, ScriptQualityReviewSchema } from "./quality.js";
import { CreativeSeedSchema, IntroOutroClipKindSchema, IntroOutroSeedSelectionSchema } from "./seeds.js";

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
    target_duration_seconds: z.number().min(8).max(10),
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
    description: z.string().trim().min(1).max(1200),
    palette: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
    staging: z.string().trim().min(1).max(800),
    motion_language: z.string().trim().min(1).max(800),
  })
  .strict();

const TimelineBeatSchema = z
  .object({
    beat: z.number().int().min(1).max(3),
    role: z.string().trim().min(1).max(80),
    start_seconds: z.number().min(0).max(10),
    end_seconds: z.number().positive().max(10),
    action: z.string().trim().min(1).max(1400),
    capability_ids: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
    props: z.array(z.string().trim().min(1).max(100)).max(3).default([]),
    visible_feature_ids: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  })
  .strict();

const VoiceLineSchema = z
  .object({
    start_seconds: z.number().min(0).max(10),
    end_seconds: z.number().positive().max(10),
    text: z.string().trim().min(1).max(240),
    delivery: z.string().trim().min(1).max(240),
  })
  .strict();

const TimedDirectionSchema = z
  .object({
    at_seconds: z.number().min(0).max(10),
    direction: z.string().trim().min(1).max(400),
  })
  .strict();

const CameraDirectionSchema = z
  .object({
    start_seconds: z.number().min(0).max(10),
    end_seconds: z.number().positive().max(10),
    framing: z.string().trim().min(1).max(300),
    movement: z.string().trim().min(1).max(300),
  })
  .strict();

export const IntroOutroScriptContentSchema = z
  .object({
    production: ProductionLayerSchema,
    production_directions: ScriptProductionDirectionsSchema.optional(),
    identity: IdentityLayerSchema,
    style: StyleLayerSchema,
    timeline: z.array(TimelineBeatSchema).length(3),
    voiceover: z
      .object({
        enabled: z.boolean(),
        lines: z.array(VoiceLineSchema).max(3),
      })
      .strict(),
    audio: z
      .object({
        music_direction: z.string().trim().max(600).default(""),
        events: z.array(TimedDirectionSchema).max(16).default([]),
      })
      .strict(),
    camera: z.array(CameraDirectionSchema).min(1).max(8),
    consistency: z
      .object({
        preserve_feature_ids: z.array(z.string().trim().min(1)).max(40),
        allowed_visible_text: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
        restrictions: z.array(z.string().trim().min(1).max(400)).max(30),
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

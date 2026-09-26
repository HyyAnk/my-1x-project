import { z } from "zod";
import { IsoDate } from "../schemas/common.js";
import { IntroOutroScriptContentSchema, IntroOutroValidationIssueSchema } from "./script.js";
import { IntroOutroClipKindSchema, IntroOutroSeedSelectionSchema } from "./seeds.js";

export const IntroOutroScriptDraftSchema = z
  .object({
    clip_kind: IntroOutroClipKindSchema,
    target_duration_seconds: z.number().min(8).max(10).default(8),
    seed_selection: IntroOutroSeedSelectionSchema.nullable().default(null),
    content: IntroOutroScriptContentSchema.nullable().default(null),
    validation_issues: z.array(IntroOutroValidationIssueSchema).default([]),
    source_revision_id: z.string().trim().min(1).nullable().default(null),
    prompt_text: z.string().max(60000).optional(),
    updated_at: IsoDate,
  })
  .strict();

export type IntroOutroScriptDraft = z.infer<typeof IntroOutroScriptDraftSchema>;

export const IntroOutroScriptProjectSchema = z
  .object({
    schema_version: z.literal(1),
    project_id: z.string().trim().min(1),
    channel_id: z.string().trim().min(1),
    style_preset_id: z.string().trim().min(1),
    name: z.string().trim().min(1).max(100),
    version: z.number().int().positive(),
    archived: z.boolean().default(false),
    purpose: z.literal("pair_workspace").optional(),
    drafts: z.object({
      intro: IntroOutroScriptDraftSchema,
      outro: IntroOutroScriptDraftSchema,
    }),
    revision_ids: z.array(z.string().trim().min(1)).default([]),
    approved_revision_ids: z.object({
      intro: z.string().trim().min(1).nullable(),
      outro: z.string().trim().min(1).nullable(),
    }),
    created_at: IsoDate,
    updated_at: IsoDate,
  })
  .strict();

export type IntroOutroScriptProject = z.infer<typeof IntroOutroScriptProjectSchema>;

export const IntroOutroScriptJobSchema = z
  .object({
    schema_version: z.literal(1),
    job_id: z.string().trim().min(1),
    channel_id: z.string().trim().min(1),
    project_id: z.string().trim().min(1).nullable(),
    type: z.enum(["identity_analysis", "script_generation"]),
    requested_clip_kinds: z.array(IntroOutroClipKindSchema).max(2),
    status: z.enum(["queued", "running", "succeeded", "partial", "failed", "cancelled", "interrupted"]),
    step: z.string().trim().min(1),
    error_code: z.string().trim().min(1).nullable(),
    error_message: z.string().trim().min(1).nullable(),
    result_revision_ids: z.array(z.string().trim().min(1)).default([]),
    failed_clip_kinds: z.array(IntroOutroClipKindSchema).default([]),
    clip_errors: z
      .array(
        z
          .object({
            clip_kind: IntroOutroClipKindSchema,
            code: z.string().trim().min(1),
            message: z.string().trim().min(1),
          })
          .strict(),
      )
      .default([]),
    submitted_project_version: z.number().int().positive().nullable(),
    idempotency_key: z.string().trim().min(1).max(160),
    request_fingerprint: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable()
      .default(null),
    created_at: IsoDate,
    started_at: IsoDate.nullable(),
    completed_at: IsoDate.nullable(),
  })
  .strict();

export type IntroOutroScriptJob = z.infer<typeof IntroOutroScriptJobSchema>;

export const IntroOutroScriptContextSchema = z
  .object({
    channel_id: z.string().trim().min(1),
    style_preset_id: z.string().trim().min(1),
    mascot_id: z.string().trim().min(1).nullable(),
    mascot_name: z.string().trim().min(1).nullable(),
    mascot_style_id: z.string().trim().min(1).nullable(),
    mascot_style_name: z.string().trim().min(1).nullable(),
    mascot_style_revision: z.number().int().positive().nullable(),
    mascot_reference_url: z.string().trim().min(1).nullable(),
    logo_reference_url: z.string().trim().min(1).nullable(),
    identity_profile_id: z.string().trim().min(1).nullable(),
    identity_status: z.enum(["missing", "unreviewed", "needs_review", "reviewed", "ready", "stale"]),
    issues: z.array(
      z.object({
        code: z.string().trim().min(1),
        message: z.string().trim().min(1),
        blocking: z.boolean(),
      }),
    ),
  })
  .strict();

export type IntroOutroScriptContext = z.infer<typeof IntroOutroScriptContextSchema>;

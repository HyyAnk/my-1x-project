import {
  CreativeSeedDimensionSchema,
  CreativeSeedSchema,
  IntroOutroClipKindSchema,
  IntroOutroScriptContentSchema,
  IntroOutroSeedSelectionSchema,
  MascotStyleIdentityProfileSchema,
} from "@studio/shared";
import { z } from "zod";

export const ContextQuerySchema = z
  .object({
    style_preset_id: z.string().trim().min(1),
    mascot_style_id: z.string().trim().min(1).optional(),
  })
  .strict();

export const AnalyzeContextInputSchema = ContextQuerySchema.extend({
  idempotency_key: z.string().trim().min(1).max(160),
});

export const ReviewIdentityInputSchema = z
  .object({
    style_preset_id: z.string().trim().min(1),
    mascot_style_id: z.string().trim().min(1).optional(),
    expected_updated_at: z.string().datetime().nullable().optional(),
    profile: MascotStyleIdentityProfileSchema,
  })
  .strict();

export const CreateSeedInputSchema = CreativeSeedSchema.omit({
  id: true,
  revision: true,
  origin: true,
  status: true,
}).extend({
  id: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .max(80)
    .optional(),
});

export const UpdateSeedInputSchema = CreativeSeedSchema.omit({
  id: true,
  revision: true,
  origin: true,
})
  .partial()
  .extend({ expected_revision: z.number().int().positive() })
  .strict();

export const ListProjectsQuerySchema = z
  .object({
    style_preset_id: z.string().trim().min(1).optional(),
    include_archived: z.enum(["true", "false"]).optional(),
  })
  .strict();

export const CreateProjectInputSchema = z
  .object({
    style_preset_id: z.string().trim().min(1),
    name: z.string().trim().min(1).max(100),
  })
  .strict();

const DraftPatchSchema = z
  .object({
    target_duration_seconds: z.number().min(6).max(10).optional(),
    seed_selection: IntroOutroSeedSelectionSchema.nullable().optional(),
    content: IntroOutroScriptContentSchema.nullable().optional(),
    prompt_text: z.string().max(60000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "No draft update supplied");

export const UpdateProjectInputSchema = z
  .object({
    expected_version: z.number().int().positive(),
    name: z.string().trim().min(1).max(100).optional(),
    archived: z.boolean().optional(),
    drafts: z
      .object({
        intro: DraftPatchSchema.optional(),
        outro: DraftPatchSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined || value.archived !== undefined || value.drafts?.intro !== undefined || value.drafts?.outro !== undefined,
    "No project update supplied",
  );

export const DuplicateProjectInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const CheckpointInputSchema = z
  .object({
    clip_kind: IntroOutroClipKindSchema,
    expected_version: z.number().int().positive(),
    warning_acknowledgements: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
    mascot_style_id: z.string().trim().min(1).optional(),
  })
  .strict();

export const ValidateDraftInputSchema = z
  .object({
    clip_kind: IntroOutroClipKindSchema,
    mascot_style_id: z.string().trim().min(1).optional(),
  })
  .strict();

const GenerateClipInputSchema = z
  .object({
    clip_kind: IntroOutroClipKindSchema,
    duration_seconds: z.number().min(6).max(10),
    randomization_seed: z.string().trim().min(1).max(120),
    selected_seed_ids: z.array(z.string().trim().min(1).max(80)).max(7).optional(),
    locked_dimensions: z.array(CreativeSeedDimensionSchema).max(7).optional(),
    logo_mode: z.enum(["post_overlay", "supplied_reference", "none"]).optional(),
  })
  .strict();

export const GenerateScriptsInputSchema = z
  .object({
    expected_version: z.number().int().positive(),
    auto_identity: z.boolean().default(true),
    mascot_style_id: z.string().trim().min(1).optional(),
    idempotency_key: z.string().trim().min(1).max(160),
    clips: z.array(GenerateClipInputSchema).min(1).max(2),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.clips.map((clip) => clip.clip_kind)).size !== value.clips.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["clips"], message: "Each clip kind may be requested once" });
    }
  });

export const ApproveRevisionInputSchema = z
  .object({
    revision_id: z.string().trim().min(1),
    expected_version: z.number().int().positive(),
  })
  .strict();

export type DraftPatch = z.infer<typeof DraftPatchSchema>;

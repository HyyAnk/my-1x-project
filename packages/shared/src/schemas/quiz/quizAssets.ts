import { z } from "zod";
import { QuizAssetAspectRatioSchema, QuizAssetPurposeSchema, QuizAssetStyleSchema } from "../../enums.js";

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

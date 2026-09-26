import { z } from "zod";
import { IsoDate } from "../schemas/common.js";

export const MascotCapabilityIdSchema = z.enum([
  "locomotion",
  "grasping",
  "pointing",
  "waving",
  "flight",
  "facial_expression",
  "speech",
  "ride_vehicle",
  "hold_props",
]);

export type MascotCapabilityId = z.infer<typeof MascotCapabilityIdSchema>;

export const MascotCapabilityStateSchema = z.enum(["supported", "unsupported", "unknown"]);
export type MascotCapabilityState = z.infer<typeof MascotCapabilityStateSchema>;

export const MascotFeatureSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(500),
    body_anchor: z.string().trim().min(1).max(120),
    material: z.string().trim().max(120).default("unknown"),
    rigidity: z.enum(["rigid", "flexible", "unknown"]).default("unknown"),
    importance: z.enum(["signature", "important", "supporting"]).default("supporting"),
    visibility_rule: z.string().trim().max(300).default("Preserve when visible in the selected framing"),
  })
  .strict();

export type MascotFeature = z.infer<typeof MascotFeatureSchema>;

export const MascotStyleIdentityProfileSchema = z
  .object({
    schema_version: z.literal(1),
    profile_id: z.string().trim().min(1),
    mascot_id: z.string().trim().min(1),
    mascot_style_id: z.string().trim().min(1),
    style_preset_id: z.string().trim().min(1).nullable(),
    style_revision: z.number().int().positive(),
    reference_asset_url: z.string().trim().min(1),
    reference_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    reference_mime_type: z.enum(["image/png", "image/jpeg", "image/webp"]),
    summary: z.string().trim().min(1).max(1200),
    morphology: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
    features: z.array(MascotFeatureSchema).max(40).default([]),
    capabilities: z.record(MascotCapabilityIdSchema, MascotCapabilityStateSchema).default({}),
    motion_constraints: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
    palette: z
      .array(z.string().regex(/^#[0-9a-fA-F]{6}$/))
      .max(10)
      .default([]),
    style_description: z.string().trim().max(1000).default(""),
    allowed_accessories: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
    status: z.enum(["unreviewed", "needs_review", "reviewed", "ready"]),
    source: z.enum(["antigravity_vision", "manual"]),
    analysis_model: z.string().trim().min(1).nullable(),
    analysis_version: z.string().trim().min(1),
    created_at: IsoDate,
    updated_at: IsoDate,
    reviewed_at: IsoDate.nullable(),
  })
  .strict();

export type MascotStyleIdentityProfile = z.infer<typeof MascotStyleIdentityProfileSchema>;

export const IntroOutroReferenceAssetSchema = z
  .object({
    role: z.enum(["mascot_subject", "channel_logo"]),
    asset_id: z.string().trim().min(1),
    url: z.string().trim().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    mime_type: z.enum(["image/png", "image/jpeg", "image/webp"]),
  })
  .strict();

export type IntroOutroReferenceAsset = z.infer<typeof IntroOutroReferenceAssetSchema>;

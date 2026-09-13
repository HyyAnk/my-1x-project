import { z } from "zod";
import { SegmentIndexSchema, ReelSegmentSchema } from "./reelSegment.schema.js";
import { ReelScriptSchema } from "./reelScript.schema.js";
import {
  ReelReferencesPayloadSchema,
  ReelCoverPayloadSchema,
  ShortReelDisplayProjectionSchema,
} from "./reelShotPlan.schema.js";
import {
  ShortReelSourceSnapshotSchema,
  CompleteShortReelSourceSnapshotSchema,
  sha256Hex,
} from "../shortReelSource.schema.js";
import { ReelPublishingPayloadSchema } from "../shortReelPublishing.schema.js";
import { ReelVisualContextSchema } from "../shortReelVisual.schema.js";

export const ShortReelTopicSnapshotSchema = z
  .object({
    topic_id: z.string().min(1),
    channel_id: z.string().min(1),
    title: z.string().min(1),
    premise: z.string().min(1),
    hook: z.string().min(1),
    origin: z.enum(["keyword", "discovery"]),
  })
  .strict();

export type ShortReelTopicSnapshot = z.infer<typeof ShortReelTopicSnapshotSchema>;

export const ReelUnitStatusSchema = z.enum(["missing", "pending", "ready", "stale", "failed", "cancelled"]);
export type ReelUnitStatus = z.infer<typeof ReelUnitStatusSchema>;

export const ReelAttemptMetadataSchema = z
  .object({
    operation_id: z.string().min(1),
    dependency_fingerprint: z.string().min(1),
    started_at: z.string(),
    completed_at: z.string().nullable(),
    error: z.string().nullable(),
    error_message: z.string().optional(),
    retryable: z.boolean().optional(),
  })
  .strict();

export type ReelAttemptMetadata = z.infer<typeof ReelAttemptMetadataSchema>;

export function createReelUnitStateSchema<T extends z.ZodTypeAny>(payloadSchema: T) {
  return z
    .object({
      state: ReelUnitStatusSchema,
      last_accepted_payload: payloadSchema.nullable(),
      current_attempt: ReelAttemptMetadataSchema.nullable(),
      accepted_dependency_fingerprint: z.string().nullable().default(null),
    })
    .strict();
}

export const ReelScriptPayloadSchema = z
  .object({
    script: ReelScriptSchema,
    compiled_prompts: z.tuple([z.string(), z.string(), z.string()]).nullable(),
  })
  .strict();

export type ReelScriptPayload = z.infer<typeof ReelScriptPayloadSchema>;

export const ReelDeliverableUnitsSchema = z
  .object({
    references: createReelUnitStateSchema(ReelReferencesPayloadSchema),
    script: createReelUnitStateSchema(ReelScriptPayloadSchema),
    cover: createReelUnitStateSchema(ReelCoverPayloadSchema),
    publishing: createReelUnitStateSchema(ReelPublishingPayloadSchema),
  })
  .strict();

export type ReelDeliverableUnits = z.infer<typeof ReelDeliverableUnitsSchema>;

export const ReelArtifactsSchema = ReelDeliverableUnitsSchema;
export type ReelArtifacts = z.infer<typeof ReelArtifactsSchema>;

export const MutationReceiptSchema = z
  .object({
    request_id: z.string().min(1),
    revision: z.number().int().min(1),
    command_kind: z.string().min(1),
    command_hash: z.string().min(1),
    applied_at: z.string(),
  })
  .strict();

export type MutationReceipt = z.infer<typeof MutationReceiptSchema>;

export const ShortReelRecordSchema = z
  .object({
    schema_version: z.literal(2),
    reel_id: z.string().min(1),
    channel_id: z.string().min(1),
    topic_id: z.string().min(1),
    topic: ShortReelTopicSnapshotSchema,
    aspect_ratio: z.literal("9:16"),
    source: ShortReelSourceSnapshotSchema,
    revision: z.number().int().min(1),
    model_note: z.string().max(200),
    created_at: z.string(),
    updated_at: z.string(),
    script: ReelScriptSchema.nullable(),
    stale_segments: z.array(SegmentIndexSchema).optional(),
    visual_context: ReelVisualContextSchema.nullable().default(null),
    units: ReelDeliverableUnitsSchema,
    last_mutation: MutationReceiptSchema.nullable().optional(),
    mutation_history: z.array(MutationReceiptSchema).optional(),
  })
  .strict();

export type ShortReelRecord = z.infer<typeof ShortReelRecordSchema>;

export const ShortReelRecordPatchSchema = ShortReelRecordSchema.partial();
export type ShortReelRecordPatch = z.infer<typeof ShortReelRecordPatchSchema>;

export const ReelPlanSchema = ShortReelRecordSchema;
export type ReelPlan = z.infer<typeof ReelPlanSchema>;

export const ShortReelEditCommandSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("update_model_note"),
      model_note: z.string().min(1).max(200),
    })
    .strict(),
  z
    .object({
      kind: z.literal("update_script"),
      script: ReelScriptSchema,
      display_projection: ShortReelDisplayProjectionSchema.partial().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("update_segment"),
      segment_index: SegmentIndexSchema,
      segment: ReelSegmentSchema,
      display_projection: ShortReelDisplayProjectionSchema.partial().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("update_references"),
      references: ReelReferencesPayloadSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("update_publishing"),
      publishing: ReelPublishingPayloadSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("update_cover"),
      cover: ReelCoverPayloadSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("replace_source_question"),
      source: CompleteShortReelSourceSnapshotSchema,
    })
    .strict(),
]);

export type ShortReelEditCommand = z.infer<typeof ShortReelEditCommandSchema>;

function createEmptyUnitState() {
  return {
    state: "missing" as const,
    last_accepted_payload: null,
    current_attempt: null,
    accepted_dependency_fingerprint: null,
  };
}

export function createInitialShortReel(params: {
  channel_id: string;
  topic: z.infer<typeof ShortReelTopicSnapshotSchema>;
  source: z.infer<typeof ShortReelSourceSnapshotSchema>;
  model_note?: string;
  reel_id?: string;
}): z.infer<typeof ShortReelRecordSchema> {
  const now = new Date().toISOString();
  const reelId = params.reel_id || `sreel_${sha256Hex(`${params.channel_id}:${params.topic.topic_id}:${now}`).slice(0, 16)}`;

  return ShortReelRecordSchema.parse({
    schema_version: 2,
    reel_id: reelId,
    channel_id: params.channel_id,
    topic_id: params.topic.topic_id,
    topic: params.topic,
    aspect_ratio: "9:16",
    source: CompleteShortReelSourceSnapshotSchema.parse(params.source),
    revision: 1,
    model_note: params.model_note || "Omni 1.1 Flash",
    created_at: now,
    updated_at: now,
    script: null,
    visual_context: null,
    units: {
      references: createEmptyUnitState(),
      script: createEmptyUnitState(),
      cover: createEmptyUnitState(),
      publishing: createEmptyUnitState(),
    },
  });
}

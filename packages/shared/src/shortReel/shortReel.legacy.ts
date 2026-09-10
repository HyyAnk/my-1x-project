import { z } from "zod";
import {
  ReelUnitStatusSchema,
  ReelAttemptMetadataSchema,
  ReelReferencesPayloadSchema,
  ReelCoverPayloadSchema,
  ReelScriptPayloadSchema,
  ShortReelTopicSnapshotSchema,
  ReelScriptSchema,
  SegmentIndexSchema,
  MutationReceiptSchema,
} from "./shortReel.schema.js";
import { ShortReelSourceSnapshotSchema } from "./shortReelSource.schema.js";

export const LegacyReelPublishingPayloadSchema = z
  .object({
    hook: z.string().min(1).max(500),
    description: z.string().min(1).max(2000),
    cta: z.string().max(200).nullable(),
    hashtags: z.array(z.string().min(1).max(50)),
  })
  .strict();

export type LegacyReelPublishingPayload = z.infer<typeof LegacyReelPublishingPayloadSchema>;

export function createLegacyReelUnitStateSchema<T extends z.ZodTypeAny>(payloadSchema: T) {
  return z
    .object({
      state: ReelUnitStatusSchema,
      last_accepted_payload: payloadSchema.nullable(),
      current_attempt: ReelAttemptMetadataSchema.nullable(),
    })
    .strict();
}

export const LegacyReelDeliverableUnitsSchema = z
  .object({
    references: createLegacyReelUnitStateSchema(ReelReferencesPayloadSchema),
    script: createLegacyReelUnitStateSchema(ReelScriptPayloadSchema),
    cover: createLegacyReelUnitStateSchema(ReelCoverPayloadSchema),
    publishing: createLegacyReelUnitStateSchema(LegacyReelPublishingPayloadSchema),
  })
  .strict();

export const LegacyShortReelRecordSchema = z
  .object({
    schema_version: z.literal(1),
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
    units: LegacyReelDeliverableUnitsSchema,
    last_mutation: MutationReceiptSchema.nullable().optional(),
    mutation_history: z.array(MutationReceiptSchema).optional(),
  })
  .strict();

export type LegacyShortReelRecord = z.infer<typeof LegacyShortReelRecordSchema>;

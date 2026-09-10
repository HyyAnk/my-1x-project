import type { z } from "zod";
import type {
  ReelArchetypeSchema,
  SegmentIndexSchema,
  SegmentModeSchema,
  TextCueRoleSchema,
  TextCueSchema,
  ContinuityStateSchema,
  ReelSegmentSchema,
  ReelScriptSchema,
  ShortReelTopicSnapshotSchema,
  ShortReelSourceSnapshotSchema,
  ReelUnitStatusSchema,
  ReelAttemptMetadataSchema,
  ReelReferencesPayloadSchema,
  ReelCoverPayloadSchema,
  ReelScriptPayloadSchema,
  ReelDeliverableUnitsSchema,
  ShortReelRecordSchema,
  ShortReelEditCommandSchema,
  MutationReceiptSchema,
} from "./shortReel.schema.js";

export type ReelArchetype = z.infer<typeof ReelArchetypeSchema>;
export type SegmentIndex = z.infer<typeof SegmentIndexSchema>;
export type SegmentMode = z.infer<typeof SegmentModeSchema>;
export type TextCueRole = z.infer<typeof TextCueRoleSchema>;
export type TextCue = z.infer<typeof TextCueSchema>;
export type ContinuityState = z.infer<typeof ContinuityStateSchema>;
export type ReelSegment = z.infer<typeof ReelSegmentSchema>;
export type ReelScript = z.infer<typeof ReelScriptSchema>;
export type ShortReelTopicSnapshot = z.infer<typeof ShortReelTopicSnapshotSchema>;
export type ShortReelSourceSnapshot = z.infer<typeof ShortReelSourceSnapshotSchema>;
export type { ShortReelSourceProvenance, ShortReelSourceChoice } from "./shortReelSource.schema.js";
export type ReelUnitStatus = z.infer<typeof ReelUnitStatusSchema>;
export type ReelAttemptMetadata = z.infer<typeof ReelAttemptMetadataSchema>;
export type ReelReferencesPayload = z.infer<typeof ReelReferencesPayloadSchema>;
export type ReelCoverPayload = z.infer<typeof ReelCoverPayloadSchema>;
export type { ReelPublishingPayload, GeneratedReelPublishing } from "./shortReelPublishing.schema.js";
export type ReelScriptPayload = z.infer<typeof ReelScriptPayloadSchema>;
export type ReelDeliverableUnits = z.infer<typeof ReelDeliverableUnitsSchema>;
export type ShortReelRecord = z.infer<typeof ShortReelRecordSchema>;
export type ShortReelEditCommand = z.infer<typeof ShortReelEditCommandSchema>;
export type MutationReceipt = z.infer<typeof MutationReceiptSchema>;

export interface ReelKey {
  channel_id: string;
  reel_id: string;
}

export interface MutationContext {
  expected_revision: number;
  request_id: string;
}

export type GenerationTarget = "script" | "segment_1" | "segment_2" | "segment_3" | "references" | "cover" | "publishing" | "package";

export type {
  ReelArchetype,
  SegmentIndex,
  SegmentMode,
  TextCueRole,
  TextCue,
  ContinuityState,
  ReelSegment,
  ReelScript,
  ShortReelTopicSnapshot,
  ShortReelSourceSnapshot,
  ShortReelSourceProvenance,
  ShortReelSourceChoice,
  ReelUnitStatus,
  ReelAttemptMetadata,
  ReelReferencesPayload,
  ReelCoverPayload,
  ReelPublishingPayload,
  GeneratedReelPublishing,
  ReelScriptPayload,
  ReelDeliverableUnits,
  ShortReelRecord,
  ShortReelEditCommand,
  MutationReceipt,
} from "./shortReel.schema.js";

export interface ReelKey {
  channel_id: string;
  reel_id: string;
}

export interface MutationContext {
  expected_revision: number;
  request_id: string;
}

export type GenerationTarget = "script" | "segment_1" | "segment_2" | "segment_3" | "references" | "cover" | "publishing" | "package";

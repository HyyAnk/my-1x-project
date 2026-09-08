import { canonicalJsonStringify, sha256Hex, type ShortReelEditCommand, type ShortReelRecord } from "@studio/shared";
export type DeliverableUnitKey = "references" | "script" | "cover" | "publishing";

/**
 * Returns the deliverable unit keys affected and invalidated by a given edit command.
 * Strictly adheres to the Short-Reel Invalidation Table.
 */
export function affectedReelUnits(command: ShortReelEditCommand): DeliverableUnitKey[] {
  switch (command.kind) {
    case "replace_source_question":
      return ["references", "script", "cover", "publishing"];

    case "update_references":
      return ["script", "cover"];

    case "update_script":
    case "update_segment":
      return ["script"];

    case "update_cover":
      return ["cover"];

    case "update_publishing":
      return ["publishing"];

    case "update_model_note":
      return [];
  }
}

/**
 * Computes a deterministic SHA-256 fingerprint for a deliverable unit's input dependencies.
 * Sibling unit updates do NOT alter this fingerprint, preserving concurrent non-interfering attempts.
 */
export function computeDependencyFingerprint(unitKey: DeliverableUnitKey, record: ShortReelRecord): string {
  switch (unitKey) {
    case "references":
      return sha256Hex(
        canonicalJsonStringify({
          channel_id: record.channel_id,
          topic_id: record.topic_id,
          source_hash: record.source.content_hash,
        }),
      );

    case "script":
      return sha256Hex(
        canonicalJsonStringify({
          source_hash: record.source.content_hash,
          topic_title: record.topic.title,
          topic_premise: record.topic.premise,
          topic_hook: record.topic.hook,
          references_payload: record.units.references.last_accepted_payload,
          target_script: record.script,
        }),
      );

    case "cover":
      return sha256Hex(
        canonicalJsonStringify({
          topic_title: record.topic.title,
          topic_premise: record.topic.premise,
          source_hash: record.source.content_hash,
          references_payload: record.units.references.last_accepted_payload,
        }),
      );

    case "publishing":
      return sha256Hex(
        canonicalJsonStringify({
          topic_title: record.topic.title,
          topic_hook: record.topic.hook,
          question_text: record.source.question_text,
          topic_premise: record.topic.premise,
          source_hash: record.source.content_hash,
          answer_text: record.source.selected_answer_text,
        }),
      );
  }
}

/**
 * Returns which downstream segments are invalidated when a specific segment is modified.
 * In accordance with Phase 04 rules:
 * - Segment 1 changes mark segments 2 and 3 stale.
 * - Segment 2 changes mark segment 3 stale.
 * - Segment 3 changes do not invalidate downstream segments.
 */
export function invalidatedDownstreamSegments(segmentIndex: 1 | 2 | 3): (1 | 2 | 3)[] {
  if (segmentIndex === 1) return [2, 3];
  if (segmentIndex === 2) return [3];
  return [];
}

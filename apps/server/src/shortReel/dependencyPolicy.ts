import { canonicalJsonStringify, sha256Hex, type ShortReelEditCommand, type ShortReelRecord } from "@studio/shared";
import { COVER_PROMPT_VERSION } from "./coverPrompt.js";
import { PUBLISHING_PROMPT_VERSION } from "./publishingPrompt.js";
import { STYLE_PROMPT_VERSION } from "./stylePrompt.js";

export type DeliverableUnitKey = "references" | "script" | "cover" | "publishing";

export interface ScriptSegmentTargetContext {
  segmentIndex: 1 | 2 | 3;
  baseScriptHash: string;
}

/**
 * Returns the deliverable unit keys affected and invalidated by a given edit command.
 * Strictly adheres to the Short-Reel Dependency Matrix:
 * - replace_source_question: references, script, cover, publishing
 * - update_script / update_segment: script, references, cover, publishing
 * - update_references: references, cover
 * - update_cover: cover
 * - update_publishing: publishing
 * - update_model_note: none
 */
export function affectedReelUnits(command: ShortReelEditCommand): DeliverableUnitKey[] {
  switch (command.kind) {
    case "replace_source_question":
      return ["references", "script", "cover", "publishing"];

    case "update_script":
    case "update_segment":
      return ["script", "references", "cover", "publishing"];

    case "update_references":
      return ["references", "cover"];

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
 *
 * Matrix Rules:
 * - script: source + topic + visual context (NO references_payload, NO self-output hash unless segment replacement)
 * - references: accepted script hash + visual-context fingerprint + style-prompt version
 * - cover: accepted script hash + style reference checksum + mascot checksum + cover-prompt version
 * - publishing: accepted script hash + source_hash + topic_title + publishing-prompt version
 */
export function computeDependencyFingerprint(
  unitKey: DeliverableUnitKey,
  record: ShortReelRecord,
  segmentContext?: ScriptSegmentTargetContext,
): string {
  const scriptPayload = record.units.script.last_accepted_payload?.script ?? record.script;
  const scriptHash = scriptPayload ? sha256Hex(canonicalJsonStringify(scriptPayload)) : null;

  switch (unitKey) {
    case "script": {
      if (segmentContext) {
        return sha256Hex(
          canonicalJsonStringify({
            source_hash: record.source.content_hash,
            topic_title: record.topic.title,
            topic_premise: record.topic.premise,
            topic_hook: record.topic.hook,
            visual_context: record.visual_context?.fingerprint ?? null,
            segment_index: segmentContext.segmentIndex,
            base_script_hash: segmentContext.baseScriptHash,
          }),
        );
      }
      return sha256Hex(
        canonicalJsonStringify({
          source_hash: record.source.content_hash,
          topic_title: record.topic.title,
          topic_premise: record.topic.premise,
          topic_hook: record.topic.hook,
          visual_context: record.visual_context?.fingerprint ?? null,
        }),
      );
    }

    case "references": {
      return sha256Hex(
        canonicalJsonStringify({
          script_hash: scriptHash,
          visual_context: record.visual_context?.fingerprint ?? null,
          prompt_version: STYLE_PROMPT_VERSION,
        }),
      );
    }

    case "cover": {
      const styleChecksum = record.units.references.last_accepted_payload?.references.find((r) => r.role === "style")?.checksum ?? null;
      const mascotChecksum =
        record.units.references.last_accepted_payload?.references.find((r) => r.role === "mascot")?.checksum ??
        record.visual_context?.mascot_checksum ??
        null;

      return sha256Hex(
        canonicalJsonStringify({
          script_hash: scriptHash,
          style_checksum: styleChecksum,
          mascot_checksum: mascotChecksum,
          prompt_version: COVER_PROMPT_VERSION,
        }),
      );
    }

    case "publishing": {
      return sha256Hex(
        canonicalJsonStringify({
          script_hash: scriptHash,
          source_hash: record.source.content_hash,
          topic_title: record.topic.title,
          prompt_version: PUBLISHING_PROMPT_VERSION,
        }),
      );
    }
  }
}

/**
 * Returns which downstream segments are invalidated when a specific segment is modified.
 * - Segment 1 changes mark segments 2 and 3 stale.
 * - Segment 2 changes mark segment 3 stale.
 * - Segment 3 changes do not invalidate downstream segments.
 */
export function invalidatedDownstreamSegments(segmentIndex: 1 | 2 | 3): (1 | 2 | 3)[] {
  if (segmentIndex === 1) return [2, 3];
  if (segmentIndex === 2) return [3];
  return [];
}

import {
  makeId,
  TopicRunResultSchema,
  type TopicCandidate,
  type TopicRunCandidate,
  type TopicRunResult,
  type TopicSourceShortage,
} from "@studio/shared";
import type { TopicMatrixPlan } from "./topicMatrixPlanner.js";
import type { AllocatedSlot } from "./bankTopicAllocation.js";
import {
  extractRawCandidates,
  validateRawCandidateSlotIds,
  findCandidateIndexForSlot,
  buildCandidateFromSlot,
  buildCandidateFromItem,
} from "./candidate/index.js";

export interface ValidateTopicResponseInput {
  rawOutput: unknown;
  allocatedSlots: AllocatedSlot[];
  channelId: string;
  runId?: string;
  shortages?: TopicSourceShortage[];
}

/**
 * Validates and normalizes generated topic candidates strictly against an assigned TopicMatrixPlan.
 */
export function validateAndNormalizeTopicCandidates(rawOutput: unknown, plan: TopicMatrixPlan, channelId: string): TopicCandidate[] {
  const rawList = extractRawCandidates(rawOutput);

  if (rawList.length !== 6) {
    throw new Error(`Expected exactly 6 topic candidates, got ${rawList.length}`);
  }

  const candidates = rawList.map((raw, idx) => buildCandidateFromSlot(raw, plan.slots[idx], idx, channelId, plan));
  const ids = new Set<string>();
  for (const candidate of candidates) {
    if (ids.has(candidate.topic_id)) {
      throw new Error(`Topic candidates contain duplicate topic_id "${candidate.topic_id}"`);
    }
    ids.add(candidate.topic_id);
  }
  return candidates;
}

/**
 * Backward compatibility alias for validateAndNormalizeTopicCandidates.
 */
export const validateTopicCandidateSlots = validateAndNormalizeTopicCandidates;

/**
 * Validates and normalizes candidate response for source-allocated topic runs.
 */
export function normalizeTopicRunResult(input: ValidateTopicResponseInput): TopicRunResult {
  const { rawOutput, allocatedSlots, channelId, runId, shortages = [] } = input;
  const rawList = extractRawCandidates(rawOutput);
  const allowedSlots = new Set(allocatedSlots.map((slot) => slot.slotId));

  validateRawCandidateSlotIds(rawList, allowedSlots);

  if (rawList.length !== allocatedSlots.length) {
    throw new Error("Candidate response count does not match allocated slots");
  }

  const seenSlots = new Set<string>();
  const candidates: TopicRunCandidate[] = [];
  const usedRawIndices = new Set<number>();

  for (let idx = 0; idx < allocatedSlots.length; idx += 1) {
    const slot = allocatedSlots[idx];
    const matchIdx = findCandidateIndexForSlot(rawList, slot, idx, usedRawIndices);

    usedRawIndices.add(matchIdx);

    if (seenSlots.has(slot.slotId)) {
      throw new Error(`Duplicate candidate response for slot "${slot.slotId}"`);
    }
    seenSlots.add(slot.slotId);

    candidates.push(buildCandidateFromItem(slot, rawList[matchIdx], channelId));
  }

  const shortReelCount = allocatedSlots.filter((s) => s.contentKind === "short_reel").length;
  const episodeCount = allocatedSlots.filter((s) => s.contentKind === "episode").length;

  return TopicRunResultSchema.parse({
    run_id: runId || makeId("run"),
    target_episode_count: episodeCount || 3,
    target_short_reel_count: shortReelCount || 3,
    candidates,
    shortages,
  });
}

/**
 * Backward compatibility alias for normalizeTopicRunResult.
 */
export const validateTopicCandidateResponse = normalizeTopicRunResult;

// Re-export all symbols from candidate/ for 100% backward compatibility
export * from "./candidate/index.js";

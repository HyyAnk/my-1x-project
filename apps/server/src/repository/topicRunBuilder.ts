import {
  TopicCandidateSchema,
  TopicRunCandidateSchema,
  TopicRunResultSchema,
  makeId,
  nowIso,
  type TopicCandidate,
  type TopicRunResult,
} from "@studio/shared";
import type { TopicRun } from "./helpers.js";

export function buildRunFromResult(validatedRun: TopicRunResult): TopicRun {
  const runId = validatedRun.run_id;
  return {
    run_id: runId,
    generated_at: nowIso(),
    target_episode_count: validatedRun.target_episode_count,
    target_short_reel_count: validatedRun.target_short_reel_count,
    candidates: validatedRun.candidates.map((candidate) => ({
      ...candidate,
      run_id: runId,
    })),
    shortages: validatedRun.shortages,
  };
}

function normalizeCandidateWithBindings(candidate: TopicCandidate, runId: string) {
  const runCand = TopicRunCandidateSchema.safeParse(candidate);
  if (runCand.success && runCand.data.source_bindings && runCand.data.source_bindings.length > 0) {
    return { ...runCand.data, run_id: runId };
  }
  const parsed = TopicCandidateSchema.parse(candidate);
  const explicitSlotId = (candidate as { slot_id?: string }).slot_id;
  const existingBindings =
    (runCand.success && runCand.data.source_bindings && runCand.data.source_bindings.length > 0
      ? runCand.data.source_bindings
      : undefined) ?? (parsed.source_bindings && parsed.source_bindings.length > 0 ? parsed.source_bindings : undefined);

  return {
    ...parsed,
    run_id: runId,
    ...(explicitSlotId ? { slot_id: explicitSlotId } : {}),
    ...(existingBindings && existingBindings.length > 0 ? { source_bindings: existingBindings } : {}),
  };
}

export function buildRunFromCandidates(candidates: TopicCandidate[]): TopicRun {
  const runId = makeId("run");
  return {
    run_id: runId,
    generated_at: nowIso(),
    target_episode_count: 3,
    target_short_reel_count: 2,
    candidates: candidates.map((candidate) => normalizeCandidateWithBindings(candidate, runId)),
    shortages: [],
  };
}

export function buildTopicRun(candidatesOrRun: TopicCandidate[] | TopicRunResult): TopicRun {
  const isRunResult =
    !Array.isArray(candidatesOrRun) &&
    typeof candidatesOrRun === "object" &&
    candidatesOrRun !== null &&
    "candidates" in candidatesOrRun;

  return isRunResult
    ? buildRunFromResult(TopicRunResultSchema.parse(candidatesOrRun))
    : buildRunFromCandidates(candidatesOrRun);
}

import { randomUUID } from "node:crypto";
import {
  TaskSchema,
  type GenerateShortReelRequest,
  type ReelKey,
  type ShortReelRecord,
  type Task,
} from "@studio/shared";
import type { RepositoryService } from "../../repository/service.js";
import {
  generateReelCover,
  generateReelPublishingUnit,
  generateReelReferencesUnit,
  generateReelScriptUnit,
} from "../../shortReel/packageService.js";
import { cancelReelUnitAttempt } from "../../shortReel/unitLifecycle.js";
import { executeReelGeneration } from "../../shortReel/generationWorkflow.js";
import type { TaskManager } from "../../tasks/manager.js";
import type { ShortReelsRouteDeps } from "./shortReelsTypes.js";

export type ReplayCheckResult =
  | { kind: "replay"; statusCode: number; body: unknown }
  | { kind: "active_conflict" }
  | { kind: "none" };

export function checkTaskReplayOrConflict(
  tasks: TaskManager,
  channelId: string,
  reelId: string,
  parsedBody: GenerateShortReelRequest,
  reel: ShortReelRecord,
): ReplayCheckResult {
  const reelTasks = tasks.list().filter((task) => task.channel_id === channelId && task.reel_id === reelId);
  const replay = reelTasks.find((task) => task.short_reel_request?.request_id === parsedBody.request_id);

  if (replay) {
    const normalizedRequestedMode = parsedBody.mode ?? (parsedBody.target === "package" ? "repair" : "regenerate");
    const replayReq = replay.short_reel_request;
    const normalizedReplayMode = replayReq?.mode ?? (replayReq?.target === "package" ? "repair" : "regenerate");

    if (
      replayReq?.expected_revision !== parsedBody.expected_revision ||
      replayReq?.target !== parsedBody.target ||
      normalizedReplayMode !== normalizedRequestedMode
    ) {
      return {
        kind: "replay",
        statusCode: 409,
        body: { error: "Request ID was already used with a different generation request", code: "IDEMPOTENCY_CONFLICT" },
      };
    }
    return { kind: "replay", statusCode: 202, body: { task: replay, short_reel: reel } };
  }

  const active = reelTasks.find((task) => ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(task.status));
  if (active) {
    return { kind: "active_conflict" };
  }

  return { kind: "none" };
}

export async function runDirectFallbackGeneration(
  deps: ShortReelsRouteDeps,
  key: ReelKey,
  parsedBody: GenerateShortReelRequest,
): Promise<ShortReelRecord | { unavailableError: string }> {
  if (deps.executor) {
    return await deps.executor(deps.repository, key, parsedBody, {
      llmClient: (deps.llmClient ?? undefined) as any,
      imageClient: (deps.imageClient ?? undefined) as any,
      signal: new AbortController().signal,
      onProgress: async () => {},
    });
  }
  if (parsedBody.target === "cover") {
    return await generateReelCover(deps.repository, key, "cover-" + randomUUID());
  }
  if (parsedBody.target === "references") {
    return await generateReelReferencesUnit(deps.repository, key, "references-" + randomUUID());
  }
  if (parsedBody.target === "publishing") {
    return await generateReelPublishingUnit(deps.repository, key, "publishing-" + randomUUID(), {
      llmClient: deps.llmClient ?? undefined,
    });
  }
  if (parsedBody.target === "script") {
    if (!deps.llmClient) {
      return { unavailableError: "LLM client is unavailable to generate script." };
    }
    return await generateReelScriptUnit(deps.repository, key, "script-" + randomUUID(), deps.llmClient);
  }
  if (!deps.llmClient) {
    return { unavailableError: "Generation service is unavailable. LLM client is required." };
  }
  return await executeReelGeneration(deps.repository, key, parsedBody, {
    llmClient: deps.llmClient,
    imageClient: (deps.imageClient ?? undefined) as any,
    signal: new AbortController().signal,
    onProgress: async () => {},
  });
}

export function buildSyntheticCompletedTask(channelId: string, reelId: string, parsedBody: GenerateShortReelRequest): Task {
  return TaskSchema.parse({
    task_id: `task-${parsedBody.request_id}`,
    task_type: "GENERATE_SHORT_REEL_PACKAGE",
    channel_id: channelId,
    episode_id: null,
    reel_id: reelId,
    short_reel_request: parsedBody,
    status: "COMPLETED",
    created_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    lock_key: `${reelId}:reel`,
    progress_message: "Completed",
  });
}

export async function cancelMatchingPendingUnits(
  repository: RepositoryService,
  key: ReelKey,
  reel: ShortReelRecord,
  operationId: string,
  cancelledTask: Task | null,
): Promise<ShortReelRecord> {
  let updatedReel = reel;
  const unitKeys = ["script", "references", "cover", "publishing"] as const;
  for (const unitKey of unitKeys) {
    const unit = updatedReel.units[unitKey];
    if (unit.state === "pending" && unit.current_attempt) {
      const shouldCancel = unit.current_attempt.operation_id === operationId || cancelledTask !== null;
      if (shouldCancel) {
        updatedReel = await cancelReelUnitAttempt(repository, key, unitKey, unit.current_attempt.operation_id);
      }
    }
  }
  return updatedReel;
}

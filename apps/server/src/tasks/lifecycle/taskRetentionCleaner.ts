import { FAILED_BUILD_RETENTION_MS, type Task } from "@studio/shared";
import { RepositoryError } from "../../repository.js";
import type { TaskManagerRuntime } from "../runtime.js";
import { ACTIVE_TASK_STATUSES, removeEpisodeTaskRecords } from "./taskPruning.js";

const BUILD_TASK_TYPES = new Set<Task["task_type"]>(["GENERATE_PIPELINE", "GENERATE_VIDEO"]);

export type FailedBuildCandidate = {
  channelId: string;
  episodeId: string;
  failedAt: string;
};

export function startFailedBuildCleanupTimer(this: TaskManagerRuntime): void {
  if (this.failedBuildCleanupTimer) return;
  this.failedBuildCleanupTimer = setInterval(
    () => {
      void this.cleanupExpiredFailedBuilds();
    },
    15 * 60 * 1000,
  );
  this.failedBuildCleanupTimer.unref?.();
}

export function collectFailedBuildCandidates(
  tasks: Task[],
  nowMs = Date.now(),
  retentionMs = FAILED_BUILD_RETENTION_MS,
): FailedBuildCandidate[] {
  const episodeTasks = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.episode_id) continue;
    const current = episodeTasks.get(task.episode_id) ?? [];
    current.push(task);
    episodeTasks.set(task.episode_id, current);
  }

  const candidates: FailedBuildCandidate[] = [];
  for (const [episodeId, relatedTasks] of episodeTasks) {
    if (relatedTasks.some((task) => ACTIVE_TASK_STATUSES.has(task.status))) continue;
    const buildTasks = relatedTasks.filter((task) => BUILD_TASK_TYPES.has(task.task_type));
    if (buildTasks.some((task) => task.task_type === "GENERATE_VIDEO" && task.status === "COMPLETED")) continue;
    const latestBuild = [...buildTasks].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (!latestBuild || latestBuild.status !== "FAILED" || !latestBuild.completed_at) continue;
    const failedAtMs = Date.parse(latestBuild.completed_at);
    if (Number.isNaN(failedAtMs) || nowMs - failedAtMs < retentionMs) continue;
    candidates.push({ channelId: latestBuild.channel_id, episodeId, failedAt: latestBuild.completed_at });
  }
  return candidates;
}

export const findExpiredFailedBuilds = collectFailedBuildCandidates;

export async function deleteFailedBuildDirectories(runtime: TaskManagerRuntime, candidate: FailedBuildCandidate): Promise<boolean> {
  try {
    await runtime.repository.deleteEpisode(candidate.channelId, candidate.episodeId, true);
    return true;
  } catch (error) {
    const missingCode = error instanceof RepositoryError ? error.code : null;
    if (missingCode !== "EPISODE_NOT_FOUND" && missingCode !== "CHANNEL_NOT_FOUND") {
      runtime.logger.warn(`Failed build cleanup deferred: ${error instanceof Error ? error.message : "unknown error"}`, {
        profileId: candidate.channelId,
        step: "failed_build_cleanup",
      });
      return false;
    }
    await runtime.repository.removeEpisodeRuntimeArtifacts(candidate.episodeId);
    if (missingCode !== "CHANNEL_NOT_FOUND") {
      await runtime.repository.removeQuestionHistoryEntries(candidate.channelId, { episodeIds: [candidate.episodeId] });
    }
    return true;
  }
}

export async function cleanupExpiredFailedBuilds(
  this: TaskManagerRuntime,
  nowMs = Date.now(),
): Promise<{ removedEpisodes: number; removedTasks: number }> {
  const candidates = collectFailedBuildCandidates(this.list(), nowMs);
  const removedTaskIds: string[] = [];
  const removedEpisodeIds: string[] = [];

  for (const candidate of candidates) {
    const deleted = await deleteFailedBuildDirectories(this, candidate);
    if (!deleted) {
      continue;
    }

    const relatedTaskIds = await removeEpisodeTaskRecords.call(this, candidate.episodeId);
    removedTaskIds.push(...relatedTaskIds);
    removedEpisodeIds.push(candidate.episodeId);
    this.logger.ok("Expired failed build and generated assets removed", {
      profileId: candidate.channelId,
      workerId: candidate.episodeId,
      step: "failed_build_cleanup",
    });
  }

  if (removedTaskIds.length > 0) {
    this.emitEvent({ type: "tasks.pruned", task_ids: removedTaskIds, episode_ids: removedEpisodeIds });
  }
  return { removedEpisodes: removedEpisodeIds.length, removedTasks: removedTaskIds.length };
}

import { rm } from "node:fs/promises";
import { FAILED_BUILD_RETENTION_MS, type Task } from "@studio/shared";
import { RepositoryError } from "../repository.js";
import type { TaskManagerRuntime } from "./runtime.js";

const buildTaskTypes = new Set<Task["task_type"]>(["GENERATE_PIPELINE", "GENERATE_VIDEO"]);
const activeStatuses = new Set<Task["status"]>(["QUEUED", "RUNNING", "WAITING_APPROVAL"]);

export type FailedBuildCandidate = {
  channelId: string;
  episodeId: string;
  failedAt: string;
};

export function findExpiredFailedBuilds(
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
    if (relatedTasks.some((task) => activeStatuses.has(task.status))) continue;
    const buildTasks = relatedTasks.filter((task) => buildTaskTypes.has(task.task_type));
    if (buildTasks.some((task) => task.task_type === "GENERATE_VIDEO" && task.status === "COMPLETED")) continue;
    const latestBuild = [...buildTasks].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (!latestBuild || latestBuild.status !== "FAILED" || !latestBuild.completed_at) continue;
    const failedAtMs = Date.parse(latestBuild.completed_at);
    if (Number.isNaN(failedAtMs) || nowMs - failedAtMs < retentionMs) continue;
    candidates.push({ channelId: latestBuild.channel_id, episodeId, failedAt: latestBuild.completed_at });
  }
  return candidates;
}

export async function reconcileQuestionHistory(this: TaskManagerRuntime): Promise<void> {
  const tasksByChannel = new Map<string, Task[]>();
  for (const task of this.list()) {
    const current = tasksByChannel.get(task.channel_id) ?? [];
    current.push(task);
    tasksByChannel.set(task.channel_id, current);
  }

  for (const [channelId, tasks] of tasksByChannel) {
    try {
      await reconcileChannelQuestionHistory.call(this, channelId, tasks);
    } catch (error) {
      if (error instanceof RepositoryError && error.code === "CHANNEL_NOT_FOUND") continue;
      throw error;
    }
  }
}

async function reconcileChannelQuestionHistory(this: TaskManagerRuntime, channelId: string, tasks: Task[]): Promise<void> {
  const rejectedRenders = tasks.filter(
    (task) => task.task_type === "GENERATE_VIDEO" && task.status !== "COMPLETED" && !activeStatuses.has(task.status),
  );
  const successfulEpisodeIds = new Set(
    tasks
      .filter((task) => task.task_type === "GENERATE_VIDEO" && task.status === "COMPLETED" && task.episode_id)
      .map((task) => task.episode_id!),
  );
  const legacyFailedEpisodeIds = rejectedRenders
    .map((task) => task.episode_id)
    .filter((episodeId): episodeId is string => Boolean(episodeId && !successfulEpisodeIds.has(episodeId)));
  if (rejectedRenders.length > 0) {
    await this.repository.removeQuestionHistoryEntries(channelId, {
      renderTaskIds: rejectedRenders.map((task) => task.task_id),
      episodeIds: legacyFailedEpisodeIds,
    });
  }
  await restoreLatestCompletedRenderHistory.call(this, channelId, tasks);
}

async function restoreLatestCompletedRenderHistory(this: TaskManagerRuntime, channelId: string, tasks: Task[]): Promise<void> {
  const latestByEpisode = new Map<string, Task>();
  for (const task of tasks.filter((item) => item.task_type === "GENERATE_VIDEO" && item.episode_id)) {
    const current = latestByEpisode.get(task.episode_id!);
    if (!current || task.created_at > current.created_at) latestByEpisode.set(task.episode_id!, task);
  }
  const history = await this.repository.readQuestionHistory(channelId);
  const historyTaskIds = new Set(history.map((entry) => entry.render_task_id).filter(Boolean));
  const historyCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const task of latestByEpisode.values()) {
    if (task.status !== "COMPLETED" || !task.completed_at || historyTaskIds.has(task.task_id)) continue;
    if (Date.parse(task.completed_at) < historyCutoff) continue;
    const quiz = await this.repository.readQuiz(channelId, task.episode_id!);
    if (quiz?.questions.length) {
      await this.repository.appendQuestionHistory(channelId, task.episode_id!, quiz.questions, 30, task.task_id);
    }
  }
}

export async function cleanupExpiredFailedBuilds(
  this: TaskManagerRuntime,
  nowMs = Date.now(),
): Promise<{ removedEpisodes: number; removedTasks: number }> {
  const candidates = findExpiredFailedBuilds(this.list(), nowMs);
  const removedTaskIds: string[] = [];
  const removedEpisodeIds: string[] = [];

  for (const candidate of candidates) {
    try {
      await this.repository.deleteEpisode(candidate.channelId, candidate.episodeId, true);
    } catch (error) {
      const missingCode = error instanceof RepositoryError ? error.code : null;
      if (missingCode !== "EPISODE_NOT_FOUND" && missingCode !== "CHANNEL_NOT_FOUND") {
        this.logger.warn(`Failed build cleanup deferred: ${error instanceof Error ? error.message : "unknown error"}`, {
          profileId: candidate.channelId,
          step: "failed_build_cleanup",
        });
        continue;
      }
      await this.repository.removeEpisodeRuntimeArtifacts(candidate.episodeId);
      if (missingCode !== "CHANNEL_NOT_FOUND") {
        await this.repository.removeQuestionHistoryEntries(candidate.channelId, { episodeIds: [candidate.episodeId] });
      }
    }

    const relatedTasks = this.list().filter((task) => task.episode_id === candidate.episodeId);
    await Promise.all(
      relatedTasks.map((task) => rm(this.repository.resolvePath("runtime", "tasks", `${task.task_id}.json`), { force: true })),
    );
    for (const task of relatedTasks) {
      this.tasks.delete(task.task_id);
      removedTaskIds.push(task.task_id);
    }
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

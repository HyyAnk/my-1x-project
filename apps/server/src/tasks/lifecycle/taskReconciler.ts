import { rm } from "node:fs/promises";
import type { Channel, Task } from "@studio/shared";
import { RepositoryError } from "../../repository.js";
import { failReelUnitAttempt } from "../../shortReel/unitLifecycle.js";
import type { TaskManagerRuntime } from "../runtime.js";
import { pruneStaleHyperframesDirectories } from "../storage/artifactRetentionPruner.js";
import { ACTIVE_TASK_STATUSES, abortAndCleanupTaskResources } from "./taskPruning.js";

async function collectValidEntityIds(
  repository: TaskManagerRuntime["repository"],
  channels: Channel[],
): Promise<{ validChannelIds: Set<string>; validEpisodeIds: Set<string> }> {
  const validChannelIds = new Set(channels.map((c) => c.channel_id));
  const validEpisodeIds = new Set<string>();

  for (const channel of channels) {
    try {
      const episodes = await repository.listEpisodes(channel.channel_id);
      for (const episode of episodes) {
        validEpisodeIds.add(episode.episode_id);
      }
    } catch {
      // Ignore individual channel listing errors
    }
  }

  return { validChannelIds, validEpisodeIds };
}

export async function reconcileOrphanedTasks(this: TaskManagerRuntime): Promise<{ removedEpisodes: number; removedTasks: number }> {
  let channels: Channel[];
  try {
    channels = await this.repository.listChannels(true);
  } catch (error) {
    this.logger.warn(`Failed to list channels for task orphan reconciliation: ${error instanceof Error ? error.message : "unknown error"}`);
    return { removedEpisodes: 0, removedTasks: 0 };
  }

  const { validChannelIds, validEpisodeIds } = await collectValidEntityIds(this.repository, channels);

  await reconcileInterruptedShortReelTasks(this, channels);

  const orphanedTasks = this.list().filter((task) => {
    if (task.channel_id && !validChannelIds.has(task.channel_id)) {
      return true;
    }
    if (task.episode_id && !validEpisodeIds.has(task.episode_id)) {
      return true;
    }
    return false;
  });

  if (orphanedTasks.length === 0) {
    return { removedEpisodes: 0, removedTasks: 0 };
  }

  const removedTaskIds = orphanedTasks.map((task) => task.task_id);
  const removedEpisodeIds = [...new Set(orphanedTasks.map((t) => t.episode_id).filter(Boolean) as string[])];

  await Promise.all(removedTaskIds.map((taskId) => rm(this.repository.resolvePath("runtime", "tasks", `${taskId}.json`), { force: true })));

  abortAndCleanupTaskResources(this, orphanedTasks);

  this.logger.info(
    `Reconciled orphaned tasks: removed ${removedTaskIds.length} tasks across ${removedEpisodeIds.length} missing episodes`,
    { step: "task_reconciliation" },
  );

  this.emitEvent({
    type: "tasks.pruned",
    task_ids: removedTaskIds,
    episode_ids: removedEpisodeIds,
  });

  return {
    removedEpisodes: removedEpisodeIds.length,
    removedTasks: removedTaskIds.length,
  };
}

export async function reconcileInterruptedShortReelTasks(runtime: TaskManagerRuntime, channels: Channel[]): Promise<void> {
  for (const task of runtime.list()) {
    if (
      (task.task_type === "GENERATE_SHORT_REEL" || task.task_type === "GENERATE_SHORT_REEL_PACKAGE") &&
      ACTIVE_TASK_STATUSES.has(task.status)
    ) {
      await runtime.finish(task.task_id, "FAILED", "Task was interrupted by server restart");
    }
  }

  for (const channel of channels) {
    try {
      const reels = await runtime.repository.listShortReels(channel.channel_id);
      for (const reel of reels) {
        const key = { channel_id: channel.channel_id, reel_id: reel.reel_id };
        const unitKeys = ["script", "references", "cover", "publishing"] as const;
        for (const unitKey of unitKeys) {
          const unit = reel.units[unitKey];
          if (unit.state === "pending" && unit.current_attempt) {
            try {
              await failReelUnitAttempt(runtime.repository, key, unitKey, unit.current_attempt.operation_id, "ABORTED");
            } catch (error) {
              runtime.logger.warn(
                `Failed to reconcile interrupted Short-Reel unit: ${error instanceof Error ? error.message : "unknown error"}`,
                { profileId: channel.channel_id, step: "short_reel_reconciliation" },
              );
            }
          }
        }
      }
    } catch (error) {
      runtime.logger.warn(
        `Failed to inspect Short-Reels during restart reconciliation: ${error instanceof Error ? error.message : "unknown error"}`,
        { profileId: channel.channel_id, step: "short_reel_reconciliation" },
      );
    }
  }
}

async function reconcileChannelQuestionHistory(this: TaskManagerRuntime, channelId: string, tasks: Task[]): Promise<void> {
  const rejectedRenders = tasks.filter(
    (task) => task.task_type === "GENERATE_VIDEO" && task.status !== "COMPLETED" && !ACTIVE_TASK_STATUSES.has(task.status),
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
      await this.repository.appendQuestionHistory(channelId, task.episode_id!, quiz.questions, 30, task.task_id, "episode");
    }
  }
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

export async function reconcileStartupState(
  this: TaskManagerRuntime | void,
  runtimeArg?: TaskManagerRuntime,
): Promise<{ prunedDirs: string[]; reclaimedBytes: number }> {
  const runtime = (this as TaskManagerRuntime) || runtimeArg;
  if (!runtime) {
    return { prunedDirs: [], reclaimedBytes: 0 };
  }
  const hyperframesRoot = runtime.repository.resolvePath("runtime", "hyperframes");
  const activeEpisodeIds = new Set(
    runtime
      .list()
      .filter((task) => ACTIVE_TASK_STATUSES.has(task.status) && task.episode_id)
      .map((task) => task.episode_id as string),
  );
  try {
    const result = await pruneStaleHyperframesDirectories(hyperframesRoot, undefined, activeEpisodeIds);
    if (result.prunedDirs.length > 0) {
      runtime.logger.info(
        `Startup hyperframes pruning: cleaned ${result.prunedDirs.length} stale directories, reclaimed ${result.reclaimedBytes} bytes`,
        { step: "startup_reconciliation" },
      );
    }
    return result;
  } catch (error) {
    runtime.logger.warn(`Stale hyperframes pruning failed during startup: ${error instanceof Error ? error.message : "unknown error"}`, {
      step: "startup_reconciliation",
    });
    return { prunedDirs: [], reclaimedBytes: 0 };
  }
}

import { rm } from "node:fs/promises";
import type { Task } from "@studio/shared";
import { RepositoryError } from "../../repository.js";
import type { TaskManagerRuntime } from "../runtime.js";

export const ACTIVE_TASK_STATUSES = new Set<Task["status"]>(["QUEUED", "RUNNING", "WAITING_APPROVAL"]);

export function hasActiveEpisodeTasks(this: TaskManagerRuntime, episodeId: string): boolean {
  return this.list().some((task) => task.episode_id === episodeId && ACTIVE_TASK_STATUSES.has(task.status));
}

export function hasActiveChannelTasks(this: TaskManagerRuntime, channelId: string): boolean {
  return this.list().some((task) => task.channel_id === channelId && ACTIVE_TASK_STATUSES.has(task.status));
}

export function abortAndCleanupTaskResources(runtime: TaskManagerRuntime, tasks: Task[]): void {
  for (const task of tasks) {
    const imgCtrl = runtime.activeImageControllers.get(task.task_id);
    if (imgCtrl) {
      imgCtrl.abort();
      runtime.activeImageControllers.delete(task.task_id);
    }
    const vidCtrl = runtime.activeVideoControllers.get(task.task_id);
    if (vidCtrl) {
      vidCtrl.abort();
      runtime.activeVideoControllers.delete(task.task_id);
    }
    runtime.tasks.delete(task.task_id);
    runtime.imageVariants.delete(task.task_id);
    runtime.topicHints.delete(task.task_id);
  }
}

export async function removeEpisodeTaskRecords(this: TaskManagerRuntime, episodeId: string): Promise<string[]> {
  const relatedTasks = this.list().filter((task) => task.episode_id === episodeId);
  const taskIds = relatedTasks.map((task) => task.task_id);
  await Promise.all(taskIds.map((taskId) => rm(this.repository.resolvePath("runtime", "tasks", `${taskId}.json`), { force: true })));

  for (const task of relatedTasks) {
    this.tasks.delete(task.task_id);
    this.imageVariants.delete(task.task_id);
    this.topicHints.delete(task.task_id);
  }

  return taskIds;
}

export async function pruneEpisodeTasks(this: TaskManagerRuntime, episodeId: string): Promise<string[]> {
  if (hasActiveEpisodeTasks.call(this, episodeId)) {
    throw new RepositoryError("Episode has active tasks. Cancel them before deleting the episode", "EPISODE_TASK_ACTIVE");
  }

  const taskIds = await removeEpisodeTaskRecords.call(this, episodeId);
  if (taskIds.length > 0) {
    this.emitEvent({ type: "tasks.pruned", task_ids: taskIds, episode_ids: [episodeId] });
  }
  return taskIds;
}

export async function pruneChannelTasks(this: TaskManagerRuntime, channelId: string): Promise<string[]> {
  if (hasActiveChannelTasks.call(this, channelId)) {
    throw new RepositoryError("Channel has active tasks. Cancel them before deleting the channel", "CHANNEL_TASK_ACTIVE");
  }

  const relatedTasks = this.list().filter((task) => task.channel_id === channelId);
  const taskIds = relatedTasks.map((task) => task.task_id);
  await Promise.all(taskIds.map((taskId) => rm(this.repository.resolvePath("runtime", "tasks", `${taskId}.json`), { force: true })));

  abortAndCleanupTaskResources(this, relatedTasks);

  if (taskIds.length > 0) {
    const episodeIds = [...new Set(relatedTasks.map((t) => t.episode_id).filter(Boolean) as string[])];
    this.emitEvent({ type: "tasks.pruned", task_ids: taskIds, episode_ids: episodeIds });
  }
  return taskIds;
}

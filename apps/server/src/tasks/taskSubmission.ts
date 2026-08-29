import { TaskSchema, makeId, nowIso, type Task, type TaskType } from "@studio/shared";
import { RepositoryError } from "../repository.js";
import { channelTaskTypes } from "./taskQueuePump.js";
import type { TaskManagerRuntime } from "./runtime.js";

export function submitTask(
  runtime: TaskManagerRuntime,
  taskType: TaskType,
  channelId: string,
  episodeId: string | null,
  sceneNumber?: number,
  requestedImageVariant?: number,
  topicHint?: string,
): Task {
  if (taskType === "GENERATE_BUNDLE_IMAGE" && !runtime.imageConfig.enabled)
    throw new RepositoryError("Image generation is disabled in Settings", "IMAGE_GENERATION_DISABLED");

  const imageVariant =
    taskType === "GENERATE_BUNDLE_IMAGE" && episodeId && sceneNumber
      ? (requestedImageVariant ??
        runtime
          .list()
          .filter(
            (item) =>
              item.task_type === "GENERATE_BUNDLE_IMAGE" &&
              item.episode_id === episodeId &&
              item.scene_number === sceneNumber &&
              ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(item.status),
          ).length % Math.max(1, runtime.imageConfig.images_per_bundle))
      : 0;

  const lockKey =
    taskType === "GENERATE_PIPELINE" && episodeId
      ? `${episodeId}:pipeline`
      : taskType === "GENERATE_SEQUENCE_SCENES" && episodeId && sceneNumber
        ? `${episodeId}:sequence:${sceneNumber}`
        : taskType === "GENERATE_BUNDLE_IMAGE" && episodeId && sceneNumber
          ? `${episodeId}:bundle:${sceneNumber}:variant:${imageVariant}`
          : channelTaskTypes.has(taskType)
            ? channelId
            : episodeId;

  if (!lockKey) throw new RepositoryError("Episode is required for this task", "EPISODE_REQUIRED");

  if (
    taskType === "GENERATE_PIPELINE" &&
    runtime.list().some((item) => item.lock_key === lockKey && ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(item.status))
  ) {
    throw new RepositoryError("Production pipeline is already running for this episode", "PIPELINE_ACTIVE");
  }

  const existingQueue = runtime.list().filter((task) => task.lock_key === lockKey && task.status === "QUEUED").length;

  const previousMatchingTasks = runtime
    .list()
    .filter(
      (item) =>
        item.lock_key === lockKey &&
        item.channel_id === channelId &&
        item.episode_id === episodeId &&
        item.task_type === taskType &&
        item.scene_number === (sceneNumber ?? null) &&
        ["FAILED", "CANCELLED", "COMPLETED"].includes(item.status),
    );

  const latestPreviousTask = previousMatchingTasks.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  let accumulatedDuration = 0;
  if (latestPreviousTask) {
    const start = latestPreviousTask.started_at || latestPreviousTask.created_at;
    const end = latestPreviousTask.completed_at || nowIso();
    const elapsed = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000));
    accumulatedDuration = (latestPreviousTask.accumulated_duration_seconds || 0) + elapsed;
  }

  const task = TaskSchema.parse({
    task_id: makeId("task"),
    task_type: taskType,
    channel_id: channelId,
    episode_id: episodeId,
    status: "QUEUED",
    created_at: nowIso(),
    started_at: null,
    completed_at: null,
    codex_thread_id: null,
    codex_turn_id: null,
    error: null,
    output_files: [],
    lock_key: lockKey,
    queue_position: existingQueue,
    progress_message: "Queued",
    scene_number: sceneNumber ?? null,
    accumulated_duration_seconds: accumulatedDuration,
  });

  if (taskType === "GENERATE_BUNDLE_IMAGE") runtime.imageVariants.set(task.task_id, imageVariant);
  if (taskType === "SUGGEST_TOPICS" && topicHint?.trim()) runtime.topicHints.set(task.task_id, topicHint.trim());

  return task;
}

export async function cancelTask(runtime: TaskManagerRuntime, taskId: string): Promise<Task> {
  const task = runtime.get(taskId);
  if (task.status === "QUEUED") {
    await runtime.update(taskId, { status: "CANCELLED", completed_at: nowIso(), progress_message: "Cancelled before start" });
    runtime.imageVariants.delete(taskId);
    runtime.topicHints.delete(taskId);
    return runtime.get(taskId);
  }

  const active = runtime.active.get(taskId);
  if (active) {
    await runtime.update(taskId, { progress_message: "Interrupting task" });
    await runtime.codex.interruptTurn(active.threadId, active.turnId).catch(() => undefined);
    await runtime.finish(taskId, "CANCELLED", "Cancelled by user");
  } else if (runtime.activeAudio.has(taskId)) {
    await runtime.finish(taskId, "CANCELLED", "Cancelled by user");
  } else if (runtime.activeImageControllers.has(taskId)) {
    await runtime.update(taskId, { status: "CANCELLED", progress_message: "Interrupting image generation" });
    runtime.activeImageControllers.get(taskId)?.abort();
    await runtime.finish(taskId, "CANCELLED", "Cancelled by user");
  } else {
    const pipeline = runtime.pipelineRuns.get(taskId);
    if (pipeline) {
      pipeline.cancelled = true;
      await Promise.all([...pipeline.children].map((childId) => runtime.cancel(childId).catch(() => undefined)));
    }
  }
  return runtime.get(taskId);
}

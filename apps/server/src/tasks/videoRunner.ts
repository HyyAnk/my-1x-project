import { nowIso, type Task } from "@studio/shared";
import type { TaskManagerRuntime } from "./runtime.js";
import { videoRenderConcurrencyLimiter } from "./video/renderConcurrencyLimiter.js";
import { cleanOrphanedHeadlessBrowsers } from "../infrastructure/executables/browserProcessCleaner.js";
import {
  ensureVideoTaskActive,
  finalizeRenderOutputs,
  loadRenderInputs,
  recordPostRenderHistory,
  renderProductVideo,
} from "./video/videoRenderSteps.js";

async function acquireRenderSlotWithProgress(runtime: TaskManagerRuntime, taskId: string, signal: AbortSignal): Promise<() => void> {
  const limiter = runtime.videoRenderLimiter ?? videoRenderConcurrencyLimiter;
  if (runtime.videoConfig?.max_concurrent_tasks && !process.env.MAX_CONCURRENT_VIDEO_RENDERS) {
    limiter.setMaxConcurrency(runtime.videoConfig.max_concurrent_tasks);
  }
  const release = await limiter.acquireSlot(
    taskId,
    async (pos) => {
      await runtime.update(taskId, {
        queue_position: pos,
        progress_message: `Queued · Waiting for available render slot (position ${pos})`,
        progress_percent: 4,
      });
    },
    signal,
  );
  ensureVideoTaskActive(runtime, taskId, signal);
  await runtime.update(taskId, { queue_position: null, progress_message: "Preparing Quiz composition", progress_percent: 5 });
  return release;
}

async function handleVideoFailure(runtime: TaskManagerRuntime, task: Task, controller: AbortController, error: unknown): Promise<void> {
  const context = { profileId: task.channel_id, workerId: task.task_id, step: "render_video" };
  const message = error instanceof Error ? error.message : "Video render failed";
  const current = runtime.get(task.task_id);
  if (controller.signal.aborted || current.status === "CANCELLED") {
    if (current.status !== "CANCELLED") await runtime.finish(task.task_id, "CANCELLED", "Cancelled by user");
    runtime.logger.warn("Video render cancelled", context);
    return;
  }
  if (task.episode_id) {
    await runtime.repository.removeQuestionHistoryEntries(task.channel_id, { renderTaskIds: [task.task_id] }).catch((historyError) => {
      runtime.logger.warn(`Question history rollback deferred: ${historyError instanceof Error ? historyError.message : "unknown error"}`, {
        ...context,
        step: "question_history_rollback",
      });
    });
  }
  await runtime.finish(task.task_id, "FAILED", message);
  runtime.logger.error(message, context);
}

function releaseRenderResources(runtime: TaskManagerRuntime, taskId: string, releaseSlot: (() => void) | null): void {
  try {
    if (releaseSlot) releaseSlot();
    else (runtime.videoRenderLimiter ?? videoRenderConcurrencyLimiter).releaseSlot(taskId);
  } catch {
    // Ignore release error
  }
}

/** Renders an Episode or a Quiz Short; the product kind on the task selects record, canvas and history type. */
export async function runVideoTask(this: TaskManagerRuntime, task: Task): Promise<void> {
  const context = { profileId: task.channel_id, workerId: task.task_id, step: "render_video" };
  const controller = new AbortController();
  this.activeVideoControllers.set(task.task_id, controller);
  let releaseSlot: (() => void) | null = null;
  try {
    await this.update(task.task_id, {
      status: "RUNNING",
      started_at: nowIso(),
      queue_position: null,
      progress_message: "Preparing Quiz composition",
      progress_percent: 5,
      render_progress: null,
    });
    ensureVideoTaskActive(this, task.task_id, controller.signal);
    const { product, scenes } = await loadRenderInputs(this, task);
    releaseSlot = await acquireRenderSlotWithProgress(this, task.task_id, controller.signal);
    const rendered = await renderProductVideo(this, task, controller.signal, product, scenes);
    await finalizeRenderOutputs(this, task, product, rendered);
    ensureVideoTaskActive(this, task.task_id, controller.signal);
    await this.finish(task.task_id, "COMPLETED", null, [rendered.videoPath, rendered.manifestPath]);
    await recordPostRenderHistory(this, task, product, rendered.comp);
    this.logger.ok("Quiz video rendered", context);
  } catch (error) {
    await handleVideoFailure(this, task, controller, error);
  } finally {
    releaseRenderResources(this, task.task_id, releaseSlot);
    if (this.activeVideoControllers.get(task.task_id) === controller) this.activeVideoControllers.delete(task.task_id);
    if (controller.signal.aborted || this.activeVideoControllers.size === 0) {
      await cleanOrphanedHeadlessBrowsers({ logger: this.logger }).catch(() => {});
    }
  }
}

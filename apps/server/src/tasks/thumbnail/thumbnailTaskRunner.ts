import { nowIso, type Task } from "@studio/shared";
import { ensureEpisodeThumbnail } from "../../quiz/thumbnail/ensureEpisodeThumbnail.js";
import { refreshEpisodeExport } from "../export/episodeExportPackager.js";
import type { TaskManagerRuntime } from "../runtime.js";
import { recordIndependentStageTiming } from "../pipeline/independentStageTiming.js";

export async function runThumbnailTask(runtime: TaskManagerRuntime, task: Task): Promise<void> {
  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15 * 60_000)]);
  runtime.activeImageControllers.set(task.task_id, controller);
  const started = Date.now();
  const context = { profileId: task.channel_id, workerId: task.task_id, step: "thumbnail" };
  try {
    if (!task.episode_id) throw new Error("Episode is required for thumbnail generation");
    if (runtime.get(task.task_id).status === "CANCELLED") return;
    await runtime.update(task.task_id, {
      status: "RUNNING",
      started_at: nowIso(),
      queue_position: null,
      progress_message: "Generating thumbnail",
      progress_percent: null,
    });
    runtime.logger.info("Starting thumbnail: profiles=1, mode=background, concurrency=image queue, method=provider API", context);
    await recordIndependentStageTiming(runtime.repository, task, "thumbnail", started, false);
    const manifest = await ensureEpisodeThumbnail(runtime.repository, {
      channelId: task.channel_id,
      episodeId: task.episode_id,
      activeEngine: runtime.activeEngine,
      antigravityClient: runtime.antigravity,
      imageConfig: runtime.imageConfig,
      imageFallbackConfig: runtime.imageFallbackConfig,
      signal,
    });
    signal.throwIfAborted();
    await runtime.update(task.task_id, { progress_message: "Updating thumbnail export" });
    await refreshEpisodeExport({ repository: runtime.repository, channelId: task.channel_id, episodeId: task.episode_id });
    signal.throwIfAborted();
    await recordIndependentStageTiming(runtime.repository, task, "thumbnail", started, true);
    const outputs = [manifest?.asset_path_16_9, manifest?.asset_path_9_16].filter((value): value is string => Boolean(value));
    await runtime.finish(task.task_id, "COMPLETED", null, outputs);
    runtime.logger.ok(
      `Thumbnail finished: total=1, success=1, failed=0, skipped=0, elapsed=${Math.round((Date.now() - started) / 1000)}s`,
      context,
    );
  } catch (error) {
    const cancelled = controller.signal.aborted || runtime.get(task.task_id).status === "CANCELLED";
    const message = cancelled
      ? "Cancelled by user"
      : `${error instanceof Error ? error.message : "Thumbnail failed"}. Retry thumbnail generation.`;
    await recordIndependentStageTiming(runtime.repository, task, "thumbnail", started, true).catch((timingError: unknown) => {
      runtime.logger.warn(
        `Thumbnail timing unavailable: ${timingError instanceof Error ? timingError.message : String(timingError)}`,
        context,
      );
    });
    await runtime.finish(task.task_id, cancelled ? "CANCELLED" : "FAILED", message);
    runtime.logger.warn(
      `Thumbnail finished: total=1, success=0, failed=${cancelled ? 0 : 1}, skipped=${cancelled ? 1 : 0}, elapsed=${Math.round((Date.now() - started) / 1000)}s. ${message}`,
      context,
    );
  } finally {
    if (runtime.activeImageControllers.get(task.task_id) === controller) runtime.activeImageControllers.delete(task.task_id);
  }
}

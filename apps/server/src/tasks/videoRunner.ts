import path from "node:path";
import { MASCOT_CANVAS_SIZES, nowIso, type Task } from "@studio/shared";
import { RepositoryError } from "../repository.js";
import type { TaskManagerRuntime } from "./runtime.js";
import { verifyAndCheckLayout } from "./video/videoLayoutChecker.js";
import { prepareVideoComposition } from "./video/videoCompositionPreparer.js";
import { executeHyperframesRender } from "./video/videoRenderExecution.js";
import { persistVideoRenderArtifacts } from "./video/renderManifestWriter.js";
import { videoRenderConcurrencyLimiter } from "./video/renderConcurrencyLimiter.js";
import { pruneRenderRootIntermediateFiles } from "./storage/artifactRetentionPruner.js";

function ensureVideoTaskActive(runtime: TaskManagerRuntime, taskId: string, signal: AbortSignal): void {
  if (signal.aborted || runtime.get(taskId).status === "CANCELLED") throw new Error("Video render cancelled");
}

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
  await runtime.update(taskId, {
    queue_position: null,
    progress_message: "Preparing Quiz composition",
    progress_percent: 5,
  });
  return release;
}

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
    if (!task.episode_id) throw new RepositoryError("Episode is required", "EPISODE_REQUIRED");
    const episode = await this.repository.getEpisode(task.channel_id, task.episode_id);
    const channel = await this.repository.getChannel(task.channel_id);
    const scenes = await this.repository.readScenes(task.channel_id, task.episode_id);
    if (!(await this.hasValidNarrationAsset(task.channel_id, task.episode_id, episode.narration_asset_path)))
      throw new RepositoryError("Generate the Chatterbox narration before rendering video", "NARRATION_REQUIRED");
    if (scenes.length === 0) throw new RepositoryError("Generate Quiz scenes before rendering video", "SCENES_REQUIRED");

    const renderAspectRatio = episode.quiz_config?.render_aspect_ratio ?? this.videoConfig.aspect_ratio;
    if ((renderAspectRatio as string) === "9:16") {
      throw new RepositoryError("Episodes only support 16:9 landscape video rendering", "UNSUPPORTED_ASPECT_RATIO");
    }
    const renderCanvas = MASCOT_CANVAS_SIZES[renderAspectRatio];
    if (!renderCanvas || !renderCanvas.width || !renderCanvas.height) {
      throw new RepositoryError(
        `Unsupported render aspect ratio "${renderAspectRatio}". Expected one of: ${Object.keys(MASCOT_CANVAS_SIZES).join(", ")}.`,
        "UNSUPPORTED_ASPECT_RATIO",
      );
    }

    releaseSlot = await acquireRenderSlotWithProgress(this, task.task_id, controller.signal);

    const comp = await prepareVideoComposition({
      runtime: this,
      repository: this.repository,
      taskId: task.task_id,
      channel,
      episode,
      scenes,
      renderAspectRatio,
      onProgress: async (message, percent) => {
        await this.update(task.task_id, { progress_message: message, progress_percent: percent });
      },
    });
    ensureVideoTaskActive(this, task.task_id, controller.signal);

    const layoutResult = await verifyAndCheckLayout({
      renderRoot: comp.renderRoot,
      rootDir: this.repository.rootDirectory,
      sourceFingerprint: comp.sourceFingerprint,
      fastRenderMode: this.videoConfig.fast_render_mode,
      renderQuality: this.videoConfig.render_quality,
      onProgress: async (message, percent) => {
        await this.update(task.task_id, { progress_message: message, progress_percent: percent });
      },
    });
    ensureVideoTaskActive(this, task.task_id, controller.signal);

    const { probe, duration } = await executeHyperframesRender({
      renderRoot: comp.renderRoot,
      outputPath: comp.outputPath,
      checkpointPath: comp.checkpointPath,
      sourceFingerprint: comp.sourceFingerprint,
      renderCanvas,
      videoConfig: this.videoConfig,
      repositoryRoot: this.repository.rootDirectory,
      signal: controller.signal,
      logPath: path.join(comp.renderRoot, `render-${task.task_id}.log`),
      onProgress: async (message, percent, renderProgress) => {
        const progressPatch = renderProgress === undefined ? {} : { render_progress: renderProgress };
        await this.update(task.task_id, { progress_message: message, progress_percent: percent, ...progressPatch });
      },
    });

    ensureVideoTaskActive(this, task.task_id, controller.signal);

    const { videoPath, manifestPath } = await persistVideoRenderArtifacts({
      repository: this.repository,
      channelId: task.channel_id,
      episodeId: task.episode_id,
      episode,
      outputPath: comp.outputPath,
      html: comp.html,
      sourceFingerprint: comp.sourceFingerprint,
      duration,
      renderAspectRatio,
      renderCanvas,
      fps: this.videoConfig.fps,
      selectedBgmTrackId: comp.selectedBgmTrackId,
      selectedBgmFilename: comp.selectedBgmFilename,
      assetResolution: comp.assetResolution,
      preflightAssessment: comp.preflightAssessment,
      checkStatus: layoutResult.bypassed ? "skipped_fast_mode" : "passed",
      probe,
    });

    try {
      await pruneRenderRootIntermediateFiles(comp.renderRoot);
    } catch (pruneError) {
      this.logger.warn(
        `Post-render intermediate artifact pruning deferred: ${pruneError instanceof Error ? pruneError.message : "unknown error"}`,
      );
    }

    ensureVideoTaskActive(this, task.task_id, controller.signal);

    await this.finish(task.task_id, "COMPLETED", null, [videoPath, manifestPath]);
    const quiz = await this.repository.readQuiz(task.channel_id, task.episode_id);
    if (quiz?.questions.length) {
      await this.repository.appendQuestionHistory(task.channel_id, task.episode_id, quiz.questions, undefined, task.task_id);
    }
    if (comp.selectedBgmTrackId && comp.selectedBgmFilename) {
      await this.repository
        .appendBgmHistory(task.channel_id, task.episode_id, comp.selectedBgmTrackId, comp.selectedBgmFilename)
        .catch(() => undefined);
    }
    this.logger.ok("Quiz video rendered", { ...context, step: "render_video" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video render failed";
    const current = this.get(task.task_id);
    if (controller.signal.aborted || current.status === "CANCELLED") {
      if (current.status !== "CANCELLED") await this.finish(task.task_id, "CANCELLED", "Cancelled by user");
      this.logger.warn("Video render cancelled", context);
      return;
    }
    if (task.episode_id) {
      await this.repository.removeQuestionHistoryEntries(task.channel_id, { renderTaskIds: [task.task_id] }).catch((historyError) => {
        this.logger.warn(`Question history rollback deferred: ${historyError instanceof Error ? historyError.message : "unknown error"}`, {
          ...context,
          step: "question_history_rollback",
        });
      });
    }
    await this.finish(task.task_id, "FAILED", message);
    this.logger.error(message, context);
  } finally {
    try {
      if (releaseSlot) {
        releaseSlot();
      } else {
        const limiter = this.videoRenderLimiter ?? videoRenderConcurrencyLimiter;
        limiter.releaseSlot(task.task_id);
      }
    } catch {
      // Ignore release error
    }
    if (this.activeVideoControllers.get(task.task_id) === controller) this.activeVideoControllers.delete(task.task_id);
  }
}

import { MASCOT_CANVAS_SIZES, nowIso, type Task } from "@studio/shared";
import { RepositoryError } from "../repository.js";
import type { TaskManagerRuntime } from "./runtime.js";
import { verifyAndCheckLayout } from "./video/videoLayoutChecker.js";
import { prepareVideoComposition } from "./video/videoCompositionPreparer.js";
import { executeHyperframesRender } from "./video/videoRenderExecution.js";
import { persistVideoRenderArtifacts } from "./video/renderManifestWriter.js";

export async function runVideoTask(this: TaskManagerRuntime, task: Task): Promise<void> {
  const context = { profileId: task.channel_id, workerId: task.task_id, step: "render_video" };
  try {
    const renderAspectRatio = this.videoConfig.aspect_ratio;
    const renderCanvas = MASCOT_CANVAS_SIZES[renderAspectRatio];
    await this.update(task.task_id, {
      status: "RUNNING",
      started_at: nowIso(),
      queue_position: null,
      progress_message: "Preparing Quiz composition",
      progress_percent: 5,
    });
    if (!task.episode_id) throw new RepositoryError("Episode is required", "EPISODE_REQUIRED");
    const episode = await this.repository.getEpisode(task.channel_id, task.episode_id);
    const channel = await this.repository.getChannel(task.channel_id);
    const scenes = await this.repository.readScenes(task.channel_id, task.episode_id);
    if (!(await this.hasValidNarrationAsset(task.channel_id, task.episode_id, episode.narration_asset_path)))
      throw new RepositoryError("Generate the Chatterbox narration before rendering video", "NARRATION_REQUIRED");
    if (scenes.length === 0) throw new RepositoryError("Generate Quiz scenes before rendering video", "SCENES_REQUIRED");

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

    await verifyAndCheckLayout({
      renderRoot: comp.renderRoot,
      rootDir: this.repository.rootDirectory,
      sourceFingerprint: comp.sourceFingerprint,
      fastRenderMode: this.videoConfig.fast_render_mode,
      renderQuality: this.videoConfig.render_quality,
      onProgress: async (message, percent) => {
        await this.update(task.task_id, { progress_message: message, progress_percent: percent });
      },
    });

    const { probe, duration } = await executeHyperframesRender({
      renderRoot: comp.renderRoot,
      outputPath: comp.outputPath,
      checkpointPath: comp.checkpointPath,
      sourceFingerprint: comp.sourceFingerprint,
      renderCanvas,
      videoConfig: this.videoConfig,
      repositoryRoot: this.repository.rootDirectory,
      onProgress: async (message, percent) => {
        await this.update(task.task_id, { progress_message: message, progress_percent: percent });
      },
    });

    const { videoPath, manifestPath } = await persistVideoRenderArtifacts({
      repository: this.repository,
      channelId: task.channel_id,
      episodeId: task.episode_id,
      episode,
      outputPath: comp.outputPath,
      html: comp.html,
      duration,
      renderAspectRatio,
      renderCanvas,
      fps: this.videoConfig.fps,
      selectedBgmTrackId: comp.selectedBgmTrackId,
      selectedBgmFilename: comp.selectedBgmFilename,
      assetResolution: comp.assetResolution,
      completeQuizV2: comp.completeQuizV2,
      preflightAssessment: comp.preflightAssessment,
      probe,
    });

    await this.update(task.task_id, { progress_message: "Quiz video ready", progress_percent: 100 });
    await this.finish(task.task_id, "COMPLETED", null, [videoPath, manifestPath]);
    const quiz = await this.repository.readQuiz(task.channel_id, task.episode_id);
    if (quiz && quiz.questions.length > 0) {
      await this.repository.appendQuestionHistory(task.channel_id, task.episode_id, quiz.questions, undefined, task.task_id);
    }
    if (comp.selectedBgmTrackId && comp.selectedBgmFilename) {
      try {
        await this.repository.appendBgmHistory(task.channel_id, task.episode_id, comp.selectedBgmTrackId, comp.selectedBgmFilename);
      } catch {
        // Ignore non-fatal BGM history save error
      }
    }
    this.logger.ok("Quiz video rendered", { ...context, step: "render_video" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video render failed";
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
  }
}

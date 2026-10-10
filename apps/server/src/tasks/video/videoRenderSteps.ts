import path from "node:path";
import type { Scene, Task } from "@studio/shared";
import { RepositoryError } from "../../repository.js";
import type { TaskManagerRuntime } from "../runtime.js";
import { verifyAndCheckLayout } from "./videoLayoutChecker.js";
import { prepareProductVideoComposition } from "./productCompositionDispatcher.js";
import { executeHyperframesRender } from "./videoRenderExecution.js";
import { persistVideoRenderArtifacts } from "./renderManifestWriter.js";
import { pruneRenderRootIntermediateFiles } from "../storage/artifactRetentionPruner.js";
import { packageEpisodeExport } from "../export/index.js";
import { loadRenderScenes, loadVideoRenderProduct, type VideoRenderProduct } from "./videoRenderProduct.js";
import type { VideoCompositionContext } from "./videoCompositionPreparer.js";

export type RenderedVideo = { videoPath: string; manifestPath: string; duration: number; comp: VideoCompositionContext };

export function ensureVideoTaskActive(runtime: TaskManagerRuntime, taskId: string, signal: AbortSignal): void {
  if (signal.aborted || runtime.get(taskId).status === "CANCELLED") throw new Error("Video render cancelled");
}

export async function loadRenderInputs(runtime: TaskManagerRuntime, task: Task): Promise<{ product: VideoRenderProduct; scenes: Scene[] }> {
  if (!task.episode_id) throw new RepositoryError("Episode is required", "EPISODE_REQUIRED");
  const product = await loadVideoRenderProduct(runtime.repository, task);
  const scenes = await loadRenderScenes(runtime.repository, product);
  const narrationPath = product.view.media.narration_asset_path;
  if (!(await runtime.hasValidNarrationAsset(task.channel_id, task.episode_id, narrationPath)))
    throw new RepositoryError("Generate the Chatterbox narration before rendering video", "NARRATION_REQUIRED");
  if (scenes.length === 0) throw new RepositoryError("Generate Quiz scenes before rendering video", "SCENES_REQUIRED");
  return { product, scenes };
}

export async function renderProductVideo(
  runtime: TaskManagerRuntime,
  task: Task,
  signal: AbortSignal,
  product: VideoRenderProduct,
  scenes: Scene[],
): Promise<RenderedVideo> {
  const channel = await runtime.repository.getChannel(task.channel_id);
  const onProgress = async (message: string, percent: number) => {
    await runtime.update(task.task_id, { progress_message: message, progress_percent: percent });
  };
  const comp = await prepareProductVideoComposition({
    runtime,
    repository: runtime.repository,
    taskId: task.task_id,
    signal,
    channel,
    product,
    scenes,
    onProgress,
  });
  ensureVideoTaskActive(runtime, task.task_id, signal);

  const layoutResult = await verifyAndCheckLayout({
    renderRoot: comp.renderRoot,
    rootDir: runtime.repository.rootDirectory,
    sourceFingerprint: comp.sourceFingerprint,
    fastRenderMode: product.view.quiz_config.fast_render_mode ?? runtime.videoConfig.fast_render_mode,
    renderQuality: runtime.videoConfig.render_quality,
    renderCanvas: product.renderCanvas,
    onProgress,
  });
  ensureVideoTaskActive(runtime, task.task_id, signal);

  const { probe, duration } = await executeHyperframesRender({
    renderRoot: comp.renderRoot,
    outputPath: comp.outputPath,
    checkpointPath: comp.checkpointPath,
    sourceFingerprint: comp.sourceFingerprint,
    renderCanvas: product.renderCanvas,
    videoConfig: runtime.videoConfig,
    repositoryRoot: runtime.repository.rootDirectory,
    signal,
    logPath: path.join(comp.renderRoot, `render-${task.task_id}.log`),
    onProgress: async (message, percent, renderProgress) => {
      const progressPatch = renderProgress === undefined ? {} : { render_progress: renderProgress };
      await runtime.update(task.task_id, { progress_message: message, progress_percent: percent, ...progressPatch });
    },
  });
  ensureVideoTaskActive(runtime, task.task_id, signal);

  const persisted = await persistVideoRenderArtifacts({
    repository: runtime.repository,
    channelId: task.channel_id,
    episodeId: product.ref.product_id,
    product: product.ref,
    episode: { episode_id: product.view.id, quiz_config: product.view.quiz_config },
    outputPath: comp.outputPath,
    html: comp.html,
    sourceFingerprint: comp.sourceFingerprint,
    duration,
    renderAspectRatio: product.renderAspectRatio,
    renderCanvas: product.renderCanvas,
    fps: runtime.videoConfig.fps,
    selectedBgmTrackId: comp.selectedBgmTrackId,
    selectedBgmFilename: comp.selectedBgmFilename,
    assetResolution: comp.assetResolution,
    preflightAssessment: comp.preflightAssessment,
    introOutro: comp.introOutro,
    checkStatus: layoutResult.bypassed ? "skipped_fast_mode" : "passed",
    probe,
  });
  return { ...persisted, duration, comp };
}

export async function finalizeRenderOutputs(
  runtime: TaskManagerRuntime,
  task: Task,
  product: VideoRenderProduct,
  rendered: RenderedVideo,
): Promise<void> {
  try {
    await pruneRenderRootIntermediateFiles(rendered.comp.renderRoot);
  } catch (pruneError) {
    runtime.logger.warn(
      `Post-render intermediate artifact pruning deferred: ${pruneError instanceof Error ? pruneError.message : "unknown error"}`,
    );
  }
  if (product.view.kind !== "episode") {
    runtime.logger.warn(
      "Quiz Shorts have no ZIP export package; the rendered MP4 stays in the product assets next to the cover, title and description.",
    );
    return;
  }
  try {
    await packageEpisodeExport({
      repository: runtime.repository,
      channelId: task.channel_id,
      episodeId: product.ref.product_id,
      videoSourcePath: rendered.comp.outputPath,
      duration: rendered.duration,
    });
  } catch (exportError) {
    runtime.logger.warn(`Episode export packaging deferred: ${exportError instanceof Error ? exportError.message : "unknown error"}`);
  }
}

export async function recordPostRenderHistory(
  runtime: TaskManagerRuntime,
  task: Task,
  product: VideoRenderProduct,
  comp: VideoCompositionContext,
): Promise<void> {
  const quiz = await runtime.repository.readQuiz(task.channel_id, product.ref);
  if (quiz?.questions.length) {
    await runtime.repository.appendQuestionHistory(
      task.channel_id,
      product.ref,
      quiz.questions,
      undefined,
      task.task_id,
      product.view.kind,
    );
  }
  if (comp.selectedBgmTrackId && comp.selectedBgmFilename) {
    await runtime.repository
      .appendBgmHistory(task.channel_id, product.ref, comp.selectedBgmTrackId, comp.selectedBgmFilename)
      .catch(() => undefined);
  }
}

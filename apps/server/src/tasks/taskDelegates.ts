import type { Task } from "@studio/shared";
import type { CodexServerRequest } from "../codex.js";
import type { ImageProvider } from "../providers/index.js";
import type { TaskManagerRuntime, PipelineRun, ActiveRun } from "./runtime.js";
import { runAudioTask as runAudioTaskImplementation } from "./audioRunner.js";
import {
  run as runImplementation,
  handleNotification as handleNotificationImplementation,
  handleServerRequest as handleServerRequestImplementation,
  completeWithOutput as completeWithOutputImplementation,
  retryQuizResearch as retryQuizResearchImplementation,
  retryScript as retryScriptImplementation,
  retryVisualBible as retryVisualBibleImplementation,
  retrySequenceScenes as retrySequenceScenesImplementation,
} from "./codexRunner.js";
import {
  createImageProvider as createImageProviderImplementation,
  generateBundleImageWithSafetyRetry as generateBundleImageWithSafetyRetryImplementation,
  runAntigravityBundleImageTask as runAntigravityBundleImageTaskImplementation,
  runGpti2BundleImageTask as runGpti2BundleImageTaskImplementation,
  runShopAiKeyImageTask as runShopAiKeyImageTaskImplementation,
} from "./imageRunner.js";
import {
  runPipelineTask as runPipelineTaskImplementation,
  hasReadyArtifact as hasReadyArtifactImplementation,
  generatePipelineBundleImages as generatePipelineBundleImagesImplementation,
  runQuizV2Pipeline as runQuizV2PipelineImplementation,
  attachPipelineBundleImages as attachPipelineBundleImagesImplementation,
  hasReadyScript as hasReadyScriptImplementation,
  hasValidNarrationAsset as hasValidNarrationAssetImplementation,
  isShotPlanFresh as isShotPlanFreshImplementation,
  waitForTaskTerminal as waitForTaskTerminalImplementation,
} from "./pipelineRunner.js";
import {
  cleanupExpiredFailedBuilds as cleanupExpiredFailedBuildsImplementation,
  hasActiveEpisodeTasks as hasActiveEpisodeTasksImplementation,
  pruneEpisodeTasks as pruneEpisodeTasksImplementation,
  reconcileQuestionHistory as reconcileQuestionHistoryImplementation,
  startFailedBuildCleanupTimer as startFailedBuildCleanupTimerImplementation,
} from "./taskLifecycle.js";
import { runVideoTask as runVideoTaskImplementation } from "./videoRunner.js";

export const taskDelegates = {
  run(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runImplementation.call(this, task);
  },
  createImageProvider(
    this: TaskManagerRuntime,
    imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string },
    output?: string,
  ): ImageProvider {
    return createImageProviderImplementation.call(this, imageTarget, output);
  },
  generateBundleImageWithSafetyRetry(
    this: TaskManagerRuntime,
    task: Task,
    imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string },
    initialPrompt: string,
    signal?: AbortSignal,
    output?: string,
    visualBibleContent?: string,
  ): Promise<{ image: { asset_path: string }; updatedPrompt?: string }> {
    return generateBundleImageWithSafetyRetryImplementation.call(
      this,
      task,
      imageTarget,
      initialPrompt,
      signal,
      output,
      visualBibleContent,
    );
  },
  runGpti2BundleImageTask(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runGpti2BundleImageTaskImplementation.call(this, task);
  },
  runAntigravityBundleImageTask(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runAntigravityBundleImageTaskImplementation.call(this, task);
  },
  runShopAiKeyImageTask(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runShopAiKeyImageTaskImplementation.call(this, task);
  },
  runPipelineTask(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runPipelineTaskImplementation.call(this, task);
  },
  runVideoTask(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runVideoTaskImplementation.call(this, task);
  },
  hasReadyArtifact(this: TaskManagerRuntime, channelId: string, episodeId: string, filename: string): Promise<boolean> {
    return hasReadyArtifactImplementation.call(this, channelId, episodeId, filename);
  },
  generatePipelineBundleImages(this: TaskManagerRuntime, task: Task, run: PipelineRun): Promise<void> {
    return generatePipelineBundleImagesImplementation.call(this, task, run);
  },
  runQuizV2Pipeline(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runQuizV2PipelineImplementation.call(this, task);
  },
  attachPipelineBundleImages(this: TaskManagerRuntime, channelId: string, episodeId: string): Promise<void> {
    return attachPipelineBundleImagesImplementation.call(this, channelId, episodeId);
  },
  hasReadyScript(this: TaskManagerRuntime, channelId: string, episodeId: string): Promise<boolean> {
    return hasReadyScriptImplementation.call(this, channelId, episodeId);
  },
  hasValidNarrationAsset(this: TaskManagerRuntime, channelId: string, episodeId: string, assetPath: string | null): Promise<boolean> {
    return hasValidNarrationAssetImplementation.call(this, channelId, episodeId, assetPath);
  },
  isShotPlanFresh(this: TaskManagerRuntime, channelId: string, episodeId: string): Promise<boolean> {
    return isShotPlanFreshImplementation.call(this, channelId, episodeId);
  },
  waitForTaskTerminal(
    this: TaskManagerRuntime,
    taskId: string,
    run: PipelineRun,
    onProgress?: (task: Task) => Promise<void> | void,
  ): Promise<Task> {
    return waitForTaskTerminalImplementation.call(this, taskId, run, onProgress);
  },
  runAudioTask(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runAudioTaskImplementation.call(this, task);
  },
  handleNotification(this: TaskManagerRuntime, method: string, params: Record<string, unknown>): void {
    return handleNotificationImplementation.call(this, method, params);
  },
  handleServerRequest(this: TaskManagerRuntime, request: CodexServerRequest): void {
    return handleServerRequestImplementation.call(this, request);
  },
  completeWithOutput(this: TaskManagerRuntime, active: ActiveRun): Promise<void> {
    return completeWithOutputImplementation.call(this, active);
  },
  retryQuizResearch(this: TaskManagerRuntime, active: ActiveRun, reason: string): Promise<void> {
    return retryQuizResearchImplementation.call(this, active, reason);
  },
  retryScript(this: TaskManagerRuntime, active: ActiveRun, reason: string): Promise<void> {
    return retryScriptImplementation.call(this, active, reason);
  },
  retryVisualBible(this: TaskManagerRuntime, active: ActiveRun, reason: string): Promise<void> {
    return retryVisualBibleImplementation.call(this, active, reason);
  },
  retrySequenceScenes(this: TaskManagerRuntime, active: ActiveRun, reason: string): Promise<void> {
    return retrySequenceScenesImplementation.call(this, active, reason);
  },
  cleanupExpiredFailedBuilds(this: TaskManagerRuntime, nowMs?: number): Promise<{ removedEpisodes: number; removedTasks: number }> {
    if (this.failedBuildCleanupPromise) return this.failedBuildCleanupPromise;
    const cleanup = cleanupExpiredFailedBuildsImplementation.call(this, nowMs);
    this.failedBuildCleanupPromise = cleanup;
    return cleanup.finally(() => {
      if (this.failedBuildCleanupPromise === cleanup) this.failedBuildCleanupPromise = null;
    });
  },
  hasActiveEpisodeTasks(this: TaskManagerRuntime, episodeId: string): boolean {
    return hasActiveEpisodeTasksImplementation.call(this, episodeId);
  },
  pruneEpisodeTasks(this: TaskManagerRuntime, episodeId: string): Promise<string[]> {
    return pruneEpisodeTasksImplementation.call(this, episodeId);
  },
  reconcileQuestionHistory(this: TaskManagerRuntime): Promise<void> {
    return reconcileQuestionHistoryImplementation.call(this);
  },
  startFailedBuildCleanupTimer(this: TaskManagerRuntime): void {
    return startFailedBuildCleanupTimerImplementation.call(this);
  },
};

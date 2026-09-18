import { EventEmitter } from "node:events";
import type { Task } from "@studio/shared";
import type { CodexServerRequest } from "../../codex.js";
import type { ActiveRun, PipelineRun, TaskManagerRuntime } from "../runtime.js";
import {
  run,
  handleNotification,
  handleServerRequest,
  completeWithOutput,
  retryQuizResearch,
  retryScript,
  retryVisualBible,
  retrySequenceScenes,
  retryTopicSuggestions,
} from "../codexRunner.js";
import {
  createImageProvider,
  generateBundleImageWithSafetyRetry,
  runAntigravityBundleImageTask,
  runGpti2BundleImageTask,
  runShopAiKeyImageTask,
} from "../imageRunner.js";
import {
  runPipelineTask,
  hasReadyArtifact,
  generatePipelineBundleImages,
  runQuizV2Pipeline,
  attachPipelineBundleImages,
  hasReadyScript,
  hasValidNarrationAsset,
  isShotPlanFresh,
  waitForTaskTerminal,
} from "../pipelineRunner.js";
import { runAudioTask } from "../audioRunner.js";
import { runVideoTask } from "../videoRunner.js";

export type TaskRunnerDelegates = Pick<
  TaskManagerRuntime,
  | "run"
  | "createImageProvider"
  | "generateBundleImageWithSafetyRetry"
  | "runGpti2BundleImageTask"
  | "runAntigravityBundleImageTask"
  | "runShopAiKeyImageTask"
  | "runPipelineTask"
  | "runVideoTask"
  | "hasReadyArtifact"
  | "generatePipelineBundleImages"
  | "runQuizV2Pipeline"
  | "attachPipelineBundleImages"
  | "hasReadyScript"
  | "hasValidNarrationAsset"
  | "isShotPlanFresh"
  | "waitForTaskTerminal"
  | "runAudioTask"
  | "handleNotification"
  | "handleServerRequest"
  | "completeWithOutput"
  | "retryQuizResearch"
  | "retryScript"
  | "retryVisualBible"
  | "retrySequenceScenes"
  | "retryTopicSuggestions"
>;

export const runnerDispatcherMethods: TaskRunnerDelegates = {
  run(this: TaskManagerRuntime, task: Task): Promise<void> {
    return run.call(this, task);
  },
  createImageProvider(
    this: TaskManagerRuntime,
    imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string; taskId?: string },
    output?: string,
  ) {
    return createImageProvider.call(this, imageTarget, output);
  },
  generateBundleImageWithSafetyRetry(
    this: TaskManagerRuntime,
    task: Task,
    imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string; taskId?: string },
    initialPrompt: string,
    signal?: AbortSignal,
    output?: string,
    visualBibleContent?: string,
  ) {
    return generateBundleImageWithSafetyRetry.call(this, task, imageTarget, initialPrompt, signal, output, visualBibleContent);
  },
  runGpti2BundleImageTask(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runGpti2BundleImageTask.call(this, task);
  },
  runAntigravityBundleImageTask(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runAntigravityBundleImageTask.call(this, task);
  },
  runShopAiKeyImageTask(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runShopAiKeyImageTask.call(this, task);
  },
  runPipelineTask(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runPipelineTask.call(this, task);
  },
  runVideoTask(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runVideoTask.call(this, task);
  },
  hasReadyArtifact(this: TaskManagerRuntime, channelId: string, episodeId: string, filename: string): Promise<boolean> {
    return hasReadyArtifact.call(this, channelId, episodeId, filename);
  },
  generatePipelineBundleImages(this: TaskManagerRuntime, task: Task, pipelineRun: PipelineRun): Promise<void> {
    return generatePipelineBundleImages.call(this, task, pipelineRun);
  },
  runQuizV2Pipeline(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runQuizV2Pipeline.call(this, task);
  },
  attachPipelineBundleImages(this: TaskManagerRuntime, channelId: string, episodeId: string): Promise<void> {
    return attachPipelineBundleImages.call(this, channelId, episodeId);
  },
  hasReadyScript(this: TaskManagerRuntime, channelId: string, episodeId: string): Promise<boolean> {
    return hasReadyScript.call(this, channelId, episodeId);
  },
  hasValidNarrationAsset(this: TaskManagerRuntime, channelId: string, episodeId: string, assetPath: string | null): Promise<boolean> {
    return hasValidNarrationAsset.call(this, channelId, episodeId, assetPath);
  },
  isShotPlanFresh(this: TaskManagerRuntime, channelId: string, episodeId: string): Promise<boolean> {
    return isShotPlanFresh.call(this, channelId, episodeId);
  },
  waitForTaskTerminal(
    this: TaskManagerRuntime,
    taskId: string,
    pipelineRun: PipelineRun,
    onProgress?: (task: Task) => Promise<void> | void,
    pollIntervalMs?: number,
  ): Promise<Task> {
    return waitForTaskTerminal.call(this, taskId, pipelineRun, onProgress, pollIntervalMs);
  },
  runAudioTask(this: TaskManagerRuntime, task: Task): Promise<void> {
    return runAudioTask.call(this, task);
  },
  handleNotification(this: TaskManagerRuntime, method: string, params: Record<string, unknown>): void {
    return handleNotification.call(this, method, params);
  },
  handleServerRequest(this: TaskManagerRuntime, request: CodexServerRequest): void {
    return handleServerRequest.call(this, request);
  },
  completeWithOutput(this: TaskManagerRuntime, active: ActiveRun): Promise<void> {
    return completeWithOutput.call(this, active);
  },
  retryQuizResearch(this: TaskManagerRuntime, active: ActiveRun, reason: string): Promise<void> {
    return retryQuizResearch.call(this, active, reason);
  },
  retryScript(this: TaskManagerRuntime, active: ActiveRun, reason: string): Promise<void> {
    return retryScript.call(this, active, reason);
  },
  retryVisualBible(this: TaskManagerRuntime, active: ActiveRun, reason: string): Promise<void> {
    return retryVisualBible.call(this, active, reason);
  },
  retrySequenceScenes(this: TaskManagerRuntime, active: ActiveRun, reason: string): Promise<void> {
    return retrySequenceScenes.call(this, active, reason);
  },
  retryTopicSuggestions(this: TaskManagerRuntime, active: ActiveRun, reason: string): Promise<void> {
    return retryTopicSuggestions.call(this, active, reason);
  },
};

export abstract class TaskManagerRunnerBase extends EventEmitter implements TaskRunnerDelegates {
  run(task: Task): Promise<void> {
    return runnerDispatcherMethods.run.call(this as unknown as TaskManagerRuntime, task);
  }
  createImageProvider(
    imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string; taskId?: string },
    output?: string,
  ) {
    return runnerDispatcherMethods.createImageProvider.call(this as unknown as TaskManagerRuntime, imageTarget, output);
  }
  generateBundleImageWithSafetyRetry(
    task: Task,
    imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string; taskId?: string },
    initialPrompt: string,
    signal?: AbortSignal,
    output?: string,
    visualBibleContent?: string,
  ) {
    return runnerDispatcherMethods.generateBundleImageWithSafetyRetry.call(
      this as unknown as TaskManagerRuntime,
      task,
      imageTarget,
      initialPrompt,
      signal,
      output,
      visualBibleContent,
    );
  }
  runGpti2BundleImageTask(task: Task): Promise<void> {
    return runnerDispatcherMethods.runGpti2BundleImageTask.call(this as unknown as TaskManagerRuntime, task);
  }
  runAntigravityBundleImageTask(task: Task): Promise<void> {
    return runnerDispatcherMethods.runAntigravityBundleImageTask.call(this as unknown as TaskManagerRuntime, task);
  }
  runShopAiKeyImageTask(task: Task): Promise<void> {
    return runnerDispatcherMethods.runShopAiKeyImageTask.call(this as unknown as TaskManagerRuntime, task);
  }
  runPipelineTask(task: Task): Promise<void> {
    return runnerDispatcherMethods.runPipelineTask.call(this as unknown as TaskManagerRuntime, task);
  }
  runVideoTask(task: Task): Promise<void> {
    return runnerDispatcherMethods.runVideoTask.call(this as unknown as TaskManagerRuntime, task);
  }
  hasReadyArtifact(channelId: string, episodeId: string, filename: string): Promise<boolean> {
    return runnerDispatcherMethods.hasReadyArtifact.call(this as unknown as TaskManagerRuntime, channelId, episodeId, filename);
  }
  generatePipelineBundleImages(task: Task, pipelineRun: PipelineRun): Promise<void> {
    return runnerDispatcherMethods.generatePipelineBundleImages.call(this as unknown as TaskManagerRuntime, task, pipelineRun);
  }
  runQuizV2Pipeline(task: Task): Promise<void> {
    return runnerDispatcherMethods.runQuizV2Pipeline.call(this as unknown as TaskManagerRuntime, task);
  }
  attachPipelineBundleImages(channelId: string, episodeId: string): Promise<void> {
    return runnerDispatcherMethods.attachPipelineBundleImages.call(this as unknown as TaskManagerRuntime, channelId, episodeId);
  }
  hasReadyScript(channelId: string, episodeId: string): Promise<boolean> {
    return runnerDispatcherMethods.hasReadyScript.call(this as unknown as TaskManagerRuntime, channelId, episodeId);
  }
  hasValidNarrationAsset(channelId: string, episodeId: string, assetPath: string | null): Promise<boolean> {
    return runnerDispatcherMethods.hasValidNarrationAsset.call(this as unknown as TaskManagerRuntime, channelId, episodeId, assetPath);
  }
  isShotPlanFresh(channelId: string, episodeId: string): Promise<boolean> {
    return runnerDispatcherMethods.isShotPlanFresh.call(this as unknown as TaskManagerRuntime, channelId, episodeId);
  }
  waitForTaskTerminal(
    taskId: string,
    pipelineRun: PipelineRun,
    onProgress?: (task: Task) => Promise<void> | void,
    pollIntervalMs?: number,
  ): Promise<Task> {
    return runnerDispatcherMethods.waitForTaskTerminal.call(
      this as unknown as TaskManagerRuntime,
      taskId,
      pipelineRun,
      onProgress,
      pollIntervalMs,
    );
  }
  runAudioTask(task: Task): Promise<void> {
    return runnerDispatcherMethods.runAudioTask.call(this as unknown as TaskManagerRuntime, task);
  }
  handleNotification(method: string, params: Record<string, unknown>): void {
    return runnerDispatcherMethods.handleNotification.call(this as unknown as TaskManagerRuntime, method, params);
  }
  handleServerRequest(request: CodexServerRequest): void {
    return runnerDispatcherMethods.handleServerRequest.call(this as unknown as TaskManagerRuntime, request);
  }
  completeWithOutput(active: ActiveRun): Promise<void> {
    return runnerDispatcherMethods.completeWithOutput.call(this as unknown as TaskManagerRuntime, active);
  }
  retryQuizResearch(active: ActiveRun, reason: string): Promise<void> {
    return runnerDispatcherMethods.retryQuizResearch.call(this as unknown as TaskManagerRuntime, active, reason);
  }
  retryScript(active: ActiveRun, reason: string): Promise<void> {
    return runnerDispatcherMethods.retryScript.call(this as unknown as TaskManagerRuntime, active, reason);
  }
  retryVisualBible(active: ActiveRun, reason: string): Promise<void> {
    return runnerDispatcherMethods.retryVisualBible.call(this as unknown as TaskManagerRuntime, active, reason);
  }
  retrySequenceScenes(active: ActiveRun, reason: string): Promise<void> {
    return runnerDispatcherMethods.retrySequenceScenes.call(this as unknown as TaskManagerRuntime, active, reason);
  }
  retryTopicSuggestions(active: ActiveRun, reason: string): Promise<void> {
    return runnerDispatcherMethods.retryTopicSuggestions.call(this as unknown as TaskManagerRuntime, active, reason);
  }
}

export const TaskRunnerDispatcher = TaskManagerRunnerBase;

export function attachRunnerDispatcher(_target: object): void {
  // No-op for backwards compatibility, TaskManager inherits via prototype chain
}

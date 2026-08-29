import type { AppConfig, ContextManifest, Task, TaskEvent, TaskStatus, TaskType } from "@studio/shared";
import type { AntigravityClient } from "../antigravity.js";
import type { CodexAppServerClient, CodexServerRequest } from "../codex.js";
import type { ContextEngine } from "../context.js";
import type { StudioLogger } from "../logger.js";
import type { RepositoryService } from "../repository.js";
import type { ChatterboxTarget } from "../providers/chatterbox.js";
import type { AudioProvider, ImageProvider } from "../providers/index.js";

export type ActiveRun = {
  task: Task;
  threadId: string;
  turnId: string;
  output: string;
  manifest: ContextManifest;
  researchAttempts: number;
  scriptAttempts: number;
  visualBibleAttempts: number;
  sequenceAttempts: number;
};

export type CodexCleanupConfig = { auto_delete_threads: boolean; failed_thread_retention_days: number };
export type PipelineRun = { cancelled: boolean; children: Set<string> };

export interface TaskManagerRuntime {
  tasks: Map<string, Task>;
  active: Map<string, ActiveRun>;
  activeAudio: Set<string>;
  activeEngine: "codex" | "antigravity";
  activeImageControllers: Map<string, AbortController>;
  antigravity?: AntigravityClient;
  antigravityCleanupConfig: CodexCleanupConfig;
  approvalRequests: Map<number, { taskId: string; request: CodexServerRequest }>;
  assemblingEpisodes: Set<string>;
  audioConfig: AppConfig["audio_generation"];
  audioProviderFactory: (target: ChatterboxTarget, config: AppConfig["audio_generation"]) => AudioProvider;
  cleanupTimer: NodeJS.Timeout | null;
  codex: CodexAppServerClient;
  codexCleanupConfig: CodexCleanupConfig;
  completionWaiters: Map<string, () => void>;
  contextEngine: ContextEngine;
  failedBuildCleanupPromise: Promise<{ removedEpisodes: number; removedTasks: number }> | null;
  imageConfig: AppConfig["image_generation"];
  imageVariants: Map<string, number>;
  logger: StudioLogger;
  locks: Set<string>;
  maxConcurrent: number;
  pipelineRuns: Map<string, PipelineRun>;
  repository: RepositoryService;
  topicHints: Map<string, string>;
  videoConfig: AppConfig["video_generation"];

  cancel(taskId: string): Promise<Task>;
  cleanupAntigravityThreads(force?: boolean): Promise<{ removed: number }>;
  cleanupCodexThreads(force?: boolean): Promise<{ removed: number }>;
  cleanupExpiredFailedBuilds(nowMs?: number): Promise<{ removedEpisodes: number; removedTasks: number }>;
  completeWithOutput(active: ActiveRun): Promise<void>;
  createImageProvider(
    imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string },
    output?: string,
  ): ImageProvider;
  emitEvent(event: TaskEvent): void;
  findSceneNumber(taskId: string): number | undefined;
  finish(taskId: string, status: TaskStatus, error: string | null, outputFiles?: string[]): Promise<void>;
  generateBundleImageWithSafetyRetry(
    task: Task,
    imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string },
    initialPrompt: string,
    signal?: AbortSignal,
    output?: string,
    visualBibleContent?: string,
  ): Promise<{ image: { asset_path: string }; updatedPrompt?: string }>;
  generatePipelineBundleImages(task: Task, run: PipelineRun): Promise<void>;
  attachPipelineBundleImages(channelId: string, episodeId: string): Promise<void>;
  get(taskId: string): Task;
  handleNotification(method: string, params: Record<string, unknown>): void;
  handleServerRequest(request: CodexServerRequest): void;
  hasReadyArtifact(channelId: string, episodeId: string, filename: string): Promise<boolean>;
  hasReadyScript(channelId: string, episodeId: string): Promise<boolean>;
  hasValidNarrationAsset(channelId: string, episodeId: string, assetPath: string | null): Promise<boolean>;
  isSessionCleanupEnabled(engine?: "codex" | "antigravity"): boolean;
  isShotPlanFresh(channelId: string, episodeId: string): Promise<boolean>;
  list(): Task[];
  mergeNarrationSegments(paths: string[], targetDurationSeconds?: number): Promise<Uint8Array>;
  retryQuizResearch(active: ActiveRun, reason: string): Promise<void>;
  retryScript(active: ActiveRun, reason: string): Promise<void>;
  retrySequenceScenes(active: ActiveRun, reason: string): Promise<void>;
  retryVisualBible(active: ActiveRun, reason: string): Promise<void>;
  reconcileQuestionHistory(): Promise<void>;
  run(task: Task): Promise<void>;
  runAntigravityBundleImageTask(task: Task): Promise<void>;
  runAudioTask(task: Task): Promise<void>;
  runGpti2BundleImageTask(task: Task): Promise<void>;
  runNarrationTask(task: Task): Promise<void>;
  runPipelineTask(task: Task): Promise<void>;
  runQuizV2Pipeline(task: Task): Promise<void>;
  runShopAiKeyImageTask(task: Task): Promise<void>;
  runVideoTask(task: Task): Promise<void>;
  startCleanupTimer(): void;
  submit(
    taskType: TaskType,
    channelId: string,
    episodeId: string | null,
    sceneNumber?: number,
    requestedImageVariant?: number,
    topicHint?: string,
  ): Task;
  tryDeleteThread(threadId: string, engine?: "codex" | "antigravity"): Promise<boolean>;
  update(taskId: string, patch: Partial<Task>): Promise<void>;
  waitForTaskTerminal(taskId: string, run: PipelineRun): Promise<Task>;
}

import { EventEmitter } from "node:events";
import {
  nowIso,
  type AppConfig,
  type GenerateShortReelRequest,
  type GenerateShortReelTarget,
  type Task,
  type TaskEvent,
  type TaskStatus,
  type TaskType,
} from "@studio/shared";
import type { AntigravityClient } from "../antigravity.js";
import type { CodexAppServerClient, CodexServerRequest } from "../codex.js";
import { DEFAULT_CONFIG } from "../config.js";
import type { ContextEngine } from "../context.js";
import type { StudioLogger } from "../logger.js";
import { ChatterboxProvider, type ChatterboxTarget } from "../providers/chatterbox.js";
import type { AudioProvider } from "../providers/index.js";
import { RepositoryError, RepositoryService } from "../repository.js";
import { TaskAbortRegistry } from "./taskAbortRegistry.js";
import { TaskApprovalRegistry } from "./taskApprovalRegistry.js";
import { TaskQueueCoordinator } from "./taskQueueCoordinator.js";
import { PipelineExecutionEngine } from "./pipelineExecutionEngine.js";
import { pumpTaskQueue } from "./taskQueuePump.js";
import { applyTaskPatch, loadTasksFromDisk, persistTask } from "./taskStateStore.js";
import { cancelTask, submitTask } from "./taskSubmission.js";
import { TaskMutationQueue } from "./taskMutationQueue.js";
import type { ActiveRun, PipelineRun, TaskManagerRuntime } from "./runtime.js";
import { attachTaskManagerClientEvents, type ConnectionStatus } from "./taskClientEvents.js";
import { runFailedBuildCleanup, scheduleFailedBuildCleanup } from "./taskFailedBuildCleaner.js";
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
} from "./codexRunner.js";
import {
  createImageProvider,
  generateBundleImageWithSafetyRetry,
  runAntigravityBundleImageTask,
  runGpti2BundleImageTask,
  runShopAiKeyImageTask,
} from "./imageRunner.js";
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
} from "./pipelineRunner.js";
import { runAudioTask } from "./audioRunner.js";
import { runVideoTask } from "./videoRunner.js";
import {
  hasActiveEpisodeTasks,
  hasActiveChannelTasks,
  pruneEpisodeTasks,
  pruneChannelTasks,
  reconcileQuestionHistory,
  reconcileOrphanedTasks,
} from "./taskLifecycle.js";

const ACTIVE_TERMINAL_STATUSES = ["QUEUED", "RUNNING", "WAITING_APPROVAL"] as const;

export class TaskManager extends EventEmitter implements TaskManagerRuntime {
  private readonly abortRegistry = new TaskAbortRegistry();
  private readonly pipelineEngine = new PipelineExecutionEngine();
  private readonly queueCoordinator = new TaskQueueCoordinator(() => pumpTaskQueue(this));
  private approvalRegistry!: TaskApprovalRegistry;
  readonly taskMutations = new TaskMutationQueue();

  readonly tasks = new Map<string, Task>();
  readonly active: Map<string, ActiveRun> = this.pipelineEngine.activeRuns;
  readonly completionWaiters: Map<string, () => void> = this.pipelineEngine.completionWaiters;
  readonly pipelineRuns: Map<string, PipelineRun> = this.pipelineEngine.pipelineRuns;
  readonly locks: Set<string> = this.queueCoordinator.lockSet;
  readonly assemblingEpisodes = new Set<string>();
  readonly activeImageControllers: Map<string, AbortController> = this.abortRegistry.imageControllers;
  readonly activeVideoControllers: Map<string, AbortController> = this.abortRegistry.videoControllers;
  readonly activeShortReelControllers: Map<string, AbortController> = this.abortRegistry.shortReelControllers;
  readonly shortReelTargets: Map<string, GenerateShortReelTarget> = this.abortRegistry.shortReelTargets;
  readonly imageVariants = new Map<string, number>();
  readonly topicHints = new Map<string, string>();
  runningCount = 0;
  runningAudioCount = 0;
  runningImageCount = 0;
  runningVideoCount = 0;
  runningPipelineCount = 0;
  readonly activeAudio = new Set<string>();
  audioConfig: AppConfig["audio_generation"];
  imageConfig: AppConfig["image_generation"];
  videoConfig: AppConfig["video_generation"];
  readonly audioProviderFactory: (target: ChatterboxTarget, config: AppConfig["audio_generation"]) => AudioProvider;
  failedBuildCleanupPromise: Promise<{ removedEpisodes: number; removedTasks: number }> | null = null;
  failedBuildCleanupTimer: NodeJS.Timeout | null = null;
  connectionStatus: ConnectionStatus = "disconnected";
  antigravityStatus: ConnectionStatus = "disconnected";
  activeEngine: "codex" | "antigravity" = "codex";

  /** Pending approval requests, owned by the approval registry (frozen flat contract). */
  get approvalRequests(): Map<number, { taskId: string; request: CodexServerRequest }> {
    return this.approvalRegistry.requests;
  }

  constructor(
    readonly repository: RepositoryService,
    readonly contextEngine: ContextEngine,
    readonly codex: CodexAppServerClient,
    readonly maxConcurrent: number,
    videoConfigOrMaxSceneDuration: AppConfig["video_generation"] | number,
    readonly logger: StudioLogger,
    audioConfig: AppConfig["audio_generation"] = {
      provider: "chatterbox",
      service_url: "http://127.0.0.1:8890",
      exaggeration: 0.5,
      cfg_weight: 0.5,
      max_concurrent_tasks: 2,
      merge_gap_ms: 300,
      match_target_duration: true,
    },
    audioProviderFactory?: (target: ChatterboxTarget, config: AppConfig["audio_generation"]) => AudioProvider,
    imageConfig: AppConfig["image_generation"] = DEFAULT_CONFIG.image_generation,
    readonly antigravity?: AntigravityClient,
    activeEngine: "codex" | "antigravity" = "codex",
  ) {
    super();
    this.activeEngine = activeEngine;
    this.approvalRegistry = new TaskApprovalRegistry(codex, {
      finish: (id, status, message) => this.finish(id, status, message),
      update: (id, patch) => this.update(id, patch),
      getTask: (id) => this.get(id),
    });
    this.videoConfig =
      typeof videoConfigOrMaxSceneDuration === "number"
        ? { ...DEFAULT_CONFIG.video_generation, max_scene_duration_seconds: videoConfigOrMaxSceneDuration }
        : videoConfigOrMaxSceneDuration;
    this.audioConfig = audioConfig;
    this.imageConfig = imageConfig;
    this.audioProviderFactory = audioProviderFactory ?? ((target, config) => new ChatterboxProvider(repository, config, target));
    attachTaskManagerClientEvents(this, codex, antigravity);
  }

  async load(): Promise<void> {
    const loaded = await loadTasksFromDisk(this.repository.roots.runtime);
    for (const task of loaded) this.tasks.set(task.task_id, task);
    await this.reconcileOrphanedTasks();
    await this.reconcileQuestionHistory();
    await this.cleanupExpiredFailedBuilds();
    this.startFailedBuildCleanupTimer();
  }

  async reload(): Promise<void> {
    if (this.hasActiveWork()) throw new RepositoryError("Finish active tasks before changing storage", "STORAGE_BUSY");
    this.tasks.clear();
    this.imageVariants.clear();
    this.topicHints.clear();
    this.abortRegistry.clearAll();
    this.approvalRegistry.clear();
    this.queueCoordinator.reset();
    this.runningCount = this.runningAudioCount = this.runningImageCount = this.runningVideoCount = this.runningPipelineCount = 0;
    this.connectionStatus = this.codex.isConnected ? "connected" : "disconnected";
    await this.load();
  }

  updateAudioConfig(config: AppConfig["audio_generation"]): void {
    this.audioConfig = config;
    void this.pump();
  }
  updateVideoConfig(config: AppConfig["video_generation"]): void {
    this.videoConfig = config;
    void this.pump();
  }
  updateImageConfig(config: AppConfig["image_generation"]): void {
    this.imageConfig = config;
    void this.pump();
  }
  setActiveEngine(engine: "codex" | "antigravity"): void {
    this.activeEngine = engine;
    this.emitEvent({ type: "engine.status", engine, status: this.getStatus() });
  }
  getActiveEngine(): "codex" | "antigravity" {
    return this.activeEngine;
  }
  getStatus(): ConnectionStatus {
    return this.activeEngine === "antigravity" ? this.antigravityStatus : this.connectionStatus;
  }
  getCodexStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
  getAntigravityStatus(): ConnectionStatus {
    return this.antigravityStatus;
  }
  list(): Task[] {
    return [...this.tasks.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  get(taskId: string): Task {
    const task = this.tasks.get(taskId);
    if (!task) throw new RepositoryError("Task not found", "TASK_NOT_FOUND");
    return task;
  }

  hasActiveWork(): boolean {
    const queueState = {
      locks: this.locks,
      runningCount: this.runningCount,
      runningAudioCount: this.runningAudioCount,
      runningImageCount: this.runningImageCount,
      runningVideoCount: this.runningVideoCount,
      runningPipelineCount: this.runningPipelineCount,
    };
    return (
      this.pipelineEngine.hasActiveRuns() ||
      this.activeAudio.size > 0 ||
      this.abortRegistry.hasActiveControllers() ||
      this.queueCoordinator.hasRunningWork(queueState) ||
      this.failedBuildCleanupPromise !== null ||
      this.list().some((task) => (ACTIVE_TERMINAL_STATUSES as readonly string[]).includes(task.status))
    );
  }

  submit(
    taskType: TaskType,
    channelId: string,
    episodeId: string | null,
    sceneNumber?: number,
    requestedImageVariant?: number,
    topicHint?: string,
    reelId?: string | null,
  ): Task {
    const task = submitTask(this, taskType, channelId, episodeId, sceneNumber, requestedImageVariant, topicHint, reelId);
    this.tasks.set(task.task_id, task);
    void this.taskMutations.enqueue(task.task_id, () => this.persist(task));
    this.emitTask(task);
    void this.pump();
    return task;
  }

  submitShortReel(channelId: string, reelId: string, request: GenerateShortReelRequest): Task {
    const task = submitTask(this, "GENERATE_SHORT_REEL_PACKAGE", channelId, null, undefined, undefined, undefined, reelId, request);
    this.shortReelTargets.set(task.task_id, request.target);
    this.tasks.set(task.task_id, task);
    void this.taskMutations.enqueue(task.task_id, () => this.persist(task));
    this.emitTask(task);
    void this.pump();
    return task;
  }

  async cancel(taskId: string): Promise<Task> {
    const res = await cancelTask(this, taskId);
    void this.pump();
    return res;
  }

  decideApproval(taskId: string, requestId: number, decision: "accept" | "acceptForSession" | "decline" | "cancel"): Promise<Task> {
    return this.approvalRegistry.decide(taskId, requestId, decision);
  }

  private pump(): Promise<void> {
    return this.queueCoordinator.pumpQueue();
  }
  findSceneNumber(taskId: string): number | undefined {
    return this.tasks.get(taskId)?.scene_number ?? undefined;
  }

  async finish(taskId: string, status: TaskStatus, error: string | null, outputFiles: string[] = []): Promise<void> {
    this.pipelineEngine.completeRun(taskId);
    this.abortRegistry.releaseCompletedShortReel(taskId);
    await this.update(taskId, {
      status,
      error,
      completed_at: nowIso(),
      output_files: outputFiles.length ? outputFiles : this.get(taskId).output_files,
      progress_message: status === "COMPLETED" ? "Completed" : (error ?? status),
      progress_percent: status === "COMPLETED" ? 100 : this.get(taskId).progress_percent,
    });
    this.imageVariants.delete(taskId);
    this.topicHints.delete(taskId);
  }

  async update(taskId: string, patch: Partial<Task>): Promise<void> {
    await this.taskMutations.enqueue(taskId, async () => {
      const current = this.get(taskId);
      const next = applyTaskPatch(current, patch);
      if (next === current) return;
      this.tasks.set(taskId, next);
      await this.persist(next);
      this.emitTask(next);
    });
  }

  private persist(task: Task): Promise<void> {
    return persistTask(this.repository.roots.runtime, task);
  }
  private emitTask(task: Task): void {
    this.emitEvent({ type: "task.updated", task });
  }
  emitEvent(event: TaskEvent): void {
    this.emit("event", event);
  }

  // --- Task execution (delegated to focused runner modules) ---

  run(task: Task): Promise<void> {
    return run.call(this, task);
  }
  createImageProvider(
    imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string },
    output?: string,
  ): ReturnType<TaskManagerRuntime["createImageProvider"]> {
    return createImageProvider.call(this, imageTarget, output);
  }
  generateBundleImageWithSafetyRetry(
    task: Task,
    imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string },
    initialPrompt: string,
    signal?: AbortSignal,
    output?: string,
    visualBibleContent?: string,
  ): Promise<{ image: { asset_path: string }; updatedPrompt?: string }> {
    return generateBundleImageWithSafetyRetry.call(this, task, imageTarget, initialPrompt, signal, output, visualBibleContent);
  }
  runGpti2BundleImageTask(task: Task): Promise<void> {
    return runGpti2BundleImageTask.call(this, task);
  }
  runAntigravityBundleImageTask(task: Task): Promise<void> {
    return runAntigravityBundleImageTask.call(this, task);
  }
  runShopAiKeyImageTask(task: Task): Promise<void> {
    return runShopAiKeyImageTask.call(this, task);
  }
  runPipelineTask(task: Task): Promise<void> {
    return runPipelineTask.call(this, task);
  }
  runVideoTask(task: Task): Promise<void> {
    return runVideoTask.call(this, task);
  }
  hasReadyArtifact(channelId: string, episodeId: string, filename: string): Promise<boolean> {
    return hasReadyArtifact.call(this, channelId, episodeId, filename);
  }
  generatePipelineBundleImages(task: Task, run: PipelineRun): Promise<void> {
    return generatePipelineBundleImages.call(this, task, run);
  }
  runQuizV2Pipeline(task: Task): Promise<void> {
    return runQuizV2Pipeline.call(this, task);
  }
  attachPipelineBundleImages(channelId: string, episodeId: string): Promise<void> {
    return attachPipelineBundleImages.call(this, channelId, episodeId);
  }
  hasReadyScript(channelId: string, episodeId: string): Promise<boolean> {
    return hasReadyScript.call(this, channelId, episodeId);
  }
  hasValidNarrationAsset(channelId: string, episodeId: string, assetPath: string | null): Promise<boolean> {
    return hasValidNarrationAsset.call(this, channelId, episodeId, assetPath);
  }
  isShotPlanFresh(channelId: string, episodeId: string): Promise<boolean> {
    return isShotPlanFresh.call(this, channelId, episodeId);
  }
  waitForTaskTerminal(taskId: string, run: PipelineRun, onProgress?: (task: Task) => Promise<void> | void): Promise<Task> {
    return waitForTaskTerminal.call(this, taskId, run, onProgress);
  }
  runAudioTask(task: Task): Promise<void> {
    return runAudioTask.call(this, task);
  }
  handleNotification(method: string, params: Record<string, unknown>): void {
    return handleNotification.call(this, method, params);
  }
  handleServerRequest(request: CodexServerRequest): void {
    return handleServerRequest.call(this, request);
  }
  completeWithOutput(active: ActiveRun): Promise<void> {
    return completeWithOutput.call(this, active);
  }
  retryQuizResearch(active: ActiveRun, reason: string): Promise<void> {
    return retryQuizResearch.call(this, active, reason);
  }
  retryScript(active: ActiveRun, reason: string): Promise<void> {
    return retryScript.call(this, active, reason);
  }
  retryVisualBible(active: ActiveRun, reason: string): Promise<void> {
    return retryVisualBible.call(this, active, reason);
  }
  retrySequenceScenes(active: ActiveRun, reason: string): Promise<void> {
    return retrySequenceScenes.call(this, active, reason);
  }
  retryTopicSuggestions(active: ActiveRun, reason: string): Promise<void> {
    return retryTopicSuggestions.call(this, active, reason);
  }

  // --- Lifecycle maintenance (prune/reconcile/cleanup) ---

  hasActiveEpisodeTasks(episodeId: string): boolean {
    return hasActiveEpisodeTasks.call(this, episodeId);
  }
  hasActiveChannelTasks(channelId: string): boolean {
    return hasActiveChannelTasks.call(this, channelId);
  }
  async pruneEpisodeTasks(episodeId: string): Promise<string[]> {
    const taskIds = await pruneEpisodeTasks.call(this, episodeId);
    this.abortRegistry.releaseShortReelsFor(taskIds);
    return taskIds;
  }
  async pruneChannelTasks(channelId: string): Promise<string[]> {
    const taskIds = await pruneChannelTasks.call(this, channelId);
    this.abortRegistry.releaseShortReelsFor(taskIds);
    return taskIds;
  }
  reconcileQuestionHistory(): Promise<void> {
    return reconcileQuestionHistory.call(this);
  }
  async reconcileOrphanedTasks(): Promise<{ removedEpisodes: number; removedTasks: number }> {
    const result = await reconcileOrphanedTasks.call(this);
    this.abortRegistry.reconcileShortReels(new Set(this.tasks.keys()));
    return result;
  }
  cleanupExpiredFailedBuilds(nowMs?: number): Promise<{ removedEpisodes: number; removedTasks: number }> {
    return runFailedBuildCleanup(this, nowMs);
  }
  startFailedBuildCleanupTimer(): void {
    scheduleFailedBuildCleanup(this);
  }
}

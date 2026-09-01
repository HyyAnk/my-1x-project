import { EventEmitter } from "node:events";
import { nowIso, type AppConfig, type Task, type TaskEvent, type TaskStatus, type TaskType } from "@studio/shared";
import type { AntigravityClient } from "../antigravity.js";
import type { CodexAppServerClient, CodexServerRequest } from "../codex.js";
import { DEFAULT_CONFIG } from "../config.js";
import type { ContextEngine } from "../context.js";
import type { StudioLogger } from "../logger.js";
import { ChatterboxProvider, type ChatterboxTarget } from "../providers/chatterbox.js";
import type { AudioProvider, ImageProvider } from "../providers/index.js";
import { RepositoryError, RepositoryService } from "../repository.js";
import { pumpTaskQueue } from "./taskQueuePump.js";
import { applyTaskPatch, loadTasksFromDisk, persistTask } from "./taskStateStore.js";
import { decideTaskApproval } from "./taskApprovalManager.js";
import { cancelTask, submitTask } from "./taskSubmission.js";
import { TaskMutationQueue } from "./taskMutationQueue.js";
import { taskDelegates } from "./taskDelegates.js";
import type { ActiveRun, PipelineRun, TaskManagerRuntime } from "./runtime.js";

export class TaskManager extends EventEmitter implements TaskManagerRuntime {
  readonly tasks = new Map<string, Task>();
  readonly active = new Map<string, ActiveRun>();
  readonly approvalRequests = new Map<number, { taskId: string; request: CodexServerRequest }>();
  readonly completionWaiters = new Map<string, () => void>();
  readonly pipelineRuns = new Map<string, PipelineRun>();
  readonly locks = new Set<string>();
  readonly assemblingEpisodes = new Set<string>();
  readonly activeImageControllers = new Map<string, AbortController>();
  readonly activeVideoControllers = new Map<string, AbortController>();
  readonly imageVariants = new Map<string, number>();
  readonly topicHints = new Map<string, string>();
  private readonly taskMutations = new TaskMutationQueue();
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
  private connectionStatus: "connected" | "disconnected" | "unavailable" | "connecting" = "disconnected";
  private antigravityStatus: "connected" | "disconnected" | "unavailable" | "connecting" = "disconnected";
  activeEngine: "codex" | "antigravity" = "codex";

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
    this.videoConfig =
      typeof videoConfigOrMaxSceneDuration === "number"
        ? { ...DEFAULT_CONFIG.video_generation, max_scene_duration_seconds: videoConfigOrMaxSceneDuration }
        : videoConfigOrMaxSceneDuration;
    this.audioConfig = audioConfig;
    this.imageConfig = imageConfig;
    this.audioProviderFactory = audioProviderFactory ?? ((target, config) => new ChatterboxProvider(repository, config, target));
    codex.on("status", (status: typeof this.connectionStatus) => {
      this.connectionStatus = status;
      this.emitEvent({ type: "codex.status", status });
    });
    codex.on("notification", (event: { method: string; params: Record<string, unknown> }) =>
      this.handleNotification(event.method, event.params),
    );
    codex.on("serverRequest", (request: CodexServerRequest) => this.handleServerRequest(request));
    codex.on("exit", () => {
      this.connectionStatus = "unavailable";
      this.emitEvent({ type: "codex.status", status: "unavailable", message: "Codex App Server unavailable" });
    });
    if (antigravity) {
      antigravity.on("status", (status: typeof this.antigravityStatus) => {
        this.antigravityStatus = status;
        this.emitEvent({ type: "antigravity.status", status });
      });
      antigravity.on("notification", (event: { method: string; params: Record<string, unknown> }) =>
        this.handleNotification(event.method, event.params),
      );
    }
  }

  async load(): Promise<void> {
    const loaded = await loadTasksFromDisk(this.repository.roots.runtime);
    for (const task of loaded) {
      this.tasks.set(task.task_id, task);
    }
    await this.reconcileQuestionHistory();
    await this.cleanupExpiredFailedBuilds();
    this.startFailedBuildCleanupTimer();
  }

  async reload(): Promise<void> {
    if (this.hasActiveWork()) throw new RepositoryError("Finish active tasks before changing storage", "STORAGE_BUSY");
    this.tasks.clear();
    this.imageVariants.clear();
    this.topicHints.clear();
    this.activeImageControllers.clear();
    this.activeVideoControllers.clear();
    this.approvalRequests.clear();
    this.locks.clear();
    this.runningCount = 0;
    this.runningAudioCount = 0;
    this.runningImageCount = 0;
    this.runningVideoCount = 0;
    this.runningPipelineCount = 0;
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

  getStatus(): typeof this.connectionStatus {
    return this.activeEngine === "antigravity" ? this.antigravityStatus : this.connectionStatus;
  }

  getCodexStatus(): typeof this.connectionStatus {
    return this.connectionStatus;
  }

  getAntigravityStatus(): typeof this.antigravityStatus {
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
    return (
      this.active.size > 0 ||
      this.activeAudio.size > 0 ||
      this.activeImageControllers.size > 0 ||
      this.activeVideoControllers.size > 0 ||
      this.pipelineRuns.size > 0 ||
      this.runningCount > 0 ||
      this.runningAudioCount > 0 ||
      this.runningImageCount > 0 ||
      this.runningVideoCount > 0 ||
      this.runningPipelineCount > 0 ||
      this.failedBuildCleanupPromise !== null ||
      this.list().some((task) => ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(task.status))
    );
  }

  submit(
    taskType: TaskType,
    channelId: string,
    episodeId: string | null,
    sceneNumber?: number,
    requestedImageVariant?: number,
    topicHint?: string,
  ): Task {
    const task = submitTask(this, taskType, channelId, episodeId, sceneNumber, requestedImageVariant, topicHint);
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
    return decideTaskApproval(
      taskId,
      requestId,
      decision,
      this.approvalRequests,
      this.codex,
      (id, status, msg) => this.finish(id, status, msg),
      (id, patch) => this.update(id, patch),
      (id) => this.get(id),
    );
  }

  private pump(): Promise<void> {
    return pumpTaskQueue(this);
  }

  findSceneNumber(taskId: string): number | undefined {
    return this.tasks.get(taskId)?.scene_number ?? undefined;
  }

  async finish(taskId: string, status: TaskStatus, error: string | null, outputFiles: string[] = []): Promise<void> {
    this.active.delete(taskId);
    this.completionWaiters.get(taskId)?.();
    this.completionWaiters.delete(taskId);
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

  // --- Runner & Lifecycle Delegate Forwarders ---
  run(task: Task): Promise<void> {
    return taskDelegates.run.call(this, task);
  }
  createImageProvider(
    imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string },
    output?: string,
  ): ImageProvider {
    return taskDelegates.createImageProvider.call(this, imageTarget, output);
  }
  generateBundleImageWithSafetyRetry(
    task: Task,
    imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string },
    initialPrompt: string,
    signal?: AbortSignal,
    output?: string,
    visualBibleContent?: string,
  ): Promise<{ image: { asset_path: string }; updatedPrompt?: string }> {
    return taskDelegates.generateBundleImageWithSafetyRetry.call(
      this,
      task,
      imageTarget,
      initialPrompt,
      signal,
      output,
      visualBibleContent,
    );
  }
  runGpti2BundleImageTask(task: Task): Promise<void> {
    return taskDelegates.runGpti2BundleImageTask.call(this, task);
  }
  runAntigravityBundleImageTask(task: Task): Promise<void> {
    return taskDelegates.runAntigravityBundleImageTask.call(this, task);
  }
  runShopAiKeyImageTask(task: Task): Promise<void> {
    return taskDelegates.runShopAiKeyImageTask.call(this, task);
  }
  runPipelineTask(task: Task): Promise<void> {
    return taskDelegates.runPipelineTask.call(this, task);
  }
  runVideoTask(task: Task): Promise<void> {
    return taskDelegates.runVideoTask.call(this, task);
  }
  hasReadyArtifact(channelId: string, episodeId: string, filename: string): Promise<boolean> {
    return taskDelegates.hasReadyArtifact.call(this, channelId, episodeId, filename);
  }
  generatePipelineBundleImages(task: Task, run: PipelineRun): Promise<void> {
    return taskDelegates.generatePipelineBundleImages.call(this, task, run);
  }
  runQuizV2Pipeline(task: Task): Promise<void> {
    return taskDelegates.runQuizV2Pipeline.call(this, task);
  }
  attachPipelineBundleImages(channelId: string, episodeId: string): Promise<void> {
    return taskDelegates.attachPipelineBundleImages.call(this, channelId, episodeId);
  }
  hasReadyScript(channelId: string, episodeId: string): Promise<boolean> {
    return taskDelegates.hasReadyScript.call(this, channelId, episodeId);
  }
  hasValidNarrationAsset(channelId: string, episodeId: string, assetPath: string | null): Promise<boolean> {
    return taskDelegates.hasValidNarrationAsset.call(this, channelId, episodeId, assetPath);
  }
  isShotPlanFresh(channelId: string, episodeId: string): Promise<boolean> {
    return taskDelegates.isShotPlanFresh.call(this, channelId, episodeId);
  }
  waitForTaskTerminal(taskId: string, run: PipelineRun, onProgress?: (task: Task) => Promise<void> | void): Promise<Task> {
    return taskDelegates.waitForTaskTerminal.call(this, taskId, run, onProgress);
  }
  runAudioTask(task: Task): Promise<void> {
    return taskDelegates.runAudioTask.call(this, task);
  }
  handleNotification(method: string, params: Record<string, unknown>): void {
    return taskDelegates.handleNotification.call(this, method, params);
  }
  handleServerRequest(request: CodexServerRequest): void {
    return taskDelegates.handleServerRequest.call(this, request);
  }
  completeWithOutput(active: ActiveRun): Promise<void> {
    return taskDelegates.completeWithOutput.call(this, active);
  }
  retryQuizResearch(active: ActiveRun, reason: string): Promise<void> {
    return taskDelegates.retryQuizResearch.call(this, active, reason);
  }
  retryScript(active: ActiveRun, reason: string): Promise<void> {
    return taskDelegates.retryScript.call(this, active, reason);
  }
  retryVisualBible(active: ActiveRun, reason: string): Promise<void> {
    return taskDelegates.retryVisualBible.call(this, active, reason);
  }
  retrySequenceScenes(active: ActiveRun, reason: string): Promise<void> {
    return taskDelegates.retrySequenceScenes.call(this, active, reason);
  }
  cleanupExpiredFailedBuilds(nowMs?: number): Promise<{ removedEpisodes: number; removedTasks: number }> {
    return taskDelegates.cleanupExpiredFailedBuilds.call(this, nowMs);
  }
  reconcileQuestionHistory(): Promise<void> {
    return taskDelegates.reconcileQuestionHistory.call(this);
  }
  startFailedBuildCleanupTimer(): void {
    return taskDelegates.startFailedBuildCleanupTimer.call(this);
  }
}

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
import { videoRenderConcurrencyLimiter } from "./video/renderConcurrencyLimiter.js";
import { TaskManagerLifecycleBase } from "./lifecycle/taskLifecycleMaintenance.js";

const ACTIVE_TERMINAL_STATUSES = ["QUEUED", "RUNNING", "WAITING_APPROVAL"] as const;
const DEFAULT_AUDIO_CONFIG: AppConfig["audio_generation"] = {
  provider: "chatterbox",
  service_url: "http://127.0.0.1:8890",
  exaggeration: 0.5,
  cfg_weight: 0.5,
  max_concurrent_tasks: 2,
  merge_gap_ms: 300,
  match_target_duration: true,
};

export class TaskManager extends TaskManagerLifecycleBase implements TaskManagerRuntime {
  readonly abortRegistry = new TaskAbortRegistry();
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
  readonly activeAudio = new Set<string>();
  runningCount = 0;
  runningAudioCount = 0;
  runningImageCount = 0;
  runningVideoCount = 0;
  runningPipelineCount = 0;
  audioConfig: AppConfig["audio_generation"];
  imageConfig: AppConfig["image_generation"];
  imageFallbackConfig: AppConfig["image_fallback"];
  videoConfig: AppConfig["video_generation"];
  readonly videoRenderLimiter = videoRenderConcurrencyLimiter;
  readonly audioProviderFactory: (target: ChatterboxTarget, config: AppConfig["audio_generation"]) => AudioProvider;
  failedBuildCleanupPromise: Promise<{ removedEpisodes: number; removedTasks: number }> | null = null;
  failedBuildCleanupTimer: NodeJS.Timeout | null = null;
  connectionStatus: ConnectionStatus = "disconnected";
  antigravityStatus: ConnectionStatus = "disconnected";
  activeEngine: "codex" | "antigravity" = "codex";

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
    audioConfig: AppConfig["audio_generation"] = DEFAULT_AUDIO_CONFIG,
    audioProviderFactory?: (target: ChatterboxTarget, config: AppConfig["audio_generation"]) => AudioProvider,
    imageConfig: AppConfig["image_generation"] = DEFAULT_CONFIG.image_generation,
    readonly antigravity?: AntigravityClient,
    activeEngine: "codex" | "antigravity" = "codex",
    imageFallbackConfig: AppConfig["image_fallback"] = DEFAULT_CONFIG.image_fallback,
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
    if (this.videoConfig?.max_concurrent_tasks && !process.env.MAX_CONCURRENT_VIDEO_RENDERS) {
      videoRenderConcurrencyLimiter.setMaxConcurrency(this.videoConfig.max_concurrent_tasks);
    }
    this.audioConfig = audioConfig;
    this.imageConfig = imageConfig;
    this.imageFallbackConfig = imageFallbackConfig;
    this.audioProviderFactory = audioProviderFactory ?? ((target, config) => new ChatterboxProvider(repository, config, target));
    attachTaskManagerClientEvents(this, codex, antigravity);
  }

  async load(): Promise<void> {
    for (const task of await loadTasksFromDisk(this.repository.roots.runtime)) this.tasks.set(task.task_id, task);
    await this.reconcileOrphanedTasks();
    await this.reconcileQuestionHistory();
    await this.cleanupExpiredFailedBuilds();
    await this.reconcileStartupState();
    this.startFailedBuildCleanupTimer();
    await this.pump();
  }

  async reload(): Promise<void> {
    if (this.hasActiveWork()) throw new RepositoryError("Finish active tasks before changing storage", "STORAGE_BUSY");
    this.tasks.clear();
    this.imageVariants.clear();
    this.topicHints.clear();
    this.abortRegistry.clearAll();
    this.approvalRegistry.clear();
    this.queueCoordinator.reset();
    videoRenderConcurrencyLimiter.reset();
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
    if (config.max_concurrent_tasks && !process.env.MAX_CONCURRENT_VIDEO_RENDERS)
      videoRenderConcurrencyLimiter.setMaxConcurrency(config.max_concurrent_tasks);
    void this.pump();
  }
  updateImageConfig(config: AppConfig["image_generation"]): void {
    this.imageConfig = config;
    void this.pump();
  }
  updateImageFallbackConfig(config: AppConfig["image_fallback"]): void {
    this.imageFallbackConfig = config;
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

  private registerSubmittedTask(task: Task): Task {
    this.tasks.set(task.task_id, task);
    void this.taskMutations.enqueue(task.task_id, () => this.persist(task));
    this.emitTask(task);
    void this.pump();
    return task;
  }

  submit(
    taskType: TaskType,
    channelId: string,
    episodeId: string | null,
    sceneNumber?: number,
    requestedImageVariant?: number,
    topicHint?: string,
    reelId?: string | null,
    parentTaskId?: string,
  ): Task {
    return this.registerSubmittedTask(
      submitTask(this, taskType, channelId, episodeId, sceneNumber, requestedImageVariant, topicHint, reelId, undefined, parentTaskId),
    );
  }

  submitShortReel(channelId: string, reelId: string, request: GenerateShortReelRequest): Task {
    const task = submitTask(this, "GENERATE_SHORT_REEL_PACKAGE", channelId, null, undefined, undefined, undefined, reelId, request);
    this.shortReelTargets.set(task.task_id, request.target);
    return this.registerSubmittedTask(task);
  }

  async cancel(taskId: string): Promise<Task> {
    const res = await cancelTask(this, taskId);
    void this.pump();
    return res;
  }

  decideApproval(taskId: string, reqId: number, decision: "accept" | "acceptForSession" | "decline" | "cancel"): Promise<Task> {
    return this.approvalRegistry.decide(taskId, reqId, decision);
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
}

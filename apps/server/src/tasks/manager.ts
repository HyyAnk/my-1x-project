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
import { pumpTaskQueue } from "./taskQueuePump.js";
import { applyTaskPatch, loadTasksFromDisk, persistTask } from "./taskStateStore.js";
import { decideTaskApproval } from "./taskApprovalManager.js";
import { cancelTask, submitTask } from "./taskSubmission.js";
import { TaskMutationQueue } from "./taskMutationQueue.js";
import { taskDelegates } from "./taskDelegates.js";
import type { ActiveRun, PipelineRun, TaskManagerRuntime } from "./runtime.js";
import { attachTaskManagerClientEvents, type ConnectionStatus } from "./taskClientEvents.js";
import { runFailedBuildCleanup, scheduleFailedBuildCleanup } from "./taskFailedBuildCleaner.js";

export class TaskManager extends EventEmitter implements TaskManagerRuntime {
  declare run: TaskManagerRuntime["run"];
  declare createImageProvider: TaskManagerRuntime["createImageProvider"];
  declare generateBundleImageWithSafetyRetry: TaskManagerRuntime["generateBundleImageWithSafetyRetry"];
  declare runGpti2BundleImageTask: TaskManagerRuntime["runGpti2BundleImageTask"];
  declare runAntigravityBundleImageTask: TaskManagerRuntime["runAntigravityBundleImageTask"];
  declare runShopAiKeyImageTask: TaskManagerRuntime["runShopAiKeyImageTask"];
  declare runPipelineTask: TaskManagerRuntime["runPipelineTask"];
  declare runVideoTask: TaskManagerRuntime["runVideoTask"];
  declare hasReadyArtifact: TaskManagerRuntime["hasReadyArtifact"];
  declare generatePipelineBundleImages: TaskManagerRuntime["generatePipelineBundleImages"];
  declare runQuizV2Pipeline: TaskManagerRuntime["runQuizV2Pipeline"];
  declare attachPipelineBundleImages: TaskManagerRuntime["attachPipelineBundleImages"];
  declare hasReadyScript: TaskManagerRuntime["hasReadyScript"];
  declare hasValidNarrationAsset: TaskManagerRuntime["hasValidNarrationAsset"];
  declare isShotPlanFresh: TaskManagerRuntime["isShotPlanFresh"];
  declare waitForTaskTerminal: TaskManagerRuntime["waitForTaskTerminal"];
  declare runAudioTask: TaskManagerRuntime["runAudioTask"];
  declare handleNotification: TaskManagerRuntime["handleNotification"];
  declare handleServerRequest: TaskManagerRuntime["handleServerRequest"];
  declare completeWithOutput: TaskManagerRuntime["completeWithOutput"];
  declare retryQuizResearch: TaskManagerRuntime["retryQuizResearch"];
  declare retryScript: TaskManagerRuntime["retryScript"];
  declare retryVisualBible: TaskManagerRuntime["retryVisualBible"];
  declare retrySequenceScenes: TaskManagerRuntime["retrySequenceScenes"];
  declare retryTopicSuggestions: TaskManagerRuntime["retryTopicSuggestions"];
  declare cleanupExpiredFailedBuilds: TaskManagerRuntime["cleanupExpiredFailedBuilds"];
  declare hasActiveEpisodeTasks: TaskManagerRuntime["hasActiveEpisodeTasks"];
  declare hasActiveChannelTasks: TaskManagerRuntime["hasActiveChannelTasks"];
  declare pruneEpisodeTasks: TaskManagerRuntime["pruneEpisodeTasks"];
  declare pruneChannelTasks: TaskManagerRuntime["pruneChannelTasks"];
  declare reconcileQuestionHistory: TaskManagerRuntime["reconcileQuestionHistory"];
  declare reconcileOrphanedTasks: TaskManagerRuntime["reconcileOrphanedTasks"];
  declare startFailedBuildCleanupTimer: TaskManagerRuntime["startFailedBuildCleanupTimer"];

  readonly tasks = new Map<string, Task>();
  readonly active = new Map<string, ActiveRun>();
  readonly approvalRequests = new Map<number, { taskId: string; request: CodexServerRequest }>();
  readonly completionWaiters = new Map<string, () => void>();
  readonly pipelineRuns = new Map<string, PipelineRun>();
  readonly locks = new Set<string>();
  readonly assemblingEpisodes = new Set<string>();
  readonly activeImageControllers = new Map<string, AbortController>();
  readonly activeVideoControllers = new Map<string, AbortController>();
  readonly activeShortReelControllers = new Map<string, AbortController>();
  readonly shortReelTargets = new Map<string, GenerateShortReelTarget>();
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
  connectionStatus: ConnectionStatus = "disconnected";
  antigravityStatus: ConnectionStatus = "disconnected";
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
    this.activeImageControllers.clear();
    this.activeVideoControllers.clear();
    this.activeShortReelControllers.clear();
    this.shortReelTargets.clear();
    this.approvalRequests.clear();
    this.locks.clear();
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
    return (
      this.active.size > 0 ||
      this.activeAudio.size > 0 ||
      this.activeImageControllers.size > 0 ||
      this.activeVideoControllers.size > 0 ||
      this.activeShortReelControllers.size > 0 ||
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
    this.activeShortReelControllers.delete(taskId);
    this.shortReelTargets.delete(taskId);
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

Object.assign(TaskManager.prototype, taskDelegates, {
  async pruneEpisodeTasks(this: TaskManager, episodeId: string) {
    const taskIds = await taskDelegates.pruneEpisodeTasks.call(this, episodeId);
    for (const id of taskIds) {
      this.activeShortReelControllers.get(id)?.abort();
      this.activeShortReelControllers.delete(id);
      this.shortReelTargets.delete(id);
    }
    return taskIds;
  },
  async pruneChannelTasks(this: TaskManager, channelId: string) {
    const taskIds = await taskDelegates.pruneChannelTasks.call(this, channelId);
    for (const id of taskIds) {
      this.activeShortReelControllers.get(id)?.abort();
      this.activeShortReelControllers.delete(id);
      this.shortReelTargets.delete(id);
    }
    return taskIds;
  },
  async reconcileOrphanedTasks(this: TaskManager) {
    const result = await taskDelegates.reconcileOrphanedTasks.call(this);
    for (const [id, ctrl] of this.activeShortReelControllers) {
      if (!this.tasks.has(id)) {
        ctrl.abort();
        this.activeShortReelControllers.delete(id);
      }
    }
    for (const id of this.shortReelTargets.keys()) {
      if (!this.tasks.has(id)) {
        this.shortReelTargets.delete(id);
      }
    }
    return result;
  },
  cleanupExpiredFailedBuilds(this: TaskManager, nowMs?: number) {
    return runFailedBuildCleanup(this, nowMs);
  },
  startFailedBuildCleanupTimer(this: TaskManager) {
    scheduleFailedBuildCleanup(this);
  },
});

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { EventEmitter } from "node:events";
import { TaskSchema, makeId, nowIso, type AppConfig, type Task, type TaskEvent, type TaskStatus, type TaskType } from "@studio/shared";
import { AntigravityClient } from "../antigravity.js";
import { CodexAppServerClient, type CodexServerRequest } from "../codex.js";
import { DEFAULT_CONFIG } from "../config.js";
import { ContextEngine } from "../context.js";
import { StudioLogger } from "../logger.js";
import { ChatterboxProvider, type ChatterboxTarget } from "../providers/chatterbox.js";
import type { AudioProvider, ImageProvider } from "../providers/index.js";
import { RepositoryError, RepositoryService } from "../repository.js";
import {
  runAudioTask as runAudioTaskImplementation,
  runNarrationTask as runNarrationTaskImplementation,
  mergeNarrationSegments as mergeNarrationSegmentsImplementation,
} from "./audioRunner.js";
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
  cleanupAntigravityThreads as cleanupAntigravityThreadsImplementation,
  cleanupCodexThreads as cleanupCodexThreadsImplementation,
  isSessionCleanupEnabled as isSessionCleanupEnabledImplementation,
  startCleanupTimer as startCleanupTimerImplementation,
  tryDeleteThread as tryDeleteThreadImplementation,
} from "./threadCleanup.js";
import {
  cleanupExpiredFailedBuilds as cleanupExpiredFailedBuildsImplementation,
  reconcileQuestionHistory as reconcileQuestionHistoryImplementation,
} from "./taskLifecycle.js";
import { runVideoTask as runVideoTaskImplementation } from "./videoRunner.js";
import type { ActiveRun, CodexCleanupConfig, PipelineRun, TaskManagerRuntime } from "./runtime.js";

const channelTaskTypes = new Set<TaskType>(["GENERATE_DNA", "SUGGEST_TOPICS"]);
const audioTaskTypes = new Set<TaskType>(["GENERATE_AUDIO", "GENERATE_NARRATION"]);
const imageTaskTypes = new Set<TaskType>(["GENERATE_BUNDLE_IMAGE"]);
const videoTaskTypes = new Set<TaskType>(["GENERATE_VIDEO"]);
const pipelineTaskTypes = new Set<TaskType>(["GENERATE_PIPELINE"]);

export class TaskManager extends EventEmitter implements TaskManagerRuntime {
  readonly tasks = new Map<string, Task>();
  readonly active = new Map<string, ActiveRun>();
  readonly approvalRequests = new Map<number, { taskId: string; request: CodexServerRequest }>();
  readonly completionWaiters = new Map<string, () => void>();
  readonly pipelineRuns = new Map<string, PipelineRun>();
  readonly locks = new Set<string>();
  readonly assemblingEpisodes = new Set<string>();
  readonly activeImageControllers = new Map<string, AbortController>();
  readonly imageVariants = new Map<string, number>();
  readonly topicHints = new Map<string, string>();
  private runningCount = 0;
  private runningAudioCount = 0;
  private runningImageCount = 0;
  private runningVideoCount = 0;
  private runningPipelineCount = 0;
  readonly activeAudio = new Set<string>();
  audioConfig: AppConfig["audio_generation"];
  imageConfig: AppConfig["image_generation"];
  videoConfig: AppConfig["video_generation"];
  readonly audioProviderFactory: (target: ChatterboxTarget, config: AppConfig["audio_generation"]) => AudioProvider;
  codexCleanupConfig: CodexCleanupConfig;
  antigravityCleanupConfig: CodexCleanupConfig;
  cleanupTimer: NodeJS.Timeout | null = null;
  failedBuildCleanupPromise: Promise<{ removedEpisodes: number; removedTasks: number }> | null = null;
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
    codexConfig: CodexCleanupConfig = { auto_delete_threads: false, failed_thread_retention_days: 7 },
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
    this.codexCleanupConfig = {
      auto_delete_threads: codexConfig.auto_delete_threads,
      failed_thread_retention_days: codexConfig.failed_thread_retention_days,
    };
    this.antigravityCleanupConfig = { auto_delete_threads: false, failed_thread_retention_days: 0 };
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
    const directory = path.join(this.repository.roots.runtime, "tasks");
    await mkdir(directory, { recursive: true });
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json"))) {
      try {
        const task = TaskSchema.parse(JSON.parse(await readFile(path.join(directory, entry.name), "utf8")));
        if (task.status === "RUNNING" || task.status === "WAITING_APPROVAL") {
          task.status = "FAILED";
          task.error = "Task interrupted by dashboard restart";
          task.completed_at = nowIso();
        }
        this.tasks.set(task.task_id, task);
        if (task.error === "Task interrupted by dashboard restart") await this.persist(task);
      } catch {
        // Ignore a single corrupt operational record; repository artifacts remain safe.
      }
    }
    await this.reconcileQuestionHistory();
    await this.cleanupExpiredFailedBuilds();
    this.startCleanupTimer();
    void this.cleanupCodexThreads();
    void this.cleanupAntigravityThreads();
  }

  async reload(): Promise<void> {
    if (this.hasActiveWork()) throw new RepositoryError("Finish active tasks before changing storage", "STORAGE_BUSY");
    this.tasks.clear();
    this.imageVariants.clear();
    this.topicHints.clear();
    this.activeImageControllers.clear();
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

  updateCodexConfig(config: AppConfig["codex"]): void {
    this.codexCleanupConfig = {
      auto_delete_threads: config.auto_delete_threads,
      failed_thread_retention_days: config.failed_thread_retention_days,
    };
  }

  updateAntigravityConfig(config: AppConfig["antigravity"]): void {
    this.antigravityCleanupConfig = {
      auto_delete_threads: config.auto_delete_threads,
      failed_thread_retention_days: config.failed_thread_retention_days,
    };
    if (this.antigravity) {
      this.antigravity.updateConfig({ ...DEFAULT_CONFIG, antigravity: config });
    }
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
    if (taskType === "GENERATE_BUNDLE_IMAGE" && !this.imageConfig.enabled)
      throw new RepositoryError("Image generation is disabled in Settings", "IMAGE_GENERATION_DISABLED");
    const imageVariant =
      taskType === "GENERATE_BUNDLE_IMAGE" && episodeId && sceneNumber
        ? (requestedImageVariant ??
          this.list().filter(
            (item) =>
              item.task_type === "GENERATE_BUNDLE_IMAGE" &&
              item.episode_id === episodeId &&
              item.scene_number === sceneNumber &&
              ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(item.status),
          ).length % Math.max(1, this.imageConfig.images_per_bundle))
        : 0;
    const lockKey =
      taskType === "GENERATE_PIPELINE" && episodeId
        ? `${episodeId}:pipeline`
        : taskType === "GENERATE_SEQUENCE_SCENES" && episodeId && sceneNumber
          ? `${episodeId}:sequence:${sceneNumber}`
          : taskType === "GENERATE_BUNDLE_IMAGE" && episodeId && sceneNumber
            ? `${episodeId}:bundle:${sceneNumber}:variant:${imageVariant}`
            : channelTaskTypes.has(taskType)
              ? channelId
              : episodeId;
    if (!lockKey) throw new RepositoryError("Episode is required for this task", "EPISODE_REQUIRED");
    if (
      taskType === "GENERATE_PIPELINE" &&
      this.list().some((item) => item.lock_key === lockKey && ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(item.status))
    ) {
      throw new RepositoryError("Production pipeline is already running for this episode", "PIPELINE_ACTIVE");
    }
    const existingQueue = this.list().filter((task) => task.lock_key === lockKey && task.status === "QUEUED").length;

    // When retrying or restarting a pipeline or task, accumulate duration from previous attempts
    const previousMatchingTasks = this.list().filter(
      (item) =>
        item.lock_key === lockKey &&
        item.channel_id === channelId &&
        item.episode_id === episodeId &&
        item.task_type === taskType &&
        item.scene_number === (sceneNumber ?? null) &&
        ["FAILED", "CANCELLED", "COMPLETED"].includes(item.status),
    );

    const latestPreviousTask = previousMatchingTasks.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    let accumulatedDuration = 0;
    if (latestPreviousTask) {
      const start = latestPreviousTask.started_at || latestPreviousTask.created_at;
      const end = latestPreviousTask.completed_at || nowIso();
      const elapsed = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000));
      accumulatedDuration = (latestPreviousTask.accumulated_duration_seconds || 0) + elapsed;
    }

    const task = TaskSchema.parse({
      task_id: makeId("task"),
      task_type: taskType,
      channel_id: channelId,
      episode_id: episodeId,
      status: "QUEUED",
      created_at: nowIso(),
      started_at: null,
      completed_at: null,
      codex_thread_id: null,
      codex_turn_id: null,
      error: null,
      output_files: [],
      lock_key: lockKey,
      queue_position: existingQueue,
      progress_message: "Queued",
      scene_number: sceneNumber ?? null,
      accumulated_duration_seconds: accumulatedDuration,
    });
    if (taskType === "GENERATE_BUNDLE_IMAGE") this.imageVariants.set(task.task_id, imageVariant);
    if (taskType === "SUGGEST_TOPICS" && topicHint?.trim()) this.topicHints.set(task.task_id, topicHint.trim());
    this.tasks.set(task.task_id, task);
    void this.persist(task);
    this.emitTask(task);
    void this.pump();
    return task;
  }

  async cancel(taskId: string): Promise<Task> {
    const task = this.get(taskId);
    if (task.status === "QUEUED") {
      await this.update(taskId, { status: "CANCELLED", completed_at: nowIso(), progress_message: "Cancelled before start" });
      this.imageVariants.delete(taskId);
      this.topicHints.delete(taskId);
      void this.pump();
      return this.get(taskId);
    }
    const active = this.active.get(taskId);
    if (active) {
      await this.update(taskId, { progress_message: "Interrupting task" });
      await this.codex.interruptTurn(active.threadId, active.turnId).catch(() => undefined);
      await this.finish(taskId, "CANCELLED", "Cancelled by user");
    } else if (this.activeAudio.has(taskId)) {
      await this.finish(taskId, "CANCELLED", "Cancelled by user");
    } else if (this.activeImageControllers.has(taskId)) {
      await this.update(taskId, { status: "CANCELLED", progress_message: "Interrupting image generation" });
      this.activeImageControllers.get(taskId)?.abort();
      await this.finish(taskId, "CANCELLED", "Cancelled by user");
    } else {
      const pipeline = this.pipelineRuns.get(taskId);
      if (pipeline) {
        pipeline.cancelled = true;
        await Promise.all([...pipeline.children].map((childId) => this.cancel(childId).catch(() => undefined)));
      }
    }
    return this.get(taskId);
  }

  async decideApproval(taskId: string, requestId: number, decision: "accept" | "acceptForSession" | "decline" | "cancel"): Promise<Task> {
    const pending = this.approvalRequests.get(requestId);
    if (!pending || pending.taskId !== taskId) throw new RepositoryError("Approval request not found", "APPROVAL_NOT_FOUND");
    this.approvalRequests.delete(requestId);
    this.codex.respond(requestId, { decision });
    if (decision === "decline" || decision === "cancel") await this.finish(taskId, "CANCELLED", "Approval denied");
    else await this.update(taskId, { status: "RUNNING", progress_message: "Approval granted" });
    return this.get(taskId);
  }

  private async pump(): Promise<void> {
    const maxVideoConcurrent = this.videoConfig.max_concurrent_tasks ?? 2;

    while (this.runningVideoCount < maxVideoConcurrent) {
      const next = this.list()
        .reverse()
        .find((task) => task.status === "QUEUED" && task.task_type === "GENERATE_VIDEO" && !this.locks.has(task.lock_key));
      if (!next) break;
      this.locks.add(next.lock_key);
      this.runningVideoCount += 1;
      void this.run(next).finally(() => {
        this.locks.delete(next.lock_key);
        this.runningVideoCount -= 1;
        void this.pump();
      });
    }

    while (this.runningPipelineCount < maxVideoConcurrent) {
      const next = this.list()
        .reverse()
        .find((task) => task.status === "QUEUED" && task.task_type === "GENERATE_PIPELINE" && !this.locks.has(task.lock_key));
      if (!next) break;
      this.locks.add(next.lock_key);
      this.runningPipelineCount += 1;
      void this.run(next).finally(() => {
        this.locks.delete(next.lock_key);
        this.runningPipelineCount -= 1;
        void this.pump();
      });
    }

    while (this.runningCount < this.maxConcurrent) {
      const next = this.list()
        .reverse()
        .find(
          (task) =>
            task.status === "QUEUED" &&
            !audioTaskTypes.has(task.task_type) &&
            !imageTaskTypes.has(task.task_type) &&
            !videoTaskTypes.has(task.task_type) &&
            !pipelineTaskTypes.has(task.task_type) &&
            !this.locks.has(task.lock_key),
        );
      if (!next) break;
      this.locks.add(next.lock_key);
      this.runningCount += 1;
      void this.run(next).finally(() => {
        this.locks.delete(next.lock_key);
        this.runningCount -= 1;
        void this.pump();
      });
    }
    const maxImageConcurrent = this.imageConfig.max_concurrent_tasks ?? 3;
    while (this.runningImageCount < maxImageConcurrent) {
      const next = this.list()
        .reverse()
        .find((task) => task.status === "QUEUED" && imageTaskTypes.has(task.task_type) && !this.locks.has(task.lock_key));
      if (!next) break;
      this.locks.add(next.lock_key);
      this.runningImageCount += 1;
      void this.run(next).finally(() => {
        this.locks.delete(next.lock_key);
        this.runningImageCount -= 1;
        void this.pump();
      });
    }
    while (this.runningAudioCount < this.audioConfig.max_concurrent_tasks) {
      const next = this.list()
        .reverse()
        .find((task) => task.status === "QUEUED" && audioTaskTypes.has(task.task_type) && !this.locks.has(task.lock_key));
      if (!next) break;
      this.locks.add(next.lock_key);
      this.runningAudioCount += 1;
      void this.runAudioTask(next).finally(() => {
        this.locks.delete(next.lock_key);
        this.runningAudioCount -= 1;
        void this.pump();
      });
    }
  }

  run(task: Task): Promise<void> {
    return runImplementation.call(this, task);
  }
  createImageProvider(
    imageTarget: { channelId: string; episodeId: string; bundleNumber: number; variant: number; theme?: string },
    output?: string,
  ): ImageProvider {
    return createImageProviderImplementation.call(this, imageTarget, output);
  }
  generateBundleImageWithSafetyRetry(
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
  }
  runGpti2BundleImageTask(task: Task): Promise<void> {
    return runGpti2BundleImageTaskImplementation.call(this, task);
  }
  runAntigravityBundleImageTask(task: Task): Promise<void> {
    return runAntigravityBundleImageTaskImplementation.call(this, task);
  }
  runShopAiKeyImageTask(task: Task): Promise<void> {
    return runShopAiKeyImageTaskImplementation.call(this, task);
  }
  runPipelineTask(task: Task): Promise<void> {
    return runPipelineTaskImplementation.call(this, task);
  }
  runVideoTask(task: Task): Promise<void> {
    return runVideoTaskImplementation.call(this, task);
  }
  hasReadyArtifact(channelId: string, episodeId: string, filename: string): Promise<boolean> {
    return hasReadyArtifactImplementation.call(this, channelId, episodeId, filename);
  }
  generatePipelineBundleImages(task: Task, run: PipelineRun): Promise<void> {
    return generatePipelineBundleImagesImplementation.call(this, task, run);
  }
  runQuizV2Pipeline(task: Task): Promise<void> {
    return runQuizV2PipelineImplementation.call(this, task);
  }
  attachPipelineBundleImages(channelId: string, episodeId: string): Promise<void> {
    return attachPipelineBundleImagesImplementation.call(this, channelId, episodeId);
  }
  hasReadyScript(channelId: string, episodeId: string): Promise<boolean> {
    return hasReadyScriptImplementation.call(this, channelId, episodeId);
  }
  hasValidNarrationAsset(channelId: string, episodeId: string, assetPath: string | null): Promise<boolean> {
    return hasValidNarrationAssetImplementation.call(this, channelId, episodeId, assetPath);
  }
  isShotPlanFresh(channelId: string, episodeId: string): Promise<boolean> {
    return isShotPlanFreshImplementation.call(this, channelId, episodeId);
  }
  waitForTaskTerminal(taskId: string, run: PipelineRun): Promise<Task> {
    return waitForTaskTerminalImplementation.call(this, taskId, run);
  }
  runAudioTask(task: Task): Promise<void> {
    return runAudioTaskImplementation.call(this, task);
  }
  runNarrationTask(task: Task): Promise<void> {
    return runNarrationTaskImplementation.call(this, task);
  }
  mergeNarrationSegments(paths: string[], targetDurationSeconds?: number): Promise<Uint8Array> {
    return mergeNarrationSegmentsImplementation.call(this, paths, targetDurationSeconds);
  }
  handleNotification(method: string, params: Record<string, unknown>): void {
    return handleNotificationImplementation.call(this, method, params);
  }
  handleServerRequest(request: CodexServerRequest): void {
    return handleServerRequestImplementation.call(this, request);
  }
  completeWithOutput(active: ActiveRun): Promise<void> {
    return completeWithOutputImplementation.call(this, active);
  }
  retryQuizResearch(active: ActiveRun, reason: string): Promise<void> {
    return retryQuizResearchImplementation.call(this, active, reason);
  }
  retryScript(active: ActiveRun, reason: string): Promise<void> {
    return retryScriptImplementation.call(this, active, reason);
  }
  retryVisualBible(active: ActiveRun, reason: string): Promise<void> {
    return retryVisualBibleImplementation.call(this, active, reason);
  }
  retrySequenceScenes(active: ActiveRun, reason: string): Promise<void> {
    return retrySequenceScenesImplementation.call(this, active, reason);
  }
  findSceneNumber(taskId: string): number | undefined {
    return this.tasks.get(taskId)?.scene_number ?? undefined;
  }

  async finish(taskId: string, status: TaskStatus, error: string | null, outputFiles: string[] = []): Promise<void> {
    const threadId = this.get(taskId).codex_thread_id;
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
    const isAntigravity = this.activeEngine === "antigravity";
    const cleanupConfig = isAntigravity ? this.antigravityCleanupConfig : this.codexCleanupConfig;
    const shouldDelete = Boolean(
      threadId &&
      cleanupConfig.auto_delete_threads &&
      (status === "COMPLETED" || ((status === "FAILED" || status === "CANCELLED") && cleanupConfig.failed_thread_retention_days === 0)),
    );
    if (shouldDelete && threadId && (await this.tryDeleteThread(threadId, isAntigravity ? "antigravity" : "codex")))
      await this.update(taskId, { codex_thread_id: null });
  }

  async cleanupCodexThreads(force = false): Promise<{ removed: number }> {
    return cleanupCodexThreadsImplementation.call(this, force);
  }

  async cleanupAntigravityThreads(force = false): Promise<{ removed: number }> {
    return cleanupAntigravityThreadsImplementation.call(this, force);
  }

  cleanupExpiredFailedBuilds(nowMs?: number): Promise<{ removedEpisodes: number; removedTasks: number }> {
    if (this.failedBuildCleanupPromise) return this.failedBuildCleanupPromise;
    const cleanup = cleanupExpiredFailedBuildsImplementation.call(this, nowMs);
    this.failedBuildCleanupPromise = cleanup;
    return cleanup.finally(() => {
      if (this.failedBuildCleanupPromise === cleanup) this.failedBuildCleanupPromise = null;
    });
  }

  reconcileQuestionHistory(): Promise<void> {
    return reconcileQuestionHistoryImplementation.call(this);
  }

  startCleanupTimer(): void {
    return startCleanupTimerImplementation.call(this);
  }
  tryDeleteThread(threadId: string, engine?: "codex" | "antigravity"): Promise<boolean> {
    return tryDeleteThreadImplementation.call(this, threadId, engine);
  }
  isSessionCleanupEnabled(engine?: "codex" | "antigravity"): boolean {
    return isSessionCleanupEnabledImplementation.call(this, engine);
  }
  async update(taskId: string, patch: Partial<Task>): Promise<void> {
    const current = this.get(taskId);
    let effectivePatch = patch;
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(current.status) && patch.status === undefined) {
      const { progress_message, progress_percent, ...rest } = patch;
      if (progress_message !== undefined || progress_percent !== undefined) {
        if (Object.keys(rest).length === 0) return;
        effectivePatch = rest;
      }
    }
    if (current.started_at && patch.started_at && patch.status === "RUNNING") {
      const { started_at, ...rest } = effectivePatch;
      effectivePatch = rest;
    }
    const next = TaskSchema.parse({ ...current, ...effectivePatch });
    this.tasks.set(taskId, next);
    await this.persist(next);
    this.emitTask(next);
  }

  private async persist(task: Task): Promise<void> {
    const directory = path.join(this.repository.roots.runtime, "tasks");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `${task.task_id}.json`), `${JSON.stringify(task, null, 2)}\n`, "utf8");
  }

  private emitTask(task: Task): void {
    this.emitEvent({ type: "task.updated", task });
  }

  emitEvent(event: TaskEvent): void {
    this.emit("event", event);
  }
}

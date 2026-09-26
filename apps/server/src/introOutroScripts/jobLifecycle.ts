import { IntroOutroScriptJobSchema, makeId, nowIso, type IntroOutroClipKind, type IntroOutroScriptJob } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import { describeScriptError, IntroOutroScriptError } from "./errors.js";
import type { IntroOutroScriptRepository } from "./repository.js";

const terminalStatuses = new Set<IntroOutroScriptJob["status"]>(["succeeded", "partial", "failed", "cancelled", "interrupted"]);

type QueuedJobItem = {
  job: IntroOutroScriptJob;
  initialStep: string;
  operation: (signal: AbortSignal) => Promise<Partial<IntroOutroScriptJob>>;
  controller: AbortController;
};

export class IntroOutroJobLifecycle {
  private readonly controllers = new Map<string, AbortController>();
  private readonly queue: QueuedJobItem[] = [];
  private activeCount = 0;
  private readonly maxConcurrency: number;

  constructor(
    private readonly repository: RepositoryService,
    private readonly scripts: IntroOutroScriptRepository,
    maxConcurrency = 3,
  ) {
    this.maxConcurrency = maxConcurrency;
  }

  async listActiveJobs(channelId: string): Promise<IntroOutroScriptJob[]> {
    const all = await this.scripts.listJobs(channelId);
    return all.filter((job) => job.status === "queued" || job.status === "running");
  }

  async initialize(): Promise<void> {
    const channels = await this.repository.listChannels();
    for (const channel of channels) {
      for (const job of await this.scripts.listJobs(channel.channel_id)) {
        if (job.status === "queued" || job.status === "running") {
          await this.scripts.saveJob({
            ...job,
            status: "interrupted",
            step: "Interrupted by server restart",
            error_code: "JOB_INTERRUPTED",
            error_message: "Retry the operation to continue.",
            completed_at: nowIso(),
          });
        }
      }
    }
  }

  async create(input: {
    channelId: string;
    projectId: string | null;
    type: IntroOutroScriptJob["type"];
    requestedClipKinds: IntroOutroClipKind[];
    projectVersion: number | null;
    idempotencyKey: string;
    requestFingerprint: string;
  }): Promise<IntroOutroScriptJob> {
    const job = IntroOutroScriptJobSchema.parse({
      schema_version: 1,
      job_id: makeId("ioscript_job"),
      channel_id: input.channelId,
      project_id: input.projectId,
      type: input.type,
      requested_clip_kinds: input.requestedClipKinds,
      status: "queued",
      step: "Queued",
      error_code: null,
      error_message: null,
      result_revision_ids: [],
      failed_clip_kinds: [],
      clip_errors: [],
      submitted_project_version: input.projectVersion,
      idempotency_key: input.idempotencyKey,
      request_fingerprint: input.requestFingerprint,
      created_at: nowIso(),
      started_at: null,
      completed_at: null,
    });
    return this.scripts.saveJob(job);
  }

  async findReusable(
    channelId: string,
    key: string,
    type: IntroOutroScriptJob["type"],
    requestFingerprint: string,
  ): Promise<IntroOutroScriptJob | null> {
    const existing = await this.scripts.findJobByIdempotency(channelId, key);
    if (!existing) return null;
    if (existing.type !== type) {
      throw new IntroOutroScriptError("Idempotency key was already used for another operation", "IDEMPOTENCY_CONFLICT");
    }
    if (existing.request_fingerprint !== requestFingerprint) {
      throw new IntroOutroScriptError("Idempotency key was already used with different inputs", "IDEMPOTENCY_CONFLICT");
    }
    return existing;
  }

  launch(job: IntroOutroScriptJob, initialStep: string, operation: (signal: AbortSignal) => Promise<Partial<IntroOutroScriptJob>>): void {
    const controller = new AbortController();
    this.controllers.set(job.job_id, controller);
    this.queue.push({ job, initialStep, operation, controller });
    setTimeout(() => this.drainQueue(), 0);
  }

  private drainQueue(): void {
    while (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) break;
      if (next.controller.signal.aborted) {
        this.controllers.delete(next.job.job_id);
        continue;
      }
      this.activeCount += 1;
      void this.run(next.job, next.initialStep, next.operation, next.controller).finally(() => {
        this.controllers.delete(next.job.job_id);
        this.activeCount -= 1;
        this.drainQueue();
      });
    }
  }

  async cancel(channelId: string, jobId: string): Promise<IntroOutroScriptJob> {
    const current = await this.scripts.getJob(channelId, jobId);
    if (terminalStatuses.has(current.status)) return current;
    const queuedIdx = this.queue.findIndex((item) => item.job.job_id === jobId);
    if (queuedIdx >= 0) {
      const [item] = this.queue.splice(queuedIdx, 1);
      item?.controller.abort();
    }
    this.controllers.get(jobId)?.abort();
    this.controllers.delete(jobId);
    return this.scripts.withLock(`job-progress:${jobId}`, async () => {
      const latest = await this.scripts.getJob(channelId, jobId);
      return this.scripts.saveJob({
        ...latest,
        status: "cancelled",
        step: "Cancelled",
        error_code: null,
        error_message: null,
        completed_at: nowIso(),
      });
    });
  }

  private async run(
    job: IntroOutroScriptJob,
    initialStep: string,
    operation: (signal: AbortSignal) => Promise<Partial<IntroOutroScriptJob>>,
    controller: AbortController,
  ): Promise<void> {
    try {
      await this.markRunning(job, initialStep);
      const patch = await operation(controller.signal);
      await this.complete(job, patch);
    } catch (error) {
      const current = await this.scripts.getJob(job.channel_id, job.job_id).catch(() => job);
      if (current.status === "cancelled") return;
      const details = describeScriptError(error);
      await this.complete(current, {
        status: controller.signal.aborted ? "cancelled" : "failed",
        step: controller.signal.aborted ? "Cancelled" : "Failed",
        error_code: controller.signal.aborted ? null : details.code,
        error_message: controller.signal.aborted ? null : details.message,
      });
    }
  }

  private async markRunning(job: IntroOutroScriptJob, step: string): Promise<void> {
    const current = await this.scripts.getJob(job.channel_id, job.job_id);
    if (terminalStatuses.has(current.status)) {
      throw new IntroOutroScriptError("Generation cancelled", "GENERATION_CANCELLED");
    }
    await this.scripts.saveJob({
      ...current,
      status: "running",
      step,
      started_at: current.started_at ?? nowIso(),
    });
  }

  private async complete(job: IntroOutroScriptJob, patch: Partial<IntroOutroScriptJob>): Promise<void> {
    const current = await this.scripts.getJob(job.channel_id, job.job_id).catch(() => job);
    if (current.status === "cancelled" && patch.status !== "cancelled") return;
    await this.scripts.saveJob({ ...current, ...patch, completed_at: nowIso() });
  }
}

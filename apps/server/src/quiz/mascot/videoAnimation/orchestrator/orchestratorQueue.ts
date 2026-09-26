import { MascotVideoProcessingJobSchema, type AnimationState, type MascotVideoProcessingJob } from "@studio/shared";
import { OrchestrationError } from "./orchestratorErrors.js";
import type { ActiveJobContext, QueueStatus, VideoProcessingOrchestratorDeps } from "./orchestratorTypes.js";
import { executePipeline, handlePipelineFailure, rollbackSlotStateOnCancellation } from "./pipelineSteps.js";

/**
 * Creates a unique composite key for a mascot animation slot.
 */
export function makeSlotKey(mascotId: string, styleId: string, state: AnimationState, slotIndex: number): string {
  return `${mascotId}:${styleId}:${state}:${slotIndex}`;
}

export interface OrchestratorQueue {
  scheduleJob: (job: MascotVideoProcessingJob) => Promise<MascotVideoProcessingJob>;
  runJobSync: (jobId: string) => Promise<MascotVideoProcessingJob>;
  cancelJob: (jobId: string, reason?: string) => Promise<MascotVideoProcessingJob>;
  getQueueStatus: () => QueueStatus;
}

/**
 * Manages concurrent execution, queued jobs, slot locks, and cancellations.
 */
export function createOrchestratorQueue(deps: VideoProcessingOrchestratorDeps): OrchestratorQueue {
  const maxConcurrent = deps.maxConcurrentJobs ?? 2;
  const runningJobs = new Map<string, ActiveJobContext>();
  const slotActiveJob = new Map<string, string>();
  const queuedJobIds: string[] = [];
  const cancellations = new Map<string, Promise<MascotVideoProcessingJob>>();

  async function pumpQueue(): Promise<void> {
    if (runningJobs.size >= maxConcurrent || queuedJobIds.length === 0) {
      return;
    }

    const nextJobId = queuedJobIds.shift();
    if (!nextJobId) return;

    const job = await deps.repository.getJob(nextJobId);
    if (!job || job.status === "cancelled") {
      void pumpQueue();
      return;
    }

    void startJobExecution(job);
  }

  function startJobExecution(job: MascotVideoProcessingJob): Promise<MascotVideoProcessingJob> {
    const slotKey = makeSlotKey(job.mascot_id, job.style_id, job.state, job.slot_index);

    // Cancel existing active attempt on the same slot if any
    const existingJobId = slotActiveJob.get(slotKey);
    if (existingJobId && existingJobId !== job.id) {
      const activeCtx = runningJobs.get(existingJobId);
      if (activeCtx) {
        activeCtx.abortController.abort();
      }
    }

    const abortController = new AbortController();
    slotActiveJob.set(slotKey, job.id);

    const promise = (async () => {
      try {
        return await executePipeline(deps, job, abortController.signal);
      } catch (err: unknown) {
        return await handlePipelineFailure(deps, job, err, abortController.signal);
      } finally {
        runningJobs.delete(job.id);
        if (slotActiveJob.get(slotKey) === job.id) {
          slotActiveJob.delete(slotKey);
        }
        void pumpQueue();
      }
    })();

    runningJobs.set(job.id, { job, abortController, promise });
    return promise;
  }

  async function scheduleJob(job: MascotVideoProcessingJob): Promise<MascotVideoProcessingJob> {
    const validated = MascotVideoProcessingJobSchema.parse(job);
    const saved = await deps.repository.saveJob(validated);

    if (runningJobs.size < maxConcurrent) {
      void startJobExecution(saved);
    } else {
      queuedJobIds.push(saved.id);
      await deps.repository.transitionSlotState(saved.mascot_id, saved.style_id, saved.state, saved.slot_index, "queued", saved.id);
    }

    return saved;
  }

  async function runJobSync(jobId: string): Promise<MascotVideoProcessingJob> {
    const job = await deps.repository.getJob(jobId);
    if (!job) {
      throw new OrchestrationError(`Job ${jobId} not found`, "JOB_NOT_FOUND");
    }

    const activeCtx = runningJobs.get(jobId);
    if (activeCtx) {
      return activeCtx.promise;
    }

    const queueIdx = queuedJobIds.indexOf(jobId);
    if (queueIdx >= 0) {
      queuedJobIds.splice(queueIdx, 1);
    }

    return startJobExecution(job);
  }

  async function performCancellation(jobId: string, reason = "Job cancelled by user"): Promise<MascotVideoProcessingJob> {
    const job = await deps.repository.getJob(jobId);
    if (!job) {
      throw new OrchestrationError(`Job ${jobId} not found`, "JOB_NOT_FOUND");
    }

    if (["ready", "cancelled", "qa_failed"].includes(job.status)) {
      return job;
    }

    const queueIdx = queuedJobIds.indexOf(jobId);
    if (queueIdx >= 0) {
      queuedJobIds.splice(queueIdx, 1);
    }

    const activeCtx = runningJobs.get(jobId);
    if (activeCtx) {
      activeCtx.abortController.abort(new Error(reason));
      await activeCtx.promise;
    } else {
      await rollbackSlotStateOnCancellation(deps, job, reason);
    }

    const updated = await deps.repository.getJob(jobId);
    return updated ?? job;
  }

  function getQueueStatus(): QueueStatus {
    return {
      runningCount: runningJobs.size,
      queuedCount: queuedJobIds.length,
    };
  }

  return {
    scheduleJob,
    runJobSync,
    cancelJob: (jobId, reason) => {
      const existing = cancellations.get(jobId);
      if (existing) return existing;
      const pending = performCancellation(jobId, reason).finally(() => cancellations.delete(jobId));
      cancellations.set(jobId, pending);
      return pending;
    },
    getQueueStatus,
  };
}

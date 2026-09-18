/**
 * Mascot Slot Job Execution Worker
 *
 * Handles execution of a single slot generation job including
 * state transitions, provider invocation, and status persistence.
 */

import type { EventEmitter } from "node:events";
import type { AppConfig, MascotSlotGenerationJob } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";
import type { MascotSlotJobRepository } from "./mascotSlotJobRepository.js";
import type { BatchRuntime, SlotGeneratorFn } from "./slotJobTypes.js";

export interface SlotJobWorkerContext {
  repository: RepositoryService;
  jobRepository: MascotSlotJobRepository;
  imageConfig: AppConfig["image_generation"];
  imageFallbackConfig?: AppConfig["image_fallback"];
  logger?: StudioLogger;
  slotGenerator: SlotGeneratorFn;
  emitter: EventEmitter;
  isDestroyed: () => boolean;
  onSettled: (runtime: BatchRuntime) => void;
}

export async function executeSlotJob(ctx: SlotJobWorkerContext, runtime: BatchRuntime, job: MascotSlotGenerationJob): Promise<void> {
  if (runtime.abortController.signal.aborted) {
    await handleAbortedJob(ctx, runtime, job);
    return;
  }

  const { batch: genBatch, job: genJob } = await ctx.jobRepository.updateJobStatus(job.mascot_id, runtime.batch.id, job.id, {
    status: "generating",
    started_at: new Date().toISOString(),
  });
  runtime.batch = genBatch;
  ctx.emitter.emit("job:started", genJob, genBatch);
  ctx.emitter.emit("batch:progress", genBatch);

  try {
    if (ctx.isDestroyed()) return;
    const mascot = await ctx.repository.getMascot(job.mascot_id);
    const result = await ctx.slotGenerator(
      ctx.repository,
      mascot,
      job.style_id,
      {
        style_id: job.style_id,
        state: job.state,
        slot_index: job.slot_index,
        prompt_modifier: job.prompt_modifier ?? undefined,
        composition: "half_body_16_9",
      },
      ctx.imageConfig,
      ctx.logger,
      {
        signal: runtime.abortController.signal,
        composition: "half_body_16_9",
        imageFallbackConfig: ctx.imageFallbackConfig,
      },
    );

    if (ctx.isDestroyed()) return;
    await handleCompletedJob(ctx, runtime, job, result.prompt_used);
  } catch (err: unknown) {
    if (ctx.isDestroyed()) return;
    await handleFailedJob(ctx, runtime, job, err);
  } finally {
    if (!ctx.isDestroyed()) {
      ctx.onSettled(runtime);
    }
  }
}

async function handleAbortedJob(ctx: SlotJobWorkerContext, runtime: BatchRuntime, job: MascotSlotGenerationJob): Promise<void> {
  const { batch: cancelledBatch, job: cancelledJob } = await ctx.jobRepository.updateJobStatus(job.mascot_id, runtime.batch.id, job.id, {
    status: "cancelled",
    completed_at: new Date().toISOString(),
  });
  runtime.batch = cancelledBatch;
  ctx.emitter.emit("job:cancelled", cancelledJob, cancelledBatch);
  ctx.onSettled(runtime);
}

async function handleCompletedJob(
  ctx: SlotJobWorkerContext,
  runtime: BatchRuntime,
  job: MascotSlotGenerationJob,
  promptUsed: string,
): Promise<void> {
  const { batch: compBatch, job: compJob } = await ctx.jobRepository.updateJobStatus(job.mascot_id, runtime.batch.id, job.id, {
    status: "completed",
    completed_at: new Date().toISOString(),
    prompt_used: promptUsed,
  });
  runtime.batch = compBatch;
  ctx.emitter.emit("job:completed", compJob, compBatch);
  ctx.emitter.emit("batch:progress", compBatch);
}

async function handleFailedJob(
  ctx: SlotJobWorkerContext,
  runtime: BatchRuntime,
  job: MascotSlotGenerationJob,
  err: unknown,
): Promise<void> {
  const isAborted = runtime.abortController.signal.aborted;
  const finalStatus = isAborted ? "cancelled" : "failed";
  const errorMessage = isAborted ? "Cancelled by user" : err instanceof Error ? err.message : String(err);

  try {
    const { batch: errBatch, job: errJob } = await ctx.jobRepository.updateJobStatus(job.mascot_id, runtime.batch.id, job.id, {
      status: finalStatus,
      completed_at: new Date().toISOString(),
      error: errorMessage,
    });
    runtime.batch = errBatch;
    if (isAborted) {
      ctx.emitter.emit("job:cancelled", errJob, errBatch);
    } else {
      ctx.emitter.emit("job:failed", errJob, errorMessage, errBatch);
    }
    ctx.emitter.emit("batch:progress", errBatch);
  } catch (updateErr) {
    if (!ctx.isDestroyed()) {
      const updateErrMsg = updateErr instanceof Error ? updateErr.message : String(updateErr);
      ctx.logger?.warn?.(`Failed to update status for job ${job.id}: ${updateErrMsg}`);
    }
  }
}

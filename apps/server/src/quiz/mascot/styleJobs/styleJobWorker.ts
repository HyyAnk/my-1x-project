/**
 * Mascot Style Job Execution Worker
 *
 * Handles execution of a single style concept generation job including
 * state transitions, image provider invocation, and status persistence.
 */

import type { EventEmitter } from "node:events";
import type { AppConfig, MascotStyleConceptJob } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";
import type { MascotStyleJobRepository } from "./mascotStyleJobRepository.js";
import type { StyleBatchRuntime, StyleConceptGeneratorFn } from "./styleJobTypes.js";

export interface StyleJobWorkerContext {
  repository: RepositoryService;
  jobRepository: MascotStyleJobRepository;
  imageConfig: AppConfig["image_generation"];
  imageFallbackConfig?: AppConfig["image_fallback"];
  logger?: StudioLogger;
  styleGenerator: StyleConceptGeneratorFn;
  emitter: EventEmitter;
  isDestroyed: () => boolean;
  onSettled: (runtime: StyleBatchRuntime) => void;
}

export async function executeStyleJob(ctx: StyleJobWorkerContext, runtime: StyleBatchRuntime, job: MascotStyleConceptJob): Promise<void> {
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
    const result = await ctx.styleGenerator(
      ctx.repository,
      mascot,
      job.style_id,
      ctx.imageConfig,
      {
        prompt: job.prompt ?? undefined,
        signal: runtime.abortController.signal,
        imageFallbackConfig: ctx.imageFallbackConfig,
      },
      ctx.logger,
    );

    if (ctx.isDestroyed()) return;
    runtime.abortController.signal.throwIfAborted();
    await handleCompletedJob(ctx, runtime, job, result.anchor_image_url, result.raw_anchor_image_url, result.prompt_used);
  } catch (err: unknown) {
    if (ctx.isDestroyed()) return;
    await handleFailedJob(ctx, runtime, job, err);
  } finally {
    if (!ctx.isDestroyed()) {
      ctx.onSettled(runtime);
    }
  }
}

async function handleAbortedJob(ctx: StyleJobWorkerContext, runtime: StyleBatchRuntime, job: MascotStyleConceptJob): Promise<void> {
  const { batch: cancelledBatch, job: cancelledJob } = await ctx.jobRepository.updateJobStatus(job.mascot_id, runtime.batch.id, job.id, {
    status: "cancelled",
    completed_at: new Date().toISOString(),
    error: "Cancelled by user",
  });
  runtime.batch = cancelledBatch;
  ctx.emitter.emit("job:cancelled", cancelledJob, cancelledBatch);
  ctx.onSettled(runtime);
}

async function handleCompletedJob(
  ctx: StyleJobWorkerContext,
  runtime: StyleBatchRuntime,
  job: MascotStyleConceptJob,
  anchorImageUrl: string,
  rawAnchorImageUrl?: string,
  promptUsed?: string,
): Promise<void> {
  const { batch: compBatch, job: compJob } = await ctx.jobRepository.updateJobStatus(job.mascot_id, runtime.batch.id, job.id, {
    status: "completed",
    completed_at: new Date().toISOString(),
    anchor_image_url: anchorImageUrl,
    raw_anchor_image_url: rawAnchorImageUrl,
    prompt_used: promptUsed,
  });
  runtime.batch = compBatch;
  ctx.emitter.emit("job:completed", compJob, compBatch);
  ctx.emitter.emit("batch:progress", compBatch);
}

async function handleFailedJob(
  ctx: StyleJobWorkerContext,
  runtime: StyleBatchRuntime,
  job: MascotStyleConceptJob,
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
      ctx.logger?.warn?.(`Failed to update status for style job ${job.id}: ${updateErrMsg}`);
    }
  }
}

/**
 * Mascot Slot Job Persistence Helper
 *
 * Provides cache-aware retrieval of batches from active memory or disk,
 * and unified export of underlying store and repository mechanisms.
 */

import type { MascotSlotBatchJob } from "@studio/shared";
import type { MascotSlotJobRepository } from "./mascotSlotJobRepository.js";
import type { BatchRuntime } from "./slotJobTypes.js";

export * from "./mascotSlotJobStore.js";
export * from "./mascotSlotJobRepository.js";

/**
 * Retrieves a batch by ID from in-memory runtime cache or persistent storage.
 */
export async function getBatchWithCache(
  activeBatches: Map<string, BatchRuntime>,
  jobRepository: MascotSlotJobRepository,
  mascotId: string,
  batchId: string,
): Promise<MascotSlotBatchJob | null> {
  const runtime = activeBatches.get(batchId);
  if (runtime) {
    return JSON.parse(JSON.stringify(runtime.batch)) as MascotSlotBatchJob;
  }
  return jobRepository.getBatch(mascotId, batchId);
}

/**
 * Retrieves the active batch for a style, preferring in-flight memory state.
 */
export async function getActiveBatchWithCache(
  activeBatches: Map<string, BatchRuntime>,
  jobRepository: MascotSlotJobRepository,
  mascotId: string,
  styleId: string,
): Promise<MascotSlotBatchJob | null> {
  for (const runtime of activeBatches.values()) {
    if (
      runtime.batch.mascot_id === mascotId &&
      runtime.batch.style_id === styleId &&
      (runtime.batch.status === "queued" || runtime.batch.status === "processing")
    ) {
      return JSON.parse(JSON.stringify(runtime.batch)) as MascotSlotBatchJob;
    }
  }
  return jobRepository.getActiveBatch(mascotId, styleId);
}

/**
 * Reconciles stale in-progress batches from server crashes or unexpected shutdowns.
 */
export async function reconcileStaleJobs(jobRepository: MascotSlotJobRepository, mascotId?: string): Promise<number> {
  return jobRepository.reconcileStaleJobs(mascotId);
}

/**
 * Waits for a batch to reach a terminal state ("completed" | "failed" | "cancelled")
 * via active in-memory listeners or disk fallback with a timeout.
 */
export async function waitForBatchSettled(
  getBatchFn: (mascotId: string, batchId: string) => Promise<MascotSlotBatchJob | null>,
  activeBatches: Map<string, BatchRuntime>,
  mascotId: string,
  batchId: string,
  timeoutMs = 30000,
): Promise<MascotSlotBatchJob> {
  const current = await getBatchFn(mascotId, batchId);
  if (current && ["completed", "failed", "cancelled"].includes(current.status)) {
    return current;
  }

  const runtime = activeBatches.get(batchId);
  if (!runtime) {
    if (current) return current;
    throw new Error(`Batch ${batchId} not found for mascot ${mascotId}`);
  }

  return new Promise<MascotSlotBatchJob>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for batch ${batchId} after ${timeoutMs}ms`));
    }, timeoutMs);

    runtime.waiters.push((batch) => {
      clearTimeout(timer);
      resolve(batch);
    });
  });
}

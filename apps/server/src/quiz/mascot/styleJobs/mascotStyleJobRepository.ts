/**
 * Mascot Style Generation Job Repository
 *
 * Provides persistent storage, status tracking, and query capabilities
 * for mascot style concept generation batches and jobs per mascot.
 */

import { MascotStyleBatchJobSchema, type MascotStyleBatchJob, type MascotStyleConceptJob } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import {
  listMascotIdsForStyles,
  readStyleBatchStore,
  resolveMascotsRoot,
  withStyleBatchStoreLock,
  writeStyleBatchStore,
} from "./mascotStyleJobStore.js";

export class MascotStyleJobRepository {
  public readonly mascotsRoot: string;

  constructor(target: string | RepositoryService) {
    this.mascotsRoot = resolveMascotsRoot(target);
  }

  /**
   * Persists a newly created style generation batch.
   */
  public async createBatch(batch: MascotStyleBatchJob): Promise<MascotStyleBatchJob> {
    const validated = MascotStyleBatchJobSchema.parse(batch);
    return withStyleBatchStoreLock(validated.mascot_id, async () => {
      const batches = await readStyleBatchStore(this.mascotsRoot, validated.mascot_id);
      batches[validated.id] = { ...validated };
      await writeStyleBatchStore(this.mascotsRoot, validated.mascot_id, batches);
      return JSON.parse(JSON.stringify(validated)) as MascotStyleBatchJob;
    });
  }

  /**
   * Retrieves a specific batch by its ID.
   */
  public async getBatch(mascotId: string, batchId: string): Promise<MascotStyleBatchJob | null> {
    const batches = await readStyleBatchStore(this.mascotsRoot, mascotId);
    const found = batches[batchId];
    return found ? (JSON.parse(JSON.stringify(found)) as MascotStyleBatchJob) : null;
  }

  /**
   * Retrieves the currently active (queued or processing) batch for a mascot.
   */
  public async getActiveBatch(mascotId: string): Promise<MascotStyleBatchJob | null> {
    const batches = await readStyleBatchStore(this.mascotsRoot, mascotId);
    const active = Object.values(batches)
      .filter((b) => b.status === "queued" || b.status === "processing")
      .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));

    return active[0] ? (JSON.parse(JSON.stringify(active[0])) as MascotStyleBatchJob) : null;
  }

  /**
   * Updates an entire batch record directly.
   */
  public async updateBatch(batch: MascotStyleBatchJob): Promise<MascotStyleBatchJob> {
    const validated = MascotStyleBatchJobSchema.parse(batch);
    return withStyleBatchStoreLock(validated.mascot_id, async () => {
      const batches = await readStyleBatchStore(this.mascotsRoot, validated.mascot_id);
      const updated: MascotStyleBatchJob = {
        ...validated,
        updated_at: new Date().toISOString(),
      };
      batches[validated.id] = updated;
      await writeStyleBatchStore(this.mascotsRoot, validated.mascot_id, batches);
      return JSON.parse(JSON.stringify(updated)) as MascotStyleBatchJob;
    });
  }

  /**
   * Atomically updates a specific job's status within a batch and recalculates counters.
   */
  public async updateJobStatus(
    mascotId: string,
    batchId: string,
    jobId: string,
    update: Partial<MascotStyleConceptJob>,
  ): Promise<{ batch: MascotStyleBatchJob; job: MascotStyleConceptJob }> {
    return withStyleBatchStoreLock(mascotId, async () => {
      const batches = await readStyleBatchStore(this.mascotsRoot, mascotId);
      const batch = batches[batchId];
      if (!batch) {
        throw new Error(`Batch ${batchId} not found for mascot ${mascotId}`);
      }

      const jobIndex = batch.items.findIndex((j) => j.id === jobId);
      if (jobIndex === -1) {
        throw new Error(`Job ${jobId} not found in batch ${batchId}`);
      }

      const job = { ...batch.items[jobIndex], ...update };
      batch.items[jobIndex] = job;

      batch.completed_count = batch.items.filter((j) => j.status === "completed").length;
      batch.failed_count = batch.items.filter((j) => j.status === "failed").length;
      batch.active_style_ids = batch.items.filter((j) => j.status === "generating").map((j) => j.style_id);

      if (batch.status !== "cancelled") {
        const allSettled = batch.items.every((j) => ["completed", "failed", "cancelled"].includes(j.status));
        if (allSettled) {
          batch.status = batch.completed_count > 0 ? "completed" : "failed";
        } else if (batch.items.some((j) => j.status === "generating")) {
          batch.status = "processing";
        }
      }

      batch.updated_at = new Date().toISOString();
      await writeStyleBatchStore(this.mascotsRoot, mascotId, batches);

      return {
        batch: JSON.parse(JSON.stringify(batch)) as MascotStyleBatchJob,
        job: JSON.parse(JSON.stringify(job)) as MascotStyleConceptJob,
      };
    });
  }

  /**
   * Cancels an active batch and any pending or in-flight jobs.
   */
  public async cancelBatch(mascotId: string, batchId: string, reason?: string): Promise<MascotStyleBatchJob | null> {
    return withStyleBatchStoreLock(mascotId, async () => {
      const batches = await readStyleBatchStore(this.mascotsRoot, mascotId);
      const batch = batches[batchId];
      if (!batch) return null;

      const now = new Date().toISOString();
      batch.status = "cancelled";
      batch.updated_at = now;
      batch.active_style_ids = [];

      for (const job of batch.items) {
        if (job.status === "queued" || job.status === "generating") {
          job.status = "cancelled";
          job.completed_at = now;
          if (reason) job.error = reason;
        }
      }

      await writeStyleBatchStore(this.mascotsRoot, mascotId, batches);
      return JSON.parse(JSON.stringify(batch)) as MascotStyleBatchJob;
    });
  }

  /**
   * Retrieves recent batches for a mascot ordered by creation date descending.
   */
  public async getRecentBatches(mascotId: string, limit = 10): Promise<MascotStyleBatchJob[]> {
    const batches = await readStyleBatchStore(this.mascotsRoot, mascotId);
    return Object.values(batches)
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
      .slice(0, limit);
  }

  /**
   * Scans and marks any lingering 'queued' or 'generating' jobs as 'failed' following server restart.
   */
  public async reconcileStaleJobs(targetMascotId?: string): Promise<number> {
    const mascotIds = targetMascotId ? [targetMascotId] : await listMascotIdsForStyles(this.mascotsRoot);
    let reconciledCount = 0;

    for (const mascotId of mascotIds) {
      await withStyleBatchStoreLock(mascotId, async () => {
        const batches = await readStyleBatchStore(this.mascotsRoot, mascotId);
        let changed = false;

        for (const batch of Object.values(batches)) {
          if (batch.status === "queued" || batch.status === "processing") {
            const now = new Date().toISOString();
            batch.status = "failed";
            batch.updated_at = now;
            batch.active_style_ids = [];

            for (const job of batch.items) {
              if (job.status === "queued" || job.status === "generating") {
                job.status = "failed";
                job.error = "Interrupted by server restart or shutdown";
                job.completed_at = now;
                reconciledCount++;
              }
            }
            changed = true;
          }
        }

        if (changed) {
          await writeStyleBatchStore(this.mascotsRoot, mascotId, batches);
        }
      });
    }

    return reconciledCount;
  }
}

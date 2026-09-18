/**
 * Mascot Slot Generation Job Repository
 *
 * Provides persistent storage, status tracking, and query capabilities
 * for mascot slot generation batches and jobs per mascot.
 */

import { MascotSlotBatchJobSchema, formatMascotSlotKey, type MascotSlotBatchJob, type MascotSlotGenerationJob } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import { listMascotIds, readBatchStore, resolveMascotsRoot, withBatchStoreLock, writeBatchStore } from "./mascotSlotJobStore.js";

export class MascotSlotJobRepository {
  public readonly mascotsRoot: string;

  constructor(target: string | RepositoryService) {
    this.mascotsRoot = resolveMascotsRoot(target);
  }

  /**
   * Persists a newly created slot generation batch.
   */
  public async createBatch(batch: MascotSlotBatchJob): Promise<MascotSlotBatchJob> {
    const validated = MascotSlotBatchJobSchema.parse(batch);
    return withBatchStoreLock(validated.mascot_id, async () => {
      const batches = await readBatchStore(this.mascotsRoot, validated.mascot_id);
      batches[validated.id] = { ...validated };
      await writeBatchStore(this.mascotsRoot, validated.mascot_id, batches);
      return JSON.parse(JSON.stringify(validated)) as MascotSlotBatchJob;
    });
  }

  /**
   * Retrieves a specific batch by its ID.
   */
  public async getBatch(mascotId: string, batchId: string): Promise<MascotSlotBatchJob | null> {
    const batches = await readBatchStore(this.mascotsRoot, mascotId);
    const found = batches[batchId];
    return found ? (JSON.parse(JSON.stringify(found)) as MascotSlotBatchJob) : null;
  }

  /**
   * Retrieves the currently active (queued or processing) batch for a mascot style.
   */
  public async getActiveBatch(mascotId: string, styleId: string): Promise<MascotSlotBatchJob | null> {
    const batches = await readBatchStore(this.mascotsRoot, mascotId);
    const active = Object.values(batches)
      .filter((b) => b.style_id === styleId && (b.status === "queued" || b.status === "processing"))
      .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));

    return active[0] ? (JSON.parse(JSON.stringify(active[0])) as MascotSlotBatchJob) : null;
  }

  /**
   * Updates an entire batch record directly.
   */
  public async updateBatch(batch: MascotSlotBatchJob): Promise<MascotSlotBatchJob> {
    const validated = MascotSlotBatchJobSchema.parse(batch);
    return withBatchStoreLock(validated.mascot_id, async () => {
      const batches = await readBatchStore(this.mascotsRoot, validated.mascot_id);
      const updated: MascotSlotBatchJob = {
        ...validated,
        updated_at: new Date().toISOString(),
      };
      batches[validated.id] = updated;
      await writeBatchStore(this.mascotsRoot, validated.mascot_id, batches);
      return JSON.parse(JSON.stringify(updated)) as MascotSlotBatchJob;
    });
  }

  /**
   * Atomically updates a specific job's status within a batch and recalculates counters.
   */
  public async updateJobStatus(
    mascotId: string,
    batchId: string,
    jobId: string,
    update: Partial<MascotSlotGenerationJob>,
  ): Promise<{ batch: MascotSlotBatchJob; job: MascotSlotGenerationJob }> {
    return withBatchStoreLock(mascotId, async () => {
      const batches = await readBatchStore(this.mascotsRoot, mascotId);
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
      batch.active_slot_keys = batch.items.filter((j) => j.status === "generating").map((j) => formatMascotSlotKey(j.state, j.slot_index));

      if (batch.status !== "cancelled") {
        const allSettled = batch.items.every((j) => ["completed", "failed", "cancelled"].includes(j.status));
        if (allSettled) {
          batch.status = batch.completed_count > 0 ? "completed" : "failed";
        } else if (batch.items.some((j) => j.status === "generating")) {
          batch.status = "processing";
        }
      }

      batch.updated_at = new Date().toISOString();
      await writeBatchStore(this.mascotsRoot, mascotId, batches);

      return {
        batch: JSON.parse(JSON.stringify(batch)) as MascotSlotBatchJob,
        job: JSON.parse(JSON.stringify(job)) as MascotSlotGenerationJob,
      };
    });
  }

  /**
   * Cancels an active batch and any pending or in-flight jobs.
   */
  public async cancelBatch(mascotId: string, batchId: string, reason?: string): Promise<MascotSlotBatchJob | null> {
    return withBatchStoreLock(mascotId, async () => {
      const batches = await readBatchStore(this.mascotsRoot, mascotId);
      const batch = batches[batchId];
      if (!batch) return null;

      if (["completed", "failed", "cancelled"].includes(batch.status)) {
        return JSON.parse(JSON.stringify(batch)) as MascotSlotBatchJob;
      }

      const now = new Date().toISOString();
      batch.status = "cancelled";
      batch.active_slot_keys = [];
      batch.updated_at = now;

      for (const item of batch.items) {
        if (item.status === "queued" || item.status === "generating") {
          item.status = "cancelled";
          item.completed_at = now;
          if (reason && !item.error) item.error = reason;
        }
      }

      await writeBatchStore(this.mascotsRoot, mascotId, batches);
      return JSON.parse(JSON.stringify(batch)) as MascotSlotBatchJob;
    });
  }

  /**
   * Retrieves recent batches for a mascot, optionally filtered by style ID.
   */
  public async getRecentBatches(mascotId: string, styleId?: string, limit = 10): Promise<MascotSlotBatchJob[]> {
    const batches = await readBatchStore(this.mascotsRoot, mascotId);
    let list = Object.values(batches);
    if (styleId) {
      list = list.filter((b) => b.style_id === styleId);
    }
    list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    return JSON.parse(JSON.stringify(list.slice(0, limit))) as MascotSlotBatchJob[];
  }

  /**
   * Lists all batches for a mascot.
   */
  public async listBatches(mascotId: string): Promise<MascotSlotBatchJob[]> {
    const batches = await readBatchStore(this.mascotsRoot, mascotId);
    return JSON.parse(JSON.stringify(Object.values(batches))) as MascotSlotBatchJob[];
  }

  /**
   * Reconciles stale in-progress batches after a server crash or restart.
   * Marks interrupted in-flight jobs as failed and remaining queued jobs as cancelled.
   */
  public async reconcileStaleJobs(mascotId?: string): Promise<number> {
    const targetMascotIds = mascotId ? [mascotId] : await listMascotIds(this.mascotsRoot);
    let totalReconciled = 0;

    for (const id of targetMascotIds) {
      await withBatchStoreLock(id, async () => {
        const batches = await readBatchStore(this.mascotsRoot, id);
        let storeModified = false;
        const now = new Date().toISOString();

        for (const batch of Object.values(batches)) {
          if (batch.status === "queued" || batch.status === "processing") {
            let batchModified = false;
            for (const item of batch.items) {
              if (item.status === "generating") {
                item.status = "failed";
                item.error = "Job interrupted by server restart";
                item.completed_at = now;
                totalReconciled++;
                batchModified = true;
              } else if (item.status === "queued") {
                item.status = "cancelled";
                item.error = "Cancelled due to server restart";
                item.completed_at = now;
                batchModified = true;
              }
            }

            if (batchModified) {
              batch.completed_count = batch.items.filter((j) => j.status === "completed").length;
              batch.failed_count = batch.items.filter((j) => j.status === "failed").length;
              batch.active_slot_keys = [];
              batch.status = batch.completed_count > 0 ? "completed" : "failed";
              batch.updated_at = now;
              storeModified = true;
            }
          }
        }

        if (storeModified) {
          await writeBatchStore(this.mascotsRoot, id, batches);
        }
      });
    }

    return totalReconciled;
  }
}

export function createMascotSlotJobRepository(target: string | RepositoryService): MascotSlotJobRepository {
  return new MascotSlotJobRepository(target);
}

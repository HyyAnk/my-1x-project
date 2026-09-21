/**
 * Mascot Style Generation Job Manager (Orchestrator)
 *
 * Coordinates bounded-concurrency background generation of mascot style concepts,
 * dynamic queue appending, cancellation, crash reconciliation, and reactive status querying.
 */

import { EventEmitter } from "node:events";
import type {
  CancelStyleGenerationInput,
  MascotStyleBatchJob,
  MascotStyleConceptJob,
  QueueStyleGenerationInput,
  StyleBatchStatusResponse,
} from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import { generateMascotStyleConcept } from "../generation/styleConceptGenerator.js";
import type { MascotStyleJobRepository } from "./mascotStyleJobRepository.js";
import { DEFAULT_STYLE_IMAGE_CONFIG, type MascotStyleJobManagerOptions, type StyleBatchRuntime } from "./styleJobTypes.js";
import { StyleJobQueueRunner } from "./styleJobQueueRunner.js";

export class MascotStyleJobManager extends EventEmitter {
  private readonly repository: RepositoryService;
  private readonly jobRepository: MascotStyleJobRepository;
  private readonly activeBatches = new Map<string, StyleBatchRuntime>();
  private readonly runner: StyleJobQueueRunner;
  private destroyed = false;

  constructor(options: MascotStyleJobManagerOptions) {
    super();
    this.repository = options.repository;
    this.jobRepository = options.jobRepository;
    this.runner = new StyleJobQueueRunner({
      ...options,
      concurrency: options.concurrency ?? 1,
      imageConfig: options.imageConfig ?? DEFAULT_STYLE_IMAGE_CONFIG,
      styleGenerator: options.styleGenerator ?? generateMascotStyleConcept,
      activeBatches: this.activeBatches,
      emitter: this,
    });
  }

  public async initialize(): Promise<void> {
    await this.reconcileStaleJobs();
  }

  public getActiveWorkerCount(): number {
    return this.runner.getActiveWorkerCount();
  }

  public async getBatch(mascotId: string, batchId: string): Promise<MascotStyleBatchJob | null> {
    const runtime = this.activeBatches.get(batchId);
    if (runtime) {
      return JSON.parse(JSON.stringify(runtime.batch)) as MascotStyleBatchJob;
    }
    return this.jobRepository.getBatch(mascotId, batchId);
  }

  public async getActiveBatch(mascotId: string): Promise<MascotStyleBatchJob | null> {
    for (const runtime of this.activeBatches.values()) {
      if (runtime.batch.mascot_id === mascotId && (runtime.batch.status === "queued" || runtime.batch.status === "processing")) {
        return JSON.parse(JSON.stringify(runtime.batch)) as MascotStyleBatchJob;
      }
    }
    return this.jobRepository.getActiveBatch(mascotId);
  }

  public async getBatchStatus(mascotId: string): Promise<StyleBatchStatusResponse> {
    const activeBatch = await this.getActiveBatch(mascotId);
    const recentBatches = await this.jobRepository.getRecentBatches(mascotId, 10);

    const queued_style_ids = activeBatch ? activeBatch.items.filter((j) => j.status === "queued").map((j) => j.style_id) : [];
    const active_style_ids = activeBatch ? activeBatch.items.filter((j) => j.status === "generating").map((j) => j.style_id) : [];

    return {
      active_batch: activeBatch,
      queued_style_ids,
      active_style_ids,
      recent_batches: recentBatches,
    };
  }

  public async enqueueBatch(mascotId: string, input: QueueStyleGenerationInput): Promise<MascotStyleBatchJob> {
    if (this.destroyed) {
      throw new Error("Cannot start batch: MascotStyleJobManager has been destroyed");
    }

    const existingActive = await this.getActiveBatch(mascotId);
    if (existingActive) {
      return this.appendStylesToBatch(mascotId, existingActive, input);
    }

    const now = new Date().toISOString();
    const batchId = `style_batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const items: MascotStyleConceptJob[] = input.styles.map((s, idx) => ({
      id: `job_${batchId}_${idx + 1}_${s.style_id}`,
      mascot_id: mascotId,
      style_id: s.style_id,
      style_name: s.style_name || s.style_id,
      status: "queued",
      prompt: s.prompt,
      created_at: now,
    }));

    const batchRecord: MascotStyleBatchJob = {
      id: batchId,
      mascot_id: mascotId,
      status: "queued",
      total_styles: items.length,
      completed_count: 0,
      failed_count: 0,
      active_style_ids: [],
      items,
      created_at: now,
      updated_at: now,
    };

    const savedBatch = await this.jobRepository.createBatch(batchRecord);
    this.registerRuntime(savedBatch);
    this.emit("batch:started", savedBatch);
    this.runner.dispatch();
    return savedBatch;
  }

  private async appendStylesToBatch(
    mascotId: string,
    existingActive: MascotStyleBatchJob,
    input: QueueStyleGenerationInput,
  ): Promise<MascotStyleBatchJob> {
    const existingStyleIds = new Set(
      existingActive.items.filter((j) => j.status === "queued" || j.status === "generating").map((j) => j.style_id),
    );

    const newStyles = input.styles.filter((s) => !existingStyleIds.has(s.style_id));
    if (newStyles.length === 0) {
      return existingActive;
    }

    const now = new Date().toISOString();
    const newItems: MascotStyleConceptJob[] = newStyles.map((s, idx) => ({
      id: `job_${existingActive.id}_${existingActive.items.length + idx + 1}_${s.style_id}`,
      mascot_id: mascotId,
      style_id: s.style_id,
      style_name: s.style_name || s.style_id,
      status: "queued",
      prompt: s.prompt,
      created_at: now,
    }));

    const updatedBatch: MascotStyleBatchJob = {
      ...existingActive,
      total_styles: existingActive.total_styles + newItems.length,
      items: [...existingActive.items, ...newItems],
      status: existingActive.status === "completed" || existingActive.status === "failed" ? "processing" : existingActive.status,
      updated_at: now,
    };

    const savedBatch = await this.jobRepository.updateBatch(updatedBatch);
    this.registerRuntime(savedBatch);
    this.emit("batch:progress", savedBatch);
    this.runner.dispatch();
    return savedBatch;
  }

  private registerRuntime(batch: MascotStyleBatchJob): StyleBatchRuntime {
    let runtime = this.activeBatches.get(batch.id);
    if (!runtime) {
      runtime = { batch, abortController: new AbortController(), waiters: [] };
      this.activeBatches.set(batch.id, runtime);
    } else {
      runtime.batch = batch;
    }
    return runtime;
  }

  public async cancelBatch(mascotId: string, input: CancelStyleGenerationInput): Promise<MascotStyleBatchJob | null> {
    const targetBatchId = input.batch_id ?? (await this.getActiveBatch(mascotId))?.id;
    if (!targetBatchId) return null;

    const runtime = this.activeBatches.get(targetBatchId);
    runtime?.abortController.abort();

    const cancelledBatch = await this.jobRepository.cancelBatch(mascotId, targetBatchId, input.reason);
    if (runtime && cancelledBatch) {
      runtime.batch = cancelledBatch;
      this.runner.checkSettled(runtime);
    }
    return cancelledBatch;
  }

  public async reconcileStaleJobs(mascotId?: string): Promise<number> {
    return this.jobRepository.reconcileStaleJobs(mascotId);
  }

  public destroy(): void {
    this.destroyed = true;
    this.runner.destroy();
    this.activeBatches.clear();
  }
}

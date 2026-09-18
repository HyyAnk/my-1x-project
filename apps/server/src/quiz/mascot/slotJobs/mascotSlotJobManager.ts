/**
 * Mascot Slot Generation Job Manager (Orchestrator)
 *
 * Coordinates bounded-concurrency background generation of mascot style slots,
 * provides mutex-backed slot locking, cancellation via AbortController,
 * crash reconciliation, and reactive batch status querying.
 */

import { EventEmitter } from "node:events";
import type { CancelSlotGenerationInput, MascotSlotBatchJob, QueueSlotGenerationInput, SlotBatchStatusResponse } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import { generateMascotStyleSlot } from "../generation/styleSlotGenerator.js";
import type { MascotSlotJobRepository } from "./mascotSlotJobRepository.js";
import { SlotJobMutex } from "./mascotSlotJobMutex.js";
import { DEFAULT_IMAGE_CONFIG, type BatchRuntime, type MascotSlotJobManagerOptions } from "./slotJobTypes.js";
import { appendSlotsAndPrepareBatch, buildSlotBatchStatusResponse, createSlotBatchRecord } from "./slotJobPlanner.js";
import { getActiveBatchWithCache, getBatchWithCache, reconcileStaleJobs, waitForBatchSettled } from "./slotJobPersistence.js";
import { SlotJobQueueRunner } from "./slotJobQueueRunner.js";

export class MascotSlotJobManager extends EventEmitter {
  private readonly repository: RepositoryService;
  private readonly jobRepository: MascotSlotJobRepository;
  private readonly activeBatches = new Map<string, BatchRuntime>();
  private readonly slotMutex = new SlotJobMutex();
  private readonly runner: SlotJobQueueRunner;
  private destroyed = false;

  constructor(options: MascotSlotJobManagerOptions) {
    super();
    this.repository = options.repository;
    this.jobRepository = options.jobRepository;
    this.runner = new SlotJobQueueRunner({
      ...options,
      concurrency: options.concurrency ?? 3,
      imageConfig: options.imageConfig ?? DEFAULT_IMAGE_CONFIG,
      slotGenerator: options.slotGenerator ?? generateMascotStyleSlot,
      slotMutex: this.slotMutex,
      activeBatches: this.activeBatches,
      emitter: this,
    });
  }

  public async initialize(): Promise<void> {
    await this.reconcileStaleJobs();
  }

  public getActiveSlotGenerationsCount(): number {
    return this.runner.getActiveWorkerCount();
  }

  public isSlotGenerating(mascotId: string, styleId: string, state: string, slotIndex: number): boolean {
    return this.runner.isSlotGenerating(mascotId, styleId, state, slotIndex);
  }

  public async getBatch(mascotId: string, batchId: string): Promise<MascotSlotBatchJob | null> {
    return getBatchWithCache(this.activeBatches, this.jobRepository, mascotId, batchId);
  }

  public async getActiveBatch(mascotId: string, styleId: string): Promise<MascotSlotBatchJob | null> {
    return getActiveBatchWithCache(this.activeBatches, this.jobRepository, mascotId, styleId);
  }

  public async getBatchStatus(mascotId: string, styleId: string): Promise<SlotBatchStatusResponse> {
    const activeBatch = await this.getActiveBatch(mascotId, styleId);
    const recentBatches = await this.jobRepository.getRecentBatches(mascotId, styleId, 10);
    return buildSlotBatchStatusResponse(activeBatch, recentBatches);
  }

  public async startBatch(mascotId: string, input: QueueSlotGenerationInput): Promise<MascotSlotBatchJob> {
    return this.enqueueBatch(mascotId, input);
  }

  public async enqueueBatch(mascotId: string, input: QueueSlotGenerationInput): Promise<MascotSlotBatchJob> {
    if (this.destroyed) {
      throw new Error("Cannot start batch: MascotSlotJobManager has been destroyed");
    }

    const existingActive = await this.getActiveBatch(mascotId, input.style_id);
    if (existingActive) {
      return this.appendSlotsToBatch(mascotId, existingActive, input);
    }

    const batchRecord = createSlotBatchRecord(mascotId, input);
    const savedBatch = await this.jobRepository.createBatch(batchRecord);

    if (savedBatch.items.length === 0) {
      this.emit("batch:completed", savedBatch);
      return savedBatch;
    }

    this.registerRuntime(savedBatch);
    this.emit("batch:started", savedBatch);
    this.runner.dispatch();
    return savedBatch;
  }

  private async appendSlotsToBatch(
    mascotId: string,
    existingActive: MascotSlotBatchJob,
    input: QueueSlotGenerationInput,
  ): Promise<MascotSlotBatchJob> {
    const updated = appendSlotsAndPrepareBatch(existingActive, mascotId, input);
    if (!updated) return existingActive;

    const savedBatch = await this.jobRepository.updateBatch(updated);
    this.registerRuntime(savedBatch);
    this.emit("batch:progress", savedBatch);
    this.runner.dispatch();
    return savedBatch;
  }

  private registerRuntime(batch: MascotSlotBatchJob): BatchRuntime {
    let runtime = this.activeBatches.get(batch.id);
    if (!runtime) {
      runtime = { batch, abortController: new AbortController(), waiters: [] };
      this.activeBatches.set(batch.id, runtime);
    } else {
      runtime.batch = batch;
    }
    return runtime;
  }

  public async cancelBatch(mascotId: string, input: CancelSlotGenerationInput): Promise<MascotSlotBatchJob | null> {
    const targetBatchId = input.batch_id ?? (await this.getActiveBatch(mascotId, input.style_id))?.id;
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
    return reconcileStaleJobs(this.jobRepository, mascotId);
  }

  public async waitForBatch(mascotId: string, batchId: string, timeoutMs = 30000): Promise<MascotSlotBatchJob> {
    return waitForBatchSettled((m, b) => this.getBatch(m, b), this.activeBatches, mascotId, batchId, timeoutMs);
  }

  public destroy(): void {
    this.destroyed = true;
    this.runner.destroy();
    this.activeBatches.clear();
    this.slotMutex.clear();
    this.removeAllListeners();
  }
}

export function createMascotSlotJobManager(options: MascotSlotJobManagerOptions): MascotSlotJobManager {
  return new MascotSlotJobManager(options);
}

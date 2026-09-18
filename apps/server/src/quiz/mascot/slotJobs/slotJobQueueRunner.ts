/**
 * Mascot Slot Job Queue Runner
 *
 * Manages bounded-concurrency worker dispatching, slot mutex acquisition,
 * and batch completion settlement.
 */

import type { EventEmitter } from "node:events";
import type { AppConfig, MascotSlotGenerationJob } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";
import type { MascotSlotJobRepository } from "./mascotSlotJobRepository.js";
import { buildSlotLockKey, SlotJobMutex } from "./mascotSlotJobMutex.js";
import type { BatchRuntime, SlotGeneratorFn } from "./slotJobTypes.js";
import { executeSlotJob, type SlotJobWorkerContext } from "./slotJobWorker.js";

export interface SlotJobQueueRunnerOptions {
  repository: RepositoryService;
  jobRepository: MascotSlotJobRepository;
  concurrency: number;
  imageConfig: AppConfig["image_generation"];
  imageFallbackConfig?: AppConfig["image_fallback"];
  logger?: StudioLogger;
  slotGenerator: SlotGeneratorFn;
  slotMutex?: SlotJobMutex;
  activeBatches: Map<string, BatchRuntime>;
  emitter: EventEmitter;
}

export class SlotJobQueueRunner {
  private readonly concurrency: number;
  private readonly slotMutex: SlotJobMutex;
  private readonly activeBatches: Map<string, BatchRuntime>;
  private readonly emitter: EventEmitter;
  private readonly workerContext: SlotJobWorkerContext;

  private activeWorkerCount = 0;
  private destroyed = false;

  constructor(options: SlotJobQueueRunnerOptions) {
    this.concurrency = Math.max(1, options.concurrency);
    this.slotMutex = options.slotMutex ?? new SlotJobMutex();
    this.activeBatches = options.activeBatches;
    this.emitter = options.emitter;

    this.workerContext = {
      repository: options.repository,
      jobRepository: options.jobRepository,
      imageConfig: options.imageConfig,
      imageFallbackConfig: options.imageFallbackConfig,
      logger: options.logger,
      slotGenerator: options.slotGenerator,
      emitter: options.emitter,
      isDestroyed: () => this.destroyed,
      onSettled: (runtime: BatchRuntime) => this.checkSettled(runtime),
    };
  }

  public getActiveWorkerCount(): number {
    return this.activeWorkerCount;
  }

  public isSlotGenerating(mascotId: string, styleId: string, state: string, slotIndex: number): boolean {
    const key = buildSlotLockKey(mascotId, styleId, state, slotIndex);
    return this.slotMutex.isLocked(key);
  }

  public dispatch(): void {
    if (this.destroyed) return;

    while (this.activeWorkerCount < this.concurrency) {
      const nextTask = this.findNextEligibleJob();
      if (!nextTask) break;

      const { runtime, job, slotKey } = nextTask;
      this.activeWorkerCount++;
      this.slotMutex.tryLock(slotKey);

      void executeSlotJob(this.workerContext, runtime, job).finally(() => {
        this.slotMutex.unlock(slotKey);
        this.activeWorkerCount--;
        this.dispatch();
      });
    }
  }

  private findNextEligibleJob(): {
    runtime: BatchRuntime;
    job: MascotSlotGenerationJob;
    slotKey: string;
  } | null {
    for (const runtime of this.activeBatches.values()) {
      if (runtime.abortController.signal.aborted) continue;

      for (const job of runtime.batch.items) {
        if (job.status === "queued") {
          const slotKey = buildSlotLockKey(job.mascot_id, job.style_id, job.state, job.slot_index);
          if (!this.slotMutex.isLocked(slotKey)) {
            return { runtime, job, slotKey };
          }
        }
      }
    }
    return null;
  }

  public checkSettled(runtime: BatchRuntime): void {
    const isSettled = ["completed", "failed", "cancelled"].includes(runtime.batch.status);
    if (isSettled) {
      this.activeBatches.delete(runtime.batch.id);
      this.emitter.emit(`batch:${runtime.batch.status}`, runtime.batch);
      for (const waiter of runtime.waiters) {
        waiter(runtime.batch);
      }
      runtime.waiters = [];
    }
  }

  public destroy(): void {
    this.destroyed = true;
    for (const runtime of this.activeBatches.values()) {
      runtime.abortController.abort();
    }
  }
}

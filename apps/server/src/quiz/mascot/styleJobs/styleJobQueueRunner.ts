/**
 * Mascot Style Job Queue Runner
 *
 * Manages bounded-concurrency worker dispatching for style concept jobs,
 * tracking active workers and settling batch completions.
 */

import type { EventEmitter } from "node:events";
import type { AppConfig, MascotStyleConceptJob } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";
import type { MascotStyleJobRepository } from "./mascotStyleJobRepository.js";
import type { StyleBatchRuntime, StyleConceptGeneratorFn } from "./styleJobTypes.js";
import { executeStyleJob, type StyleJobWorkerContext } from "./styleJobWorker.js";

export interface StyleJobQueueRunnerOptions {
  repository: RepositoryService;
  jobRepository: MascotStyleJobRepository;
  concurrency: number;
  imageConfig: AppConfig["image_generation"];
  imageFallbackConfig?: AppConfig["image_fallback"];
  logger?: StudioLogger;
  styleGenerator: StyleConceptGeneratorFn;
  activeBatches: Map<string, StyleBatchRuntime>;
  emitter: EventEmitter;
}

export class StyleJobQueueRunner {
  private readonly concurrency: number;
  private readonly activeBatches: Map<string, StyleBatchRuntime>;
  private readonly emitter: EventEmitter;
  private readonly workerContext: StyleJobWorkerContext;

  private activeWorkerCount = 0;
  private destroyed = false;

  constructor(options: StyleJobQueueRunnerOptions) {
    this.concurrency = Math.max(1, options.concurrency);
    this.activeBatches = options.activeBatches;
    this.emitter = options.emitter;

    this.workerContext = {
      repository: options.repository,
      jobRepository: options.jobRepository,
      imageConfig: options.imageConfig,
      imageFallbackConfig: options.imageFallbackConfig,
      logger: options.logger,
      styleGenerator: options.styleGenerator,
      emitter: options.emitter,
      isDestroyed: () => this.destroyed,
      onSettled: (runtime: StyleBatchRuntime) => this.checkSettled(runtime),
    };
  }

  public getActiveWorkerCount(): number {
    return this.activeWorkerCount;
  }

  public dispatch(): void {
    if (this.destroyed) return;

    while (this.activeWorkerCount < this.concurrency) {
      const nextTask = this.findNextEligibleJob();
      if (!nextTask) break;

      const { runtime, job } = nextTask;
      this.activeWorkerCount++;

      void executeStyleJob(this.workerContext, runtime, job).finally(() => {
        this.activeWorkerCount--;
        this.dispatch();
      });
    }
  }

  private findNextEligibleJob(): {
    runtime: StyleBatchRuntime;
    job: MascotStyleConceptJob;
  } | null {
    for (const runtime of this.activeBatches.values()) {
      if (runtime.abortController.signal.aborted) continue;

      for (const job of runtime.batch.items) {
        if (job.status === "queued") {
          return { runtime, job };
        }
      }
    }
    return null;
  }

  public checkSettled(runtime: StyleBatchRuntime): void {
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

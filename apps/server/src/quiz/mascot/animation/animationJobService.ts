import { existsSync } from "node:fs";
import path from "node:path";
import {
  buildAnimationPrompt,
  getRecipeBySlot,
  type AnimationPromptContext,
  type AnimationState,
  type MascotAnimationBatch,
  type MascotAnimationJob,
  type MascotProfile,
  type MascotStyle,
} from "@studio/shared";
import { AnimationConcurrencyQueue } from "./animationConcurrencyQueue.js";
import { runAnimationJob } from "./animationJobRunner.js";
import type { AnimationRepository } from "./animationRepositoryTypes.js";
import { buildSlotLockKey, withAnimationSlotLock } from "./animationSlotMutex.js";
import type { SpriteGenAdapter } from "./spriteGen/spriteGenAdapter.js";

export function resolveAnchorImagePath(
  mascot: MascotProfile,
  style: MascotStyle | undefined,
  state: AnimationState,
  outputBaseDir: string,
): string {
  const candidate =
    style?.anchor_image_url ||
    mascot.master_image_url ||
    mascot.actions?.[state]?.sprite_url ||
    mascot.actions?.thinking?.sprite_url ||
    mascot.actions?.celebrate?.sprite_url;

  if (!candidate) {
    return "/mascot/assets/style_anchor.png";
  }

  if (path.isAbsolute(candidate) && existsSync(candidate)) {
    return candidate;
  }

  const filename = path.basename(candidate);
  const storageRoot = path.resolve(outputBaseDir, "../..");
  const candidatePaths = [
    path.join(storageRoot, "mascots", mascot.id, "assets", filename),
    path.join(path.dirname(storageRoot), ".quiz-studio", "mascots", mascot.id, "assets", filename),
    path.join(process.cwd(), ".quiz-studio", "mascots", mascot.id, "assets", filename),
  ];

  for (const p of candidatePaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  return candidate;
}

export interface AnimationJobServiceOptions {
  repository: AnimationRepository;
  adapter: SpriteGenAdapter;
  outputBaseDir: string;
  maxConcurrency?: number;
}

export class AnimationJobService {
  private readonly repository: AnimationRepository;
  private readonly adapter: SpriteGenAdapter;
  private readonly outputBaseDir: string;
  private readonly queue: AnimationConcurrencyQueue;
  private readonly activeJobControllers = new Map<string, AbortController>();

  constructor(options: AnimationJobServiceOptions) {
    this.repository = options.repository;
    this.adapter = options.adapter;
    this.outputBaseDir = path.resolve(options.outputBaseDir);
    this.queue = new AnimationConcurrencyQueue({ concurrency: options.maxConcurrency ?? 2 });
  }

  public getActiveControllerCount(): number {
    return this.activeJobControllers.size;
  }

  public async runJob(mascot: MascotProfile, job: MascotAnimationJob, options?: { fixtureMode?: boolean }): Promise<MascotAnimationJob> {
    const lockKey = buildSlotLockKey(job.mascot_id, job.style_id, job.state, job.slot_index);

    return withAnimationSlotLock(lockKey, async () => {
      const controller = new AbortController();
      this.activeJobControllers.set(job.id, controller);

      try {
        const style = (mascot.styles || []).find((s) => s.id === job.style_id);
        const recipe = getRecipeBySlot(job.state, job.slot_index);
        if (!recipe) {
          throw new Error(`Recipe ${job.recipe_id} not found`);
        }

        const promptContext: AnimationPromptContext = {
          characterName: mascot.name,
          characterDescription: mascot.description || mascot.name,
          visualStyle: mascot.visual_style,
          anchorKeyword: style?.keyword,
        };
        const prompt = buildAnimationPrompt(recipe, promptContext);
        const styleAnchorPath = resolveAnchorImagePath(mascot, style, job.state, this.outputBaseDir);

        const result = await runAnimationJob(job, {
          repository: this.repository,
          adapter: this.adapter,
          outputBaseDir: this.outputBaseDir,
          prompt,
          styleAnchorPath,
          fixtureMode: options?.fixtureMode,
          signal: controller.signal,
        });

        return result.job;
      } finally {
        this.activeJobControllers.delete(job.id);
      }
    });
  }

  public async runBatch(
    mascot: MascotProfile,
    batchId: string,
    options?: { fixtureMode?: boolean },
  ): Promise<{ batch: MascotAnimationBatch; jobs: MascotAnimationJob[] }> {
    const existingBatch = await this.repository.getBatch(mascot.id, batchId);
    if (!existingBatch) {
      throw new Error(`Batch ${batchId} not found for mascot ${mascot.id}`);
    }

    const runningBatch: MascotAnimationBatch = {
      ...existingBatch,
      status: "running",
      updated_at: new Date().toISOString(),
    };
    await this.repository.saveBatch(runningBatch);

    const jobs = await this.repository.listJobsByBatch(mascot.id, batchId);
    const tasks = jobs.map((job) => async () => this.runJob(mascot, job, options));
    const finishedJobs = await this.queue.runAll(tasks);

    const completed = finishedJobs.filter((j) => j.status === "ready").length;
    const failed = finishedJobs.filter((j) => j.status === "error" || j.status === "qa_failed" || j.status === "cancelled").length;

    const finalStatus =
      failed > 0 && completed === 0 ? "failed" : finishedJobs.some((j) => j.status === "cancelled") ? "cancelled" : "completed";

    const updatedBatch: MascotAnimationBatch = {
      ...runningBatch,
      completed_jobs: completed,
      failed_jobs: failed,
      status: finalStatus,
      updated_at: new Date().toISOString(),
    };
    await this.repository.saveBatch(updatedBatch);

    return { batch: updatedBatch, jobs: finishedJobs };
  }

  public async cancelJob(mascotId: string, jobId: string): Promise<MascotAnimationJob> {
    const controller = this.activeJobControllers.get(jobId);
    if (controller) {
      controller.abort();
      this.activeJobControllers.delete(jobId);
    }

    const existing = await this.repository.getJob(mascotId, jobId);
    if (!existing) {
      throw new Error(`Job ${jobId} not found`);
    }

    const cancelledJob: MascotAnimationJob = {
      ...existing,
      status: "cancelled",
      error_message: "Job cancelled by user request",
      updated_at: new Date().toISOString(),
    };

    return this.repository.saveJob(cancelledJob);
  }

  public async cancelBatch(mascotId: string, batchId: string): Promise<void> {
    const jobs = await this.repository.listJobsByBatch(mascotId, batchId);
    for (const job of jobs) {
      await this.cancelJob(mascotId, job.id);
    }

    const batch = await this.repository.getBatch(mascotId, batchId);
    if (batch) {
      await this.repository.saveBatch({
        ...batch,
        status: "cancelled",
        updated_at: new Date().toISOString(),
      });
    }
  }

  public async retryJob(
    mascotId: string,
    jobId: string,
    mascot: MascotProfile,
    options?: { fixtureMode?: boolean },
  ): Promise<MascotAnimationJob> {
    const existing = await this.repository.getJob(mascotId, jobId);
    if (!existing) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Reset status to queued
    const queuedJob: MascotAnimationJob = {
      ...existing,
      status: "queued",
      error_message: null,
      updated_at: new Date().toISOString(),
    };
    await this.repository.saveJob(queuedJob);

    return this.runJob(mascot, queuedJob, options);
  }
}

export function createAnimationJobService(options: AnimationJobServiceOptions): AnimationJobService {
  return new AnimationJobService(options);
}

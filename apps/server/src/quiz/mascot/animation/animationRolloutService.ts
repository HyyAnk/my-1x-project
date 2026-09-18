/**
 * Animation Rollout Service (Stage 17)
 *
 * Orchestrates all-style generation across all registered styles for a mascot:
 * - Plans 20 slots per style, deduplicating ready slots by source fingerprint.
 * - Enforces bounded concurrency across styles and slots.
 * - Style-by-style publishing isolation: each style publishes only when all 20 slots pass QA.
 * - Transparent error tracking: failed slots stay visibly marked and individually retryable.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { isStyleAnimationPublishEligible, MascotProfileSchema, type MascotProfile } from "@studio/shared";
import { AnimationConcurrencyQueue } from "./animationConcurrencyQueue.js";
import { AnimationJobService } from "./animationJobService.js";
import { persistStylePlan, planStyleAnimation } from "./animationPlanService.js";
import { AnimationPublishService } from "./animationPublishService.js";
import type { AnimationRepository } from "./animationRepositoryTypes.js";
import { DefaultAnimationRepository } from "./animationRepository.js";
import type { AnimationRolloutOptions, RolloutReport, RolloutSlotFailureDetail, StyleRolloutReport } from "./animationRolloutTypes.js";
import { DefaultSpriteGenAdapter, type SpriteGenAdapter } from "./spriteGen/spriteGenAdapter.js";

export * from "./animationRolloutTypes.js";

export class AnimationRolloutService {
  private readonly repository: AnimationRepository;
  private readonly jobService: AnimationJobService;
  private readonly publishService: AnimationPublishService;
  private readonly outputBaseDir: string;
  private readonly storageRoot?: string;

  constructor(options: {
    repository: AnimationRepository;
    jobService: AnimationJobService;
    publishService: AnimationPublishService;
    outputBaseDir: string;
    storageRoot?: string;
  }) {
    this.repository = options.repository;
    this.jobService = options.jobService;
    this.publishService = options.publishService;
    this.outputBaseDir = options.outputBaseDir;
    this.storageRoot = options.storageRoot;
  }

  public async resolveMascot(mascotId: string, options?: AnimationRolloutOptions): Promise<MascotProfile> {
    if (options?.mascot) return options.mascot;
    const root = options?.storageRoot ?? this.storageRoot ?? path.resolve("./data/mascots");
    const profilePath = path.join(root, "mascots", mascotId, "mascot.json");
    const raw = await fs.readFile(profilePath, "utf8");
    return MascotProfileSchema.parse(JSON.parse(raw));
  }

  public async rolloutStyle(mascot: MascotProfile, styleId: string, options?: AnimationRolloutOptions): Promise<StyleRolloutReport> {
    const style = (mascot.styles || []).find((s) => s.id === styleId);
    if (!style) {
      throw new Error(`Style ${styleId} not found in mascot ${mascot.id}`);
    }

    const plan = planStyleAnimation(mascot, styleId, { force: options?.force });
    await persistStylePlan(this.repository, plan);

    const fixtureMode = options?.fixtureMode ?? true;

    // Run planned jobs if any
    if (plan.planned_jobs.length > 0) {
      await this.jobService.runBatch(mascot, plan.batch_id, { fixtureMode });
    }

    // Inspect all 20 slots in repository
    const styleSlots = await this.repository.getStyleSlots(mascot.id, styleId);
    const eligibility = isStyleAnimationPublishEligible(styleSlots.thinking, styleSlots.celebrate);

    let published = false;
    let publishedAt: string | undefined;
    const failureDetails: RolloutSlotFailureDetail[] = [];

    if (eligibility.eligible) {
      if (options?.autoPublish !== false) {
        const publishResult = await this.publishService.publishStyleAnimations(mascot.id, styleId);
        published = true;
        publishedAt = publishResult.publishedAt;
      }
    } else {
      // Gather failed / missing slot details
      const batchJobs = await this.repository.listJobsByStyle(mascot.id, styleId);

      for (const missing of eligibility.missingSlots) {
        const matchingJob = batchJobs
          .filter((j) => j.state === missing.state && j.slot_index === missing.slot_index)
          .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))[0];

        const jobStatus = matchingJob?.status;
        const isFailure = jobStatus === "qa_failed" || jobStatus === "error" || jobStatus === "cancelled";

        failureDetails.push({
          state: missing.state,
          slotIndex: missing.slot_index,
          recipeId: matchingJob?.recipe_id || `slot-${missing.slot_index}`,
          jobId: matchingJob?.id,
          status: isFailure ? jobStatus : "missing",
          reasons: [matchingJob?.error_message || (isFailure ? "QA validation failed" : "Slot not ready")],
          failedChecks: isFailure ? [jobStatus === "qa_failed" ? "qa_gate" : "execution"] : undefined,
          retryable: isFailure,
        });
      }
    }

    const failedSlotsCount = failureDetails.filter(
      (f) => f.status === "qa_failed" || f.status === "error" || f.status === "cancelled",
    ).length;

    const status = published ? "published" : failedSlotsCount > 0 ? "failed" : "pending";

    return {
      styleId,
      styleName: style.name,
      status,
      published,
      publishedAt,
      totalSlots: plan.total_slots,
      readySlots: eligibility.readyCount,
      failedSlots: failedSlotsCount,
      skippedSlots: plan.skipped_slots.length,
      newlyExecutedSlots: plan.planned_jobs.length,
      batchId: plan.batch_id,
      failureDetails,
    };
  }

  public async executeRollout(mascotId: string, options?: AnimationRolloutOptions): Promise<RolloutReport> {
    const mascot = await this.resolveMascot(mascotId, options);
    const allStyles = mascot.styles || [];
    const targetStyles = options?.styleIds ? allStyles.filter((s) => options.styleIds?.includes(s.id)) : allStyles;

    if (targetStyles.length === 0) {
      return {
        mascotId,
        totalStyles: 0,
        publishedStyles: 0,
        pendingStyles: 0,
        totalSlots: 0,
        readySlots: 0,
        failedSlots: 0,
        styleReports: {},
        completedAt: new Date().toISOString(),
      };
    }

    // Bounded concurrency across styles
    const styleQueue = new AnimationConcurrencyQueue({
      concurrency: options?.maxStyleConcurrency ?? 2,
    });

    const tasks = targetStyles.map((style) => async () => {
      const currentMascot = await this.resolveMascot(mascotId, options);
      return this.rolloutStyle(currentMascot, style.id, options);
    });

    const reportsList = await styleQueue.runAll(tasks);
    const styleReports: Record<string, StyleRolloutReport> = {};

    let publishedStyles = 0;
    let readySlots = 0;
    let failedSlots = 0;
    let totalSlots = 0;

    for (const report of reportsList) {
      styleReports[report.styleId] = report;
      if (report.published) {
        publishedStyles += 1;
      }
      readySlots += report.readySlots;
      failedSlots += report.failedSlots;
      totalSlots += report.totalSlots;
    }

    return {
      mascotId,
      totalStyles: targetStyles.length,
      publishedStyles,
      pendingStyles: targetStyles.length - publishedStyles,
      totalSlots,
      readySlots,
      failedSlots,
      styleReports,
      completedAt: new Date().toISOString(),
    };
  }
}

export function createAnimationRolloutService(options: {
  repository: AnimationRepository;
  jobService: AnimationJobService;
  publishService: AnimationPublishService;
  outputBaseDir: string;
  storageRoot?: string;
}): AnimationRolloutService {
  return new AnimationRolloutService(options);
}

export async function executeMascotAnimationRollout(mascotId: string, options?: AnimationRolloutOptions): Promise<RolloutReport> {
  const storageRoot = options?.storageRoot ?? path.resolve("./data/mascots");
  const repository = options?.repository ?? new DefaultAnimationRepository({ storageRoot });
  const adapter: SpriteGenAdapter = options?.adapter ?? new DefaultSpriteGenAdapter();
  const outputBaseDir = options?.outputBaseDir ?? path.join(storageRoot, "output");

  const jobService =
    options?.jobService ??
    new AnimationJobService({
      repository,
      adapter,
      outputBaseDir,
      maxConcurrency: options?.maxConcurrency ?? 4,
    });

  const publishService = options?.publishService ?? new AnimationPublishService({ repository });

  const rolloutService = new AnimationRolloutService({
    repository,
    jobService,
    publishService,
    outputBaseDir,
    storageRoot,
  });

  return rolloutService.executeRollout(mascotId, options);
}

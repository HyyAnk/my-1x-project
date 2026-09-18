/**
 * Animation Pilot Service (Stage 16)
 *
 * Runs the twelve-frame pilot verification gate:
 * - Phase A: Generates and verifies 2 pilot rows (slot 1 thinking + slot 1 celebrate).
 * - Phase B: Generates and verifies remaining 18 slots (10 thinking + 10 celebrate total).
 * - Evaluates alpha coverage, bounds, duplicate ratio, motion thresholds, and seam continuity.
 * - Blocks style publication if ANY slot fails QA.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { MascotProfileSchema, type MascotAnimationJob, type MascotProfile } from "@studio/shared";
import { AnimationJobService } from "./animationJobService.js";
import type { AnimationPilotOptions, PilotReport, PilotSlotFailureDetail } from "./animationPilotTypes.js";
import { persistStylePlan, planStyleAnimation } from "./animationPlanService.js";
import { AnimationPublishService } from "./animationPublishService.js";
import type { AnimationQaReport } from "./animationQaTypes.js";
import { DefaultAnimationRepository } from "./animationRepository.js";
import type { AnimationRepository } from "./animationRepositoryTypes.js";
import { DefaultSpriteGenAdapter, type SpriteGenAdapter } from "./spriteGen/spriteGenAdapter.js";

export * from "./animationPilotTypes.js";

function evaluateQaReportChecks(qaReport: AnimationQaReport): { failedChecks: string[]; reasons: string[] } {
  const failedChecks: string[] = [];
  const reasons: string[] = [];
  const checks = qaReport.checks;
  if (!checks) return { failedChecks, reasons };

  if (checks.alpha_coverage && checks.alpha_coverage.passed === false) {
    failedChecks.push("alpha_coverage");
    reasons.push(checks.alpha_coverage.message || "Alpha coverage check failed");
  }
  if (checks.bounds && checks.bounds.passed === false) {
    failedChecks.push("bounds");
    reasons.push(checks.bounds.message || "Bounds check failed");
  }
  if (checks.duplicate_pose && checks.duplicate_pose.passed === false) {
    failedChecks.push("duplicate_pose");
    reasons.push(checks.duplicate_pose.message || "Duplicate pose threshold exceeded");
  }
  if (checks.motion_difference && checks.motion_difference.passed === false) {
    failedChecks.push("motion_difference");
    reasons.push(checks.motion_difference.message || "Motion difference below threshold");
  }
  if ((checks.seam && checks.seam.passed === false) || (checks as Record<string, unknown>)?.seams_detected === true) {
    failedChecks.push("seam");
    reasons.push(checks.seam?.message || "Seam continuity check failed");
  }
  if (
    (checks.frame_count && typeof checks.frame_count === "object" && checks.frame_count.passed === false) ||
    (typeof checks.frame_count === "number" && checks.frame_count !== 12)
  ) {
    failedChecks.push("frame_count");
    reasons.push((checks.frame_count as { message?: string })?.message || "Frame count mismatch");
  }

  return { failedChecks, reasons };
}

async function inspectJobQa(
  job: MascotAnimationJob,
  jobResult: MascotAnimationJob,
  outputBaseDir: string,
): Promise<{ passed: boolean; failure?: PilotSlotFailureDetail }> {
  if (jobResult.status !== "ready") {
    return {
      passed: false,
      failure: {
        state: job.state,
        slotIndex: job.slot_index,
        recipeId: job.recipe_id,
        failedChecks: [jobResult.status === "qa_failed" ? "qa_gate" : "execution"],
        reasons: [jobResult.error_message || `Job status: ${jobResult.status}`],
      },
    };
  }

  const attemptNum = jobResult.attempts?.length || 1;
  const qaPath = path.join(
    outputBaseDir,
    job.mascot_id,
    job.style_id,
    job.state,
    String(job.slot_index),
    `attempt_${attemptNum}`,
    "qa_report.json",
  );

  try {
    const raw = await fs.readFile(qaPath, "utf8");
    const qaReport = JSON.parse(raw) as AnimationQaReport;

    const { failedChecks, reasons } = evaluateQaReportChecks(qaReport);

    if (!qaReport.passed || failedChecks.length > 0) {
      if (failedChecks.length === 0) {
        failedChecks.push("qa_gate");
        reasons.push("QA report passed status is false");
      }
      return {
        passed: false,
        failure: {
          state: job.state,
          slotIndex: job.slot_index,
          recipeId: job.recipe_id,
          failedChecks,
          reasons,
          metrics: {
            alphaRatio: qaReport.summary?.average_alpha_ratio,
            duplicateRatio: qaReport.summary?.duplicate_ratio,
            motionScore: qaReport.summary?.motion_score,
            seamDifference: qaReport.summary?.seam_difference,
          },
        },
      };
    }

    return { passed: true };
  } catch (err) {
    return {
      passed: false,
      failure: {
        state: job.state,
        slotIndex: job.slot_index,
        recipeId: job.recipe_id,
        failedChecks: ["qa_report_missing"],
        reasons: [(err as Error).message || "Failed to read QA report file"],
      },
    };
  }
}

export class AnimationPilotService {
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

  private async resolveMascot(mascotId: string, options?: AnimationPilotOptions): Promise<MascotProfile> {
    if (options?.mascot) return options.mascot;
    const root = options?.storageRoot ?? this.storageRoot ?? path.resolve("./data/mascots");
    const profilePath = path.join(root, "mascots", mascotId, "mascot.json");
    const raw = await fs.readFile(profilePath, "utf8");
    return MascotProfileSchema.parse(JSON.parse(raw));
  }

  public async runPilot(mascotId: string, styleId: string, options?: AnimationPilotOptions): Promise<PilotReport> {
    const mascot = await this.resolveMascot(mascotId, options);

    const style = (mascot.styles || []).find((s) => s.id === styleId);
    if (!style) {
      throw new Error(`Style ${styleId} not found in mascot ${mascotId}`);
    }

    const plan = planStyleAnimation(mascot, styleId);
    await persistStylePlan(this.repository, plan);

    const fixtureMode = options?.fixtureMode ?? true;

    // --- Phase A: 2 Pilot Rows (Slot 1 Thinking + Slot 1 Celebrate) ---
    const phaseAJobs = plan.planned_jobs.filter((j: MascotAnimationJob) => j.slot_index === 1);
    const phaseAFailures: PilotSlotFailureDetail[] = [];

    for (const job of phaseAJobs) {
      const jobResult = await this.jobService.runJob(mascot, job, { fixtureMode });
      const qaCheck = await inspectJobQa(job, jobResult, this.outputBaseDir);
      if (!qaCheck.passed && qaCheck.failure) {
        phaseAFailures.push(qaCheck.failure);
      }
    }

    const phaseAPassed = phaseAFailures.length === 0;
    const phaseAResult = {
      passed: phaseAPassed,
      testedSlots: phaseAJobs.length,
      passedSlots: phaseAJobs.length - phaseAFailures.length,
    };

    if (!phaseAPassed) {
      return {
        passed: false,
        mascotId,
        styleId,
        phase: "phase_a",
        testedSlotsCount: phaseAJobs.length,
        passedSlotsCount: phaseAResult.passedSlots,
        failedSlotsCount: phaseAFailures.length,
        phaseAResult,
        failureDetails: phaseAFailures,
        published: false,
        completedAt: new Date().toISOString(),
      };
    }

    if (options?.twoRowOnly) {
      return {
        passed: true,
        mascotId,
        styleId,
        phase: "phase_a",
        testedSlotsCount: phaseAJobs.length,
        passedSlotsCount: phaseAJobs.length,
        failedSlotsCount: 0,
        phaseAResult,
        failureDetails: [],
        published: false,
        completedAt: new Date().toISOString(),
      };
    }

    // --- Phase B: Remaining 18 slots (Slots 2..10 thinking + celebrate) ---
    const phaseBJobs = plan.planned_jobs.filter((j: MascotAnimationJob) => j.slot_index > 1);
    const phaseBFailures: PilotSlotFailureDetail[] = [];

    for (const job of phaseBJobs) {
      const jobResult = await this.jobService.runJob(mascot, job, { fixtureMode });
      const qaCheck = await inspectJobQa(job, jobResult, this.outputBaseDir);
      if (!qaCheck.passed && qaCheck.failure) {
        phaseBFailures.push(qaCheck.failure);
      }
    }

    const phaseBPassed = phaseBFailures.length === 0;
    const phaseBResult = {
      passed: phaseBPassed,
      testedSlots: phaseBJobs.length,
      passedSlots: phaseBJobs.length - phaseBFailures.length,
    };

    const totalTested = phaseAJobs.length + phaseBJobs.length;
    const allFailures = [...phaseAFailures, ...phaseBFailures];
    const totalPassed = totalTested - allFailures.length;
    const overallPassed = allFailures.length === 0;

    let published = false;
    if (overallPassed && options?.autoPublish) {
      await this.publishService.publishStyleAnimations(mascotId, styleId);
      published = true;
    }

    return {
      passed: overallPassed,
      mascotId,
      styleId,
      phase: overallPassed ? "completed" : "phase_b",
      testedSlotsCount: totalTested,
      passedSlotsCount: totalPassed,
      failedSlotsCount: allFailures.length,
      phaseAResult,
      phaseBResult,
      failureDetails: allFailures,
      published,
      completedAt: new Date().toISOString(),
    };
  }
}

export function createAnimationPilotService(options: {
  repository: AnimationRepository;
  jobService: AnimationJobService;
  publishService: AnimationPublishService;
  outputBaseDir: string;
  storageRoot?: string;
}): AnimationPilotService {
  return new AnimationPilotService(options);
}

export async function runAnimationPilot(mascotId: string, styleId: string, options?: AnimationPilotOptions): Promise<PilotReport> {
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

  const pilotService = new AnimationPilotService({
    repository,
    jobService,
    publishService,
    outputBaseDir,
    storageRoot,
  });

  return pilotService.runPilot(mascotId, styleId, options);
}

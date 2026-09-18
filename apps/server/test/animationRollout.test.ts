import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MascotProfile } from "@studio/shared";
import {
  AnimationJobService,
  AnimationPublishService,
  AnimationRolloutService,
  DefaultAnimationRepository,
  DefaultSpriteGenAdapter,
  executeMascotAnimationRollout,
  type SpriteGenAdapter,
} from "../src/quiz/mascot/animation/index.js";

describe("All-Style Mascot Animation Rollout (Stage 17)", { timeout: 60_000 }, () => {
  let tempStorageRoot: string;
  let repo: DefaultAnimationRepository;
  let adapter: SpriteGenAdapter;
  let jobService: AnimationJobService;
  let publishService: AnimationPublishService;
  let rolloutService: AnimationRolloutService;
  let outputBaseDir: string;

  const multiStyleMascot: MascotProfile = {
    id: "owl_rollout_mascot",
    name: "Professor Owl",
    description: "A scholarly owl in tweed jacket",
    visual_style: "pixar_3d",
    master_prompt: "Scholarly owl with spectacles",
    master_image_url: "/mascots/owl/master.png",
    color_theme: "#10b981",
    styles: [
      {
        id: "style_academic",
        name: "Academic Style",
        keyword: "scholarly",
        is_default: true,
        anchor_image_url: "/mascots/owl/academic_anchor.png",
        states: {
          thinking: [],
          celebrate: [],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "style_casual",
        name: "Casual Style",
        keyword: "playful",
        is_default: false,
        anchor_image_url: "/mascots/owl/casual_anchor.png",
        states: {
          thinking: [],
          celebrate: [],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    tempStorageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "anim-rollout-test-"));
    repo = new DefaultAnimationRepository({ storageRoot: tempStorageRoot });
    adapter = new DefaultSpriteGenAdapter();
    outputBaseDir = path.join(tempStorageRoot, "output");

    jobService = new AnimationJobService({
      repository: repo,
      adapter,
      outputBaseDir,
      maxConcurrency: 4,
    });
    publishService = new AnimationPublishService({ repository: repo });

    rolloutService = new AnimationRolloutService({
      repository: repo,
      jobService,
      publishService,
      outputBaseDir,
      storageRoot: tempStorageRoot,
    });

    // Seed mascot profile on disk
    const mascotDir = path.join(tempStorageRoot, "mascots", multiStyleMascot.id);
    await fs.mkdir(mascotDir, { recursive: true });
    await fs.writeFile(path.join(mascotDir, "mascot.json"), JSON.stringify(multiStyleMascot, null, 2), "utf8");
  });

  afterEach(async () => {
    try {
      await fs.rm(tempStorageRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it("plans and executes multi-style rollout with deduplication on subsequent runs", async () => {
    const report = await rolloutService.executeRollout(multiStyleMascot.id, {
      fixtureMode: true,
      autoPublish: true,
    });

    // 1. Verify multi-style summary
    expect(report.mascotId).toBe(multiStyleMascot.id);
    expect(report.totalStyles).toBe(2);
    expect(report.publishedStyles).toBe(2);
    expect(report.pendingStyles).toBe(0);
    expect(report.totalSlots).toBe(40);
    expect(report.readySlots).toBe(40);
    expect(report.failedSlots).toBe(0);

    // 2. Verify individual style reports
    const academicReport = report.styleReports.style_academic;
    expect(academicReport).toBeDefined();
    expect(academicReport.status).toBe("published");
    expect(academicReport.published).toBe(true);
    expect(academicReport.readySlots).toBe(20);
    expect(academicReport.newlyExecutedSlots).toBe(20);
    expect(academicReport.skippedSlots).toBe(0);

    const casualReport = report.styleReports.style_casual;
    expect(casualReport).toBeDefined();
    expect(casualReport.status).toBe("published");
    expect(casualReport.published).toBe(true);
    expect(casualReport.readySlots).toBe(20);
    expect(casualReport.newlyExecutedSlots).toBe(20);
    expect(casualReport.skippedSlots).toBe(0);

    // 3. Verify deduplication: second run with matching fingerprints skips all 40 slots
    const secondReport = await rolloutService.executeRollout(multiStyleMascot.id, {
      fixtureMode: true,
      autoPublish: true,
    });

    expect(secondReport.totalStyles).toBe(2);
    expect(secondReport.publishedStyles).toBe(2);
    expect(secondReport.readySlots).toBe(40);
    expect(secondReport.failedSlots).toBe(0);
    expect(secondReport.styleReports.style_academic.skippedSlots).toBe(20);
    expect(secondReport.styleReports.style_academic.newlyExecutedSlots).toBe(0);
    expect(secondReport.styleReports.style_casual.skippedSlots).toBe(20);
    expect(secondReport.styleReports.style_casual.newlyExecutedSlots).toBe(0);
  }, 120000);

  it("enforces style-by-style publishing isolation when one style fails QA", async () => {
    // Custom adapter where style_casual slot 4 celebrate fails QA
    const failingAdapter: SpriteGenAdapter = {
      async execute(request) {
        const res = await adapter.execute(request);
        if (request.styleId === "style_casual" && request.state === "celebrate" && request.slot === 4) {
          const qaPath = path.join(request.outputDir, "qa_report.json");
          const failedReport = {
            version: 1,
            job_id: request.jobId,
            passed: false,
            score: 0.2,
            timestamp: new Date().toISOString(),
            checks: {
              frame_count: { passed: true, score: 1.0 },
              bounds: { passed: true, score: 1.0 },
              alpha_coverage: { passed: false, score: 0.005, message: "Alpha coverage below minimum 0.02" },
              duplicate_pose: { passed: true, score: 1.0 },
              motion_difference: { passed: true, score: 0.9 },
              seam: { passed: true, score: 0.9 },
              fingerprint_consistency: { passed: true, score: 1.0 },
            },
            summary: {
              state: "celebrate",
              recipe_id: request.recipeId,
              frame_count: 12,
              fps: 8,
              average_alpha_ratio: 0.005,
              duplicate_ratio: 0.01,
              motion_score: 0.9,
              seam_difference: 0.1,
            },
          };
          await fs.writeFile(qaPath, JSON.stringify(failedReport, null, 2), "utf8");
        }
        return res;
      },
    };

    const isolatedJobService = new AnimationJobService({
      repository: repo,
      adapter: failingAdapter,
      outputBaseDir,
      maxConcurrency: 4,
    });

    const isolatedRolloutService = new AnimationRolloutService({
      repository: repo,
      jobService: isolatedJobService,
      publishService,
      outputBaseDir,
      storageRoot: tempStorageRoot,
    });

    const report = await isolatedRolloutService.executeRollout(multiStyleMascot.id, {
      fixtureMode: true,
      autoPublish: true,
    });

    // Style A (style_academic) must publish with all 20 slots ready
    expect(report.publishedStyles).toBe(1);
    expect(report.pendingStyles).toBe(1);
    expect(report.styleReports.style_academic.published).toBe(true);
    expect(report.styleReports.style_academic.status).toBe("published");
    expect(report.styleReports.style_academic.readySlots).toBe(20);

    // Style B (style_casual) must remain un-published with 19 ready and 1 failed
    const casualReport = report.styleReports.style_casual;
    expect(casualReport.published).toBe(false);
    expect(casualReport.status).toBe("failed");
    expect(casualReport.readySlots).toBe(19);
    expect(casualReport.failedSlots).toBe(1);

    // Structured failure details
    expect(casualReport.failureDetails.length).toBe(1);
    const failure = casualReport.failureDetails[0];
    expect(failure.state).toBe("celebrate");
    expect(failure.slotIndex).toBe(4);
    expect(failure.status).toBe("qa_failed");
    expect(failure.retryable).toBe(true);
    expect(failure.jobId).toBeTruthy();

    // Verify repository state: academic is published, casual is not
    const publishedAcademic = await repo.listPublishedRecords(multiStyleMascot.id, "style_academic", "celebrate", 1);
    expect(publishedAcademic.length).toBeGreaterThan(0);

    const publishedCasual = await repo.listPublishedRecords(multiStyleMascot.id, "style_casual", "celebrate", 4);
    expect(publishedCasual.length).toBe(0);
  }, 120000);

  it("persists error details and enables individual slot retry to achieve full publication", async () => {
    let shouldFail = true;

    const dynamicAdapter: SpriteGenAdapter = {
      async execute(request) {
        const res = await adapter.execute(request);
        if (shouldFail && request.styleId === "style_casual" && request.state === "thinking" && request.slot === 2) {
          const qaPath = path.join(request.outputDir, "qa_report.json");
          const failedReport = {
            version: 1,
            job_id: request.jobId,
            passed: false,
            score: 0.1,
            timestamp: new Date().toISOString(),
            checks: {
              frame_count: { passed: true, score: 1.0 },
              bounds: { passed: true, score: 1.0 },
              alpha_coverage: { passed: true, score: 0.9 },
              duplicate_pose: { passed: false, score: 0.2, message: "Duplicate pose ratio 0.6 exceeds 0.25" },
              motion_difference: { passed: true, score: 0.8 },
              seam: { passed: true, score: 0.9 },
              fingerprint_consistency: { passed: true, score: 1.0 },
            },
            summary: {
              state: "thinking",
              recipe_id: request.recipeId,
              frame_count: 12,
              fps: 8,
              average_alpha_ratio: 0.3,
              duplicate_ratio: 0.6,
              motion_score: 0.8,
              seam_difference: 0.1,
            },
          };
          await fs.writeFile(qaPath, JSON.stringify(failedReport, null, 2), "utf8");
        }
        return res;
      },
    };

    const dynJobService = new AnimationJobService({
      repository: repo,
      adapter: dynamicAdapter,
      outputBaseDir,
      maxConcurrency: 2,
    });

    const dynRolloutService = new AnimationRolloutService({
      repository: repo,
      jobService: dynJobService,
      publishService,
      outputBaseDir,
      storageRoot: tempStorageRoot,
    });

    // 1. Initial rollout: style_casual has 1 failed slot
    const report1 = await dynRolloutService.executeRollout(multiStyleMascot.id, {
      fixtureMode: true,
      autoPublish: true,
    });

    const casualReport1 = report1.styleReports.style_casual;
    expect(casualReport1.published).toBe(false);
    expect(casualReport1.failedSlots).toBe(1);
    expect(casualReport1.failureDetails[0].retryable).toBe(true);
    const failedJobId = casualReport1.failureDetails[0].jobId!;

    // 2. Verify failed job status in repository
    const storedJob = await repo.getJob(multiStyleMascot.id, failedJobId);
    expect(storedJob).toBeDefined();
    expect(storedJob?.status).toBe("qa_failed");

    // 3. Fix underlying condition and retry the specific failed job individually
    shouldFail = false;
    const freshMascot = await dynRolloutService.resolveMascot(multiStyleMascot.id);
    const retryResult = await dynJobService.retryJob(multiStyleMascot.id, failedJobId, freshMascot, { fixtureMode: true });
    expect(retryResult.status).toBe("ready");

    // 4. Re-run rollout: deduplication keeps 39 ready slots and publishes style_casual
    const report2 = await dynRolloutService.executeRollout(multiStyleMascot.id, {
      fixtureMode: true,
      autoPublish: true,
    });

    expect(report2.publishedStyles).toBe(2);
    expect(report2.pendingStyles).toBe(0);
    expect(report2.styleReports.style_casual.published).toBe(true);
    expect(report2.styleReports.style_casual.readySlots).toBe(20);
    expect(report2.styleReports.style_casual.failedSlots).toBe(0);
  }, 120000);

  it("supports standalone executeMascotAnimationRollout helper function", async () => {
    const report = await executeMascotAnimationRollout(multiStyleMascot.id, {
      storageRoot: tempStorageRoot,
      outputBaseDir,
      fixtureMode: true,
      autoPublish: true,
      styleIds: ["style_academic"], // Filter to a single style
    });

    expect(report.totalStyles).toBe(1);
    expect(report.publishedStyles).toBe(1);
    expect(report.totalSlots).toBe(20);
    expect(report.readySlots).toBe(20);
    expect(report.styleReports.style_academic.published).toBe(true);
  });
});

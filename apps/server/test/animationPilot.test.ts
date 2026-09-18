import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MascotProfile } from "@studio/shared";
import {
  AnimationJobService,
  AnimationPilotService,
  AnimationPublishService,
  DefaultAnimationRepository,
  DefaultSpriteGenAdapter,
  runAnimationPilot,
  type SpriteGenAdapter,
} from "../src/quiz/mascot/animation/index.js";

describe("Twelve-Frame Animation Pilot Gate (Stage 16)", { timeout: 60_000 }, () => {
  let tempStorageRoot: string;
  let repo: DefaultAnimationRepository;
  let adapter: SpriteGenAdapter;
  let jobService: AnimationJobService;
  let publishService: AnimationPublishService;
  let pilotService: AnimationPilotService;

  const baseMascotProfile: MascotProfile = {
    id: "owl_pilot_mascot",
    name: "Professor Owl",
    description: "A scholarly owl in tweed jacket",
    visual_style: "pixar_3d",
    master_prompt: "Scholarly owl with spectacles",
    master_image_url: "/mascots/owl/master.png",
    color_theme: "#10b981",
    styles: [
      {
        id: "core",
        name: "Core Style",
        keyword: "scholarly",
        is_default: true,
        anchor_image_url: "/mascots/owl/anchor.png",
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
    tempStorageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "anim-pilot-test-"));
    repo = new DefaultAnimationRepository({ storageRoot: tempStorageRoot });
    adapter = new DefaultSpriteGenAdapter();

    const outputBaseDir = path.join(tempStorageRoot, "output");
    jobService = new AnimationJobService({
      repository: repo,
      adapter,
      outputBaseDir,
      maxConcurrency: 4,
    });
    publishService = new AnimationPublishService({ repository: repo });

    pilotService = new AnimationPilotService({
      repository: repo,
      jobService,
      publishService,
      outputBaseDir,
      storageRoot: tempStorageRoot,
    });

    // Seed mascot profile
    const mascotDir = path.join(tempStorageRoot, "mascots", baseMascotProfile.id);
    await fs.mkdir(mascotDir, { recursive: true });
    await fs.writeFile(path.join(mascotDir, "mascot.json"), JSON.stringify(baseMascotProfile, null, 2), "utf8");
  });

  afterEach(async () => {
    try {
      await fs.rm(tempStorageRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it("executes Phase A (2-row pilot) cleanly via fixture adapter", async () => {
    const report = await pilotService.runPilot(baseMascotProfile.id, "core", {
      twoRowOnly: true,
      fixtureMode: true,
    });

    expect(report.passed).toBe(true);
    expect(report.mascotId).toBe(baseMascotProfile.id);
    expect(report.styleId).toBe("core");
    expect(report.phase).toBe("phase_a");
    expect(report.testedSlotsCount).toBe(2);
    expect(report.passedSlotsCount).toBe(2);
    expect(report.failedSlotsCount).toBe(0);
    expect(report.failureDetails).toHaveLength(0);
    expect(report.phaseAResult).toBeDefined();
    expect(report.phaseAResult?.passed).toBe(true);
    expect(report.phaseAResult?.testedSlots).toBe(2);
    expect(report.phaseAResult?.passedSlots).toBe(2);
    expect(report.published).toBe(false);

    // Verify 2 slots exist in style profile
    const slots = await repo.getStyleSlots(baseMascotProfile.id, "core");
    const readyThinking = slots.thinking.filter((s) => s.status === "ready");
    const readyCelebrate = slots.celebrate.filter((s) => s.status === "ready");

    expect(readyThinking).toHaveLength(1);
    expect(readyCelebrate).toHaveLength(1);
    expect(readyThinking[0].slot_index).toBe(1);
    expect(readyCelebrate[0].slot_index).toBe(1);
  });

  it("executes full 20-slot pilot, clears gate, and publishes style", async () => {
    const report = await pilotService.runPilot(baseMascotProfile.id, "core", {
      fixtureMode: true,
      autoPublish: true,
    });

    expect(report.passed).toBe(true);
    expect(report.phase).toBe("completed");
    expect(report.testedSlotsCount).toBe(20);
    expect(report.passedSlotsCount).toBe(20);
    expect(report.failedSlotsCount).toBe(0);
    expect(report.failureDetails).toHaveLength(0);
    expect(report.phaseAResult?.passed).toBe(true);
    expect(report.phaseBResult?.passed).toBe(true);
    expect(report.phaseAResult?.testedSlots).toBe(2);
    expect(report.phaseBResult?.testedSlots).toBe(18);
    expect(report.published).toBe(true);

    // Verify style slots in repository: exactly 20 slots ready with animations
    const slots = await repo.getStyleSlots(baseMascotProfile.id, "core");
    expect(slots.thinking).toHaveLength(10);
    expect(slots.celebrate).toHaveLength(10);

    for (let i = 1; i <= 10; i += 1) {
      const thinkSlot = slots.thinking.find((s) => s.slot_index === i);
      const celebSlot = slots.celebrate.find((s) => s.slot_index === i);

      expect(thinkSlot?.status).toBe("ready");
      expect(thinkSlot?.animation).toBeDefined();
      expect(thinkSlot?.animation?.frame_count).toBe(12);
      expect(thinkSlot?.animation?.fps).toBe(8);

      expect(celebSlot?.status).toBe("ready");
      expect(celebSlot?.animation).toBeDefined();
      expect(celebSlot?.animation?.frame_count).toBe(12);
      expect(celebSlot?.animation?.fps).toBe(8);
    }
  });

  it("rejects pilot and blocks publication when Phase A row fails QA", async () => {
    // Custom adapter that writes failing QA report for Phase A slot 1 thinking
    const failingAdapter: SpriteGenAdapter = {
      async execute(request) {
        const result = await adapter.execute(request);
        if (request.slot === 1 && request.state === "thinking") {
          const qaPath = path.join(request.outputDir, "qa_report.json");
          const failingReport = {
            version: 1,
            job_id: request.jobId,
            passed: false,
            score: 0.1,
            timestamp: new Date().toISOString(),
            checks: {
              frame_count: { passed: true, score: 1.0 },
              bounds: { passed: true, score: 1.0 },
              alpha_coverage: { passed: false, score: 0.05, message: "Alpha coverage 0.04 below minimum threshold 0.15" },
              duplicate_pose: { passed: false, score: 0.2, message: "Duplicate pose ratio 0.5 exceeds maximum 0.25" },
              motion_difference: { passed: true, score: 0.8 },
              seam: { passed: false, score: 0.1, message: "Seam discontinuity 0.42 exceeds maximum 0.15" },
              fingerprint_consistency: { passed: true, score: 1.0 },
            },
            summary: {
              state: "thinking",
              recipe_id: request.recipeId,
              frame_count: 12,
              fps: 8,
              average_alpha_ratio: 0.04,
              duplicate_ratio: 0.5,
              motion_score: 0.8,
              seam_difference: 0.42,
            },
          };
          await fs.writeFile(qaPath, JSON.stringify(failingReport, null, 2), "utf8");
        }
        return result;
      },
    };

    const outputBaseDir = path.join(tempStorageRoot, "output");
    const failingJobService = new AnimationJobService({
      repository: repo,
      adapter: failingAdapter,
      outputBaseDir,
      maxConcurrency: 2,
    });

    const failingPilotService = new AnimationPilotService({
      repository: repo,
      jobService: failingJobService,
      publishService,
      outputBaseDir,
      storageRoot: tempStorageRoot,
    });

    const report = await failingPilotService.runPilot(baseMascotProfile.id, "core", {
      fixtureMode: true,
      autoPublish: true,
    });

    expect(report.passed).toBe(false);
    expect(report.phase).toBe("phase_a");
    expect(report.testedSlotsCount).toBe(2);
    expect(report.failedSlotsCount).toBeGreaterThanOrEqual(1);
    expect(report.published).toBe(false);
    expect(report.failureDetails.length).toBeGreaterThanOrEqual(1);

    const failDetail = report.failureDetails.find((f) => f.state === "thinking" && f.slotIndex === 1);
    expect(failDetail).toBeDefined();
    expect(failDetail?.failedChecks.length).toBeGreaterThan(0);

    // Phase B was aborted completely
    expect(report.phaseBResult).toBeUndefined();
  });

  it("rejects pilot when Phase B slot fails QA and reports measured failures", async () => {
    // Custom adapter where Phase A passes but slot 5 in Phase B fails seam QA
    const failingPhaseBAdapter: SpriteGenAdapter = {
      async execute(request) {
        const result = await adapter.execute(request);
        if (request.slot === 5 && request.state === "celebrate") {
          const qaPath = path.join(request.outputDir, "qa_report.json");
          const failingReport = {
            version: 1,
            job_id: request.jobId,
            passed: false,
            score: 0.3,
            timestamp: new Date().toISOString(),
            checks: {
              frame_count: { passed: true, score: 1.0 },
              bounds: { passed: true, score: 1.0 },
              alpha_coverage: { passed: true, score: 0.9 },
              duplicate_pose: { passed: true, score: 0.9 },
              motion_difference: { passed: true, score: 0.8 },
              seam: { passed: false, score: 0.1, message: "Broken seam return-to-rest failed" },
              fingerprint_consistency: { passed: true, score: 1.0 },
            },
            summary: {
              state: "celebrate",
              recipe_id: request.recipeId,
              frame_count: 12,
              fps: 8,
              average_alpha_ratio: 0.45,
              duplicate_ratio: 0.05,
              motion_score: 0.85,
              seam_difference: 0.58,
            },
          };
          await fs.writeFile(qaPath, JSON.stringify(failingReport, null, 2), "utf8");
        }
        return result;
      },
    };

    const outputBaseDir = path.join(tempStorageRoot, "output");
    const failingJobService = new AnimationJobService({
      repository: repo,
      adapter: failingPhaseBAdapter,
      outputBaseDir,
      maxConcurrency: 4,
    });

    const failingPilotService = new AnimationPilotService({
      repository: repo,
      jobService: failingJobService,
      publishService,
      outputBaseDir,
      storageRoot: tempStorageRoot,
    });

    const report = await failingPilotService.runPilot(baseMascotProfile.id, "core", {
      fixtureMode: true,
      autoPublish: true,
    });

    expect(report.passed).toBe(false);
    expect(report.phase).toBe("phase_b");
    expect(report.testedSlotsCount).toBe(20);
    expect(report.failedSlotsCount).toBeGreaterThanOrEqual(1);
    expect(report.published).toBe(false);
    expect(report.phaseAResult?.passed).toBe(true);
    expect(report.phaseBResult?.passed).toBe(false);

    const failDetail = report.failureDetails.find((f) => f.state === "celebrate" && f.slotIndex === 5);
    expect(failDetail).toBeDefined();
    expect(failDetail?.failedChecks.length).toBeGreaterThan(0);
  });

  it("standalone runAnimationPilot helper function works end-to-end", async () => {
    const report = await runAnimationPilot(baseMascotProfile.id, "core", {
      storageRoot: tempStorageRoot,
      outputBaseDir: path.join(tempStorageRoot, "output"),
      twoRowOnly: true,
      fixtureMode: true,
    });

    expect(report.passed).toBe(true);
    expect(report.phase).toBe("phase_a");
    expect(report.testedSlotsCount).toBe(2);
    expect(report.completedAt).toBeDefined();
  });
});

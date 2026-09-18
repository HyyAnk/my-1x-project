import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeAnimationSourceFingerprint,
  getRecipeBySlot,
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
  type MascotAnimationAssetV1,
  type MascotProfile,
} from "@studio/shared";
import {
  AnimationJobService,
  DefaultAnimationRepository,
  DefaultSpriteGenAdapter,
  persistStylePlan,
  planMultiStyleAnimation,
  planStyleAnimation,
  type SpriteGenAdapter,
} from "../src/quiz/mascot/animation/index.js";

describe("Animation Batch & Plan Orchestration (Stage 08)", () => {
  let tempStorageRoot: string;
  let repo: DefaultAnimationRepository;
  let adapter: SpriteGenAdapter;
  let jobService: AnimationJobService;

  beforeEach(async () => {
    tempStorageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "anim-orchestration-test-"));
    repo = new DefaultAnimationRepository({ storageRoot: tempStorageRoot });
    adapter = new DefaultSpriteGenAdapter();
    jobService = new AnimationJobService({
      repository: repo,
      adapter,
      outputBaseDir: path.join(tempStorageRoot, "output"),
      maxConcurrency: 2,
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempStorageRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  const baseMascotProfile: MascotProfile = {
    id: "owl_prof_1",
    name: "Professor Owl",
    description: "A wise scholarly owl with round spectacles",
    visual_style: "pixar_3d",
    master_prompt: "Scholarly owl in tweed jacket",
    master_image_url: "/mascots/owl/master.png",
    color_theme: "#10b981",
    styles: [
      {
        id: "core",
        name: "Core Style",
        keyword: "scholarly",
        is_default: true,
        anchor_image_url: "/mascots/owl/style_anchor.png",
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

  async function seedMascot(profile: MascotProfile): Promise<void> {
    const dir = path.join(tempStorageRoot, "mascots", profile.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "mascot.json"), JSON.stringify(profile, null, 2), "utf8");
  }

  it("produces exactly 20 jobs per style (10 thinking + 10 celebrate)", () => {
    const plan = planStyleAnimation(baseMascotProfile, "core");

    expect(plan.total_slots).toBe(20);
    expect(plan.all_slots).toHaveLength(20);
    expect(plan.planned_jobs).toHaveLength(20);
    expect(plan.skipped_slots).toHaveLength(0);

    const thinkingSlots = plan.all_slots.filter((s) => s.state === "thinking");
    const celebrateSlots = plan.all_slots.filter((s) => s.state === "celebrate");

    expect(thinkingSlots).toHaveLength(10);
    expect(celebrateSlots).toHaveLength(10);

    // Verify slots are indexed 1..10
    thinkingSlots.forEach((slot, index) => {
      expect(slot.slot_index).toBe(index + 1);
      expect(slot.status).toBe("queued");
      expect(slot.job).toBeDefined();
    });

    celebrateSlots.forEach((slot, index) => {
      expect(slot.slot_index).toBe(index + 1);
      expect(slot.status).toBe("queued");
      expect(slot.job).toBeDefined();
    });

    // Multi-style planning
    const multiPlan = planMultiStyleAnimation(baseMascotProfile);
    expect(multiPlan).toHaveLength(1);
    expect(multiPlan[0].total_slots).toBe(20);
  });

  it("deduplicates unchanged ready slots by fingerprint", async () => {
    const style = baseMascotProfile.styles![0];
    const thinkingRecipe1 = getRecipeBySlot("thinking", 1)!;

    // Compute identical source fingerprint
    const prompt = `Character: Professor Owl, A wise scholarly owl with round spectacles. Visual Style: pixar_3d. Style Accent: scholarly. Action: ${thinkingRecipe1.action_instruction}. State Mood: Calm, focused, thoughtful contemplation. Maintain stationary grounding, subtle breathing, and focused facial expression. Frame Specifications: Exactly 12 sequential animation frames at 8 fps (smooth seamless cycle). Composition: Exactly one centered character at fixed scale and camera angle across all frames. Background: Solid flat chroma key background (#00FF00), perfectly uniform with zero gradient, zero shadows on backdrop. Strict Negative Constraints (Must Exclude): no text, no background scenery, no multiple characters, no detached effects, no motion lines, no model-generated atlas.`;

    const expectedFingerprint = computeAnimationSourceFingerprint({
      styleAnchorIdOrUrl: style.anchor_image_url || style.id,
      recipeId: thinkingRecipe1.id,
      prompt,
      frameCount: REQUIRED_FRAME_COUNT,
      fps: REQUIRED_FPS,
    });

    const readySlotAnimation: MascotAnimationAssetV1 = {
      version: 1,
      state: "thinking",
      atlas_url: "/atlas.png",
      manifest_url: "/manifest.json",
      frame_count: 12,
      fps: 8,
      loop: true,
      frames: Array.from({ length: 12 }, (_, i) => ({
        index: i,
        x: (i % 4) * 128,
        y: Math.floor(i / 4) * 128,
        width: 128,
        height: 128,
        duration_ms: 125,
      })),
      registration: {
        source_width: 512,
        source_height: 512,
        content_bounds: { x: 50, y: 50, width: 400, height: 400 },
        pivot: { x: 256, y: 512 },
        offset_x: 0,
        offset_y: 0,
      },
      content_fingerprint: "cnt_123",
      source_fingerprint: expectedFingerprint,
    };

    const mascotWithReadySlot: MascotProfile = {
      ...baseMascotProfile,
      styles: [
        {
          ...style,
          states: {
            thinking: [
              {
                id: "slot_1",
                slot_index: 1,
                image_url: "/legacy.png",
                status: "ready",
                animation: readySlotAnimation,
              },
            ],
            celebrate: [],
          },
        },
      ],
    };

    // Plan without force: slot 1 thinking should be skipped
    const normalPlan = planStyleAnimation(mascotWithReadySlot, "core");
    expect(normalPlan.total_slots).toBe(20);
    expect(normalPlan.skipped_slots).toHaveLength(1);
    expect(normalPlan.skipped_slots[0].slot_index).toBe(1);
    expect(normalPlan.skipped_slots[0].skip_reason).toBe("fingerprint_match");
    expect(normalPlan.planned_jobs).toHaveLength(19);

    // Plan with force: true: slot 1 thinking should be planned
    const forcedPlan = planStyleAnimation(mascotWithReadySlot, "core", { force: true });
    expect(forcedPlan.skipped_slots).toHaveLength(0);
    expect(forcedPlan.planned_jobs).toHaveLength(20);
  });

  it("enforces bounded concurrency during batch execution", async () => {
    await seedMascot(baseMascotProfile);

    let currentActive = 0;
    let maxActiveObserved = 0;

    // Custom adapter simulating latency to observe concurrency bounds
    const trackingAdapter: SpriteGenAdapter = {
      async execute(request) {
        currentActive += 1;
        if (currentActive > maxActiveObserved) {
          maxActiveObserved = currentActive;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
        currentActive -= 1;
        return adapter.execute({ ...request, fixtureMode: true });
      },
    };

    const boundedService = new AnimationJobService({
      repository: repo,
      adapter: trackingAdapter,
      outputBaseDir: path.join(tempStorageRoot, "output"),
      maxConcurrency: 2,
    });

    // Plan 4 jobs
    const plan = planStyleAnimation(baseMascotProfile, "core");
    plan.planned_jobs = plan.planned_jobs.slice(0, 4);
    await persistStylePlan(repo, plan);

    const result = await boundedService.runBatch(baseMascotProfile, plan.batch_id, {
      fixtureMode: true,
    });

    expect(result.jobs).toHaveLength(4);
    expect(result.batch.status).toBe("completed");
    expect(result.batch.completed_jobs).toBe(4);
    expect(maxActiveObserved).toBeLessThanOrEqual(2);
  });

  it("supports job cancellation cleanly triggering abort", async () => {
    await seedMascot(baseMascotProfile);

    // Adapter that stays alive until aborted
    const slowAdapter: SpriteGenAdapter = {
      async execute(request) {
        return new Promise<never>((_, reject) => {
          if (request.signal?.aborted) {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
            return;
          }
          request.signal?.addEventListener("abort", () => {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      },
    };

    const cancellableService = new AnimationJobService({
      repository: repo,
      adapter: slowAdapter,
      outputBaseDir: path.join(tempStorageRoot, "output"),
      maxConcurrency: 2,
    });

    const plan = planStyleAnimation(baseMascotProfile, "core");
    const job = plan.planned_jobs[0];
    await repo.saveJob(job);

    const runPromise = cancellableService.runJob(baseMascotProfile, job);

    // Wait until the job has registered an active controller and created attempt 1
    await vi.waitFor(
      async () => {
        expect(cancellableService.getActiveControllerCount()).toBe(1);
        const j = await repo.getJob(baseMascotProfile.id, job.id);
        expect(j?.attempts?.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 5000, interval: 20 },
    );

    // Trigger cancellation
    const cancelledJob = await cancellableService.cancelJob(baseMascotProfile.id, job.id);
    expect(cancelledJob.status).toBe("cancelled");

    const finishedJob = await runPromise;
    expect(finishedJob.status).toBe("cancelled");
    expect(cancellableService.getActiveControllerCount()).toBe(0);
  });

  it("retries a failed job by incrementing attempt and re-running", async () => {
    await seedMascot(baseMascotProfile);

    const plan = planStyleAnimation(baseMascotProfile, "core");
    const job = plan.planned_jobs[0];
    await repo.saveJob(job);

    // Simulate an initial attempt that failed
    await repo.recordAttemptStart(baseMascotProfile.id, job.id, job.fingerprint);
    await repo.updateAttempt(baseMascotProfile.id, job.id, 1, {
      status: "error",
      completed_at: new Date().toISOString(),
      error_message: "Simulated synthesis error",
    });

    const failedJob = await repo.getJob(baseMascotProfile.id, job.id);
    expect(failedJob?.status).toBe("error");
    expect(failedJob?.attempts).toHaveLength(1);

    // Trigger retry
    const retriedJob = await jobService.retryJob(baseMascotProfile.id, job.id, baseMascotProfile, { fixtureMode: true });

    expect(retriedJob.status).toBe("ready");
    expect(retriedJob.attempts).toHaveLength(2);
    expect(retriedJob.attempts[0].attempt_number).toBe(1);
    expect(retriedJob.attempts[0].status).toBe("error");
    expect(retriedJob.attempts[1].attempt_number).toBe(2);
    expect(retriedJob.attempts[1].status).toBe("ready");
  });

  it("suppresses race conditions across concurrent execution calls on same slot", async () => {
    await seedMascot(baseMascotProfile);

    const plan = planStyleAnimation(baseMascotProfile, "core");
    const job = plan.planned_jobs[0];
    await repo.saveJob(job);

    let executionCount = 0;
    const countingAdapter: SpriteGenAdapter = {
      async execute(request) {
        executionCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 40));
        return adapter.execute({ ...request, fixtureMode: true });
      },
    };

    const lockedService = new AnimationJobService({
      repository: repo,
      adapter: countingAdapter,
      outputBaseDir: path.join(tempStorageRoot, "output"),
      maxConcurrency: 2,
    });

    // Fire two concurrent runs on the exact same job/slot
    const [res1, res2] = await Promise.all([
      lockedService.runJob(baseMascotProfile, job, { fixtureMode: true }),
      lockedService.runJob(baseMascotProfile, job, { fixtureMode: true }),
    ]);

    expect(res1.status).toBe("ready");
    expect(res2.status).toBe("ready");
    expect(executionCount).toBe(2);

    // Verify slot lock serialized the operations cleanly without corruption
    const finalJob = await repo.getJob(baseMascotProfile.id, job.id);
    expect(finalJob?.status).toBe("ready");
  });
});

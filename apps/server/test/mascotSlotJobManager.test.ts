import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig, MascotProfile } from "@studio/shared";
import { buildApp } from "../src/app.js";
import {
  MascotSlotJobManager,
  MascotSlotJobRepository,
  createMascotSlotJobManager,
  createMascotSlotJobRepository,
} from "../src/quiz/mascot/slotJobs/index.js";

const testImageConfig: AppConfig["image_generation"] = {
  enabled: false,
  provider: "shopaikey",
  model: "gpt-image-2",
  api_key: "",
};

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Mascot Slot Job Repository & Concurrency Manager", () => {
  describe("Batch Creation and Persistence", () => {
    it("creates, persists, and retrieves batch state across repository operations", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-repo-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Cyber Lynx",
        description: "A neon robotic lynx",
        visual_style: "pixar_3d",
      });

      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Neon Striker",
        keyword: "neon visor glowing cyber blades",
      });

      const jobRepo = createMascotSlotJobRepository(app.repository);
      const manager = createMascotSlotJobManager({
        repository: app.repository,
        jobRepository: jobRepo,
        imageConfig: testImageConfig,
      });

      // 1. Start a new batch
      const batch = await manager.startBatch(mascot.id, {
        style_id: style.id,
        mode: "batch_empty",
        slots: [
          { state: "thinking", slot_index: 1, prompt_modifier: "analyzing network" },
          { state: "thinking", slot_index: 2, prompt_modifier: "decoding cipher" },
          { state: "celebrate", slot_index: 1, prompt_modifier: "victory pose" },
        ],
      });

      expect(batch.id).toMatch(/^batch_/);
      expect(batch.mascot_id).toBe(mascot.id);
      expect(batch.style_id).toBe(style.id);
      expect(batch.total_slots).toBe(3);
      expect(batch.items.length).toBe(3);

      // 2. Query batch directly from disk via jobRepository
      const persistedBatch = await jobRepo.getBatch(mascot.id, batch.id);
      expect(persistedBatch).toBeTruthy();
      expect(persistedBatch?.id).toBe(batch.id);
      expect(persistedBatch?.total_slots).toBe(3);

      // 3. Query active batch for the style
      const activeBatch = await manager.getActiveBatch(mascot.id, style.id);
      expect(activeBatch).toBeTruthy();
      expect(activeBatch?.id).toBe(batch.id);

      // 4. Query status response contract
      const statusResponse = await manager.getBatchStatus(mascot.id, style.id);
      expect(statusResponse.active_batch?.id).toBe(batch.id);
      expect(statusResponse.recent_batches).toBeDefined();

      // Wait for batch completion
      const completedBatch = await manager.waitForBatch(mascot.id, batch.id, 10000);
      expect(completedBatch.status).toBe("completed");
      expect(completedBatch.completed_count).toBe(3);
      expect(completedBatch.failed_count).toBe(0);

      // 5. Query recent batches sorted newest first
      const recentBatches = await jobRepo.getRecentBatches(mascot.id, style.id, 5);
      expect(recentBatches.length).toBeGreaterThanOrEqual(1);
      expect(recentBatches[0].id).toBe(batch.id);

      manager.destroy();
    });
  });

  describe("Bounded Concurrency Limiting", () => {
    it("enforces max concurrent workers (default 3) across slot generations", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-concurrency-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Echo Bat",
        description: "A radar bat mascot",
        visual_style: "flat_vector",
      });

      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Sonar Pilot",
        keyword: "flight helmet goggles headset",
      });

      const jobRepo = new MascotSlotJobRepository(app.repository);

      let currentActiveWorkers = 0;
      let maxObservedActiveWorkers = 0;

      // Mock slot generator that simulates async work and records concurrency peak
      const mockSlotGenerator = async (
        _repo: unknown,
        _mascot: MascotProfile,
        _styleId: string,
        input: { state: "thinking" | "celebrate"; slot_index: number },
      ) => {
        currentActiveWorkers++;
        maxObservedActiveWorkers = Math.max(maxObservedActiveWorkers, currentActiveWorkers);
        // Simulate generation latency - wait to ensure active workers overlap
        const startTime = Date.now();
        while (currentActiveWorkers < 3 && Date.now() - startTime < 300) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
        currentActiveWorkers--;

        return {
          mascot: mascot,
          slot: {
            slot_index: input.slot_index,
            image_url: `/api/mascots/assets/slot_${input.slot_index}.png`,
            transparent_image_url: `/api/mascots/assets/slot_${input.slot_index}.png`,
          },
          prompt_used: `Generated prompt for ${input.state} slot ${input.slot_index}`,
          placeholder: false,
        };
      };

      const manager = new MascotSlotJobManager({
        repository: app.repository,
        jobRepository: jobRepo,
        concurrency: 3,
        slotGenerator: mockSlotGenerator,
      });

      // Queue 8 slots simultaneously
      const batch = await manager.startBatch(mascot.id, {
        style_id: style.id,
        mode: "batch_empty",
        slots: Array.from({ length: 8 }, (_, i) => ({
          state: "thinking" as const,
          slot_index: i + 1,
        })),
      });

      const finished = await manager.waitForBatch(mascot.id, batch.id, 10000);

      expect(finished.status).toBe("completed");
      expect(finished.completed_count).toBe(8);
      expect(maxObservedActiveWorkers).toBe(3);
      expect(currentActiveWorkers).toBe(0);

      manager.destroy();
    });
  });

  describe("Success Path: Mascot Slot Updating and Batch Completion", () => {
    it("completes all jobs in a batch, updating slot metadata and batch records", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-success-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Blaze Hound",
        description: "A fire hound mascot",
        visual_style: "pixar_3d",
      });

      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Firefighter",
        keyword: "firefighter jacket yellow helmet axe",
      });

      const jobRepo = new MascotSlotJobRepository(app.repository);
      const manager = new MascotSlotJobManager({
        repository: app.repository,
        jobRepository: jobRepo,
        imageConfig: testImageConfig,
      });

      const startedEvents: string[] = [];
      const completedEvents: string[] = [];

      manager.on("job:started", (job) => startedEvents.push(job.id));
      manager.on("job:completed", (job) => completedEvents.push(job.id));

      const batch = await manager.startBatch(mascot.id, {
        style_id: style.id,
        mode: "batch_empty",
        slots: [
          { state: "thinking", slot_index: 1, prompt_modifier: "inspecting fire hydrant" },
          { state: "celebrate", slot_index: 2, prompt_modifier: "spraying confetti hose" },
        ],
      });

      const finalBatch = await manager.waitForBatch(mascot.id, batch.id, 10000);

      expect(finalBatch.status).toBe("completed");
      expect(finalBatch.completed_count).toBe(2);
      expect(finalBatch.failed_count).toBe(0);
      expect(finalBatch.active_slot_keys).toEqual([]);
      expect(startedEvents.length).toBe(2);
      expect(completedEvents.length).toBe(2);

      for (const item of finalBatch.items) {
        expect(item.status).toBe("completed");
        expect(item.completed_at).toBeTruthy();
        expect(item.prompt_used).toBeTruthy();
      }

      // Verify mascot slots were updated in repository
      const updatedMascot = await app.repository.getMascot(mascot.id);
      const updatedStyle = updatedMascot.styles?.find((s) => s.id === style.id);
      expect(updatedStyle?.states.thinking.find((s) => s.slot_index === 1)?.image_url).toBeTruthy();
      expect(updatedStyle?.states.celebrate.find((s) => s.slot_index === 2)?.image_url).toBeTruthy();

      manager.destroy();
    });
  });

  describe("Error Handling: Slot Failure and Counter Increment", () => {
    it("handles worker failure by marking slot failed and updating failed_count while allowing remaining slots to finish", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-errors-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Glitch Robot",
        description: "A quirky glitchy robot",
        visual_style: "flat_vector",
      });

      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Circuit Master",
        keyword: "circuit boards wires LED indicators",
      });

      const jobRepo = new MascotSlotJobRepository(app.repository);

      // Slot 2 will fail; slots 1 and 3 will succeed
      const mockSlotGenerator = async (
        _repo: unknown,
        _mascot: MascotProfile,
        _styleId: string,
        input: { state: "thinking" | "celebrate"; slot_index: number },
      ) => {
        if (input.slot_index === 2) {
          throw new Error("Provider rate limit reached (simulated 429)");
        }
        return {
          mascot: mascot,
          slot: {
            slot_index: input.slot_index,
            image_url: `/api/mascots/assets/slot_${input.slot_index}.png`,
            transparent_image_url: `/api/mascots/assets/slot_${input.slot_index}.png`,
          },
          prompt_used: `Generated prompt for ${input.state} slot ${input.slot_index}`,
          placeholder: false,
        };
      };

      const manager = new MascotSlotJobManager({
        repository: app.repository,
        jobRepository: jobRepo,
        slotGenerator: mockSlotGenerator,
      });

      const failedEvents: Array<{ jobId: string; error: string }> = [];
      manager.on("job:failed", (job, error) => {
        failedEvents.push({ jobId: job.id, error });
      });

      const batch = await manager.startBatch(mascot.id, {
        style_id: style.id,
        mode: "batch_empty",
        slots: [
          { state: "thinking", slot_index: 1 },
          { state: "thinking", slot_index: 2 },
          { state: "thinking", slot_index: 3 },
        ],
      });

      const finishedBatch = await manager.waitForBatch(mascot.id, batch.id, 10000);

      expect(finishedBatch.total_slots).toBe(3);
      expect(finishedBatch.completed_count).toBe(2);
      expect(finishedBatch.failed_count).toBe(1);
      expect(finishedBatch.status).toBe("completed");

      const failedJob = finishedBatch.items.find((i) => i.slot_index === 2);
      expect(failedJob?.status).toBe("failed");
      expect(failedJob?.error).toContain("Provider rate limit reached");
      expect(failedJob?.completed_at).toBeTruthy();

      expect(failedEvents.length).toBe(1);
      expect(failedEvents[0].error).toContain("Provider rate limit reached");

      manager.destroy();
    });
  });

  describe("Cancellation: Graceful Abort and Queue Cleanup", () => {
    it("keeps cancelled slots cancelled when an in-flight generator returns success late", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-cancellation-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Shadow Panther",
        description: "A stealth panther mascot",
        visual_style: "pixar_3d",
      });

      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Night Ops",
        keyword: "tactical vest night vision goggles",
      });

      const jobRepo = new MascotSlotJobRepository(app.repository);

      let markGeneratorStarted!: () => void;
      const generatorStarted = new Promise<void>((resolve) => {
        markGeneratorStarted = resolve;
      });
      let releaseGenerator!: () => void;
      const generatorGate = new Promise<void>((resolve) => {
        releaseGenerator = resolve;
      });

      const mockSlotGenerator = async (
        _repo: unknown,
        _mascot: MascotProfile,
        _styleId: string,
        _input: unknown,
        _imageConfig: unknown,
        _logger: unknown,
        _options?: { signal?: AbortSignal },
      ) => {
        markGeneratorStarted();
        await generatorGate;

        return {
          mascot: mascot,
          slot: {
            slot_index: 1,
            image_url: "/api/mascots/assets/slot_1.png",
            transparent_image_url: "/api/mascots/assets/slot_1.png",
          },
          prompt_used: "Prompt",
          placeholder: false,
        };
      };

      const manager = new MascotSlotJobManager({
        repository: app.repository,
        jobRepository: jobRepo,
        concurrency: 1,
        slotGenerator: mockSlotGenerator,
      });

      const batch = await manager.startBatch(mascot.id, {
        style_id: style.id,
        mode: "batch_empty",
        slots: [
          { state: "thinking", slot_index: 1 },
          { state: "thinking", slot_index: 2 },
          { state: "thinking", slot_index: 3 },
        ],
      });
      await generatorStarted;

      // Cancel the batch
      const cancelledBatch = await manager.cancelBatch(mascot.id, {
        style_id: style.id,
        batch_id: batch.id,
        reason: "User cancelled generation",
      });

      expect(cancelledBatch).toBeTruthy();
      expect(cancelledBatch?.status).toBe("cancelled");
      expect(cancelledBatch?.active_slot_keys).toEqual([]);

      // Verify all items are cancelled
      for (const item of cancelledBatch?.items || []) {
        expect(item.status).toBe("cancelled");
        expect(item.completed_at).toBeTruthy();
      }

      // Verify getActiveBatch returns null
      const active = await manager.getActiveBatch(mascot.id, style.id);
      expect(active).toBeNull();

      releaseGenerator();
      await vi.waitFor(() => expect(manager.getActiveSlotGenerationsCount()).toBe(0));

      const persisted = await jobRepo.getBatch(mascot.id, batch.id);
      expect(persisted?.status).toBe("cancelled");
      expect(persisted?.completed_count).toBe(0);
      for (const item of persisted?.items || []) {
        expect(item.status).toBe("cancelled");
      }

      manager.destroy();
    });
  });

  describe("Crash Recovery: Stale In-Progress Jobs Reconciliation", () => {
    it("reconciles stale in-progress batches from server crash, marking stuck jobs as failed", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-crash-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Phoenix",
        description: "A legendary fiery phoenix",
        visual_style: "pixar_3d",
      });

      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Solar Flare",
        keyword: "solar corona golden plumes",
      });

      const jobRepo = new MascotSlotJobRepository(app.repository);

      // Simulate a crashed server state written directly to disk
      const crashBatch = {
        id: "batch_crash_1",
        mascot_id: mascot.id,
        style_id: style.id,
        status: "processing" as const,
        total_slots: 3,
        completed_count: 1,
        failed_count: 0,
        active_slot_keys: ["thinking_2"],
        items: [
          {
            id: "job_1",
            mascot_id: mascot.id,
            style_id: style.id,
            state: "thinking" as const,
            slot_index: 1,
            status: "completed" as const,
            created_at: "2026-09-17T20:00:00.000Z",
            completed_at: "2026-09-17T20:00:05.000Z",
          },
          {
            id: "job_2",
            mascot_id: mascot.id,
            style_id: style.id,
            state: "thinking" as const,
            slot_index: 2,
            status: "generating" as const, // Stuck in-flight when server crashed!
            created_at: "2026-09-17T20:00:00.000Z",
            started_at: "2026-09-17T20:00:06.000Z",
          },
          {
            id: "job_3",
            mascot_id: mascot.id,
            style_id: style.id,
            state: "thinking" as const,
            slot_index: 3,
            status: "queued" as const, // Queued when server crashed
            created_at: "2026-09-17T20:00:00.000Z",
          },
        ],
        created_at: "2026-09-17T20:00:00.000Z",
        updated_at: "2026-09-17T20:00:06.000Z",
      };

      await jobRepo.createBatch(crashBatch);

      // Verify it's currently stored as active
      const beforeReconcile = await jobRepo.getActiveBatch(mascot.id, style.id);
      expect(beforeReconcile?.status).toBe("processing");

      // Initialize a new manager instance (simulating server startup)
      const newManager = new MascotSlotJobManager({
        repository: app.repository,
        jobRepository: jobRepo,
      });

      const reconciledCount = await newManager.reconcileStaleJobs(mascot.id);
      expect(reconciledCount).toBe(1);

      // Verify the batch was settled and is no longer active
      const afterReconcileActive = await newManager.getActiveBatch(mascot.id, style.id);
      expect(afterReconcileActive).toBeNull();

      const recoveredBatch = await jobRepo.getBatch(mascot.id, "batch_crash_1");
      expect(recoveredBatch).toBeTruthy();
      expect(recoveredBatch?.active_slot_keys).toEqual([]);
      expect(recoveredBatch?.completed_count).toBe(1);
      expect(recoveredBatch?.failed_count).toBe(1);

      const stuckJob = recoveredBatch?.items.find((i) => i.id === "job_2");
      expect(stuckJob?.status).toBe("failed");
      expect(stuckJob?.error).toContain("Job interrupted by server restart");
      expect(stuckJob?.completed_at).toBeTruthy();

      const queuedJob = recoveredBatch?.items.find((i) => i.id === "job_3");
      expect(queuedJob?.status).toBe("cancelled");
      expect(queuedJob?.error).toContain("Cancelled due to server restart");

      newManager.destroy();
    });
  });

  describe("Idempotency and Slot Mutex", () => {
    it("prevents starting two batches concurrently on the same style", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-mutex-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Titan Golem",
        description: "A stone golem mascot",
        visual_style: "pixar_3d",
      });

      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Runic Knight",
        keyword: "runic stone glowing runes",
      });

      const jobRepo = new MascotSlotJobRepository(app.repository);

      const mockSlotGenerator = async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return {
          mascot: mascot,
          slot: {
            slot_index: 1,
            image_url: "/api/mascots/assets/slot_1.png",
            transparent_image_url: "/api/mascots/assets/slot_1.png",
          },
          prompt_used: "Prompt",
          placeholder: false,
        };
      };

      const manager = new MascotSlotJobManager({
        repository: app.repository,
        jobRepository: jobRepo,
        slotGenerator: mockSlotGenerator,
      });

      // Start first batch
      const firstBatch = await manager.startBatch(mascot.id, {
        style_id: style.id,
        mode: "batch_empty",
        slots: [{ state: "thinking", slot_index: 1 }],
      });
      expect(firstBatch).toBeTruthy();

      // Starting a second batch for the same style while the first is active should append slots
      const secondBatch = await manager.startBatch(mascot.id, {
        style_id: style.id,
        mode: "batch_empty",
        slots: [{ state: "thinking", slot_index: 2 }],
      });
      expect(secondBatch.id).toBe(firstBatch.id);
      expect(secondBatch.total_slots).toBe(2);
      expect(secondBatch.items).toHaveLength(2);

      await manager.waitForBatch(mascot.id, firstBatch.id);
      manager.destroy();
    });

    it("serializes execution when a batch contains duplicate slot targets", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-dup-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Prism Falcon",
        description: "A crystal falcon",
        visual_style: "flat_vector",
      });

      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Crystal Armor",
        keyword: "crystal wings glowing feathers",
      });

      const jobRepo = new MascotSlotJobRepository(app.repository);

      let activeGenerationsForSlot1 = 0;
      let maxConcurrentForSlot1 = 0;

      const mockSlotGenerator = async (_repo: unknown, _mascot: MascotProfile, _styleId: string, input: { slot_index: number }) => {
        if (input.slot_index === 1) {
          activeGenerationsForSlot1++;
          maxConcurrentForSlot1 = Math.max(maxConcurrentForSlot1, activeGenerationsForSlot1);
          await new Promise((resolve) => setTimeout(resolve, 80));
          activeGenerationsForSlot1--;
        }
        return {
          mascot: mascot,
          slot: {
            slot_index: input.slot_index,
            image_url: `/api/mascots/assets/slot_${input.slot_index}.png`,
            transparent_image_url: `/api/mascots/assets/slot_${input.slot_index}.png`,
          },
          prompt_used: "Prompt",
          placeholder: false,
        };
      };

      const manager = new MascotSlotJobManager({
        repository: app.repository,
        jobRepository: jobRepo,
        concurrency: 3,
        slotGenerator: mockSlotGenerator,
      });

      // Pass two duplicate targets for slot 1
      const batch = await manager.startBatch(mascot.id, {
        style_id: style.id,
        mode: "batch_empty",
        slots: [
          { state: "thinking", slot_index: 1, prompt_modifier: "run 1" },
          { state: "thinking", slot_index: 1, prompt_modifier: "run 2" },
        ],
      });

      const finished = await manager.waitForBatch(mascot.id, batch.id, 10000);
      expect(finished.status).toBe("completed");
      expect(finished.completed_count).toBe(2);
      // Max concurrent generations for slot 1 must NEVER exceed 1
      expect(maxConcurrentForSlot1).toBe(1);

      manager.destroy();
    });

    it("handles empty batch creation gracefully by completing immediately", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-empty-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Empty Otter",
        description: "An otter",
      });

      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Otter Style",
        keyword: "otter vest",
      });

      const jobRepo = new MascotSlotJobRepository(app.repository);
      const manager = new MascotSlotJobManager({
        repository: app.repository,
        jobRepository: jobRepo,
      });

      let completedEmitted = false;
      manager.on("batch:completed", () => {
        completedEmitted = true;
      });

      const batch = await manager.startBatch(mascot.id, {
        style_id: style.id,
        mode: "batch_empty",
        slots: [],
      });

      expect(batch.status).toBe("completed");
      expect(batch.total_slots).toBe(0);
      expect(batch.completed_count).toBe(0);
      expect(completedEmitted).toBe(true);

      manager.destroy();
    });

    it("allows queuing a subsequent batch once the previous batch has completed", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-seq-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Solar Dragon",
        description: "A dragon",
      });

      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Dragon Scale",
        keyword: "scale armor",
      });

      const jobRepo = new MascotSlotJobRepository(app.repository);
      const manager = new MascotSlotJobManager({
        repository: app.repository,
        jobRepository: jobRepo,
      });

      // First batch
      const batch1 = await manager.startBatch(mascot.id, {
        style_id: style.id,
        mode: "batch_empty",
        slots: [{ state: "thinking", slot_index: 1 }],
      });
      await manager.waitForBatch(mascot.id, batch1.id);

      // Second batch on the same style now succeeds
      const batch2 = await manager.startBatch(mascot.id, {
        style_id: style.id,
        mode: "batch_empty",
        slots: [{ state: "celebrate", slot_index: 1 }],
      });
      const finished2 = await manager.waitForBatch(mascot.id, batch2.id);

      expect(finished2.status).toBe("completed");

      const recent = await jobRepo.getRecentBatches(mascot.id, style.id, 10);
      expect(recent.length).toBe(2);

      manager.destroy();
    });
  });
});

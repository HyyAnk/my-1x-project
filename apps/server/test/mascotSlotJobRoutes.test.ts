import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { MascotProfile, MascotSlotBatchJob, SlotBatchStatusResponse } from "@studio/shared";
import { buildApp } from "../src/app.js";
import { createMascotSlotJobManager, createMascotSlotJobRepository } from "../src/quiz/mascot/slotJobs/index.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })));
});

async function setupTestApp(customSlotGenerator?: Parameters<typeof createMascotSlotJobManager>[0]["slotGenerator"]) {
  const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-routes-test-"));
  roots.push(root);

  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");

  let app = await buildApp(root);

  // If a custom slot generator is provided, replace mascotSlotJobManager with configured one
  if (customSlotGenerator) {
    const jobRepo = createMascotSlotJobRepository(app.repository);
    const customManager = createMascotSlotJobManager({
      repository: app.repository,
      jobRepository: jobRepo,
      slotGenerator: customSlotGenerator,
    });
    await app.close();
    roots.pop(); // Remove previous root from cleanup list so it doesn't double-clean
    roots.push(root);
    app = await buildApp(root, { mascotSlotJobManager: customManager });
  }

  // Create test mascot
  const mascotRes = await app.server.inject({
    method: "POST",
    url: "/api/mascots",
    payload: {
      name: "Quantum Fox",
      description: "An energetic robotic quantum fox",
      visual_style: "pixar_3d",
      master_prompt: "High-tech energetic fox with cyan neon aura",
    },
  });
  expect(mascotRes.statusCode).toBe(201);
  const mascot = mascotRes.json<{ mascot: MascotProfile }>().mascot;

  // Create test style
  const styleRes = await app.server.inject({
    method: "POST",
    url: `/api/mascots/${mascot.id}/styles`,
    payload: {
      name: "Cyber Neon",
      keyword: "cyan cyber armor with glowing tail",
    },
  });
  expect(styleRes.statusCode).toBe(201);
  const style = styleRes.json<{ style: { id: string; name: string } }>().style;

  return { app, root, mascot, style };
}

describe("Mascot Slot Job Routes Integration (Phase 3)", () => {
  describe("POST /api/mascots/:mascotId/styles/:styleId/jobs/queue", () => {
    it("queues a single slot generation job and returns 202 Accepted", async () => {
      const { app, mascot, style } = await setupTestApp();

      const response = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/queue`,
        payload: {
          mode: "single",
          slots: [
            {
              state: "thinking",
              slot_index: 1,
              prompt_modifier: "contemplating puzzle",
            },
          ],
        },
      });

      expect(response.statusCode).toBe(202);
      const batch = response.json<MascotSlotBatchJob>();
      expect(batch.id).toMatch(/^batch_/);
      expect(batch.mascot_id).toBe(mascot.id);
      expect(batch.style_id).toBe(style.id);
      expect(batch.total_slots).toBe(1);
      expect(batch.items).toHaveLength(1);
      expect(batch.items[0].state).toBe("thinking");
      expect(batch.items[0].slot_index).toBe(1);
      expect(batch.items[0].prompt_modifier).toBe("contemplating puzzle");

      // Wait for background job to finish cleanly
      await app.mascotSlotJobManager.waitForBatch(mascot.id, batch.id, 10000);
      await app.close();
    });

    it("queues a multi-select batch job and processes all slots asynchronously", async () => {
      const { app, mascot, style } = await setupTestApp();

      const response = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/queue`,
        payload: {
          mode: "regenerate_selected",
          slots: [
            { state: "thinking", slot_index: 1, prompt_modifier: "pondering" },
            { state: "thinking", slot_index: 2, prompt_modifier: "calculating" },
            { state: "celebrate", slot_index: 1, prompt_modifier: "cheering" },
          ],
        },
      });

      expect(response.statusCode).toBe(202);
      const batch = response.json<MascotSlotBatchJob>();
      expect(batch.total_slots).toBe(3);
      expect(batch.items).toHaveLength(3);

      const completed = await app.mascotSlotJobManager.waitForBatch(mascot.id, batch.id, 15000);
      expect(completed.status).toBe("completed");
      expect(completed.completed_count).toBe(3);
      expect(completed.failed_count).toBe(0);

      await app.close();
    });

    it("handles empty batch gracefully without errors", async () => {
      const { app, mascot, style } = await setupTestApp();

      const response = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/queue`,
        payload: {
          mode: "batch_empty",
          slots: [],
        },
      });

      expect(response.statusCode).toBe(202);
      const batch = response.json<MascotSlotBatchJob>();
      expect(batch.total_slots).toBe(0);
      expect(batch.status).toBe("completed");

      await app.close();
    });
  });

  describe("GET /api/mascots/:mascotId/styles/:styleId/jobs/status", () => {
    it("returns initial empty status before any batch has run", async () => {
      const { app, mascot, style } = await setupTestApp();

      const response = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/status`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<SlotBatchStatusResponse>();
      expect(body.active_batch).toBeNull();
      expect(body.queued_slot_keys).toEqual([]);
      expect(body.active_slot_keys).toEqual([]);
      expect(body.recent_batches).toEqual([]);

      await app.close();
    });

    it("accurately tracks in-flight generation progress and completed history", async () => {
      let releaseSlotGeneration: () => void = () => {};
      const slotGate = new Promise<void>((resolve) => {
        releaseSlotGeneration = resolve;
      });

      // Custom slot generator held until released
      const { app, mascot, style } = await setupTestApp(async (repo, mascotProfile, styleId, input) => {
        await slotGate;
        return {
          mascot: mascotProfile,
          slot: {
            state: input.state,
            slot_index: input.slot_index,
            asset_path: "mascots/mock/slot.png",
            preview_url: "/api/mascots/mock/slot.png",
          },
          prompt_used: "mock-prompt",
          placeholder: true,
        };
      });

      // 1. Queue a batch
      const queueRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/queue`,
        payload: {
          mode: "single",
          slots: [{ state: "thinking", slot_index: 3 }],
        },
      });
      expect(queueRes.statusCode).toBe(202);
      const queuedBatch = queueRes.json<MascotSlotBatchJob>();

      // 2. Poll status while in flight
      const inFlightStatusRes = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/status`,
      });
      expect(inFlightStatusRes.statusCode).toBe(200);
      const inFlightStatus = inFlightStatusRes.json<SlotBatchStatusResponse>();
      expect(inFlightStatus.active_batch).not.toBeNull();
      expect(inFlightStatus.active_batch?.id).toBe(queuedBatch.id);
      // Slot key thinking_3 should be active or queued
      const allActiveOrQueued = [...inFlightStatus.active_slot_keys, ...inFlightStatus.queued_slot_keys];
      expect(allActiveOrQueued).toContain("thinking_3");

      // 3. Release worker and wait for batch completion
      releaseSlotGeneration();
      const completedBatch = await app.mascotSlotJobManager.waitForBatch(mascot.id, queuedBatch.id, 10000);
      expect(completedBatch.status).toBe("completed");

      // 4. Poll status after completion
      const completedStatusRes = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/status`,
      });
      expect(completedStatusRes.statusCode).toBe(200);
      const completedStatus = completedStatusRes.json<SlotBatchStatusResponse>();
      expect(completedStatus.active_batch).toBeNull();
      expect(completedStatus.active_slot_keys).toHaveLength(0);
      expect(completedStatus.queued_slot_keys).toHaveLength(0);
      expect(completedStatus.recent_batches).toBeDefined();
      expect(completedStatus.recent_batches?.length).toBeGreaterThanOrEqual(1);
      expect(completedStatus.recent_batches?.[0].id).toBe(queuedBatch.id);

      await app.close();
    });
  });

  describe("Batch Queue Appending", () => {
    it("appends slots to active batch when queuing while a batch is already in progress", async () => {
      let releaseSlotGeneration: () => void = () => {};
      const slotGate = new Promise<void>((resolve) => {
        releaseSlotGeneration = resolve;
      });

      const { app, mascot, style } = await setupTestApp(async (repo, mascotProfile, styleId, input) => {
        await slotGate;
        return {
          mascot: mascotProfile,
          slot: {
            state: input.state,
            slot_index: input.slot_index,
            asset_path: "mock.png",
            preview_url: "/mock.png",
          },
          prompt_used: "mock",
          placeholder: true,
        };
      });

      // 1. Queue first batch
      const firstRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/queue`,
        payload: {
          mode: "single",
          slots: [{ state: "celebrate", slot_index: 2 }],
        },
      });
      expect(firstRes.statusCode).toBe(202);
      const firstBatch = firstRes.json<MascotSlotBatchJob>();

      // 2. Queue second slot while first is still active -> should append to active batch
      const secondRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/queue`,
        payload: {
          mode: "single",
          slots: [{ state: "celebrate", slot_index: 3 }],
        },
      });

      expect(secondRes.statusCode).toBe(202);
      const secondBatch = secondRes.json<MascotSlotBatchJob>();
      expect(secondBatch.id).toBe(firstBatch.id);
      expect(secondBatch.total_slots).toBe(2);
      expect(secondBatch.items).toHaveLength(2);

      // 3. Clean up
      releaseSlotGeneration();
      await app.mascotSlotJobManager.waitForBatch(mascot.id, firstBatch.id, 10000);
      await app.close();
    });
  });

  describe("POST /api/mascots/:mascotId/styles/:styleId/jobs/cancel", () => {
    it("cancels an active in-flight batch and updates batch status", async () => {
      let releaseSlotGeneration: () => void = () => {};
      const slotGate = new Promise<void>((resolve) => {
        releaseSlotGeneration = resolve;
      });

      const { app, mascot, style } = await setupTestApp(async (repo, mascotProfile, styleId, input, imageConfig, logger, options) => {
        // Wait on slotGate, but if aborted, reject immediately
        await new Promise<void>((resolve, reject) => {
          if (options?.signal?.aborted) {
            reject(new Error("AbortError"));
            return;
          }
          options?.signal?.addEventListener("abort", () => reject(new Error("AbortError")));
          slotGate.then(resolve);
        });

        return {
          mascot: mascotProfile,
          slot: {
            state: input.state,
            slot_index: input.slot_index,
            asset_path: "mock.png",
            preview_url: "/mock.png",
          },
          prompt_used: "mock",
          placeholder: true,
        };
      });

      // 1. Queue batch
      const queueRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/queue`,
        payload: {
          mode: "regenerate_selected",
          slots: [
            { state: "thinking", slot_index: 1 },
            { state: "thinking", slot_index: 2 },
          ],
        },
      });
      expect(queueRes.statusCode).toBe(202);
      const _queuedBatch = queueRes.json<MascotSlotBatchJob>();

      // 2. Cancel batch
      const cancelRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/cancel`,
        payload: {
          reason: "User cancelled generation manually",
        },
      });

      expect(cancelRes.statusCode).toBe(200);
      const cancelBody = cancelRes.json<{ ok: boolean; batch: MascotSlotBatchJob }>();
      expect(cancelBody.ok).toBe(true);
      expect(cancelBody.batch.status).toBe("cancelled");

      releaseSlotGeneration();
      await app.close();
    });

    it("returns 404 when cancelling when no active batch exists", async () => {
      const { app, mascot, style } = await setupTestApp();

      const cancelRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/cancel`,
        payload: {},
      });

      expect(cancelRes.statusCode).toBe(404);
      const body = cancelRes.json<{ ok: boolean; error: string }>();
      expect(body.ok).toBe(false);
      expect(body.error).toContain("No active or matching batch found");

      await app.close();
    });
  });

  describe("Validation & Error Handling (400 & 404)", () => {
    it("returns 400 Bad Request when slot index is outside valid range (1..10)", async () => {
      const { app, mascot, style } = await setupTestApp();

      const res = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/queue`,
        payload: {
          mode: "single",
          slots: [{ state: "thinking", slot_index: 99 }],
        },
      });

      expect(res.statusCode).toBe(400);
      await app.close();
    });

    it("returns 400 Bad Request when slot state is invalid", async () => {
      const { app, mascot, style } = await setupTestApp();

      const res = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/queue`,
        payload: {
          mode: "single",
          slots: [{ state: "invalid_state", slot_index: 1 }],
        },
      });

      expect(res.statusCode).toBe(400);
      await app.close();
    });

    it("returns 400 Bad Request when queue mode is invalid", async () => {
      const { app, mascot, style } = await setupTestApp();

      const res = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/queue`,
        payload: {
          mode: "unsupported_mode",
          slots: [],
        },
      });

      expect(res.statusCode).toBe(400);
      await app.close();
    });

    it("returns 400 Bad Request when body style_id conflicts with path styleId", async () => {
      const { app, mascot, style } = await setupTestApp();

      const res = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/styles/${style.id}/jobs/queue`,
        payload: {
          style_id: "mismatched-style-id",
          mode: "single",
          slots: [{ state: "thinking", slot_index: 1 }],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json<{ error: string }>().error).toContain("does not match");

      await app.close();
    });

    it("returns 404 Not Found for non-existent mascot ID", async () => {
      const { app, style } = await setupTestApp();

      const res = await app.server.inject({
        method: "POST",
        url: `/api/mascots/non-existent-mascot/styles/${style.id}/jobs/queue`,
        payload: {
          mode: "single",
          slots: [{ state: "thinking", slot_index: 1 }],
        },
      });

      expect(res.statusCode).toBe(404);
      await app.close();
    });

    it("returns 404 Not Found for non-existent style ID", async () => {
      const { app, mascot } = await setupTestApp();

      const res = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascot.id}/styles/non-existent-style/jobs/status`,
      });

      expect(res.statusCode).toBe(404);
      await app.close();
    });
  });

  describe("Startup Job Reconciliation", () => {
    it("reconciles stale in-progress batches on server boot", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-stale-reconcile-"));
      roots.push(root);

      await mkdir(path.join(root, "templates"), { recursive: true });
      await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
      await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
      await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");

      // App 1: Create mascot, style, and save an uncompleted batch directly to disk
      const app1 = await buildApp(root);
      const mascotRes = await app1.server.inject({
        method: "POST",
        url: "/api/mascots",
        payload: {
          name: "Stale Falcon",
          description: "A metallic test falcon",
          visual_style: "pixar_3d",
        },
      });
      const mascot = mascotRes.json<{ mascot: MascotProfile }>().mascot;
      const styleId = mascot.styles[0].id;

      const jobRepo = createMascotSlotJobRepository(app1.repository);
      await jobRepo.createBatch({
        id: "batch_interrupted_123",
        mascot_id: mascot.id,
        style_id: styleId,
        status: "processing",
        total_slots: 2,
        completed_count: 0,
        failed_count: 0,
        active_slot_keys: ["thinking_1"],
        items: [
          {
            id: "slotjob_1",
            mascot_id: mascot.id,
            style_id: styleId,
            state: "thinking",
            slot_index: 1,
            status: "generating",
            created_at: new Date().toISOString(),
          },
          {
            id: "slotjob_2",
            mascot_id: mascot.id,
            style_id: styleId,
            state: "thinking",
            slot_index: 2,
            status: "queued",
            created_at: new Date().toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await app1.close();

      // App 2: Boot new instance pointing to same storage root
      const app2 = await buildApp(root);

      // Verify startup reconciliation marked stale jobs as failed
      const statusRes = await app2.server.inject({
        method: "GET",
        url: `/api/mascots/${mascot.id}/styles/${styleId}/jobs/status`,
      });
      expect(statusRes.statusCode).toBe(200);
      const statusBody = statusRes.json<SlotBatchStatusResponse>();
      // No active batch remains
      expect(statusBody.active_batch).toBeNull();
      // Interrupted batch is in recent batches marked failed
      const reconciled = statusBody.recent_batches?.find((b) => b.id === "batch_interrupted_123");
      expect(reconciled).toBeDefined();
      expect(reconciled?.status).toBe("failed");
      expect(reconciled?.items[0].status).toBe("failed");
      expect(reconciled?.items[0].error).toBe("Job interrupted by server restart");

      await app2.close();
    });
  });
});

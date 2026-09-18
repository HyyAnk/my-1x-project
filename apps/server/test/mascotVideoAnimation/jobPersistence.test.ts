import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  MascotAnimationRevisionSchema,
  MascotAttemptMetadataSchema,
  type AnimationState,
  type MascotAnimationRevision,
  type MascotAttemptMetadata,
  type MascotVideoProcessingJob,
} from "@studio/shared";
import {
  atomicWriteJson,
  createAnimationStorageAdapter,
  createVideoProcessingRepository,
  InvalidStateTransitionError,
  StaleCompletionError,
} from "../../src/quiz/mascot/videoAnimation/index.js";

describe("Stage 10 — Job Persistence, State Machine & Approved Revisions", () => {
  const testRoots: string[] = [];

  beforeEach(() => {
    // Fresh test context
  });

  afterEach(async () => {
    while (testRoots.length > 0) {
      const dir = testRoots.pop();
      if (dir) {
        try {
          await fs.rm(dir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  });

  async function createTestRoot(): Promise<string> {
    const root = path.join(os.tmpdir(), `stage10-persistence-test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
    await fs.mkdir(root, { recursive: true });
    testRoots.push(root);
    return root;
  }

  function createMockRevision(options: {
    id?: string;
    attempt: number;
    state?: AnimationState;
    slotIndex?: number;
    styleId?: string;
  }): MascotAnimationRevision {
    const { id = `rev_${options.attempt}`, attempt, state = "thinking", slotIndex = 1, styleId = "style_default" } = options;

    const _frames = Array.from({ length: 12 }, (_, i) => ({
      index: i,
      x: (i % 4) * 200,
      y: Math.floor(i / 4) * 200,
      width: 200,
      height: 200,
      duration_ms: 125 as const,
    }));

    return {
      id,
      attempt,
      created_at: new Date().toISOString(),
      version: 1,
      style_id: styleId,
      state,
      slot_index: slotIndex,
      source_video_url: `/mascots/m1/animations/${styleId}/${state}/slot_${slotIndex}/attempts/att_${attempt}/source.mp4`,
      atlas_url: `/mascots/m1/animations/${styleId}/${state}/slot_${slotIndex}/attempts/att_${attempt}/atlas.png`,
      manifest_url: `/mascots/m1/animations/${styleId}/${state}/slot_${slotIndex}/attempts/att_${attempt}/manifest.json`,
      frame_urls: Array.from({ length: 12 }, (_, i) => `/frame_${i + 1}.png`),
      frame_count: 12,
      source_fps: 24,
      playback_fps: 8,
      duration_ms: 1500,
      loop_mode: "loop",
      canvas: { width: 1280, height: 720 },
      content_bounds: { x: 100, y: 50, width: 800, height: 600 },
      pivot: { x: 500, y: 650 },
      registration: {
        source_width: 1280,
        source_height: 720,
        offset_x: 100,
        offset_y: 50,
        pivot: { x: 400, y: 600 },
        content_bounds: { x: 0, y: 0, width: 800, height: 600 },
      },
      source_fingerprint: `fp_source_${attempt}`,
      processing_fingerprint: `fp_proc_${attempt}`,
      status: "ready",
    };
  }

  describe("Atomic Write Reliability", () => {
    it("writes JSON atomically to destination file and cleans up temp files", async () => {
      const root = await createTestRoot();
      const targetFile = path.join(root, "nested", "sub", "test.json");
      const sampleData = { hello: "world", count: 42, active: true };

      await atomicWriteJson(targetFile, sampleData);

      const content = await fs.readFile(targetFile, "utf8");
      expect(JSON.parse(content)).toEqual(sampleData);

      // Verify no temporary files remain in the folder
      const dirFiles = await fs.readdir(path.dirname(targetFile));
      expect(dirFiles).toEqual(["test.json"]);
    });

    it("overwrites existing file atomically without corruption", async () => {
      const root = await createTestRoot();
      const targetFile = path.join(root, "config.json");

      await atomicWriteJson(targetFile, { version: 1 });
      await atomicWriteJson(targetFile, { version: 2, author: "antigravity" });

      const content = await fs.readFile(targetFile, "utf8");
      expect(JSON.parse(content)).toEqual({ version: 2, author: "antigravity" });
    });
  });

  describe("Stale Completion Defense", () => {
    it("rejects an older attempt completion when a newer attempt is already active", async () => {
      const root = await createTestRoot();
      const storageAdapter = createAnimationStorageAdapter(root);
      const repo = createVideoProcessingRepository(storageAdapter);

      const mascotId = "mascot_alpha";
      const styleId = "style_neo";
      const state: AnimationState = "thinking";
      const slotIndex = 1;

      // Save job for attempt 1
      const job1: MascotVideoProcessingJob = {
        id: "job_att_1",
        mascot_id: mascotId,
        style_id: styleId,
        state,
        slot_index: slotIndex,
        attempt: 1,
        source_video_url: "/source1.mp4",
        source_video_fingerprint: "fp1",
        status: "processing",
        progress: 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await repo.saveJob(job1);

      // Slot is now on attempt 1
      let projection = await repo.getSlotProjection(mascotId, styleId, state, slotIndex);
      expect(projection.active_attempt).toBe(1);

      // Now user starts attempt 2 (e.g. replaced video before attempt 1 completed)
      const job2: MascotVideoProcessingJob = {
        id: "job_att_2",
        mascot_id: mascotId,
        style_id: styleId,
        state,
        slot_index: slotIndex,
        attempt: 2,
        source_video_url: "/source2.mp4",
        source_video_fingerprint: "fp2",
        status: "processing",
        progress: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await repo.saveJob(job2);

      projection = await repo.getSlotProjection(mascotId, styleId, state, slotIndex);
      expect(projection.active_attempt).toBe(2);

      // Attempt 1 finishes late and tries to save its revision
      const revision1 = createMockRevision({ attempt: 1, state, slotIndex, styleId });
      await expect(repo.saveActiveRevision(mascotId, styleId, state, slotIndex, 1, revision1)).rejects.toThrow(StaleCompletionError);

      try {
        await repo.saveActiveRevision(mascotId, styleId, state, slotIndex, 1, revision1);
      } catch (err) {
        expect(err).toBeInstanceOf(StaleCompletionError);
        expect((err as StaleCompletionError).code).toBe("STALE_COMPLETION");
        expect((err as StaleCompletionError).incomingAttempt).toBe(1);
        expect((err as StaleCompletionError).currentAttempt).toBe(2);
      }

      // Projection remains on attempt 2
      const finalProjection = await repo.getSlotProjection(mascotId, styleId, state, slotIndex);
      expect(finalProjection.active_attempt).toBe(2);
      expect(finalProjection.active_revision_id).toBeUndefined();
    });

    it("ignores failed completion from a stale attempt without disturbing current attempt", async () => {
      const root = await createTestRoot();
      const storageAdapter = createAnimationStorageAdapter(root);
      const repo = createVideoProcessingRepository(storageAdapter);

      const mascotId = "mascot_alpha";
      const styleId = "style_neo";
      const state: AnimationState = "celebrate";
      const slotIndex = 2;

      // Slot is active on attempt 2
      await repo.saveJob({
        id: "job_att_2",
        mascot_id: mascotId,
        style_id: styleId,
        state,
        slot_index: slotIndex,
        attempt: 2,
        source_video_url: "/source2.mp4",
        source_video_fingerprint: "fp2",
        status: "processing",
        progress: 20,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Attempt 1 fails late
      const projection = await repo.recordAttemptFailure(mascotId, styleId, state, slotIndex, 1, {
        code: "STALE_ERROR",
        message: "Old attempt failed",
      });

      // Attempt 2 status and active_attempt are unharmed
      expect(projection.active_attempt).toBe(2);
      expect(projection.error_code).toBeUndefined();
    });
  });

  describe("Protecting Approved Revisions During Replacement", () => {
    it("preserves active revision during replacement and restores ready status if replacement attempt fails", async () => {
      const root = await createTestRoot();
      const storageAdapter = createAnimationStorageAdapter(root);
      const repo = createVideoProcessingRepository(storageAdapter);

      const mascotId = "mascot_alpha";
      const styleId = "style_retro";
      const state: AnimationState = "thinking";
      const slotIndex = 3;

      // 1. Initial attempt 1 succeeds and becomes ready
      const revision1 = createMockRevision({ id: "rev_ready_v1", attempt: 1, state, slotIndex, styleId });
      const readyProj = await repo.saveActiveRevision(mascotId, styleId, state, slotIndex, 1, revision1);
      expect(readyProj.status).toBe("ready");
      expect(readyProj.active_revision_id).toBe("rev_ready_v1");
      expect(readyProj.active_revision).toBeDefined();

      // 2. User starts replacement: ready -> replacing -> processing
      const replacingProj = await repo.transitionSlotState(mascotId, styleId, state, slotIndex, "replacing");
      expect(replacingProj.status).toBe("replacing");
      // Approved revision MUST remain active and accessible during replacement!
      expect(replacingProj.active_revision_id).toBe("rev_ready_v1");
      expect(replacingProj.active_revision?.id).toBe("rev_ready_v1");

      const processingProj = await repo.transitionSlotState(mascotId, styleId, state, slotIndex, "processing", "job_att_2");
      expect(processingProj.status).toBe("processing");
      expect(processingProj.active_revision_id).toBe("rev_ready_v1");

      // Active revision query still serves revision 1 during replacement
      const activeRev = await repo.getActiveRevision(mascotId, styleId, state, slotIndex);
      expect(activeRev?.id).toBe("rev_ready_v1");

      // 3. Replacement attempt 2 fails (e.g. invalid video or matting failure)
      const failedProj = await repo.recordAttemptFailure(mascotId, styleId, state, slotIndex, 2, {
        code: "MATTING_FAILED",
        message: "Alpha channel extraction failed",
      });

      // Approved revision is PROTECTED: slot reverts to ready so production is never broken!
      expect(failedProj.status).toBe("ready");
      expect(failedProj.active_revision_id).toBe("rev_ready_v1");
      expect(failedProj.active_revision?.id).toBe("rev_ready_v1");
      expect(failedProj.error_code).toBe("MATTING_FAILED");

      // 4. Subsequent attempt 3 succeeds and smoothly replaces revision 1
      const revision3 = createMockRevision({ id: "rev_ready_v3", attempt: 3, state, slotIndex, styleId });
      const finalProj = await repo.saveActiveRevision(mascotId, styleId, state, slotIndex, 3, revision3);
      expect(finalProj.status).toBe("ready");
      expect(finalProj.active_revision_id).toBe("rev_ready_v3");
      expect(finalProj.active_revision?.id).toBe("rev_ready_v3");

      const updatedActiveRev = await repo.getActiveRevision(mascotId, styleId, state, slotIndex);
      expect(updatedActiveRev?.id).toBe("rev_ready_v3");
    });
  });

  describe("Immutable Revision Archiving & History", () => {
    it("archives each completed revision immutably and lists history in chronological order", async () => {
      const root = await createTestRoot();
      const storageAdapter = createAnimationStorageAdapter(root);
      const repo = createVideoProcessingRepository(storageAdapter);

      const mascotId = "mascot_alpha";
      const styleId = "style_classic";
      const state: AnimationState = "celebrate";
      const slotIndex = 1;

      // Save revision 1
      const rev1 = createMockRevision({ id: "rev_1", attempt: 1, state, slotIndex, styleId });
      await repo.saveActiveRevision(mascotId, styleId, state, slotIndex, 1, rev1);

      // Save revision 2
      const rev2 = createMockRevision({ id: "rev_2", attempt: 2, state, slotIndex, styleId });
      await repo.saveActiveRevision(mascotId, styleId, state, slotIndex, 2, rev2);

      // Save revision 3
      const rev3 = createMockRevision({ id: "rev_3", attempt: 3, state, slotIndex, styleId });
      await repo.saveActiveRevision(mascotId, styleId, state, slotIndex, 3, rev3);

      // Retrieve all revisions
      const revisions = await repo.listRevisions(mascotId, styleId, state, slotIndex);
      expect(revisions.length).toBe(3);
      expect(revisions.map((r) => r.attempt)).toEqual([1, 2, 3]);
      expect(revisions.map((r) => r.id)).toEqual(["rev_1", "rev_2", "rev_3"]);

      // Verify files exist in storage adapter revisions directory
      const revisionsDir = storageAdapter.getSlotRevisionsDir(mascotId, styleId, state, slotIndex);
      const files = await fs.readdir(revisionsDir);
      expect(files.sort()).toEqual(["rev_1.json", "rev_2.json", "rev_3.json"]);
    });
  });

  describe("Attempt Metadata Persistence", () => {
    it("persists and reloads attempt metadata in the attempt directory", async () => {
      const root = await createTestRoot();
      const storageAdapter = createAnimationStorageAdapter(root);
      const repo = createVideoProcessingRepository(storageAdapter);

      const metadata: MascotAttemptMetadata = {
        job_id: "job_meta_test",
        mascot_id: "mascot_meta",
        style_id: "style_meta",
        state: "thinking",
        slot_index: 4,
        attempt: 1,
        source_video_url: "/meta/source.mp4",
        source_video_fingerprint: "fp_source_meta",
        processing_fingerprint: "fp_proc_meta",
        status: "ready",
        progress: 100,
        error_code: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        manifest_url: "/meta/manifest.json",
        atlas_url: "/meta/atlas.png",
      };

      await repo.saveAttemptMetadata(metadata);

      const loaded = await repo.getAttemptMetadata(
        metadata.mascot_id,
        metadata.style_id,
        metadata.state,
        metadata.slot_index,
        metadata.attempt,
      );

      expect(loaded).not.toBeNull();
      expect(loaded?.job_id).toBe("job_meta_test");
      expect(loaded?.source_video_fingerprint).toBe("fp_source_meta");
      expect(loaded?.status).toBe("ready");
      expect(loaded?.progress).toBe(100);

      // Validates schema compliance
      expect(() => MascotAttemptMetadataSchema.parse(loaded)).not.toThrow();
    });

    it("returns null when attempt metadata file does not exist", async () => {
      const root = await createTestRoot();
      const storageAdapter = createAnimationStorageAdapter(root);
      const repo = createVideoProcessingRepository(storageAdapter);

      const loaded = await repo.getAttemptMetadata("m", "s", "thinking", 1, 999);
      expect(loaded).toBeNull();
    });
  });

  describe("Slot State Machine Transitions & Projections", () => {
    it("enforces allowed state machine transitions", async () => {
      const root = await createTestRoot();
      const storageAdapter = createAnimationStorageAdapter(root);
      const repo = createVideoProcessingRepository(storageAdapter);

      const mascotId = "mascot_sm";
      const styleId = "style_sm";
      const state: AnimationState = "thinking";
      const slotIndex = 5;

      // Initial state is empty
      let proj = await repo.getSlotProjection(mascotId, styleId, state, slotIndex);
      expect(proj.status).toBe("empty");

      // empty -> uploading (allowed)
      proj = await repo.transitionSlotState(mascotId, styleId, state, slotIndex, "uploading");
      expect(proj.status).toBe("uploading");

      // uploading -> processing (allowed)
      proj = await repo.transitionSlotState(mascotId, styleId, state, slotIndex, "processing");
      expect(proj.status).toBe("processing");

      // processing -> empty (NOT allowed)
      await expect(repo.transitionSlotState(mascotId, styleId, state, slotIndex, "empty")).rejects.toThrow(InvalidStateTransitionError);
    });

    it("listSlotProjections returns all 20 slots with missing slots defaulted to empty", async () => {
      const root = await createTestRoot();
      const storageAdapter = createAnimationStorageAdapter(root);
      const repo = createVideoProcessingRepository(storageAdapter);

      const mascotId = "mascot_all_slots";
      const styleId = "style_all_slots";

      // Configure only slot 1 of thinking
      await repo.transitionSlotState(mascotId, styleId, "thinking", 1, "uploading");

      const allSlots = await repo.listSlotProjections(mascotId, styleId);
      expect(allSlots.length).toBe(20);

      const thinkingSlots = allSlots.filter((s) => s.state === "thinking");
      const celebrateSlots = allSlots.filter((s) => s.state === "celebrate");

      expect(thinkingSlots.length).toBe(10);
      expect(celebrateSlots.length).toBe(10);

      const slot1 = thinkingSlots.find((s) => s.slot_index === 1);
      expect(slot1?.status).toBe("uploading");

      const slot2 = thinkingSlots.find((s) => s.slot_index === 2);
      expect(slot2?.status).toBe("empty");
    });
  });

  describe("Persistence Across Repository Restarts", () => {
    it("reloads persisted slot projections and active revisions across repository restarts", async () => {
      const root = await createTestRoot();
      const storageAdapter = createAnimationStorageAdapter(root);

      const mascotId = "mascot_restart";
      const styleId = "style_restart";
      const state: AnimationState = "thinking";
      const slotIndex = 1;

      // Repo Instance 1: write data
      {
        const repo1 = createVideoProcessingRepository(storageAdapter);
        const revision = createMockRevision({ id: "rev_restart_v1", attempt: 1, state, slotIndex, styleId });
        await repo1.saveActiveRevision(mascotId, styleId, state, slotIndex, 1, revision);

        const proj = await repo1.getSlotProjection(mascotId, styleId, state, slotIndex);
        expect(proj.status).toBe("ready");
        expect(proj.active_revision_id).toBe("rev_restart_v1");
      }

      // Repo Instance 2: fresh instance with same storage root
      {
        const repo2 = createVideoProcessingRepository(storageAdapter);

        // Read slot projection from persisted file
        const proj = await repo2.getSlotProjection(mascotId, styleId, state, slotIndex);
        expect(proj.status).toBe("ready");
        expect(proj.active_revision_id).toBe("rev_restart_v1");

        // Read active revision from persisted active_revision.json
        const activeRev = await repo2.getActiveRevision(mascotId, styleId, state, slotIndex);
        expect(activeRev).not.toBeNull();
        expect(activeRev?.id).toBe("rev_restart_v1");
        expect(activeRev?.attempt).toBe(1);

        // Verify Schema validation passed
        expect(() => MascotAnimationRevisionSchema.parse(activeRev)).not.toThrow();
      }
    });
  });
});

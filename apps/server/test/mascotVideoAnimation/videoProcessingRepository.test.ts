import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import {
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
  isRecognizedArtifact,
  RECOGNIZED_ARTIFACT_FILES,
} from "../../src/quiz/mascot/videoAnimation/index.js";
import {
  applyActiveRevision,
  applyAttemptFailure,
  applyStateTransition,
  buildAllDefaultSlotProjections,
  collateRevisions,
  createDefaultSlotProjection,
  makeSlotKey,
} from "../../src/quiz/mascot/videoAnimation/projections/slotProjectionMapper.js";

describe("Stage 2 — Video Processing Repository & Sub-modules Decomposition", () => {
  const testRoots: string[] = [];

  afterEach(async () => {
    while (testRoots.length > 0) {
      const dir = testRoots.pop();
      if (dir) {
        try {
          await fs.rm(dir, { recursive: true, force: true });
        } catch {
          // Cleanup ignore
        }
      }
    }
  });

  async function createTestRoot(): Promise<string> {
    const root = path.join(os.tmpdir(), `stage2-repo-test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
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
      frame_urls: [`/frame_1.png`],
      frame_count: 1,
      source_fps: 24,
      playback_fps: 8,
      duration_ms: 125,
      loop_mode: "loop",
      canvas: { width: 500, height: 500 },
      content_bounds: { x: 50, y: 50, width: 400, height: 400 },
      pivot: { x: 250, y: 250 },
      registration: {
        source_width: 500,
        source_height: 500,
        offset_x: 50,
        offset_y: 50,
        pivot: { x: 250, y: 250 },
        content_bounds: { x: 50, y: 50, width: 400, height: 400 },
      },
      source_fingerprint: `fp_source_${attempt}`,
      processing_fingerprint: `fp_proc_${attempt}`,
      status: "ready",
    };
  }

  describe("Sub-module: utils/atomicFs.ts", () => {
    it("writes JSON atomically and ensures file directory creation", async () => {
      const root = await createTestRoot();
      const targetFile = path.join(root, "deep", "nested", "data.json");
      const payload = { test: true, count: 123 };

      await atomicWriteJson(targetFile, payload);

      const content = await fs.readFile(targetFile, "utf8");
      expect(JSON.parse(content)).toEqual(payload);
    });
  });

  describe("Sub-module: errors/videoProcessingErrors.ts", () => {
    it("instantiates InvalidStateTransitionError with appropriate properties", () => {
      const err = new InvalidStateTransitionError("empty", "ready");
      expect(err.name).toBe("InvalidStateTransitionError");
      expect(err.code).toBe("INVALID_STATE_TRANSITION");
      expect(err.from).toBe("empty");
      expect(err.to).toBe("ready");
      expect(err.message).toContain('Cannot transition slot state from "empty" to "ready"');
    });

    it("instantiates StaleCompletionError with appropriate properties", () => {
      const err = new StaleCompletionError(1, 2);
      expect(err.name).toBe("StaleCompletionError");
      expect(err.code).toBe("STALE_COMPLETION");
      expect(err.incomingAttempt).toBe(1);
      expect(err.currentAttempt).toBe(2);
      expect(err.message).toContain("Attempt 1 is stale");
    });
  });

  describe("Sub-module: projections/slotProjectionMapper.ts", () => {
    it("creates key with makeSlotKey and generates default grid with buildAllDefaultSlotProjections", () => {
      const key = makeSlotKey("mascot-1", "style_1", "thinking", 3);
      expect(key).toBe("mascot-1:style_1:thinking:3");

      const grid = buildAllDefaultSlotProjections("style_default");
      expect(grid.length).toBe(20);
      expect(grid.every((s) => s.status === "empty")).toBe(true);
    });

    it("applies state transitions and enforces state machine rules", () => {
      const initial = createDefaultSlotProjection("style1", "thinking", 1);
      expect(initial.status).toBe("empty");

      const uploading = applyStateTransition(initial, "uploading", "job_1");
      expect(uploading.status).toBe("uploading");
      expect(uploading.active_job_id).toBe("job_1");

      expect(() => applyStateTransition(uploading, "ready")).toThrow(InvalidStateTransitionError);
    });

    it("applies active revision and catches stale attempts", () => {
      const current = createDefaultSlotProjection("style1", "thinking", 1);
      current.active_attempt = 2;

      const revision = createMockRevision({ attempt: 1 });
      expect(() => applyActiveRevision(current, 1, revision)).toThrow(StaleCompletionError);

      const validRev = createMockRevision({ attempt: 2 });
      const ready = applyActiveRevision(current, 2, validRev);
      expect(ready.status).toBe("ready");
      expect(ready.active_attempt).toBe(2);
      expect(ready.active_revision_id).toBe("rev_2");
    });

    it("protects approved revision on attempt failure", () => {
      const current = createDefaultSlotProjection("style1", "thinking", 1);
      current.active_revision_id = "rev_approved";
      current.active_attempt = 2;

      const failed = applyAttemptFailure(current, 2, { code: "ERR", message: "Failed" });
      expect(failed.status).toBe("ready");
      expect(failed.error_code).toBe("ERR");
      expect(failed.active_revision_id).toBe("rev_approved");
    });

    it("collates revisions chronologically", () => {
      const rev3 = createMockRevision({ attempt: 3 });
      const rev1 = createMockRevision({ attempt: 1 });
      const rev2 = createMockRevision({ attempt: 2 });

      const sorted = collateRevisions([rev3, rev1, rev2]);
      expect(sorted.map((r) => r.attempt)).toEqual([1, 2, 3]);
    });
  });

  describe("Repository Integration & Re-exports", () => {
    it("recognizes expected artifact files", () => {
      expect(RECOGNIZED_ARTIFACT_FILES.length).toBeGreaterThan(0);
      expect(isRecognizedArtifact("video_transparent.webm")).toBe(true);
      expect(isRecognizedArtifact("frame_001.png")).toBe(true);
      expect(isRecognizedArtifact("unknown.txt")).toBe(false);
    });

    it("performs full job lifecycle and slot projection updates through repository", async () => {
      const root = await createTestRoot();
      const storageAdapter = createAnimationStorageAdapter(root);
      const repo = createVideoProcessingRepository(storageAdapter);

      const job: MascotVideoProcessingJob = {
        id: "job_test_1",
        mascot_id: "mascot_1",
        style_id: "style_1",
        state: "thinking",
        slot_index: 1,
        attempt: 1,
        source_video_url: "/upload.mp4",
        source_video_fingerprint: "fp_1",
        status: "queued",
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const saved = await repo.saveJob(job);
      expect(saved.id).toBe("job_test_1");

      const retrieved = await repo.getJob("job_test_1");
      expect(retrieved?.id).toBe("job_test_1");

      const slotJob = await repo.getSlotJob("mascot_1", "style_1", "thinking", 1);
      expect(slotJob?.id).toBe("job_test_1");

      const updated = await repo.updateJobStatus("job_test_1", "processing", 50);
      expect(updated.status).toBe("processing");
      expect(updated.progress).toBe(50);

      const proj = await repo.getSlotProjection("mascot_1", "style_1", "thinking", 1);
      expect(proj.active_job_id).toBe("job_test_1");
      expect(proj.active_attempt).toBe(1);

      const rev = createMockRevision({ attempt: 1, state: "thinking", slotIndex: 1, styleId: "style_1" });
      const readyProj = await repo.saveActiveRevision("mascot_1", "style_1", "thinking", 1, 1, rev);
      expect(readyProj.status).toBe("ready");

      const activeRev = await repo.getActiveRevision("mascot_1", "style_1", "thinking", 1);
      expect(activeRev?.id).toBe("rev_1");

      const revisions = await repo.listRevisions("mascot_1", "style_1", "thinking", 1);
      expect(revisions.length).toBe(1);
    });

    it("saves and retrieves attempt metadata", async () => {
      const root = await createTestRoot();
      const storageAdapter = createAnimationStorageAdapter(root);
      const repo = createVideoProcessingRepository(storageAdapter);

      const metadata: MascotAttemptMetadata = {
        job_id: "job_m1",
        mascot_id: "m1",
        style_id: "s1",
        state: "celebrate",
        slot_index: 2,
        attempt: 1,
        source_video_url: "/video.mp4",
        source_video_fingerprint: "fp_v",
        processing_fingerprint: "fp_p",
        status: "ready",
        progress: 100,
        error_code: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        manifest_url: "/manifest.json",
        atlas_url: "/atlas.png",
      };

      await repo.saveAttemptMetadata(metadata);
      const loaded = await repo.getAttemptMetadata("m1", "s1", "celebrate", 2, 1);
      expect(loaded?.job_id).toBe("job_m1");
    });

    it("resolves published artifact paths", async () => {
      const root = await createTestRoot();
      const storageAdapter = createAnimationStorageAdapter(root);
      const repo = createVideoProcessingRepository(storageAdapter);

      const slotDir = storageAdapter.getSlotDir("m1", "s1", "thinking", 1);
      await fs.mkdir(slotDir, { recursive: true });
      const webmPath = path.join(slotDir, "video_transparent.webm");
      await fs.writeFile(webmPath, "dummy-webm");

      const resolved = await repo.resolveArtifactPath("m1", "s1", "thinking", 1, "video_transparent.webm");
      expect(resolved).toBe(webmPath);

      const unrec = await repo.resolveArtifactPath("m1", "s1", "thinking", 1, "malicious.sh");
      expect(unrec).toBeNull();
    });
  });
});

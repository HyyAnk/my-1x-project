import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createAnimationStorageAdapter,
  createFfmpegAdapter,
  createVideoProcessingRepository,
  createVideoUploadService,
} from "../../src/quiz/mascot/videoAnimation/index.js";
import { buildApp, type StudioApp } from "../../src/app.js";

const testRoots: string[] = [];

describe("Stage 12 — Mascot Video Processing Routes (Retry, Replace, Cancel, Artifacts)", () => {
  let app: StudioApp;
  let storageRoot: string;
  let mascotId: string;

  beforeEach(async () => {
    storageRoot = await mkdtemp(path.join(os.tmpdir(), "anim-routes-test-"));
    testRoots.push(storageRoot);

    await Promise.all([
      mkdir(path.join(storageRoot, "templates"), { recursive: true }),
      mkdir(path.join(storageRoot, "channels"), { recursive: true }),
      mkdir(path.join(storageRoot, "mascots"), { recursive: true }),
    ]);
    await Promise.all([
      writeFile(path.join(storageRoot, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
      writeFile(path.join(storageRoot, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
    ]);

    const mockFfmpeg = createFfmpegAdapter({
      fixtureMetadata: {
        width: 1280,
        height: 720,
        durationMs: 1500,
        fps: 24,
        codec: "h264",
        format: "mp4",
        fileSizeBytes: 200,
      },
    });

    const storageAdapter = createAnimationStorageAdapter(storageRoot);
    const videoUploadService = createVideoUploadService(storageAdapter, mockFfmpeg);
    const videoProcessingRepo = createVideoProcessingRepository(storageAdapter);

    app = await buildApp(storageRoot, {
      ffmpegAdapter: mockFfmpeg,
      animationStorageAdapter: storageAdapter,
      videoUploadService,
      videoProcessingRepository: videoProcessingRepo,
    });

    await app.repository.saveMascot({
      id: "owl-mascot",
      name: "Milo Owl",
      description: "A wise owl mascot",
      color_theme: "#06b6d4",
      styles: [
        {
          id: "core",
          name: "Core Style",
          keyword: "clean vector",
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          states: {
            thinking: Array.from({ length: 10 }, (_, i) => ({
              id: `slot_${i + 1}`,
              slot_index: i + 1,
              image_url: "",
            })),
            celebrate: Array.from({ length: 10 }, (_, i) => ({
              id: `slot_${i + 1}`,
              slot_index: i + 1,
              image_url: "",
            })),
          },
        },
      ],
    });

    const mascots = await app.repository.listMascots();
    mascotId = mascots[0].id;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    while (testRoots.length > 0) {
      const dir = testRoots.pop();
      if (dir) {
        try {
          await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        } catch {
          // Ignore Windows cleanup lock errors
        }
      }
    }
  });

  it("schedules job and updates slot projection to uploading/processing on upload", async () => {
    const fakeVideoBase64 = Buffer.from("video-bytes-content").toString("base64");

    const response = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascotId}/styles/core/animation-slots/thinking/1/video`,
      payload: {
        data: `data:video/mp4;base64,${fakeVideoBase64}`,
        filename: "pose_1.mp4",
        mime_type: "video/mp4",
      },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.ok).toBe(true);
    expect(data.job_id).toBeTruthy();
    expect(data.slot_projection.slot_index).toBe(1);
    expect(data.slot_projection.state).toBe("thinking");
  });

  it("cancels an active job and returns updated projection", async () => {
    const fakeVideoBase64 = Buffer.from("video-bytes-content").toString("base64");

    const uploadRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascotId}/styles/core/animation-slots/thinking/2/video`,
      payload: {
        data: `data:video/mp4;base64,${fakeVideoBase64}`,
        filename: "pose_2.mp4",
        mime_type: "video/mp4",
      },
    });
    const { job_id } = uploadRes.json();
    expect(job_id).toBeTruthy();

    const cancelRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascotId}/animation-processing/${job_id}/cancel`,
      payload: { reason: "User cancelled upload" },
    });

    expect(cancelRes.statusCode).toBe(200);
    const cancelData = cancelRes.json();
    expect(cancelData.ok).toBe(true);
    expect(cancelData.job.status).toBe("cancelled");
    expect(cancelData.slot_projection.status).toBe("cancelled");
  });

  it("retries a cancelled or failed slot and creates next attempt", async () => {
    const fakeVideoBase64 = Buffer.from("video-bytes-content").toString("base64");

    const uploadRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascotId}/styles/core/animation-slots/thinking/3/video`,
      payload: {
        data: `data:video/mp4;base64,${fakeVideoBase64}`,
        filename: "pose_3.mp4",
        mime_type: "video/mp4",
      },
    });
    const { job_id } = uploadRes.json();
    expect(job_id).toBeTruthy();

    // Cancel to put in cancelled status
    await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascotId}/animation-processing/${job_id}/cancel`,
      payload: { reason: "Abort" },
    });

    // Retry the slot
    const retryRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascotId}/styles/core/animation-slots/thinking/3/retry`,
    });

    expect(retryRes.statusCode).toBe(200);
    const retryData = retryRes.json();
    expect(retryData.ok).toBe(true);
    expect(retryData.attempt).toBe(2);
  });

  it("rejects retry when slot is empty or already processing", async () => {
    const retryRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascotId}/styles/core/animation-slots/thinking/4/retry`,
    });

    expect(retryRes.statusCode).toBe(409);
    const data = retryRes.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("INVALID_STATE_TRANSITION");
  });

  it("replaces video on a ready slot and increments attempt", async () => {
    const storageAdapter = createAnimationStorageAdapter(storageRoot);
    const videoProcessingRepo = createVideoProcessingRepository(storageAdapter);

    // Seed a ready revision and slot projection
    await videoProcessingRepo.transitionSlotState(mascotId, "core", "celebrate", 1, "uploading");
    await videoProcessingRepo.transitionSlotState(mascotId, "core", "celebrate", 1, "processing", "job_seed");
    await videoProcessingRepo.saveActiveRevision(mascotId, "core", "celebrate", 1, 1, {
      id: "rev_1",
      attempt: 1,
      version: 1,
      created_at: new Date().toISOString(),
      style_id: "core",
      state: "celebrate",
      slot_index: 1,
      source_video_url: "/source.mp4",
      atlas_url: "/atlas.png",
      manifest_url: "/manifest.json",
      frame_urls: Array.from({ length: 12 }, (_, i) => `/frame_${i + 1}.png`),
      frame_count: 12,
      source_fps: 24,
      playback_fps: 8,
      duration_ms: 1500,
      loop_mode: "one_shot_rest",
      canvas: { width: 1280, height: 720 },
      content_bounds: { x: 100, y: 100, width: 800, height: 500 },
      pivot: { x: 500, y: 350 },
      registration: {
        source_width: 1280,
        source_height: 720,
        offset_x: 0,
        offset_y: 0,
        content_bounds: { x: 100, y: 100, width: 800, height: 500 },
        pivot: { x: 500, y: 350 },
      },
      source_fingerprint: "fp_seed",
      processing_fingerprint: "proc_seed",
      status: "ready",
    });

    const fakeVideoBase64 = Buffer.from("replacement-video-bytes").toString("base64");

    const replaceRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascotId}/styles/core/animation-slots/celebrate/1/replace`,
      payload: {
        data: `data:video/mp4;base64,${fakeVideoBase64}`,
        filename: "celebrate_replacement.mp4",
        mime_type: "video/mp4",
      },
    });

    expect(replaceRes.statusCode).toBe(200);
    const replaceData = replaceRes.json();
    expect(replaceData.ok).toBe(true);
    expect(replaceData.attempt).toBe(2);
    expect(replaceData.slot_projection.active_revision_id).toBe("rev_1"); // active revision preserved!
  });

  it("serves generated artifacts from the active attempt directory", async () => {
    const storageAdapter = createAnimationStorageAdapter(storageRoot);
    const attemptDir = storageAdapter.getAttemptDir(mascotId, "core", "thinking", 5, 1);
    await mkdir(attemptDir, { recursive: true });
    await writeFile(path.join(attemptDir, "preview.png"), Buffer.from("mock-preview-png-data"));

    const response = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascotId}/styles/core/animations/thinking/5/artifacts/preview.png`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.body).toBe("mock-preview-png-data");
  });
});

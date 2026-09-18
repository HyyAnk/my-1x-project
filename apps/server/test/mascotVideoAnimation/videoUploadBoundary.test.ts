import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createAnimationStorageAdapter,
  createFfmpegAdapter,
  createVideoUploadService,
  sanitizeIdentifier,
  validateSafePath,
  AnimationStorageSecurityError,
} from "../../src/quiz/mascot/videoAnimation/index.js";
import { buildApp, type StudioApp } from "../../src/app.js";

const testRoots: string[] = [];

afterEach(async () => {
  while (testRoots.length > 0) {
    const dir = testRoots.pop();
    if (dir) {
      try {
        await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } catch {
        // Ignore Windows lock during fast async tests
      }
    }
  }
});

describe("Stage 05 — Mascot Video Upload Boundary & Security", () => {
  describe("Path Traversal and Storage Isolation Security", () => {
    it("sanitizes identifiers and rejects directory traversal sequences", () => {
      expect(sanitizeIdentifier("owl-mascot")).toBe("owl-mascot");
      expect(sanitizeIdentifier("style_pixel_01")).toBe("style_pixel_01");

      expect(() => sanitizeIdentifier("../evil")).toThrow(AnimationStorageSecurityError);
      expect(() => sanitizeIdentifier("..\\windows")).toThrow(AnimationStorageSecurityError);
      expect(() => sanitizeIdentifier("foo/bar")).toThrow(AnimationStorageSecurityError);
      expect(() => sanitizeIdentifier("foo\\bar")).toThrow(AnimationStorageSecurityError);
      expect(() => sanitizeIdentifier("")).toThrow(AnimationStorageSecurityError);
      expect(() => sanitizeIdentifier("hello world")).toThrow(AnimationStorageSecurityError);
    });

    it("prevents path traversal escaping the allowed base directory", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "anim-sec-"));
      testRoots.push(root);

      expect(() => validateSafePath("../outside", root)).toThrow(AnimationStorageSecurityError);
      expect(() => validateSafePath("sub/../../escaped", root)).toThrow(AnimationStorageSecurityError);
      expect(() => validateSafePath("foo\0bar", root)).toThrow(AnimationStorageSecurityError);

      const safe = validateSafePath("sub/folder/file.mp4", root);
      expect(safe.startsWith(path.resolve(root))).toBe(true);
    });

    it("isolates attempt directory strictly per mascot, style, state, slot, and attempt", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "anim-sec-"));
      testRoots.push(root);
      const adapter = createAnimationStorageAdapter(root);

      const attemptDir = adapter.getAttemptDir("owl", "pixel", "thinking", 3, 1);
      expect(attemptDir).toContain(path.normalize("mascots/owl/animations/pixel/thinking/slot_3/attempts/att_1"));

      expect(() => adapter.getAttemptDir("owl/hack", "pixel", "thinking", 3, 1)).toThrow(AnimationStorageSecurityError);
      expect(() => adapter.getAttemptDir("owl", "pixel", "thinking", 15, 1)).toThrow(AnimationStorageSecurityError);
    });
  });

  describe("Video Upload Service Validation Rules", () => {
    it("rejects empty files or files exceeding 50MB", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "anim-srv-"));
      testRoots.push(root);
      const storageAdapter = createAnimationStorageAdapter(root);
      const ffmpegAdapter = createFfmpegAdapter({
        fixtureMetadata: {
          width: 1280,
          height: 720,
          durationMs: 1500,
          fps: 24,
          codec: "h264",
          format: "mp4",
          fileSizeBytes: 100,
        },
      });
      const service = createVideoUploadService(storageAdapter, ffmpegAdapter);

      await expect(
        service.validateAndStageSourceVideo({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
          filename: "test.mp4",
          buffer: Buffer.alloc(0),
        }),
      ).rejects.toMatchObject({ code: "FILE_EMPTY" });

      const oversized = Buffer.alloc(51 * 1024 * 1024);
      await expect(
        service.validateAndStageSourceVideo({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
          filename: "test.mp4",
          buffer: oversized,
        }),
      ).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
    });

    it("rejects unsupported extensions and MIME types", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "anim-srv-"));
      testRoots.push(root);
      const storageAdapter = createAnimationStorageAdapter(root);
      const ffmpegAdapter = createFfmpegAdapter({
        fixtureMetadata: {
          width: 1280,
          height: 720,
          durationMs: 1500,
          fps: 24,
          codec: "h264",
          format: "mp4",
          fileSizeBytes: 100,
        },
      });
      const service = createVideoUploadService(storageAdapter, ffmpegAdapter);

      await expect(
        service.validateAndStageSourceVideo({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
          filename: "malicious.sh",
          buffer: Buffer.from("echo evil"),
        }),
      ).rejects.toMatchObject({ code: "INVALID_FILE_EXTENSION" });

      await expect(
        service.validateAndStageSourceVideo({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
          filename: "photo.png",
          buffer: Buffer.from("png"),
        }),
      ).rejects.toMatchObject({ code: "INVALID_FILE_EXTENSION" });

      await expect(
        service.validateAndStageSourceVideo({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
          filename: "video.mp4",
          buffer: Buffer.from("fake-video"),
          mimeType: "image/png",
        }),
      ).rejects.toMatchObject({ code: "INVALID_MIME_TYPE" });
    });

    it("rejects durations below 1.0s or above 15.0s", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "anim-srv-"));
      testRoots.push(root);
      const storageAdapter = createAnimationStorageAdapter(root);

      const tooShortFfmpeg = createFfmpegAdapter({
        fixtureMetadata: {
          width: 1280,
          height: 720,
          durationMs: 500, // 0.5s
          fps: 24,
          codec: "h264",
          format: "mp4",
          fileSizeBytes: 100,
        },
      });
      const serviceShort = createVideoUploadService(storageAdapter, tooShortFfmpeg);

      await expect(
        serviceShort.validateAndStageSourceVideo({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
          filename: "short.mp4",
          buffer: Buffer.from("video-bytes"),
        }),
      ).rejects.toMatchObject({ code: "INVALID_DURATION" });

      const tooLongFfmpeg = createFfmpegAdapter({
        fixtureMetadata: {
          width: 1280,
          height: 720,
          durationMs: 20000, // 20s
          fps: 24,
          codec: "h264",
          format: "mp4",
          fileSizeBytes: 100,
        },
      });
      const serviceLong = createVideoUploadService(storageAdapter, tooLongFfmpeg);

      await expect(
        serviceLong.validateAndStageSourceVideo({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
          filename: "long.mp4",
          buffer: Buffer.from("video-bytes"),
        }),
      ).rejects.toMatchObject({ code: "INVALID_DURATION" });
    });

    it("rejects non-16:9 aspect ratios or out-of-bounds resolutions", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "anim-srv-"));
      testRoots.push(root);
      const storageAdapter = createAnimationStorageAdapter(root);

      // 9:16 portrait
      const portraitFfmpeg = createFfmpegAdapter({
        fixtureMetadata: {
          width: 720,
          height: 1280,
          durationMs: 1500,
          fps: 24,
          codec: "h264",
          format: "mp4",
          fileSizeBytes: 100,
        },
      });
      const servicePortrait = createVideoUploadService(storageAdapter, portraitFfmpeg);

      await expect(
        servicePortrait.validateAndStageSourceVideo({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
          filename: "portrait.mp4",
          buffer: Buffer.from("video-bytes"),
        }),
      ).rejects.toMatchObject({ code: "INVALID_DIMENSIONS" });

      // Square 1:1
      const squareFfmpeg = createFfmpegAdapter({
        fixtureMetadata: {
          width: 800,
          height: 800,
          durationMs: 1500,
          fps: 24,
          codec: "h264",
          format: "mp4",
          fileSizeBytes: 100,
        },
      });
      const serviceSquare = createVideoUploadService(storageAdapter, squareFfmpeg);

      await expect(
        serviceSquare.validateAndStageSourceVideo({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
          filename: "square.mp4",
          buffer: Buffer.from("video-bytes"),
        }),
      ).rejects.toMatchObject({ code: "INVALID_DIMENSIONS" });
    });

    it("accepts valid 16:9 video, stages source, and computes deterministic fingerprint", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "anim-srv-"));
      testRoots.push(root);
      const storageAdapter = createAnimationStorageAdapter(root);
      const validFfmpeg = createFfmpegAdapter({
        fixtureMetadata: {
          width: 1280,
          height: 720,
          durationMs: 1500,
          fps: 24,
          codec: "h264",
          format: "mp4",
          fileSizeBytes: 1024,
        },
      });
      const service = createVideoUploadService(storageAdapter, validFfmpeg);

      const fakeVideo = Buffer.from("mock-valid-mp4-video-stream-content");
      const result = await service.validateAndStageSourceVideo({
        mascotId: "owl",
        styleId: "pixel",
        state: "celebrate",
        slotIndex: 2,
        attemptId: 1,
        filename: "celebrate_02.mp4",
        buffer: fakeVideo,
        mimeType: "video/mp4",
      });

      expect(result.attemptId).toBe("1");
      expect(result.metadata.width).toBe(1280);
      expect(result.metadata.height).toBe(720);
      expect(result.metadata.durationMs).toBe(1500);
      expect(result.videoSha256).toBeDefined();
      expect(result.sourceVideoFingerprint).toBeDefined();
      expect(result.sourceVideoPath).toContain(path.normalize("slot_2/attempts/att_1/celebrate_02.mp4"));
    });
  });

  describe("HTTP Routes Integration", () => {
    let app: StudioApp;
    let root: string;

    beforeEach(async () => {
      root = await mkdtemp(path.join(os.tmpdir(), "anim-routes-"));
      testRoots.push(root);

      // Create dummy template files needed for bootstrap
      await mkdir(path.join(root, "templates"), { recursive: true });
      await Promise.all([
        writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
        writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
      ]);

      const storageAdapter = createAnimationStorageAdapter(root);
      const ffmpegAdapter = createFfmpegAdapter({
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

      app = await buildApp(root, {
        ffmpegAdapter,
        animationStorageAdapter: storageAdapter,
      });

      // Create a test mascot with styles
      await app.repository.saveMascot({
        name: "Test Owl",
        description: "An owl mascot",
        color_theme: "#06b6d4",
        styles: [
          {
            id: "pixel",
            name: "Pixel Style",
            keyword: "pixelated",
            is_default: false,
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
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it("handles video upload endpoint successfully and creates queued job", async () => {
      const mascots = await app.repository.listMascots();
      const mascotId = mascots[0].id;

      const fakeVideoBase64 = Buffer.from("test-video-payload").toString("base64");

      const response = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascotId}/styles/pixel/animation-slots/thinking/1/video`,
        payload: {
          data: `data:video/mp4;base64,${fakeVideoBase64}`,
          filename: "source.mp4",
          mime_type: "video/mp4",
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.ok).toBe(true);
      expect(data.job_id).toMatch(/^job_/);
      expect(data.attempt).toBe(1);
      expect(data.status).toBe("queued");
      expect(data.slot_projection.slot_index).toBe(1);
      expect(data.upload.metadata.width).toBe(1280);
      expect(data.upload.metadata.height).toBe(720);

      // Verify querying the job
      const jobRes = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascotId}/animation-processing/${data.job_id}`,
      });
      expect(jobRes.statusCode).toBe(200);
      const jobData = jobRes.json();
      expect(jobData.ok).toBe(true);
      expect(jobData.job.id).toBe(data.job_id);

      // Verify slot projections overview
      const slotsRes = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascotId}/styles/pixel/animation-slots`,
      });
      expect(slotsRes.statusCode).toBe(200);
      const slotsData = slotsRes.json();
      expect(slotsData.slots.thinking.length).toBe(10);
      expect(slotsData.slots.celebrate.length).toBe(10);
      expect(slotsData.slots.thinking[0].active_job_id).toBe(data.job_id);
    });

    it("rejects invalid upload params or bad payload with structured error", async () => {
      const mascots = await app.repository.listMascots();
      const mascotId = mascots[0].id;

      // Bad state
      const badStateRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascotId}/styles/pixel/animation-slots/running/1/video`,
        payload: { data: "base64" },
      });
      expect(badStateRes.statusCode).toBe(400);

      // Bad slot index (11 > 10)
      const badSlotRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascotId}/styles/pixel/animation-slots/thinking/11/video`,
        payload: { data: "base64" },
      });
      expect(badSlotRes.statusCode).toBe(400);

      // Nonexistent style
      const badStyleRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascotId}/styles/nonexistent/animation-slots/thinking/1/video`,
        payload: { data: "base64" },
      });
      expect(badStyleRes.statusCode).toBe(404);
      expect(badStyleRes.json().error.code).toBe("STYLE_NOT_FOUND");
    });
  });
});

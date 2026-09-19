import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  createAnimationStorageAdapter,
  createFfmpegAdapter,
  createFrameExtractionService,
  VideoExtractError,
  type ExtractedFrame,
} from "../../src/quiz/mascot/videoAnimation/index.js";

const execFileAsync = promisify(execFile);

describe("Stage 06 — Mascot Sequential Frame Extraction", () => {
  const testRoots: string[] = [];

  afterEach(async () => {
    while (testRoots.length > 0) {
      const dir = testRoots.pop();
      if (dir) {
        try {
          await fs.rm(dir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      }
    }
  });

  async function generateSyntheticTestVideo(outputPath: string, durationSec = 1.5, width = 1280, height = 720): Promise<void> {
    const args = [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `testsrc=duration=${durationSec}:size=${width}x${height}:rate=24`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      outputPath,
    ];
    await execFileAsync("ffmpeg", args);
  }

  describe("Real FFmpeg Extraction End-to-End", () => {
    it("extracts exactly 12 sequential frames at 8 FPS from a 1.5s 16:9 video", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-extract-real-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const ffmpegAdapter = createFfmpegAdapter();
      const service = createFrameExtractionService(storageAdapter, ffmpegAdapter);

      // Create synthetic 1.5s video on disk
      const tempVideoPath = path.join(root, "temp_source.mp4");
      await generateSyntheticTestVideo(tempVideoPath, 1.5, 1280, 720);
      const videoBuffer = await fs.readFile(tempVideoPath);

      // Stage video into slot 1 attempt 1
      await storageAdapter.saveAttemptSourceVideo("owl", "pixel", "thinking", 1, 1, "source.mp4", videoBuffer);

      // Extract frames
      const result = await service.extractAttemptFrames({
        mascotId: "owl",
        styleId: "pixel",
        state: "thinking",
        slotIndex: 1,
        attemptId: 1,
        targetFps: 8,
        targetFrameCount: 12,
      });

      expect(result.frameCount).toBe(12);
      expect(result.frames.length).toBe(12);
      expect(result.fps).toBe(8);
      expect(result.durationMs).toBe(1500);
      expect(result.sourceMetadata.width).toBe(1280);
      expect(result.sourceMetadata.height).toBe(720);

      // Check each frame exists on disk and has strict sequential metadata
      for (let i = 0; i < 12; i++) {
        const frame = result.frames[i];
        expect(frame.frameIndex).toBe(i + 1);
        const expectedFilename = `frame_${String(i + 1).padStart(3, "0")}.png`;
        expect(frame.fileName).toBe(expectedFilename);
        expect(frame.timestampMs).toBe(Math.round(i * (1000 / 8)));

        const stats = await fs.stat(frame.filePath);
        expect(stats.isFile()).toBe(true);
        expect(stats.size).toBeGreaterThan(0);
      }
    });
  });

  describe("Sequential Verification & Fixture Operations", () => {
    it("accepts valid 12-frame sequential extraction via fixture handler", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-extract-fix-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const outputFramesDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "celebrate", 2, 1, "source");
      await fs.mkdir(outputFramesDir, { recursive: true });

      const mockFrames: ExtractedFrame[] = Array.from({ length: 12 }, (_, i) => ({
        frameIndex: i + 1,
        fileName: `frame_${String(i + 1).padStart(3, "0")}.png`,
        filePath: path.join(outputFramesDir, `frame_${String(i + 1).padStart(3, "0")}.png`),
        timestampMs: Math.round(i * 125),
      }));

      const ffmpegAdapter = createFfmpegAdapter({
        fixtureMetadata: {
          width: 1280,
          height: 720,
          durationMs: 1500,
          fps: 24,
          codec: "h264",
          format: "mp4",
          fileSizeBytes: 2048,
        },
        fixtureExtractHandler: async () => ({
          frames: mockFrames,
          frameCount: 12,
          fps: 8,
          durationMs: 1500,
          outputDir: outputFramesDir,
        }),
      });

      // Stage dummy source file
      await storageAdapter.saveAttemptSourceVideo("owl", "pixel", "celebrate", 2, 1, "source.mp4", Buffer.from("dummy-video-content"));

      const service = createFrameExtractionService(storageAdapter, ffmpegAdapter);
      const result = await service.extractAttemptFrames({
        mascotId: "owl",
        styleId: "pixel",
        state: "celebrate",
        slotIndex: 2,
        attemptId: 1,
        targetFps: 8,
        targetFrameCount: 12,
      });

      expect(result.frameCount).toBe(12);
      expect(result.frames[0].frameIndex).toBe(1);
      expect(result.frames[11].frameIndex).toBe(12);
    });

    it("rejects partial output (fewer than 12 frames) with INSUFFICIENT_FRAMES", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-extract-partial-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const outputFramesDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "thinking", 1, 1, "source");
      await fs.mkdir(outputFramesDir, { recursive: true });

      // Return only 6 frames instead of 12
      const mockFrames: ExtractedFrame[] = Array.from({ length: 6 }, (_, i) => ({
        frameIndex: i + 1,
        fileName: `frame_${String(i + 1).padStart(3, "0")}.png`,
        filePath: path.join(outputFramesDir, `frame_${String(i + 1).padStart(3, "0")}.png`),
        timestampMs: Math.round(i * 125),
      }));

      const ffmpegAdapter = createFfmpegAdapter({
        fixtureMetadata: {
          width: 1280,
          height: 720,
          durationMs: 750,
          fps: 24,
          codec: "h264",
          format: "mp4",
          fileSizeBytes: 1024,
        },
        fixtureExtractHandler: async () => ({
          frames: mockFrames,
          frameCount: 6,
          fps: 8,
          durationMs: 750,
          outputDir: outputFramesDir,
        }),
      });

      await storageAdapter.saveAttemptSourceVideo("owl", "pixel", "thinking", 1, 1, "source.mp4", Buffer.from("short-video-bytes"));

      const service = createFrameExtractionService(storageAdapter, ffmpegAdapter);

      await expect(
        service.extractAttemptFrames({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
          targetFps: 8,
          targetFrameCount: 12,
        }),
      ).rejects.toMatchObject({
        code: "INSUFFICIENT_FRAMES",
      });
    });

    it("rejects non-consecutive or gap-containing frame sequences with DISCONTINUOUS_FRAMES", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-extract-gap-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const outputFramesDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "thinking", 1, 1, "source");

      // 12 frames, but missing frame 5 (has index 13 instead)
      const mockFrames: ExtractedFrame[] = [
        { frameIndex: 1, fileName: "frame_001.png", filePath: "frame_001.png", timestampMs: 0 },
        { frameIndex: 2, fileName: "frame_002.png", filePath: "frame_002.png", timestampMs: 125 },
        { frameIndex: 3, fileName: "frame_003.png", filePath: "frame_003.png", timestampMs: 250 },
        { frameIndex: 4, fileName: "frame_004.png", filePath: "frame_004.png", timestampMs: 375 },
        { frameIndex: 6, fileName: "frame_006.png", filePath: "frame_006.png", timestampMs: 500 }, // Gap! 6 instead of 5
        { frameIndex: 7, fileName: "frame_007.png", filePath: "frame_007.png", timestampMs: 625 },
        { frameIndex: 8, fileName: "frame_008.png", filePath: "frame_008.png", timestampMs: 750 },
        { frameIndex: 9, fileName: "frame_009.png", filePath: "frame_009.png", timestampMs: 875 },
        { frameIndex: 10, fileName: "frame_010.png", filePath: "frame_010.png", timestampMs: 1000 },
        { frameIndex: 11, fileName: "frame_011.png", filePath: "frame_011.png", timestampMs: 1125 },
        { frameIndex: 12, fileName: "frame_012.png", filePath: "frame_012.png", timestampMs: 1250 },
        { frameIndex: 13, fileName: "frame_013.png", filePath: "frame_013.png", timestampMs: 1375 },
      ];

      const ffmpegAdapter = createFfmpegAdapter({
        fixtureMetadata: {
          width: 1280,
          height: 720,
          durationMs: 1500,
          fps: 24,
          codec: "h264",
          format: "mp4",
          fileSizeBytes: 2048,
        },
        fixtureExtractHandler: async () => ({
          frames: mockFrames,
          frameCount: 12,
          fps: 8,
          durationMs: 1500,
          outputDir: outputFramesDir,
        }),
      });

      await storageAdapter.saveAttemptSourceVideo("owl", "pixel", "thinking", 1, 1, "source.mp4", Buffer.from("dummy"));

      const service = createFrameExtractionService(storageAdapter, ffmpegAdapter);

      await expect(
        service.extractAttemptFrames({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
          targetFps: 8,
          targetFrameCount: 12,
        }),
      ).rejects.toMatchObject({
        code: "DISCONTINUOUS_FRAMES",
      });
    });
  });

  describe("Cancellation & Abort Handling", () => {
    it("aborts execution and rejects with ABORTED when AbortSignal is triggered", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-extract-abort-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const abortController = new AbortController();

      const ffmpegAdapter = createFfmpegAdapter({
        fixtureMetadata: {
          width: 1280,
          height: 720,
          durationMs: 1500,
          fps: 24,
          codec: "h264",
          format: "mp4",
          fileSizeBytes: 1024,
        },
        fixtureExtractHandler: async (options) => {
          return new Promise<never>((_, reject) => {
            options.signal?.addEventListener("abort", () => {
              reject(new VideoExtractError("Extraction was cancelled", "ABORTED"));
            });
          });
        },
      });

      await storageAdapter.saveAttemptSourceVideo("owl", "pixel", "thinking", 1, 1, "source.mp4", Buffer.from("dummy-video-data"));

      const service = createFrameExtractionService(storageAdapter, ffmpegAdapter);

      const extractionPromise = service.extractAttemptFrames({
        mascotId: "owl",
        styleId: "pixel",
        state: "thinking",
        slotIndex: 1,
        attemptId: 1,
        signal: abortController.signal,
      });

      // Trigger abort immediately
      setTimeout(() => abortController.abort(), 10);

      await expect(extractionPromise).rejects.toMatchObject({
        code: "ABORTED",
      });
    });

    it("rejects immediately when AbortSignal is already aborted before start", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-extract-preabort-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const abortController = new AbortController();
      abortController.abort(); // Pre-abort

      const ffmpegAdapter = createFfmpegAdapter({
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

      await storageAdapter.saveAttemptSourceVideo("owl", "pixel", "thinking", 1, 1, "source.mp4", Buffer.from("dummy-video-data"));

      const service = createFrameExtractionService(storageAdapter, ffmpegAdapter);

      await expect(
        service.extractAttemptFrames({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
          signal: abortController.signal,
        }),
      ).rejects.toMatchObject({
        code: "ABORTED",
      });
    });
  });

  describe("Timeout Handling", () => {
    it("times out and rejects with TIMEOUT when extraction duration exceeds timeoutMs", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-extract-timeout-"));
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
          fileSizeBytes: 1024,
        },
        fixtureExtractHandler: async (options) => {
          return new Promise<never>((_, reject) => {
            const timeout = options.timeoutMs ?? 50;
            setTimeout(() => {
              reject(new VideoExtractError(`Extraction timed out after ${timeout}ms`, "TIMEOUT"));
            }, timeout);
          });
        },
      });

      await storageAdapter.saveAttemptSourceVideo("owl", "pixel", "thinking", 1, 1, "source.mp4", Buffer.from("dummy-video-data"));

      const service = createFrameExtractionService(storageAdapter, ffmpegAdapter);

      await expect(
        service.extractAttemptFrames({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
          timeoutMs: 30,
        }),
      ).rejects.toMatchObject({
        code: "TIMEOUT",
      });
    });
  });

  describe("Input & Filesystem Validation", () => {
    it("rejects when source video file does not exist", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-extract-missing-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const ffmpegAdapter = createFfmpegAdapter();
      const service = createFrameExtractionService(storageAdapter, ffmpegAdapter);

      await expect(
        service.extractAttemptFrames({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
        }),
      ).rejects.toMatchObject({
        code: "SOURCE_FILE_NOT_FOUND",
      });
    });

    it("rejects when source video file is 0 bytes (empty)", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-extract-empty-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const ffmpegAdapter = createFfmpegAdapter();
      const service = createFrameExtractionService(storageAdapter, ffmpegAdapter);

      // Save 0-byte video
      await storageAdapter.saveAttemptSourceVideo("owl", "pixel", "thinking", 1, 1, "source.mp4", Buffer.alloc(0));

      await expect(
        service.extractAttemptFrames({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
        }),
      ).rejects.toMatchObject({
        code: "FILE_EMPTY",
      });
    });
  });
});

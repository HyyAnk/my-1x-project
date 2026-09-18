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
} from "../../src/quiz/mascot/videoAnimation/index.js";
import { encodeRgbaToPng, type DecodedImage } from "../../src/utils/imageMatting.js";

const execFileAsync = promisify(execFile);

describe("Stage B2 — Dynamic Video Duration, FPS & Transparent WebM VP9 Encoding", () => {
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

  async function createTestRoot(prefix: string): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    testRoots.push(root);
    return root;
  }

  async function generateSyntheticTestVideo(
    outputPath: string,
    durationSec: number,
    fps: number,
    width = 640,
    height = 360,
  ): Promise<void> {
    const args = [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `testsrc=duration=${durationSec}:size=${width}x${height}:rate=${fps}`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      outputPath,
    ];
    await execFileAsync("ffmpeg", args);
  }

  function createTransparentFramePng(width = 320, height = 180, frameIndex = 1): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    // Background is completely transparent (alpha = 0)
    // Draw an animated colored box in the center with alpha = 255
    const offsetX = (frameIndex * 2) % 60;
    const minX = Math.floor(width * 0.3) + offsetX;
    const maxX = Math.min(width - 1, minX + 50);
    const minY = Math.floor(height * 0.3);
    const maxY = Math.min(height - 1, minY + 50);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = (frameIndex * 20) % 256; // R
        data[idx + 1] = 180; // G
        data[idx + 2] = 240; // B
        data[idx + 3] = 255; // Fully opaque alpha
      }
    }

    const decoded: DecodedImage = { width, height, data };
    return encodeRgbaToPng(decoded);
  }

  describe("Dynamic Video Probing (4s to 10s, 8 to 60 FPS)", () => {
    it("probes a 4-second 24 FPS video with accurate computed frame count", async () => {
      const root = await createTestRoot("anim-probe-4s-");
      const videoPath = path.join(root, "source_4s.mp4");
      await generateSyntheticTestVideo(videoPath, 4, 24, 640, 360);

      const ffmpegAdapter = createFfmpegAdapter();
      const metadata = await ffmpegAdapter.probeVideoMetadata(videoPath);

      expect(metadata.width).toBe(640);
      expect(metadata.height).toBe(360);
      expect(metadata.durationMs).toBe(4000);
      expect(metadata.fps).toBe(24);
      expect(metadata.frameCount).toBe(96);
      expect(metadata.fileSizeBytes).toBeGreaterThan(0);
    });

    it("probes a 10-second 30 FPS video with accurate computed frame count", async () => {
      const root = await createTestRoot("anim-probe-10s-");
      const videoPath = path.join(root, "source_10s.mp4");
      await generateSyntheticTestVideo(videoPath, 10, 30, 640, 360);

      const ffmpegAdapter = createFfmpegAdapter();
      const metadata = await ffmpegAdapter.probeVideoMetadata(videoPath);

      expect(metadata.width).toBe(640);
      expect(metadata.height).toBe(360);
      expect(metadata.durationMs).toBe(10000);
      expect(metadata.fps).toBe(30);
      expect(metadata.frameCount).toBe(300);
    });

    it("probes a 60 FPS video dynamically", async () => {
      const root = await createTestRoot("anim-probe-60fps-");
      const videoPath = path.join(root, "source_60fps.mp4");
      await generateSyntheticTestVideo(videoPath, 4, 60, 640, 360);

      const ffmpegAdapter = createFfmpegAdapter();
      const metadata = await ffmpegAdapter.probeVideoMetadata(videoPath);

      expect(metadata.fps).toBe(60);
      expect(metadata.durationMs).toBe(4000);
      expect(metadata.frameCount).toBe(240);
    });
  });

  describe("Dynamic Sequential Frame Extraction", () => {
    it("extracts all 96 frames sequentially from a 4s 24 FPS video", async () => {
      const root = await createTestRoot("anim-extract-4s-");
      const storageAdapter = createAnimationStorageAdapter(root);
      const ffmpegAdapter = createFfmpegAdapter();
      const service = createFrameExtractionService(storageAdapter, ffmpegAdapter);

      const videoPath = path.join(root, "temp_4s.mp4");
      await generateSyntheticTestVideo(videoPath, 4, 24, 640, 360);
      const videoBuffer = await fs.readFile(videoPath);

      await storageAdapter.saveAttemptSourceVideo("owl", "vector", "idle", 1, 1, "source.mp4", videoBuffer);

      const result = await service.extractAttemptFrames({
        mascotId: "owl",
        styleId: "vector",
        state: "idle",
        slotIndex: 1,
        attemptId: 1,
      });

      expect(result.frameCount).toBe(96);
      expect(result.frames.length).toBe(96);
      expect(result.fps).toBe(24);
      expect(result.durationMs).toBe(4000);

      // Validate sequential continuity and file existence for all 96 frames
      for (let i = 0; i < 96; i++) {
        const frame = result.frames[i];
        expect(frame.frameIndex).toBe(i + 1);
        const expectedFilename = `frame_${String(i + 1).padStart(3, "0")}.png`;
        expect(frame.fileName).toBe(expectedFilename);
        expect(frame.timestampMs).toBe(Math.round(i * (1000 / 24)));

        const stats = await fs.stat(frame.filePath);
        expect(stats.isFile()).toBe(true);
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    it("extracts all 300 frames sequentially from a 10s 30 FPS video", async () => {
      const root = await createTestRoot("anim-extract-10s-");
      const storageAdapter = createAnimationStorageAdapter(root);
      const ffmpegAdapter = createFfmpegAdapter();
      const service = createFrameExtractionService(storageAdapter, ffmpegAdapter);

      const videoPath = path.join(root, "temp_10s.mp4");
      await generateSyntheticTestVideo(videoPath, 10, 30, 640, 360);
      const videoBuffer = await fs.readFile(videoPath);

      await storageAdapter.saveAttemptSourceVideo("owl", "vector", "idle", 1, 1, "source.mp4", videoBuffer);

      const result = await service.extractAttemptFrames({
        mascotId: "owl",
        styleId: "vector",
        state: "idle",
        slotIndex: 1,
        attemptId: 1,
      });

      expect(result.frameCount).toBe(300);
      expect(result.frames.length).toBe(300);
      expect(result.fps).toBe(30);
      expect(result.durationMs).toBe(10000);

      expect(result.frames[0].frameIndex).toBe(1);
      expect(result.frames[0].fileName).toBe("frame_001.png");
      expect(result.frames[299].frameIndex).toBe(300);
      expect(result.frames[299].fileName).toBe("frame_300.png");
    });

    it("extracts with configured target FPS via FrameExtractionServiceOptions", async () => {
      const root = await createTestRoot("anim-extract-configured-fps-");
      const storageAdapter = createAnimationStorageAdapter(root);
      const ffmpegAdapter = createFfmpegAdapter();

      // Configure service with 15 FPS target
      const service = createFrameExtractionService(storageAdapter, ffmpegAdapter, {
        configuredTargetFps: 15,
      });

      const videoPath = path.join(root, "temp_4s.mp4");
      await generateSyntheticTestVideo(videoPath, 4, 24, 640, 360);
      const videoBuffer = await fs.readFile(videoPath);

      await storageAdapter.saveAttemptSourceVideo("owl", "vector", "idle", 1, 1, "source.mp4", videoBuffer);

      const result = await service.extractAttemptFrames({
        mascotId: "owl",
        styleId: "vector",
        state: "idle",
        slotIndex: 1,
        attemptId: 1,
      });

      // 4 seconds at 15 FPS = 60 frames
      expect(result.fps).toBe(15);
      expect(result.frameCount).toBe(60);
      expect(result.frames.length).toBe(60);
    });

    it("extracts with explicit targetFps and targetFrameCount params", async () => {
      const root = await createTestRoot("anim-extract-explicit-params-");
      const storageAdapter = createAnimationStorageAdapter(root);
      const ffmpegAdapter = createFfmpegAdapter();
      const service = createFrameExtractionService(storageAdapter, ffmpegAdapter);

      const videoPath = path.join(root, "temp_4s.mp4");
      await generateSyntheticTestVideo(videoPath, 4, 24, 640, 360);
      const videoBuffer = await fs.readFile(videoPath);

      await storageAdapter.saveAttemptSourceVideo("owl", "vector", "idle", 1, 1, "source.mp4", videoBuffer);

      const result = await service.extractAttemptFrames({
        mascotId: "owl",
        styleId: "vector",
        state: "idle",
        slotIndex: 1,
        attemptId: 1,
        targetFps: 12,
        targetFrameCount: 48,
      });

      expect(result.fps).toBe(12);
      expect(result.frameCount).toBe(48);
      expect(result.frames.length).toBe(48);
    });
  });

  describe("Transparent WebM VP9 Encoding (encodeFramesToTransparentWebm)", () => {
    it("encodes transparent PNG frames into a valid VP9 WebM video with alpha channel", async () => {
      const root = await createTestRoot("anim-webm-real-");
      const framesDir = path.join(root, "transparent_frames");
      await fs.mkdir(framesDir, { recursive: true });

      // Generate 24 transparent PNG frames
      for (let i = 1; i <= 24; i++) {
        const pngBytes = createTransparentFramePng(320, 180, i);
        const fileName = `frame_${String(i).padStart(3, "0")}.png`;
        await fs.writeFile(path.join(framesDir, fileName), pngBytes);
      }

      const ffmpegAdapter = createFfmpegAdapter();
      const outputWebmPath = path.join(root, "output", "animation.webm");

      const encodeResult = await ffmpegAdapter.encodeFramesToTransparentWebm({
        framesDir,
        outputWebmPath,
        fps: 24,
      });

      expect(encodeResult.outputWebmPath).toBe(outputWebmPath);
      expect(encodeResult.fps).toBe(24);
      expect(encodeResult.durationMs).toBe(1000); // 24 frames @ 24fps = 1000ms
      expect(encodeResult.codec).toBe("vp9_alpha");
      expect(encodeResult.fileSizeBytes).toBeGreaterThan(0);

      // Verify file exists on disk
      const stats = await fs.stat(outputWebmPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBe(encodeResult.fileSizeBytes);

      // Probe the generated WebM to verify VP9 codec and format
      const probed = await ffmpegAdapter.probeVideoMetadata(outputWebmPath);
      expect(probed.codec).toBe("vp9");
      expect(probed.format).toMatch(/webm|matroska/i);
      expect(probed.width).toBe(320);
      expect(probed.height).toBe(180);
    });

    it("supports optional resolution scaling (width & height)", async () => {
      const root = await createTestRoot("anim-webm-scale-");
      const framesDir = path.join(root, "frames");
      await fs.mkdir(framesDir, { recursive: true });

      for (let i = 1; i <= 12; i++) {
        const pngBytes = createTransparentFramePng(320, 180, i);
        await fs.writeFile(path.join(framesDir, `frame_${String(i).padStart(3, "0")}.png`), pngBytes);
      }

      const ffmpegAdapter = createFfmpegAdapter();
      const outputWebmPath = path.join(root, "scaled.webm");

      const encodeResult = await ffmpegAdapter.encodeFramesToTransparentWebm({
        framesDir,
        outputWebmPath,
        fps: 12,
        width: 640,
        height: 360,
      });

      expect(encodeResult.fileSizeBytes).toBeGreaterThan(0);

      const probed = await ffmpegAdapter.probeVideoMetadata(outputWebmPath);
      expect(probed.width).toBe(640);
      expect(probed.height).toBe(360);
    });

    it("supports fixture mode via fixtureEncodeWebmHandler", async () => {
      const root = await createTestRoot("anim-webm-fixture-");
      const framesDir = path.join(root, "frames");
      await fs.mkdir(framesDir, { recursive: true });
      const outputWebmPath = path.join(root, "mock.webm");

      const ffmpegAdapter = createFfmpegAdapter({
        fixtureEncodeWebmHandler: async (options) => {
          return {
            outputWebmPath: options.outputWebmPath,
            fileSizeBytes: 4096,
            durationMs: 1500,
            fps: options.fps,
            codec: "vp9_alpha",
          };
        },
      });

      const result = await ffmpegAdapter.encodeFramesToTransparentWebm({
        framesDir,
        outputWebmPath,
        fps: 24,
      });

      expect(result.outputWebmPath).toBe(outputWebmPath);
      expect(result.fileSizeBytes).toBe(4096);
      expect(result.durationMs).toBe(1500);
      expect(result.codec).toBe("vp9_alpha");
    });

    it("rejects with VideoEncodeError when frames directory does not exist", async () => {
      const root = await createTestRoot("anim-webm-nonexistent-");
      const ffmpegAdapter = createFfmpegAdapter();

      await expect(
        ffmpegAdapter.encodeFramesToTransparentWebm({
          framesDir: path.join(root, "does_not_exist"),
          outputWebmPath: path.join(root, "out.webm"),
          fps: 24,
        }),
      ).rejects.toMatchObject({
        name: "VideoEncodeError",
        code: "FRAMES_DIR_NOT_FOUND",
      });
    });

    it("rejects with VideoEncodeError when frames directory contains no PNG frames", async () => {
      const root = await createTestRoot("anim-webm-empty-dir-");
      const emptyFramesDir = path.join(root, "empty_dir");
      await fs.mkdir(emptyFramesDir, { recursive: true });

      const ffmpegAdapter = createFfmpegAdapter();

      await expect(
        ffmpegAdapter.encodeFramesToTransparentWebm({
          framesDir: emptyFramesDir,
          outputWebmPath: path.join(root, "out.webm"),
          fps: 24,
        }),
      ).rejects.toMatchObject({
        name: "VideoEncodeError",
        code: "NO_FRAMES_FOUND",
      });
    });

    it("rejects with VideoEncodeError when invalid FPS is provided", async () => {
      const root = await createTestRoot("anim-webm-invalid-fps-");
      const framesDir = path.join(root, "frames");
      await fs.mkdir(framesDir, { recursive: true });
      await fs.writeFile(path.join(framesDir, "frame_001.png"), createTransparentFramePng());

      const ffmpegAdapter = createFfmpegAdapter();

      await expect(
        ffmpegAdapter.encodeFramesToTransparentWebm({
          framesDir,
          outputWebmPath: path.join(root, "out.webm"),
          fps: 0,
        }),
      ).rejects.toMatchObject({
        name: "VideoEncodeError",
        code: "INVALID_FPS",
      });
    });

    it("aborts execution and rejects with ABORTED when AbortSignal triggers", async () => {
      const root = await createTestRoot("anim-webm-abort-");
      const framesDir = path.join(root, "frames");
      await fs.mkdir(framesDir, { recursive: true });

      for (let i = 1; i <= 30; i++) {
        await fs.writeFile(path.join(framesDir, `frame_${String(i).padStart(3, "0")}.png`), createTransparentFramePng(640, 360, i));
      }

      const abortController = new AbortController();
      const ffmpegAdapter = createFfmpegAdapter();

      const encodePromise = ffmpegAdapter.encodeFramesToTransparentWebm({
        framesDir,
        outputWebmPath: path.join(root, "abort.webm"),
        fps: 24,
        signal: abortController.signal,
      });

      setTimeout(() => abortController.abort(), 10);

      await expect(encodePromise).rejects.toMatchObject({
        name: "VideoEncodeError",
        code: "ABORTED",
      });
    });

    it("rejects immediately when AbortSignal is already aborted before starting", async () => {
      const root = await createTestRoot("anim-webm-preabort-");
      const framesDir = path.join(root, "frames");
      await fs.mkdir(framesDir, { recursive: true });
      await fs.writeFile(path.join(framesDir, "frame_001.png"), createTransparentFramePng());

      const abortController = new AbortController();
      abortController.abort(); // Pre-abort

      const ffmpegAdapter = createFfmpegAdapter();

      await expect(
        ffmpegAdapter.encodeFramesToTransparentWebm({
          framesDir,
          outputWebmPath: path.join(root, "preabort.webm"),
          fps: 24,
          signal: abortController.signal,
        }),
      ).rejects.toMatchObject({
        name: "VideoEncodeError",
        code: "ABORTED",
      });
    });

    it("times out and rejects with TIMEOUT when encoding exceeds timeoutMs", async () => {
      const root = await createTestRoot("anim-webm-timeout-");
      const framesDir = path.join(root, "frames");
      await fs.mkdir(framesDir, { recursive: true });

      for (let i = 1; i <= 60; i++) {
        await fs.writeFile(path.join(framesDir, `frame_${String(i).padStart(3, "0")}.png`), createTransparentFramePng(640, 360, i));
      }

      const ffmpegAdapter = createFfmpegAdapter();

      await expect(
        ffmpegAdapter.encodeFramesToTransparentWebm({
          framesDir,
          outputWebmPath: path.join(root, "timeout.webm"),
          fps: 24,
          timeoutMs: 1, // Extremely low timeout to force timeout
        }),
      ).rejects.toMatchObject({
        name: "VideoEncodeError",
        code: "TIMEOUT",
      });
    });
  });
});

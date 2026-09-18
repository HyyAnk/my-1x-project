import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { MascotAssetRegistrationSchema } from "@studio/shared";
import {
  createAnimationStorageAdapter,
  createMascotMattingAdapter,
  createFrameMattingService,
  createFrameRegistrationService,
  createAnimationPackagingService,
  createFfmpegAdapter,
  MascotMattingError,
  type MatteFrameInput,
} from "../../src/quiz/mascot/videoAnimation/index.js";
import { encodeRgbaToPng, type DecodedImage } from "../../src/utils/imageMatting.js";

describe("Stage B3 — Dynamic Frame Matting, Registration & WebM Animation Packaging", () => {
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

  async function createTestRoot(prefix = "anim-b3-"): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    testRoots.push(root);
    return root;
  }

  function createChromaFramePng(width = 64, height = 64, frameIndex = 1): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    const centerX = 32;
    const centerY = 32;
    const sway = Math.round(Math.sin(frameIndex * 0.2) * 6);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const dist = Math.sqrt((x - (centerX + sway)) ** 2 + (y - centerY) ** 2);
        if (dist <= 14) {
          // Mascot character (blue)
          data[idx] = 30;
          data[idx + 1] = 144;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        } else {
          // Chroma green background
          data[idx] = 0;
          data[idx + 1] = 255;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        }
      }
    }

    const decoded: DecodedImage = { width, height, data };
    return encodeRgbaToPng(decoded);
  }

  function createMattedFramePng(width = 64, height = 64, frameIndex = 1): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    const centerX = 32;
    const centerY = 32;
    const sway = Math.round(Math.sin(frameIndex * 0.2) * 6);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const dist = Math.sqrt((x - (centerX + sway)) ** 2 + (y - centerY) ** 2);
        if (dist <= 14) {
          data[idx] = 30;
          data[idx + 1] = 144;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        } else {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;
        }
      }
    }

    const decoded: DecodedImage = { width, height, data };
    return encodeRgbaToPng(decoded);
  }

  describe("Dynamic Matting Pipeline (4s / 96 frames & 10s / 300 frames)", () => {
    it("mattes a 4-second sequence (96 frames) with chunked batch processing", async () => {
      const root = await createTestRoot("matting-4s-");
      const storageAdapter = createAnimationStorageAdapter(root);
      const sourceDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "thinking", 1, 1, "source");
      await fs.mkdir(sourceDir, { recursive: true });

      const framePng = Buffer.from(createChromaFramePng(64, 64, 1));
      for (let i = 1; i <= 96; i++) {
        await fs.writeFile(path.join(sourceDir, `frame_${String(i).padStart(3, "0")}.png`), framePng);
      }

      const mattingAdapter = createMascotMattingAdapter();
      const service = createFrameMattingService(storageAdapter, mattingAdapter, { batchSize: 16 });

      const result = await service.matteAttemptFrames({
        mascotId: "owl",
        styleId: "pixel",
        state: "thinking",
        slotIndex: 1,
        attemptId: 1,
        mattingOptions: {
          targetColor: [0, 255, 0],
          tolerance: 30,
        },
      });

      expect(result.mattedFrames.length).toBe(96);
      expect(result.frameDiagnostics.length).toBe(96);
      expect(result.sequenceDiagnostics.alphaFlickerDetected).toBe(false);

      // Verify all 96 frames are written on disk
      const firstStat = await fs.stat(result.mattedFrames[0]);
      expect(firstStat.isFile()).toBe(true);
      expect(firstStat.size).toBeGreaterThan(0);

      const lastStat = await fs.stat(result.mattedFrames[95]);
      expect(lastStat.isFile()).toBe(true);
      expect(lastStat.size).toBeGreaterThan(0);
    });

    it("mattes a 10-second sequence (300 frames) with chunked batch processing without memory exhaustion", async () => {
      const root = await createTestRoot("matting-10s-");
      const storageAdapter = createAnimationStorageAdapter(root);
      const sourceDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "celebrate", 1, 1, "source");
      await fs.mkdir(sourceDir, { recursive: true });

      const framePng = Buffer.from(createChromaFramePng(64, 64, 1));
      for (let i = 1; i <= 300; i++) {
        await fs.writeFile(path.join(sourceDir, `frame_${String(i).padStart(3, "0")}.png`), framePng);
      }

      // Fast mock matting adapter for 300 frames
      const mattingAdapter = createMascotMattingAdapter({
        fixtureHandler: async (input: MatteFrameInput) => ({
          imageBytes: input.imageBytes,
          width: 64,
          height: 64,
          diagnostics: {
            hiddenRgbDetected: false,
            hiddenRgbPixelsZeroed: 0,
            residualBackgroundRatio: 0,
            holesDetected: false,
            edgeClippingDetected: false,
            transparentPixels: 200,
            opaquePixels: 400,
            translucentPixels: 20,
            contentBounds: { x: 18, y: 18, minX: 18, minY: 18, maxX: 46, maxY: 46, width: 29, height: 29 },
            alphaMean: 245,
          },
        }),
      });

      const service = createFrameMattingService(storageAdapter, mattingAdapter, { batchSize: 24 });

      const result = await service.matteAttemptFrames({
        mascotId: "owl",
        styleId: "pixel",
        state: "celebrate",
        slotIndex: 1,
        attemptId: 1,
      });

      expect(result.mattedFrames.length).toBe(300);
      expect(result.frameDiagnostics.length).toBe(300);
      expect(result.sequenceDiagnostics.alphaFlickerDetected).toBe(false);
    });

    it("strictly halts pipeline when a single frame fails matting in a dynamic sequence", async () => {
      const root = await createTestRoot("matting-fail-");
      const storageAdapter = createAnimationStorageAdapter(root);
      const sourceDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "thinking", 1, 1, "source");
      await fs.mkdir(sourceDir, { recursive: true });

      const framePng = Buffer.from(createChromaFramePng(64, 64, 1));
      for (let i = 1; i <= 96; i++) {
        await fs.writeFile(path.join(sourceDir, `frame_${String(i).padStart(3, "0")}.png`), framePng);
      }

      const mattingAdapter = createMascotMattingAdapter({
        fixtureHandler: async (input: MatteFrameInput) => {
          if (input.frameIndex === 42) {
            throw new MascotMattingError("Model segmentation collapsed on frame 42", "FRAME_MATTING_FAILED");
          }
          return {
            imageBytes: input.imageBytes,
            width: 64,
            height: 64,
            diagnostics: {
              hiddenRgbDetected: false,
              hiddenRgbPixelsZeroed: 0,
              residualBackgroundRatio: 0,
              holesDetected: false,
              edgeClippingDetected: false,
              transparentPixels: 200,
              opaquePixels: 400,
              translucentPixels: 20,
              contentBounds: { x: 18, y: 18, minX: 18, minY: 18, maxX: 46, maxY: 46, width: 29, height: 29 },
              alphaMean: 245,
            },
          };
        },
      });

      const service = createFrameMattingService(storageAdapter, mattingAdapter, { batchSize: 16 });

      await expect(
        service.matteAttemptFrames({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
        }),
      ).rejects.toMatchObject({
        name: "FrameMattingServiceError",
        code: "FRAME_MATTING_FAILED",
      });
    });
  });

  describe("Dynamic Sequence Registration", () => {
    it("computes common bounds and stable pivot across all 96 frames dynamically", async () => {
      const root = await createTestRoot("reg-96-");
      const storageAdapter = createAnimationStorageAdapter(root);
      const mattedDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "thinking", 1, 1, "matted");
      await fs.mkdir(mattedDir, { recursive: true });

      for (let i = 1; i <= 96; i++) {
        const pngBytes = createMattedFramePng(128, 128, i);
        await fs.writeFile(path.join(mattedDir, `frame_${String(i).padStart(3, "0")}.png`), Buffer.from(pngBytes));
      }

      const service = createFrameRegistrationService(storageAdapter);
      const result = await service.computeAttemptRegistration({
        mascotId: "owl",
        styleId: "pixel",
        state: "thinking",
        slotIndex: 1,
        attemptId: 1,
      });

      expect(result.canvas.width).toBe(128);
      expect(result.canvas.height).toBe(128);
      expect(result.commonBounds.width).toBeGreaterThan(20);
      expect(result.commonBounds.height).toBeGreaterThan(20);
      expect(result.frameCentroids.length).toBe(96);
      expect(result.maxDriftPx).toBeLessThan(50);

      const parsed = MascotAssetRegistrationSchema.parse(result.registration);
      expect(parsed.source_width).toBe(128);
      expect(parsed.source_height).toBe(128);
    });
  });

  describe("Packaging: Transparent WebM & Atlas Handling", () => {
    it("generates video_transparent.webm, atlas.png, and contact_sheet.png for <= 36 frames", async () => {
      const root = await createTestRoot("pkg-legacy-12-");
      const storageAdapter = createAnimationStorageAdapter(root);
      const mattedDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "celebrate", 1, 1, "matted");
      await fs.mkdir(mattedDir, { recursive: true });

      for (let i = 1; i <= 12; i++) {
        const pngBytes = createMattedFramePng(64, 64, i);
        await fs.writeFile(path.join(mattedDir, `frame_${String(i).padStart(3, "0")}.png`), Buffer.from(pngBytes));
      }

      const packagingService = createAnimationPackagingService(storageAdapter);

      const result = await packagingService.packageAttemptAnimation({
        mascotId: "owl",
        styleId: "pixel",
        state: "celebrate",
        slotIndex: 1,
        attemptId: 1,
        sourceVideoFingerprint: "fp_legacy_12",
      });

      // 1. Transparent WebM exists
      expect(result.transparentVideoPath).toContain("video_transparent.webm");
      const webmStat = await fs.stat(result.transparentVideoPath);
      expect(webmStat.isFile()).toBe(true);
      expect(webmStat.size).toBeGreaterThan(0);

      // 2. Atlas and contact sheet generated for <= 36 frames
      expect(result.atlasPath).toBeTruthy();
      expect(result.contactSheetPath).toBeTruthy();
      const atlasStat = await fs.stat(result.atlasPath!);
      expect(atlasStat.isFile()).toBe(true);
      expect(atlasStat.size).toBeGreaterThan(0);

      // 3. Manifest contains atlas and transparent video
      expect(result.manifest.frame_count).toBe(12);
      expect(result.manifest.fps).toBe(8);
      expect(result.manifest.transparent_video_url).toBe("video_transparent.webm");
      expect(result.manifest.alpha_codec).toBe("vp9_alpha");
      expect(result.manifest.atlas?.file_path).toBe("atlas.png");

      const validated = await packagingService.loadAndValidateAttemptManifest(result.manifestPath);
      expect(validated.frame_count).toBe(12);
      expect(validated.transparent_video_url).toBe("video_transparent.webm");
    });

    it("generates video_transparent.webm and SKIPS atlas generation for > 36 frames", async () => {
      const root = await createTestRoot("pkg-dynamic-96-");
      const storageAdapter = createAnimationStorageAdapter(root);
      const mattedDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "thinking", 1, 1, "matted");
      await fs.mkdir(mattedDir, { recursive: true });

      for (let i = 1; i <= 96; i++) {
        const pngBytes = createMattedFramePng(64, 64, i);
        await fs.writeFile(path.join(mattedDir, `frame_${String(i).padStart(3, "0")}.png`), Buffer.from(pngBytes));
      }

      const packagingService = createAnimationPackagingService(storageAdapter);

      const result = await packagingService.packageAttemptAnimation({
        mascotId: "owl",
        styleId: "pixel",
        state: "thinking",
        slotIndex: 1,
        attemptId: 1,
        sourceVideoFingerprint: "fp_dynamic_96",
        fps: 24,
      });

      // 1. Transparent WebM exists
      expect(result.transparentVideoPath).toContain("video_transparent.webm");
      const webmStat = await fs.stat(result.transparentVideoPath);
      expect(webmStat.isFile()).toBe(true);
      expect(webmStat.size).toBeGreaterThan(0);

      // 2. Atlas is strictly skipped to prevent memory crashing
      expect(result.atlasPath).toBeUndefined();
      expect(result.contactSheetPath).toBeUndefined();
      expect(result.manifest.atlas).toBeUndefined();

      // Atlas file does not exist in attempt directory
      const attemptDir = path.dirname(result.manifestPath);
      await expect(fs.stat(path.join(attemptDir, "atlas.png"))).rejects.toThrow();

      // 3. Manifest has dynamic video properties
      expect(result.manifest.frame_count).toBe(96);
      expect(result.manifest.fps).toBe(24);
      expect(result.manifest.duration_ms).toBe(4000);
      expect(result.manifest.transparent_video_url).toBe("video_transparent.webm");
      expect(result.manifest.alpha_codec).toBe("vp9_alpha");
      expect(result.manifest.frames?.length).toBe(96);

      // 4. Preview image exists
      const previewStat = await fs.stat(result.previewPath);
      expect(previewStat.isFile()).toBe(true);
      expect(previewStat.size).toBeGreaterThan(0);

      // 5. Validates roundtrip with loadAndValidateAttemptManifest
      const validated = await packagingService.loadAndValidateAttemptManifest(result.manifestPath);
      expect(validated.frame_count).toBe(96);
      expect(validated.transparent_video_url).toBe("video_transparent.webm");
      expect(validated.atlas).toBeUndefined();
    });

    it("supports injected FfmpegAdapter fixture in AnimationPackagingService", async () => {
      const root = await createTestRoot("pkg-fixture-");
      const storageAdapter = createAnimationStorageAdapter(root);
      const mattedDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "thinking", 1, 1, "matted");
      await fs.mkdir(mattedDir, { recursive: true });

      for (let i = 1; i <= 12; i++) {
        const pngBytes = createMattedFramePng(64, 64, i);
        await fs.writeFile(path.join(mattedDir, `frame_${String(i).padStart(3, "0")}.png`), Buffer.from(pngBytes));
      }

      let encodeCalled = false;
      const ffmpegAdapter = createFfmpegAdapter({
        fixtureEncodeWebmHandler: async (options) => {
          encodeCalled = true;
          // Create dummy webm file
          await fs.writeFile(options.outputWebmPath, Buffer.from("DUMMY_WEBM_BYTES"));
          return {
            outputWebmPath: options.outputWebmPath,
            fileSizeBytes: 16,
            durationMs: 1500,
            fps: options.fps,
            codec: "vp9_alpha",
          };
        },
      });

      const packagingService = createAnimationPackagingService(storageAdapter, { ffmpegAdapter });

      const result = await packagingService.packageAttemptAnimation({
        mascotId: "owl",
        styleId: "pixel",
        state: "thinking",
        slotIndex: 1,
        attemptId: 1,
        sourceVideoFingerprint: "fp_mock_ffmpeg",
      });

      expect(encodeCalled).toBe(true);
      expect(result.transparentVideoPath).toContain("video_transparent.webm");
      const webmContent = await fs.readFile(result.transparentVideoPath, "utf8");
      expect(webmContent).toBe("DUMMY_WEBM_BYTES");
    });
  });
});

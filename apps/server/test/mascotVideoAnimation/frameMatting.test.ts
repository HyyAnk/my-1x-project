import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import {
  createAnimationStorageAdapter,
  createMascotMattingAdapter,
  createFrameMattingService,
  cleanupAlphaAndExtractDiagnostics,
  computeSequenceAlphaDiagnostics,
  MascotMattingError,
  type FrameAlphaDiagnostics,
  type MatteFrameInput,
} from "../../src/quiz/mascot/videoAnimation/index.js";
import { encodeRgbaToPng, decodePngToRgba, type DecodedImage } from "../../src/utils/imageMatting.js";

describe("Stage 07 — Strict Frame Matting & Alpha Cleanup", () => {
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

  /**
   * Helper to create a dummy 64x64 RGBA image with specified center circle and background color.
   */
  function createTestRgbaImage(
    bgColor: [number, number, number, number],
    fgColor: [number, number, number, number],
    radius = 16,
  ): DecodedImage {
    const width = 64;
    const height = 64;
    const data = new Uint8Array(width * height * 4);
    const centerX = 32;
    const centerY = 32;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (dist <= radius) {
          data[idx] = fgColor[0];
          data[idx + 1] = fgColor[1];
          data[idx + 2] = fgColor[2];
          data[idx + 3] = fgColor[3];
        } else {
          data[idx] = bgColor[0];
          data[idx + 1] = bgColor[1];
          data[idx + 2] = bgColor[2];
          data[idx + 3] = bgColor[3];
        }
      }
    }

    return { width, height, data };
  }

  describe("Hidden-RGB Detection & Zeroing", () => {
    it("cleans RGB values under zero/near-zero alpha to prevent color bleeding", () => {
      const width = 10;
      const height = 10;
      const data = new Uint8Array(width * height * 4);

      // Create transparent pixels that contain residual bright green color (hidden RGB)
      for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        if (i < 50) {
          // Hidden RGB under alpha 0
          data[idx] = 0; // R
          data[idx + 1] = 255; // G (chroma bleed)
          data[idx + 2] = 0; // B
          data[idx + 3] = 0; // A = 0
        } else {
          // Genuine character pixels
          data[idx] = 200;
          data[idx + 1] = 100;
          data[idx + 2] = 50;
          data[idx + 3] = 255;
        }
      }

      const { cleanedImage, diagnostics } = cleanupAlphaAndExtractDiagnostics({ width, height, data });

      expect(diagnostics.hiddenRgbDetected).toBe(true);
      expect(diagnostics.hiddenRgbPixelsZeroed).toBe(50);

      // Verify that all transparent pixels now have strictly (0, 0, 0, 0)
      for (let i = 0; i < 50; i++) {
        const idx = i * 4;
        expect(cleanedImage.data[idx]).toBe(0);
        expect(cleanedImage.data[idx + 1]).toBe(0);
        expect(cleanedImage.data[idx + 2]).toBe(0);
        expect(cleanedImage.data[idx + 3]).toBe(0);
      }

      // Verify character pixels preserved
      expect(cleanedImage.data[50 * 4]).toBe(200);
      expect(cleanedImage.data[50 * 4 + 3]).toBe(255);
    });
  });

  describe("Edge Clipping & Holes Diagnostics", () => {
    it("detects edge clipping when character touches frame boundary", () => {
      const width = 20;
      const height = 20;
      const data = new Uint8Array(width * height * 4);

      // Place a character pixel right on the left edge (x = 0, y = 10)
      const edgeIdx = (10 * width + 0) * 4;
      data[edgeIdx] = 255;
      data[edgeIdx + 1] = 255;
      data[edgeIdx + 2] = 255;
      data[edgeIdx + 3] = 255;

      const { diagnostics } = cleanupAlphaAndExtractDiagnostics({ width, height, data });
      expect(diagnostics.edgeClippingDetected).toBe(true);
    });

    it("detects internal holes within character bounds", () => {
      const width = 40;
      const height = 40;
      const data = new Uint8Array(width * height * 4);

      // Create a solid box from (5,5) to (35,35)
      for (let y = 5; y <= 35; y++) {
        for (let x = 5; x <= 35; x++) {
          const idx = (y * width + x) * 4;
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        }
      }

      // Punch a transparent hole in the center: (18,18) to (22,22)
      for (let y = 18; y <= 22; y++) {
        for (let x = 18; x <= 22; x++) {
          const idx = (y * width + x) * 4;
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;
        }
      }

      const { diagnostics } = cleanupAlphaAndExtractDiagnostics({ width, height, data });
      expect(diagnostics.holesDetected).toBe(true);
    });
  });

  describe("Alpha Flicker Analysis", () => {
    it("flags alpha flicker when adjacent frame area jumps abruptly (> 40%)", () => {
      const baseDiag: FrameAlphaDiagnostics = {
        hiddenRgbDetected: false,
        hiddenRgbPixelsZeroed: 0,
        residualBackgroundRatio: 0,
        holesDetected: false,
        edgeClippingDetected: false,
        transparentPixels: 5000,
        opaquePixels: 10000,
        translucentPixels: 200,
        contentBounds: { x: 10, y: 10, minX: 10, minY: 10, maxX: 50, maxY: 50, width: 40, height: 40 },
        alphaMean: 250,
      };

      // 12 frames, with frame 5 suddenly losing 60% of its character area
      const frames: FrameAlphaDiagnostics[] = Array.from({ length: 12 }, (_, i) => {
        if (i === 4) {
          // Frame 5: abrupt area drop
          return { ...baseDiag, opaquePixels: 3500 };
        }
        return { ...baseDiag };
      });

      const seq = computeSequenceAlphaDiagnostics(frames);
      expect(seq.alphaFlickerDetected).toBe(true);
      expect(seq.maxAreaJump).toBeGreaterThan(0.4);
    });

    it("clears visual stability when area transitions smoothly between frames", () => {
      const baseDiag: FrameAlphaDiagnostics = {
        hiddenRgbDetected: false,
        hiddenRgbPixelsZeroed: 0,
        residualBackgroundRatio: 0,
        holesDetected: false,
        edgeClippingDetected: false,
        transparentPixels: 5000,
        opaquePixels: 10000,
        translucentPixels: 200,
        contentBounds: { x: 10, y: 10, minX: 10, minY: 10, maxX: 50, maxY: 50, width: 40, height: 40 },
        alphaMean: 250,
      };

      // Smooth variation (<= 5% between frames)
      const frames: FrameAlphaDiagnostics[] = Array.from({ length: 12 }, (_, i) => ({
        ...baseDiag,
        opaquePixels: 10000 + i * 50,
      }));

      const seq = computeSequenceAlphaDiagnostics(frames);
      expect(seq.alphaFlickerDetected).toBe(false);
      expect(seq.maxAreaJump).toBeLessThan(0.05);
    });
  });

  describe("Strict One-Frame Failure Rule (Core Invariant)", () => {
    it("fails the entire attempt when even 1 single required frame fails matting", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-matting-fail-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const sourceFramesDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "thinking", 1, 1, "source");
      await fs.mkdir(sourceFramesDir, { recursive: true });

      // Create 12 dummy frame PNGs
      const dummyPng = encodeRgbaToPng(createTestRgbaImage([0, 255, 0, 255], [0, 0, 255, 255]));
      for (let i = 1; i <= 12; i++) {
        const filename = `frame_${String(i).padStart(3, "0")}.png`;
        await fs.writeFile(path.join(sourceFramesDir, filename), Buffer.from(dummyPng));
      }

      // Mock adapter where frame 7 fails
      const mattingAdapter = createMascotMattingAdapter({
        fixtureHandler: async (input: MatteFrameInput) => {
          if (input.frameIndex === 7) {
            throw new MascotMattingError("Segmentation model collapsed on frame 7", "FRAME_MATTING_FAILED");
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
              transparentPixels: 100,
              opaquePixels: 200,
              translucentPixels: 20,
              contentBounds: { x: 10, y: 10, minX: 10, minY: 10, maxX: 30, maxY: 30, width: 20, height: 20 },
              alphaMean: 240,
            },
          };
        },
      });

      const service = createFrameMattingService(storageAdapter, mattingAdapter);

      await expect(
        service.matteAttemptFrames({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
        }),
      ).rejects.toMatchObject({
        code: "FRAME_MATTING_FAILED",
      });
    });

    it("rejects attempt when a required frame is missing from source frames directory", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-matting-missing-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const sourceFramesDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "thinking", 1, 1, "source");
      await fs.mkdir(sourceFramesDir, { recursive: true });

      // Create only frames 1 through 11 (missing frame 12)
      const dummyPng = encodeRgbaToPng(createTestRgbaImage([0, 255, 0, 255], [0, 0, 255, 255]));
      for (let i = 1; i <= 11; i++) {
        const filename = `frame_${String(i).padStart(3, "0")}.png`;
        await fs.writeFile(path.join(sourceFramesDir, filename), Buffer.from(dummyPng));
      }

      const mattingAdapter = createMascotMattingAdapter();
      const service = createFrameMattingService(storageAdapter, mattingAdapter);

      await expect(
        service.matteAttemptFrames({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
        }),
      ).rejects.toMatchObject({
        code: "REQUIRED_FRAME_MISSING",
      });
    });
  });

  describe("Real Matting Pipeline Integration", () => {
    it("successfully mattes a 12-frame sequence and writes transparent PNGs with diagnostics", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-matting-real-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const sourceFramesDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "celebrate", 1, 1, "source");
      await fs.mkdir(sourceFramesDir, { recursive: true });

      // Generate 12 real frames: green background with blue mascot circle
      const testImage = createTestRgbaImage([0, 255, 0, 255], [0, 0, 255, 255], 16);
      const testPng = encodeRgbaToPng(testImage);

      for (let i = 1; i <= 12; i++) {
        const filename = `frame_${String(i).padStart(3, "0")}.png`;
        await fs.writeFile(path.join(sourceFramesDir, filename), Buffer.from(testPng));
      }

      const mattingAdapter = createMascotMattingAdapter();
      const service = createFrameMattingService(storageAdapter, mattingAdapter);

      const result = await service.matteAttemptFrames({
        mascotId: "owl",
        styleId: "pixel",
        state: "celebrate",
        slotIndex: 1,
        attemptId: 1,
        mattingOptions: {
          targetColor: [0, 255, 0],
          tolerance: 30,
        },
      });

      expect(result.mattedFrames.length).toBe(12);
      expect(result.frameDiagnostics.length).toBe(12);
      expect(result.sequenceDiagnostics.alphaFlickerDetected).toBe(false);

      // Verify all 12 matted PNG files exist and are transparent at borders
      for (let i = 0; i < 12; i++) {
        const framePath = result.mattedFrames[i];
        const stats = await fs.stat(framePath);
        expect(stats.isFile()).toBe(true);
        expect(stats.size).toBeGreaterThan(0);

        const diag = result.frameDiagnostics[i];
        expect(diag.transparentPixels).toBeGreaterThan(0);
        expect(diag.opaquePixels).toBeGreaterThan(0);
        expect(diag.residualBackgroundRatio).toBe(0);
      }
    });

    it("cleans enclosed cavities (donut ring hole) while strictly preserving delicate character features (eyes/teeth)", async () => {
      const width = 64;
      const height = 64;
      const data = new Uint8Array(width * height * 4);
      const bg: [number, number, number] = [220, 220, 220];
      const charColor: [number, number, number] = [60, 140, 60]; // Green dragon body
      const eyeColor: [number, number, number] = [232, 218, 208]; // Dragon eye sclera / highlight

      const centerX = 32;
      const centerY = 32;

      // 1. Fill canvas with background
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          data[idx] = bg[0];
          data[idx + 1] = bg[1];
          data[idx + 2] = bg[2];
          data[idx + 3] = 255;
        }
      }

      // 2. Draw donut ring (character with trapped enclosed background cavity in the middle)
      // Outer radius 24, inner hole radius 10
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dist = Math.hypot(x - centerX, y - centerY);
          const idx = (y * width + x) * 4;
          if (dist <= 24 && dist > 10) {
            data[idx] = charColor[0];
            data[idx + 1] = charColor[1];
            data[idx + 2] = charColor[2];
            data[idx + 3] = 255;
          }
        }
      }

      // 3. Draw an eye on the character ring at (x=32, y=18)
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ex = 32 + dx;
          const ey = 18 + dy;
          const idx = (ey * width + ex) * 4;
          data[idx] = eyeColor[0];
          data[idx + 1] = eyeColor[1];
          data[idx + 2] = eyeColor[2];
          data[idx + 3] = 255;
        }
      }

      const mattingAdapter = createMascotMattingAdapter();
      const pngBytes = encodeRgbaToPng({ width, height, data });

      const result = await mattingAdapter.matteFrame({
        imageBytes: pngBytes,
        options: {
          targetColor: bg,
          tolerance: 28,
          cavityTolerance: 8,
          minCavitySize: 16,
        },
      });

      // Verify that the inner hole (x=32, y=32) was cleanly cleared (alpha = 0)
      const { cleanedImage } = cleanupAlphaAndExtractDiagnostics({
        width: result.width,
        height: result.height,
        data: decodePngToRgba(result.imageBytes).data,
      });

      const centerIdx = (centerY * width + centerX) * 4;
      expect(cleanedImage.data[centerIdx + 3]).toBe(0); // Inner hole is transparent!

      // Verify that the eye (x=32, y=18) is 100% preserved (alpha = 255)
      const eyeIdx = (18 * width + 32) * 4;
      expect(cleanedImage.data[eyeIdx + 3]).toBe(255); // Eye is intact!
      expect(cleanedImage.data[eyeIdx]).toBe(eyeColor[0]);
    });

    it("strictly preserves off-white eye sclera matching background color adjacent to pupil", async () => {
      const width = 64;
      const height = 64;
      const data = new Uint8Array(width * height * 4);
      // Realistic studio off-white backdrop
      const bg: [number, number, number] = [221, 216, 214];
      const charColor: [number, number, number] = [230, 95, 30]; // Orange dragon body
      // Eye sclera whose color is almost identical to the background (dist < 4)
      const eyeScleraColor: [number, number, number] = [223, 217, 212];
      const pupilColor: [number, number, number] = [15, 10, 10]; // Dark pupil

      // Fill canvas with background
      for (let i = 0; i < width * height; i++) {
        data[i * 4] = bg[0];
        data[i * 4 + 1] = bg[1];
        data[i * 4 + 2] = bg[2];
        data[i * 4 + 3] = 255;
      }

      // Draw character body circle radius 26 centered at (32, 32)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (Math.hypot(x - 32, y - 32) <= 26) {
            const idx = (y * width + x) * 4;
            data[idx] = charColor[0];
            data[idx + 1] = charColor[1];
            data[idx + 2] = charColor[2];
          }
        }
      }

      // Draw eye sclera region (radius 6 at 24, 24)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (Math.hypot(x - 24, y - 24) <= 6) {
            const idx = (y * width + x) * 4;
            data[idx] = eyeScleraColor[0];
            data[idx + 1] = eyeScleraColor[1];
            data[idx + 2] = eyeScleraColor[2];
          }
        }
      }

      // Draw dark pupil inside eye (radius 3 at 24, 24)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (Math.hypot(x - 24, y - 24) <= 3) {
            const idx = (y * width + x) * 4;
            data[idx] = pupilColor[0];
            data[idx + 1] = pupilColor[1];
            data[idx + 2] = pupilColor[2];
          }
        }
      }

      const mattingAdapter = createMascotMattingAdapter();
      const pngBytes = encodeRgbaToPng({ width, height, data });

      // Run with removeEnclosedCavities enabled
      const result = await mattingAdapter.matteFrame({
        imageBytes: pngBytes,
        options: {
          targetColor: bg,
          tolerance: 28,
          cavityTolerance: 8,
          minCavitySize: 16,
          removeEnclosedCavities: true,
        },
      });

      const decoded = decodePngToRgba(result.imageBytes);

      // Verify outer border (0,0) is cleanly transparent
      expect(decoded.data[(0 * width + 0) * 4 + 3]).toBe(0);

      // Verify eye sclera (x=20, y=24) is 100% PRESERVED and not eaten as a cavity!
      const scleraIdx = (24 * width + 20) * 4;
      expect(decoded.data[scleraIdx + 3]).toBe(255);
      expect(decoded.data[scleraIdx]).toBe(eyeScleraColor[0]);

      // Verify pupil (x=24, y=24) is 100% PRESERVED
      const pupilIdx = (24 * width + 24) * 4;
      expect(decoded.data[pupilIdx + 3]).toBe(255);
      expect(decoded.data[pupilIdx]).toBe(pupilColor[0]);
    });
  });
});

import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { MascotAssetRegistrationSchema } from "@studio/shared";
import {
  createAnimationStorageAdapter,
  createFrameRegistrationService,
  computeRegistrationFromGeometry,
  type FrameGeometryInput,
} from "../../src/quiz/mascot/videoAnimation/index.js";
import { encodeRgbaToPng, type DecodedImage } from "../../src/utils/imageMatting.js";

describe("Stage 08 — Mascot Sequence Common Registration", () => {
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

  function createTestMattedPng(width: number, height: number, box: { minX: number; minY: number; maxX: number; maxY: number }): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    for (let y = box.minY; y <= box.maxY; y++) {
      for (let x = box.minX; x <= box.maxX; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 100;
        data[idx + 1] = 150;
        data[idx + 2] = 200;
        data[idx + 3] = 255;
      }
    }
    const decoded: DecodedImage = { width, height, data };
    return encodeRgbaToPng(decoded);
  }

  describe("Geometry Computation & Bounds Union", () => {
    it("computes union common bounds and stable baseline pivot across swaying frames", () => {
      // 12 frames where character sways from left (minX = 250) to right (maxX = 600)
      const swayPattern = [0, 10, 20, 30, 40, 50, 50, 40, 30, 20, 10, 0];
      const frames: FrameGeometryInput[] = Array.from({ length: 12 }, (_, i) => {
        const swayX = swayPattern[i];
        return {
          frameIndex: i + 1,
          width: 1280,
          height: 720,
          bounds: {
            minX: 250 + swayX,
            minY: 100,
            maxX: 550 + swayX,
            maxY: 650, // stable base
          },
        };
      });

      const result = computeRegistrationFromGeometry({ frames });

      // minX should be minimum across all frames (250)
      expect(result.commonBounds.x).toBe(250);
      // maxX should be maximum across all frames (550 + 50 = 600)
      expect(result.commonBounds.width).toBe(600 - 250 + 1); // 351px
      expect(result.commonBounds.y).toBe(100);
      expect(result.commonBounds.height).toBe(650 - 100 + 1); // 551px

      // Pivot should be centered horizontally on commonBounds and anchored at baseline (maxY = 650)
      expect(result.commonPivot.x).toBe(Math.round(250 + 351 / 2));
      expect(result.commonPivot.y).toBe(650);

      // Verify contract schema compliance
      const validated = MascotAssetRegistrationSchema.parse(result.registration);
      expect(validated.source_width).toBe(1280);
      expect(validated.source_height).toBe(720);
      expect(validated.offset_x).toBe(0);
      expect(validated.offset_y).toBe(0);
    });

    it("verifies zero per-frame recentering invariant", () => {
      // If frames are swaying, registration offset must remain (0,0) so relative movement is preserved
      const frames: FrameGeometryInput[] = Array.from({ length: 12 }, (_, i) => ({
        frameIndex: i + 1,
        width: 1280,
        height: 720,
        bounds: {
          minX: 300 + i * 2,
          minY: 120 + i * 3,
          maxX: 500 + i * 2,
          maxY: 600,
        },
      }));

      const result = computeRegistrationFromGeometry({ frames });
      expect(result.registration.offset_x).toBe(0);
      expect(result.registration.offset_y).toBe(0);
    });
  });

  describe("Inconsistent Dimensions & Validation Rejection", () => {
    it("rejects inconsistent frame dimensions with INCONSISTENT_FRAME_DIMENSIONS", () => {
      const frames: FrameGeometryInput[] = Array.from({ length: 12 }, (_, i) => ({
        frameIndex: i + 1,
        width: 1280,
        height: 720,
        bounds: { minX: 100, minY: 100, maxX: 300, maxY: 300 },
      }));

      // Inconsistent frame 5: 1280x700 instead of 1280x720
      frames[4] = {
        frameIndex: 5,
        width: 1280,
        height: 700,
        bounds: { minX: 100, minY: 100, maxX: 300, maxY: 300 },
      };

      expect(() => computeRegistrationFromGeometry({ frames })).toThrowError(
        expect.objectContaining({
          code: "INCONSISTENT_FRAME_DIMENSIONS",
        }),
      );
    });

    it("rejects sequence with fewer than 12 frames with INVALID_FRAME_COUNT", () => {
      const frames: FrameGeometryInput[] = Array.from({ length: 10 }, (_, i) => ({
        frameIndex: i + 1,
        width: 1280,
        height: 720,
        bounds: { minX: 100, minY: 100, maxX: 300, maxY: 300 },
      }));

      expect(() => computeRegistrationFromGeometry({ frames })).toThrowError(
        expect.objectContaining({
          code: "INVALID_FRAME_COUNT",
        }),
      );
    });

    it("rejects empty or inverted frame bounds with EMPTY_FRAME_BOUNDS", () => {
      const frames: FrameGeometryInput[] = Array.from({ length: 12 }, (_, i) => ({
        frameIndex: i + 1,
        width: 1280,
        height: 720,
        bounds: { minX: 100, minY: 100, maxX: 300, maxY: 300 },
      }));

      // Frame 8 has minX > maxX
      frames[7] = {
        frameIndex: 8,
        width: 1280,
        height: 720,
        bounds: { minX: 400, minY: 100, maxX: 200, maxY: 300 },
      };

      expect(() => computeRegistrationFromGeometry({ frames })).toThrowError(
        expect.objectContaining({
          code: "EMPTY_FRAME_BOUNDS",
        }),
      );
    });
  });

  describe("Diagnostic Movement Metrics", () => {
    it("accepts large intentional centroid jumps without modifying the animation", () => {
      const frames: FrameGeometryInput[] = Array.from({ length: 12 }, (_, i) => {
        // Sudden jump of 250px at frame 6
        const jump = i >= 5 ? 250 : 0;
        return {
          frameIndex: i + 1,
          width: 1280,
          height: 720,
          bounds: {
            minX: 200 + jump,
            minY: 100,
            maxX: 400 + jump,
            maxY: 600,
          },
        };
      });

      const result = computeRegistrationFromGeometry({ frames });
      expect(result.maxDriftPx).toBe(250);
      expect(result.registration.offset_x).toBe(0);
      expect(result.registration.offset_y).toBe(0);
      expect(result.commonBounds).toEqual({ x: 200, y: 100, width: 451, height: 501 });
    });

    it("measures drift metrics accurately on smooth motion", () => {
      // 10px constant step per frame
      const frames: FrameGeometryInput[] = Array.from({ length: 12 }, (_, i) => ({
        frameIndex: i + 1,
        width: 1280,
        height: 720,
        bounds: {
          minX: 200 + i * 10,
          minY: 100,
          maxX: 400 + i * 10,
          maxY: 600,
        },
      }));

      const result = computeRegistrationFromGeometry({ frames });
      expect(result.maxDriftPx).toBe(10);
      expect(result.avgDriftPx).toBe(10);
    });
  });

  describe("Disk & Storage Registration Service Integration", () => {
    it("reads 12 matted frames from disk and computes valid schema registration", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-reg-disk-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const mattedDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "thinking", 1, 1, "matted");
      await fs.mkdir(mattedDir, { recursive: true });

      // Generate 12 real matted PNGs on disk with slight bobbing motion
      for (let i = 1; i <= 12; i++) {
        const bob = (i % 2) * 6;
        const pngBytes = createTestMattedPng(1280, 720, {
          minX: 300,
          minY: 150 + bob,
          maxX: 700,
          maxY: 680,
        });
        const filename = `frame_${String(i).padStart(3, "0")}.png`;
        await fs.writeFile(path.join(mattedDir, filename), Buffer.from(pngBytes));
      }

      const service = createFrameRegistrationService(storageAdapter);
      const result = await service.computeAttemptRegistration({
        mascotId: "owl",
        styleId: "pixel",
        state: "thinking",
        slotIndex: 1,
        attemptId: 1,
      });

      expect(result.canvas.width).toBe(1280);
      expect(result.canvas.height).toBe(720);
      expect(result.commonBounds.x).toBe(300);
      expect(result.commonBounds.y).toBe(150);
      expect(result.commonBounds.width).toBe(401);
      expect(result.commonBounds.height).toBe(531); // 680 - 150 + 1
      expect(result.commonPivot.y).toBe(680);

      // Verify schema parses without any error
      const parsed = MascotAssetRegistrationSchema.parse(result.registration);
      expect(parsed.source_width).toBe(1280);
      expect(parsed.source_height).toBe(720);
    });
  });
});

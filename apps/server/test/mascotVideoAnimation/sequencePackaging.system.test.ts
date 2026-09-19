import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import sharp from "sharp";
import { MascotAnimationManifestSchema } from "@studio/shared";
import { createAnimationStorageAdapter, createAnimationPackagingService } from "../../src/quiz/mascot/videoAnimation/index.js";
import { encodeRgbaToPng, type DecodedImage } from "../../src/utils/imageMatting.js";

describe("Stage 09 — Mascot Sequence Packaging & Manifest", () => {
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
        data[idx] = 30;
        data[idx + 1] = 144;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }
    const decoded: DecodedImage = { width, height, data };
    return encodeRgbaToPng(decoded);
  }

  describe("End-to-End Sequence Packaging", () => {
    it("packages 12 matted frames into atlas, contact sheet, preview, and validated manifest", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-pkg-e2e-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const mattedDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "thinking", 1, 1, "matted");
      await fs.mkdir(mattedDir, { recursive: true });

      // Create 12 matted frames on disk (640x360 for fast test rendering)
      for (let i = 1; i <= 12; i++) {
        const sway = Math.round(Math.sin(i) * 10);
        const pngBytes = createTestMattedPng(640, 360, {
          minX: 150 + sway,
          minY: 50,
          maxX: 350 + sway,
          maxY: 320,
        });
        const filename = `frame_${String(i).padStart(3, "0")}.png`;
        await fs.writeFile(path.join(mattedDir, filename), Buffer.from(pngBytes));
      }

      const packagingService = createAnimationPackagingService(storageAdapter);

      const result = await packagingService.packageAttemptAnimation({
        mascotId: "owl",
        styleId: "pixel",
        state: "thinking",
        slotIndex: 1,
        attemptId: 1,
        sourceVideoFingerprint: "fp_test_source_video_sha256_abcdef",
        cropToContent: true,
      });

      // 1. Check generated artifact files exist
      expect(result.manifestPath).toContain(path.normalize("attempts/att_1/manifest.json"));
      expect(result.atlasPath).toContain(path.normalize("attempts/att_1/atlas.png"));
      expect(result.contactSheetPath).toContain(path.normalize("attempts/att_1/contact_sheet.png"));
      expect(result.previewPath).toContain(path.normalize("attempts/att_1/preview.png"));

      const atlasStat = await fs.stat(result.atlasPath);
      expect(atlasStat.isFile()).toBe(true);
      expect(atlasStat.size).toBeGreaterThan(0);

      const contactStat = await fs.stat(result.contactSheetPath);
      expect(contactStat.isFile()).toBe(true);

      const previewStat = await fs.stat(result.previewPath);
      expect(previewStat.isFile()).toBe(true);

      // 2. Validate atlas dimensions via Sharp probe
      const atlasMeta = await sharp(result.atlasPath).metadata();
      expect(atlasMeta.width).toBe(result.manifest.atlas.width);
      expect(atlasMeta.height).toBe(result.manifest.atlas.height);
      expect(atlasMeta.channels).toBe(4);

      // 3. Validate manifest schema compliance
      const parsedManifest = MascotAnimationManifestSchema.parse(result.manifest);
      expect(parsedManifest.frame_count).toBe(12);
      expect(parsedManifest.fps).toBe(8);
      expect(parsedManifest.loop).toBe(true);
      expect(parsedManifest.frames.length).toBe(12);
      expect(parsedManifest.fingerprint).toBe(result.processingFingerprint);
      expect(parsedManifest.source_fingerprint).toBe("fp_test_source_video_sha256_abcdef");

      // 4. Validate all 12 frame rectangles
      for (let i = 0; i < 12; i++) {
        const frame = parsedManifest.frames[i];
        expect(frame.index).toBe(i);
        expect(frame.duration_ms).toBe(125);
        expect(frame.x).toBeGreaterThanOrEqual(0);
        expect(frame.y).toBeGreaterThanOrEqual(0);
        expect(frame.x + frame.width).toBeLessThanOrEqual(result.manifest.atlas.width);
        expect(frame.y + frame.height).toBeLessThanOrEqual(result.manifest.atlas.height);
      }
    });
  });

  describe("Round-Trip Manifest Importer & Validation", () => {
    it("loads, verifies atlas presence, and validates manifest from attempt directory", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-pkg-roundtrip-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const mattedDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "celebrate", 2, 1, "matted");
      await fs.mkdir(mattedDir, { recursive: true });

      for (let i = 1; i <= 12; i++) {
        const pngBytes = createTestMattedPng(640, 360, {
          minX: 200,
          minY: 100,
          maxX: 400,
          maxY: 300,
        });
        const filename = `frame_${String(i).padStart(3, "0")}.png`;
        await fs.writeFile(path.join(mattedDir, filename), Buffer.from(pngBytes));
      }

      const packagingService = createAnimationPackagingService(storageAdapter);
      const { manifestPath } = await packagingService.packageAttemptAnimation({
        mascotId: "owl",
        styleId: "pixel",
        state: "celebrate",
        slotIndex: 2,
        attemptId: 1,
        sourceVideoFingerprint: "fp_source_celebrate_slot2",
      });

      // Round-trip test: load by file path
      const loadedByFile = await packagingService.loadAndValidateAttemptManifest(manifestPath);
      expect(loadedByFile.state).toBe("celebrate");
      expect(loadedByFile.loop_policy).toBe("one_shot_rest");
      expect(loadedByFile.frame_count).toBe(12);

      // Round-trip test: load by directory path
      const attemptDir = path.dirname(manifestPath);
      const loadedByDir = await packagingService.loadAndValidateAttemptManifest(attemptDir);
      expect(loadedByDir.fingerprint).toBe(loadedByFile.fingerprint);
    });

    it("rejects manifest when frame rectangles exceed atlas boundaries with OUT_OF_BOUNDS_FRAME", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-pkg-oob-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const mattedDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "thinking", 1, 1, "matted");
      await fs.mkdir(mattedDir, { recursive: true });

      for (let i = 1; i <= 12; i++) {
        const pngBytes = createTestMattedPng(640, 360, { minX: 100, minY: 100, maxX: 300, maxY: 300 });
        await fs.writeFile(path.join(mattedDir, `frame_${String(i).padStart(3, "0")}.png`), Buffer.from(pngBytes));
      }

      const packagingService = createAnimationPackagingService(storageAdapter);
      const { manifestPath } = await packagingService.packageAttemptAnimation({
        mascotId: "owl",
        styleId: "pixel",
        state: "thinking",
        slotIndex: 1,
        attemptId: 1,
        sourceVideoFingerprint: "fp_oob_test",
      });

      // Read manifest, tamper frame 4 to exceed atlas width
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      manifest.frames[3].x = manifest.atlas.width + 10;
      await fs.writeFile(manifestPath, JSON.stringify(manifest), "utf8");

      await expect(packagingService.loadAndValidateAttemptManifest(manifestPath)).rejects.toMatchObject({
        code: "OUT_OF_BOUNDS_FRAME",
      });
    });

    it("rejects manifest when atlas file is missing from disk with ATLAS_MISSING", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-pkg-missing-atlas-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const mattedDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "thinking", 1, 1, "matted");
      await fs.mkdir(mattedDir, { recursive: true });

      for (let i = 1; i <= 12; i++) {
        const pngBytes = createTestMattedPng(640, 360, { minX: 100, minY: 100, maxX: 300, maxY: 300 });
        await fs.writeFile(path.join(mattedDir, `frame_${String(i).padStart(3, "0")}.png`), Buffer.from(pngBytes));
      }

      const packagingService = createAnimationPackagingService(storageAdapter);
      const { manifestPath, atlasPath } = await packagingService.packageAttemptAnimation({
        mascotId: "owl",
        styleId: "pixel",
        state: "thinking",
        slotIndex: 1,
        attemptId: 1,
        sourceVideoFingerprint: "fp_missing_atlas_test",
      });

      // Remove atlas file
      await fs.rm(atlasPath);

      await expect(packagingService.loadAndValidateAttemptManifest(manifestPath)).rejects.toMatchObject({
        code: "ATLAS_MISSING",
      });
    });

    it("rejects manifest with schema violation with SCHEMA_VIOLATION", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-pkg-schema-"));
      testRoots.push(root);

      const manifestPath = path.join(root, "manifest.json");
      // Invalid frame count (10 instead of 12)
      await fs.writeFile(
        manifestPath,
        JSON.stringify({
          version: 1,
          state: "thinking",
          recipe_id: "recipe",
          frame_count: 10,
          fps: 8,
          loop: true,
          loop_policy: "loop",
          atlas: { width: 100, height: 100 },
          frames: [],
          registration: {},
          fingerprint: "abc",
        }),
      );

      const storageAdapter = createAnimationStorageAdapter(root);
      const packagingService = createAnimationPackagingService(storageAdapter);

      await expect(packagingService.loadAndValidateAttemptManifest(manifestPath)).rejects.toMatchObject({
        code: "SCHEMA_VIOLATION",
      });
    });

    it("fails packaging when a required matted frame is missing with FRAME_MISSING", async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "anim-pkg-frame-missing-"));
      testRoots.push(root);

      const storageAdapter = createAnimationStorageAdapter(root);
      const mattedDir = storageAdapter.getAttemptFramesDir("owl", "pixel", "thinking", 1, 1, "matted");
      await fs.mkdir(mattedDir, { recursive: true });

      // Create only frames 1 through 11 (missing frame 12)
      for (let i = 1; i <= 11; i++) {
        const pngBytes = createTestMattedPng(640, 360, { minX: 100, minY: 100, maxX: 300, maxY: 300 });
        await fs.writeFile(path.join(mattedDir, `frame_${String(i).padStart(3, "0")}.png`), Buffer.from(pngBytes));
      }

      const packagingService = createAnimationPackagingService(storageAdapter);

      await expect(
        packagingService.packageAttemptAnimation({
          mascotId: "owl",
          styleId: "pixel",
          state: "thinking",
          slotIndex: 1,
          attemptId: 1,
          sourceVideoFingerprint: "fp_test",
        }),
      ).rejects.toMatchObject({
        code: "FRAME_MISSING",
      });
    });
  });
});

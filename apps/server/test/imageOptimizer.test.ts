import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getOptimalAssetDimensions, optimizeRenderImage } from "../src/tasks/video/imageOptimizer.js";

describe("imageOptimizer", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `studio-img-opt-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("calculates layout-aware optimal dimensions correctly", () => {
    expect(getOptimalAssetDimensions("choice_thumbnail")).toEqual({ maxWidth: 640, maxHeight: 480 });
    expect(getOptimalAssetDimensions("hero", "visual_choices_three")).toEqual({ maxWidth: 640, maxHeight: 480 });
    expect(getOptimalAssetDimensions("hero", "media_left_choices_right")).toEqual({ maxWidth: 1080, maxHeight: 810 });
    expect(getOptimalAssetDimensions("hero", "baseline")).toEqual({ maxWidth: 1080, maxHeight: 608 });
    expect(getOptimalAssetDimensions()).toEqual({ maxWidth: 1280, maxHeight: 720 });
  });

  it("resizes high-resolution PNG image down to target bounds while maintaining aspect ratio", async () => {
    const sourcePath = path.join(tempDir, "high-res.png");
    const targetPath = path.join(tempDir, "optimized.png");

    // Generate a 2000x1000 PNG
    await sharp({
      create: {
        width: 2000,
        height: 1000,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(sourcePath);

    const result = await optimizeRenderImage({
      sourcePath,
      targetPath,
      maxWidth: 1280,
      maxHeight: 720,
    });

    expect(result.optimized).toBe(true);
    expect(result.skippedExisting).toBe(false);

    const targetMeta = await sharp(targetPath).metadata();
    expect(targetMeta.width).toBeLessThanOrEqual(1280);
    expect(targetMeta.height).toBeLessThanOrEqual(720);
    // 2000x1000 scaled to fit 1280x720 should be 1280x640
    expect(targetMeta.width).toBe(1280);
    expect(targetMeta.height).toBe(640);
  });

  it("copies directly without modification when image is already smaller than target bounds", async () => {
    const sourcePath = path.join(tempDir, "small.png");
    const targetPath = path.join(tempDir, "small-out.png");

    // Generate a 400x300 PNG
    await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(sourcePath);

    const result = await optimizeRenderImage({
      sourcePath,
      targetPath,
      maxWidth: 1280,
      maxHeight: 720,
    });

    expect(result.optimized).toBe(false);
    const targetMeta = await sharp(targetPath).metadata();
    expect(targetMeta.width).toBe(400);
    expect(targetMeta.height).toBe(300);
  });

  it("skips re-optimization when target file already exists and is fresh", async () => {
    const sourcePath = path.join(tempDir, "cached.png");
    const targetPath = path.join(tempDir, "cached-target.png");

    await sharp({
      create: {
        width: 1600,
        height: 1200,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 1 },
      },
    })
      .png()
      .toFile(sourcePath);

    // First run
    const firstRun = await optimizeRenderImage({ sourcePath, targetPath, maxWidth: 800, maxHeight: 600 });
    expect(firstRun.optimized).toBe(true);
    expect(firstRun.skippedExisting).toBe(false);

    // Second run (target exists and is fresh)
    const secondRun = await optimizeRenderImage({ sourcePath, targetPath, maxWidth: 800, maxHeight: 600 });
    expect(secondRun.skippedExisting).toBe(true);
  });

  it("safely falls back to file copy for non-image or plain text files", async () => {
    const sourcePath = path.join(tempDir, "doc.txt");
    const targetPath = path.join(tempDir, "doc-out.txt");

    await writeFile(sourcePath, "Hello world", "utf8");

    const result = await optimizeRenderImage({ sourcePath, targetPath });
    expect(result.optimized).toBe(false);

    const content = await readFile(targetPath, "utf8");
    expect(content).toBe("Hello world");
  });
});

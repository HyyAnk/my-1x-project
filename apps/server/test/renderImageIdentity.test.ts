import { mkdir, rm, utimes } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRenderImageIdentity } from "../src/tasks/video/renderImageIdentity.js";
import { optimizeRenderImage } from "../src/tasks/video/imageOptimizer.js";

describe("renderImageIdentity", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `render-img-id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("produces deterministic keys that differ when target bounds change", () => {
    const keyForSmallBounds = createRenderImageIdentity({
      sourceFingerprint: "sha256-content-abc",
      targetBounds: { width: 672, height: 504 },
      fit: "inside",
      quality: 90,
    });

    const keyForLargeBounds = createRenderImageIdentity({
      sourceFingerprint: "sha256-content-abc",
      targetBounds: { width: 1024, height: 576 },
      fit: "inside",
      quality: 90,
    });

    const keyForSameInputs = createRenderImageIdentity({
      sourceFingerprint: "sha256-content-abc",
      targetBounds: { width: 672, height: 504 },
      fit: "inside",
      quality: 90,
    });

    expect(keyForSmallBounds).not.toBe(keyForLargeBounds);
    expect(keyForSameInputs).toBe(keyForSmallBounds);
  });

  it("invalidates optimized copy when target bounds change even if target mtime is newer (regression test)", async () => {
    const sourcePath = path.join(tempDir, "source.png");
    const targetPath = path.join(tempDir, "optimized-output.png");

    // Create a 2000x1500 source image
    await sharp({
      create: {
        width: 2000,
        height: 1500,
        channels: 4,
        background: { r: 100, g: 150, b: 200, alpha: 1 },
      },
    })
      .png()
      .toFile(sourcePath);

    // Call 1: Optimize to small bounds (672x504)
    const firstResult = await optimizeRenderImage({
      sourcePath,
      targetPath,
      maxWidth: 672,
      maxHeight: 504,
    });
    expect(firstResult.optimized).toBe(true);
    expect(firstResult.skippedExisting).toBe(false);
    expect(firstResult.targetWidth).toBe(672);
    expect(firstResult.targetHeight).toBe(504);

    // Explicitly bump the target mtime to simulate a newer file
    const futureTime = new Date(Date.now() + 5000);
    await utimes(targetPath, futureTime, futureTime);

    // Call 2: Optimize to larger bounds (1024x768) with same targetPath and newer mtime
    // Must NOT incorrectly report skippedExisting because target bounds changed!
    const secondResult = await optimizeRenderImage({
      sourcePath,
      targetPath,
      maxWidth: 1024,
      maxHeight: 768,
    });
    expect(secondResult.skippedExisting).toBe(false);
    expect(secondResult.targetWidth).toBe(1024);
    expect(secondResult.targetHeight).toBe(768);

    // Call 3: Optimize to same larger bounds (1024x768)
    // Should now report skippedExisting: true!
    const thirdIdenticalResult = await optimizeRenderImage({
      sourcePath,
      targetPath,
      maxWidth: 1024,
      maxHeight: 768,
    });
    expect(thirdIdenticalResult.skippedExisting).toBe(true);
    expect(thirdIdenticalResult.targetWidth).toBe(1024);
  });
});

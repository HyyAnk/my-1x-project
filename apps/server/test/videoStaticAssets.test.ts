import { describe, expect, it } from "vitest";
import { mkdtemp, rm, stat, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { syncSfxAssets, syncStaticMediaAssets } from "../src/tasks/video/videoStaticAssets.js";

describe("videoStaticAssets", () => {
  it("synchronizes SFX files to target directory and avoids redundant copies", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "static-assets-test-"));
    try {
      const rootDir = path.join(tempDir, "mock-root");
      const templatesSfx = path.join(rootDir, "templates", "sfx");
      const renderRoot = path.join(tempDir, "render-root");

      await mkdir(templatesSfx, { recursive: true });
      await writeFile(path.join(templatesSfx, "ui_pop.wav"), "DUMMY_SFX_CONTENT", "utf8");

      await syncSfxAssets(renderRoot, rootDir);

      const targetFile = path.join(renderRoot, "sfx", "ui_pop.wav");
      const stat1 = await stat(targetFile);
      expect(stat1.size).toBeGreaterThan(0);

      // Run sync again - should be idempotent and fast
      await syncSfxAssets(renderRoot, rootDir);
      const stat2 = await stat(targetFile);
      expect(stat2.size).toBe(stat1.size);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("synchronizes static media and returns font fingerprints array", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "media-sync-test-"));
    try {
      const renderRoot = path.join(tempDir, "render");
      // Use actual workspace root
      const workspaceRoot = path.resolve(".");
      const result = await syncStaticMediaAssets(renderRoot, workspaceRoot);

      expect(Array.isArray(result.fontFingerprints)).toBe(true);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

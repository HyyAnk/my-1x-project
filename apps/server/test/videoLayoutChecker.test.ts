import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getOptimalSampleCount, verifyAndCheckLayout } from "../src/tasks/video/videoLayoutChecker.js";
import { writeRenderCheckpoint, readRenderCheckpoint } from "../src/tasks/checkpoints.js";

describe("videoLayoutChecker", () => {
  it("determines optimal sample count based on quality preset", () => {
    expect(getOptimalSampleCount("draft")).toBe(1);
    expect(getOptimalSampleCount("standard")).toBe(2);
    expect(getOptimalSampleCount("high")).toBe(5);
    expect(getOptimalSampleCount(undefined)).toBe(5);
  });

  it("recycles verified checkpoint when source fingerprint matches", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "layout-checker-test-"));
    try {
      const sourceFingerprint = "fingerprint_abc123";
      const checkpointPath = path.join(tempDir, "render-checkpoint.json");

      await writeRenderCheckpoint(checkpointPath, {
        schema_version: 2,
        source_fingerprint: sourceFingerprint,
        check: { status: "passed" },
      });

      const result = await verifyAndCheckLayout({
        renderRoot: tempDir,
        rootDir: tempDir,
        sourceFingerprint,
      });

      expect(result.status).toBe("passed");
      expect(result.reused).toBe(true);
      expect(result.bypassed).toBe(false);
      expect(result.samplesCount).toBe(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("bypasses layout check when fastRenderMode is enabled and creates valid checkpoint", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "layout-checker-fast-"));
    try {
      const sourceFingerprint = "fingerprint_fast_xyz";
      const checkpointPath = path.join(tempDir, "render-checkpoint.json");

      const progressMessages: string[] = [];
      const result = await verifyAndCheckLayout({
        renderRoot: tempDir,
        rootDir: tempDir,
        sourceFingerprint,
        fastRenderMode: true,
        onProgress: (msg) => {
          progressMessages.push(msg);
        },
      });

      expect(result.status).toBe("passed");
      expect(result.bypassed).toBe(true);
      expect(result.reused).toBe(false);
      expect(result.samplesCount).toBe(0);
      expect(progressMessages).toContain("Video · fast render mode: layout pre-verified");

      const checkpoint = await readRenderCheckpoint(checkpointPath);
      expect(checkpoint?.source_fingerprint).toBe(sourceFingerprint);
      expect(checkpoint?.check.status).toBe("passed");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("bypasses layout check when FAST_RENDER_MODE environment variable is set to true", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "layout-checker-env-"));
    const originalEnv = process.env.FAST_RENDER_MODE;
    process.env.FAST_RENDER_MODE = "true";
    try {
      const sourceFingerprint = "fingerprint_env_xyz";
      const checkpointPath = path.join(tempDir, "render-checkpoint.json");

      const result = await verifyAndCheckLayout({
        renderRoot: tempDir,
        rootDir: tempDir,
        sourceFingerprint,
      });

      expect(result.status).toBe("passed");
      expect(result.bypassed).toBe(true);

      const checkpoint = await readRenderCheckpoint(checkpointPath);
      expect(checkpoint?.source_fingerprint).toBe(sourceFingerprint);
      expect(checkpoint?.check.status).toBe("passed");
    } finally {
      if (originalEnv !== undefined) {
        process.env.FAST_RENDER_MODE = originalEnv;
      } else {
        delete process.env.FAST_RENDER_MODE;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});


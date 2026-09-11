import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { RepositoryError } from "../src/repository.js";

const mocks = vi.hoisted(() => ({
  execFileAsync: vi.fn(),
  healCompositionContrast: vi.fn(),
}));

vi.mock("node:child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:child_process")>();
  const execFile = vi.fn();
  (execFile as unknown as Record<symbol, unknown>)[Symbol.for("nodejs.util.promisify.custom")] = mocks.execFileAsync;
  return {
    ...original,
    execFile,
  };
});

vi.mock("../src/quiz/qa/contrastHealer.js", () => ({
  healCompositionContrast: (...args: unknown[]) => mocks.healCompositionContrast(...args),
}));

import { getOptimalSampleCount, verifyAndCheckLayout } from "../src/tasks/video/videoLayoutChecker.js";
import { writeRenderCheckpoint, readRenderCheckpoint } from "../src/tasks/checkpoints.js";

const cleanupDirs: string[] = [];

afterEach(async () => {
  mocks.execFileAsync.mockReset();
  mocks.healCompositionContrast.mockReset();
  await Promise.all(cleanupDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

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
      expect(progressMessages).toContain("Video · fast render mode: layout check skipped");

      const checkpoint = await readRenderCheckpoint(checkpointPath);
      expect(checkpoint?.source_fingerprint).toBe(sourceFingerprint);
      expect(checkpoint?.check.status).toBe("skipped_fast_mode");
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
      expect(checkpoint?.check.status).toBe("skipped_fast_mode");
    } finally {
      if (originalEnv !== undefined) {
        process.env.FAST_RENDER_MODE = originalEnv;
      } else {
        delete process.env.FAST_RENDER_MODE;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("does not bypass layout check when FAST_RENDER_MODE environment variable is set to false", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "layout-checker-env-false-"));
    const originalEnv = process.env.FAST_RENDER_MODE;
    process.env.FAST_RENDER_MODE = "false";
    mocks.execFileAsync.mockResolvedValueOnce({
      stdout: JSON.stringify({ ok: true, layout: { findings: [] }, contrast: { findings: [] } }),
      stderr: "",
    });
    try {
      const sourceFingerprint = "fingerprint_env_false_xyz";
      const checkpointPath = path.join(tempDir, "render-checkpoint.json");

      const result = await verifyAndCheckLayout({
        renderRoot: tempDir,
        rootDir: tempDir,
        sourceFingerprint,
        renderQuality: "draft",
      });

      expect(result.status).toBe("passed");
      expect(result.bypassed).toBe(false);
      expect(result.samplesCount).toBe(1);
      expect(mocks.execFileAsync).toHaveBeenCalledTimes(1);

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

  it("succeeds with status passed and invokes auto-healing when check reports persistent contrast issues (exit code 0)", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "layout-checker-contrast-ok-"));
    cleanupDirs.push(tempDir);
    const sourceFingerprint = "fingerprint_contrast_001";
    const checkpointPath = path.join(tempDir, "render-checkpoint.json");

    const contrastReportJson = JSON.stringify({
      ok: false,
      contrast: {
        findings: [
          {
            severity: "error",
            message: "Insufficient color contrast",
            text: "Question Title text",
            ratio: 2.1,
            requiredRatio: 4.5,
          },
        ],
      },
    });

    mocks.execFileAsync
      .mockResolvedValueOnce({ stdout: contrastReportJson, stderr: "" })
      .mockResolvedValueOnce({ stdout: contrastReportJson, stderr: "" });
    mocks.healCompositionContrast.mockResolvedValue(true);

    const progressMessages: string[] = [];
    const result = await verifyAndCheckLayout({
      renderRoot: tempDir,
      rootDir: tempDir,
      sourceFingerprint,
      renderQuality: "high",
      onProgress: (msg) => {
        progressMessages.push(msg);
      },
    });

    expect(result.status).toBe("passed");
    expect(result.reused).toBe(false);
    expect(result.bypassed).toBe(false);
    expect(result.samplesCount).toBe(5);

    expect(mocks.execFileAsync).toHaveBeenCalledTimes(2);
    expect(mocks.healCompositionContrast).toHaveBeenCalledTimes(1);
    expect(progressMessages).toContain("Video · auto-healing contrast issues...");

    const checkpoint = await readRenderCheckpoint(checkpointPath);
    expect(checkpoint?.source_fingerprint).toBe(sourceFingerprint);
    expect(checkpoint?.check.status).toBe("passed");
  });

  it("succeeds with status passed when check fails with non-zero exit code but only contrast issues are reported", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "layout-checker-contrast-err-"));
    cleanupDirs.push(tempDir);
    const sourceFingerprint = "fingerprint_contrast_002";
    const checkpointPath = path.join(tempDir, "render-checkpoint.json");

    const contrastReportJson = JSON.stringify({
      ok: false,
      contrast: {
        findings: [
          {
            severity: "error",
            message: "Low contrast on subtitle",
            text: "Subtitle text",
            ratio: 2.8,
            requiredRatio: 4.5,
          },
        ],
      },
    });

    const failure1 = Object.assign(new Error("Command failed with exit code 1"), { stdout: contrastReportJson });
    const failure2 = Object.assign(new Error("Command failed with exit code 1"), { stdout: contrastReportJson });

    mocks.execFileAsync.mockRejectedValueOnce(failure1).mockRejectedValueOnce(failure2);
    mocks.healCompositionContrast.mockResolvedValue(true);

    const progressMessages: string[] = [];
    const result = await verifyAndCheckLayout({
      renderRoot: tempDir,
      rootDir: tempDir,
      sourceFingerprint,
      renderQuality: "standard",
      onProgress: (msg) => {
        progressMessages.push(msg);
      },
    });

    expect(result.status).toBe("passed");
    expect(result.reused).toBe(false);
    expect(result.bypassed).toBe(false);
    expect(result.samplesCount).toBe(2);

    expect(mocks.execFileAsync).toHaveBeenCalledTimes(2);
    expect(mocks.healCompositionContrast).toHaveBeenCalledTimes(1);
    expect(progressMessages).toContain("Video · auto-healing contrast issues...");

    const checkpoint = await readRenderCheckpoint(checkpointPath);
    expect(checkpoint?.source_fingerprint).toBe(sourceFingerprint);
    expect(checkpoint?.check.status).toBe("passed");
  });

  it("throws QUIZ_COMPOSITION_CHECK_FAILED when blocking layout issues are detected (exit code 0)", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "layout-checker-blocking-0-"));
    cleanupDirs.push(tempDir);
    const sourceFingerprint = "fingerprint_blocking_001";

    const blockingReportJson = JSON.stringify({
      ok: false,
      layout: {
        findings: [
          {
            severity: "error",
            message: "Element overflowed screen bounds",
          },
        ],
      },
    });

    mocks.execFileAsync.mockResolvedValueOnce({ stdout: blockingReportJson, stderr: "" });

    await expect(
      verifyAndCheckLayout({
        renderRoot: tempDir,
        rootDir: tempDir,
        sourceFingerprint,
        renderQuality: "draft",
      }),
    ).rejects.toThrowError(RepositoryError);

    expect(mocks.healCompositionContrast).not.toHaveBeenCalled();
    expect(mocks.execFileAsync).toHaveBeenCalledTimes(1);
  });

  it("throws QUIZ_COMPOSITION_CHECK_FAILED when check fails with non-zero exit code and blocking issues", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "layout-checker-blocking-err-"));
    cleanupDirs.push(tempDir);
    const sourceFingerprint = "fingerprint_blocking_002";

    const blockingReportJson = JSON.stringify({
      ok: false,
      runtime: {
        findings: [
          {
            severity: "fatal",
            message: "ReferenceError: window is not defined",
          },
        ],
      },
    });

    const failure = Object.assign(new Error("Command failed with exit code 1"), { stdout: blockingReportJson });
    mocks.execFileAsync.mockRejectedValueOnce(failure);

    await expect(
      verifyAndCheckLayout({
        renderRoot: tempDir,
        rootDir: tempDir,
        sourceFingerprint,
        renderQuality: "draft",
      }),
    ).rejects.toThrowError(RepositoryError);

    expect(mocks.healCompositionContrast).not.toHaveBeenCalled();
  });

  it("throws QUIZ_COMPOSITION_CHECK_FAILED when check fails with non-zero exit code and no valid report", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "layout-checker-hard-err-"));
    cleanupDirs.push(tempDir);
    const sourceFingerprint = "fingerprint_hard_err";

    const failure = new Error("spawn hyperframes ENOENT");
    mocks.execFileAsync.mockRejectedValueOnce(failure);

    await expect(
      verifyAndCheckLayout({
        renderRoot: tempDir,
        rootDir: tempDir,
        sourceFingerprint,
      }),
    ).rejects.toThrowError(RepositoryError);

    expect(mocks.healCompositionContrast).not.toHaveBeenCalled();
  });
});

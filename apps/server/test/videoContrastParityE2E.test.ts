import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { RepositoryError } from "../src/repository.js";

const mocks = vi.hoisted(() => ({
  execFileAsync: vi.fn(),
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

import { verifyAndCheckLayout } from "../src/tasks/video/videoLayoutChecker.js";
import { readRenderCheckpoint } from "../src/tasks/checkpoints.js";

const cleanupDirs: string[] = [];

afterEach(async () => {
  mocks.execFileAsync.mockReset();
  await Promise.all(cleanupDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("Video Contrast Parity & Resilience E2E", () => {
  it("passes layout verification with status passed when compositions have severe, unhealable contrast violations (ratio 1.0:1)", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "contrast-parity-severe-"));
    cleanupDirs.push(tempDir);
    const sourceFingerprint = "fingerprint_contrast_severe_100";
    const checkpointPath = path.join(tempDir, "render-checkpoint.json");

    // Create realistic HTML composition files
    const indexHtml = path.join(tempDir, "index.html");
    await writeFile(
      indexHtml,
      `<!doctype html><html><head><title>Severe Contrast Test</title></head><body><h1 class="question-title">White on White</h1><span class="keyword-highlight">Invisible Text</span></body></html>`,
      "utf8",
    );

    // Severe contrast report with ratio 1.0:1 across multiple components
    const severeContrastReportJson = JSON.stringify({
      ok: false,
      contrast: {
        findings: [
          {
            severity: "error",
            message: "Color contrast ratio 1.00:1 fails WCAG AA minimum 4.5:1",
            text: "White on White",
            ratio: 1.0,
            requiredRatio: 4.5,
            time: 12.5,
          },
          {
            severity: "fatal",
            message: "Extreme contrast failure: foreground and background colors are identical",
            text: "Invisible Text",
            ratio: 1.0,
            requiredRatio: 3.0,
            time: 14.0,
          },
          {
            severity: "error",
            message: "Insufficient badge contrast",
            text: "Option A",
            ratio: 1.15,
            requiredRatio: 3.0,
            time: 16.2,
          },
        ],
      },
    });

    // Unhealable contrast: attempt 1 and attempt 2 both return severe contrast violations
    mocks.execFileAsync
      .mockResolvedValueOnce({ stdout: severeContrastReportJson, stderr: "" })
      .mockResolvedValueOnce({ stdout: severeContrastReportJson, stderr: "" });

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

    // Verify verification succeeds and does not fail or abort
    expect(result.status).toBe("passed");
    expect(result.reused).toBe(false);
    expect(result.bypassed).toBe(false);
    expect(result.samplesCount).toBe(5);

    // Verify auto-healing was attempted between attempts
    expect(mocks.execFileAsync).toHaveBeenCalledTimes(2);
    expect(progressMessages).toContain("Video · auto-healing contrast issues...");

    // Verify self-healing CSS was actually injected into index.html on disk
    const patchedContent = await readFile(indexHtml, "utf8");
    expect(patchedContent).toContain('id="hyperframes-contrast-healer"');
    expect(patchedContent).toContain(".keyword-highlight { color: #047857 !important;");

    // Verify checkpoint is stored with status passed so subsequent renders can reuse it
    const checkpoint = await readRenderCheckpoint(checkpointPath);
    expect(checkpoint).not.toBeNull();
    expect(checkpoint?.source_fingerprint).toBe(sourceFingerprint);
    expect(checkpoint?.check.status).toBe("passed");
  });

  it("recovers and finishes with status passed when HyperFrames check fails with non-zero exit code solely due to contrast errors", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "contrast-parity-exit1-"));
    cleanupDirs.push(tempDir);
    const sourceFingerprint = "fingerprint_contrast_exit1";

    const indexHtml = path.join(tempDir, "index.html");
    await writeFile(
      indexHtml,
      `<!doctype html><html><head></head><body><div class="fact-card"><p>Low contrast fact</p></div></body></html>`,
      "utf8",
    );

    const contrastReportJson = JSON.stringify({
      ok: false,
      contrast: {
        findings: [
          {
            severity: "error",
            message: "Text contrast ratio is 1.10:1 (WCAG AA requirement: 4.5:1)",
            text: "Low contrast fact",
            ratio: 1.1,
            requiredRatio: 4.5,
          },
        ],
      },
    });

    // Simulating non-zero exit code 1 thrown by child_process execFile
    const error1 = Object.assign(new Error("Command failed with exit code 1: hyperframes check"), {
      stdout: contrastReportJson,
    });
    const error2 = Object.assign(new Error("Command failed with exit code 1: hyperframes check"), {
      stdout: contrastReportJson,
    });

    mocks.execFileAsync.mockRejectedValueOnce(error1).mockRejectedValueOnce(error2);

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
    expect(result.samplesCount).toBe(2);
    expect(mocks.execFileAsync).toHaveBeenCalledTimes(2);
    expect(progressMessages).toContain("Video · auto-healing contrast issues...");

    const checkpoint = await readRenderCheckpoint(path.join(tempDir, "render-checkpoint.json"));
    expect(checkpoint?.check.status).toBe("passed");
  });

  it("handles auto-healing gracefully even when healed composition still has residual contrast warnings", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "contrast-parity-residual-"));
    cleanupDirs.push(tempDir);
    const sourceFingerprint = "fingerprint_contrast_residual";

    const initialReport = JSON.stringify({
      ok: false,
      contrast: {
        findings: [
          {
            severity: "error",
            message: "Low contrast on title",
            text: "Question Title",
            ratio: 2.1,
            requiredRatio: 4.5,
          },
        ],
      },
    });

    const residualReport = JSON.stringify({
      ok: true,
      contrast: {
        findings: [
          {
            severity: "warning",
            message: "Slightly low contrast on secondary element",
            text: "Subtitle",
            ratio: 3.8,
            requiredRatio: 4.5,
          },
        ],
      },
    });

    mocks.execFileAsync
      .mockResolvedValueOnce({ stdout: initialReport, stderr: "" })
      .mockResolvedValueOnce({ stdout: residualReport, stderr: "" });

    const result = await verifyAndCheckLayout({
      renderRoot: tempDir,
      rootDir: tempDir,
      sourceFingerprint,
      renderQuality: "draft",
    });

    expect(result.status).toBe("passed");
    expect(result.samplesCount).toBe(1);
    expect(mocks.execFileAsync).toHaveBeenCalledTimes(2);
  });

  it("correctly throws QUIZ_COMPOSITION_CHECK_FAILED when true blocking layout collision occurs", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "contrast-parity-layout-blocker-"));
    cleanupDirs.push(tempDir);
    const sourceFingerprint = "fingerprint_layout_blocker";

    const layoutBlockerReport = JSON.stringify({
      ok: false,
      layout: {
        findings: [
          {
            severity: "error",
            message: "Bounding box collision detected between choice card 1 and choice card 2",
            text: "Choice Cards",
          },
        ],
      },
      contrast: {
        findings: [
          {
            severity: "error",
            message: "Low contrast 1.1:1",
            text: "Choice 1",
            ratio: 1.1,
            requiredRatio: 4.5,
          },
        ],
      },
    });

    mocks.execFileAsync.mockResolvedValueOnce({ stdout: layoutBlockerReport, stderr: "" });

    let thrownError: unknown;
    try {
      await verifyAndCheckLayout({
        renderRoot: tempDir,
        rootDir: tempDir,
        sourceFingerprint,
        renderQuality: "draft",
      });
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(RepositoryError);
    const repoError = thrownError as RepositoryError;
    expect(repoError.code).toBe("QUIZ_COMPOSITION_CHECK_FAILED");
    expect(repoError.message).toContain("[ERROR] layout");
    expect(repoError.message).toContain("Bounding box collision detected");
    // Only 1 execution attempt, no contrast healing retry because true blocker was present
    expect(mocks.execFileAsync).toHaveBeenCalledTimes(1);
  });

  it("correctly throws QUIZ_COMPOSITION_CHECK_FAILED when true blocking runtime or syntax error occurs", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "contrast-parity-runtime-blocker-"));
    cleanupDirs.push(tempDir);
    const sourceFingerprint = "fingerprint_runtime_blocker";

    const runtimeBlockerReport = JSON.stringify({
      ok: false,
      runtime: {
        findings: [
          {
            severity: "fatal",
            message: "Uncaught ReferenceError: CustomAnimationHandler is not defined",
            time: 5.2,
          },
        ],
      },
      contrast: {
        findings: [
          {
            severity: "error",
            message: "Low contrast 1.0:1",
            text: "Timer Text",
            ratio: 1.0,
            requiredRatio: 3.0,
          },
        ],
      },
    });

    const failure = Object.assign(new Error("Command failed with exit code 1"), { stdout: runtimeBlockerReport });
    mocks.execFileAsync.mockRejectedValueOnce(failure);

    await expect(
      verifyAndCheckLayout({
        renderRoot: tempDir,
        rootDir: tempDir,
        sourceFingerprint,
        renderQuality: "draft",
      }),
    ).rejects.toThrowError(RepositoryError);

    expect(mocks.execFileAsync).toHaveBeenCalledTimes(1);
  });

  it("correctly throws QUIZ_COMPOSITION_CHECK_FAILED when true blocking lint error occurs", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "contrast-parity-lint-blocker-"));
    cleanupDirs.push(tempDir);
    const sourceFingerprint = "fingerprint_lint_blocker";

    const lintBlockerReport = JSON.stringify({
      ok: false,
      lint: {
        findings: [
          {
            severity: "error",
            message: "HTML syntax violation: missing closing tag in composition container",
          },
        ],
      },
    });

    mocks.execFileAsync.mockResolvedValueOnce({ stdout: lintBlockerReport, stderr: "" });

    await expect(
      verifyAndCheckLayout({
        renderRoot: tempDir,
        rootDir: tempDir,
        sourceFingerprint,
        renderQuality: "draft",
      }),
    ).rejects.toThrowError(RepositoryError);

    expect(mocks.execFileAsync).toHaveBeenCalledTimes(1);
  });

  it("correctly throws QUIZ_COMPOSITION_CHECK_FAILED on hard process spawn failure without report", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "contrast-parity-hard-crash-"));
    cleanupDirs.push(tempDir);
    const sourceFingerprint = "fingerprint_hard_crash";

    mocks.execFileAsync.mockRejectedValueOnce(new Error("spawn hyperframes ENOENT"));

    await expect(
      verifyAndCheckLayout({
        renderRoot: tempDir,
        rootDir: tempDir,
        sourceFingerprint,
      }),
    ).rejects.toThrowError(RepositoryError);

    expect(mocks.execFileAsync).toHaveBeenCalledTimes(1);
  });

  it("recycles verified checkpoint without re-running layout checks when fingerprint matches", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "contrast-parity-reuse-"));
    cleanupDirs.push(tempDir);
    const sourceFingerprint = "fingerprint_reuse_pass";

    // First run with severe contrast issues
    const contrastReportJson = JSON.stringify({
      ok: false,
      contrast: {
        findings: [
          {
            severity: "error",
            message: "Low contrast ratio 1.2:1",
            text: "Question Header",
            ratio: 1.2,
            requiredRatio: 4.5,
          },
        ],
      },
    });

    mocks.execFileAsync
      .mockResolvedValueOnce({ stdout: contrastReportJson, stderr: "" })
      .mockResolvedValueOnce({ stdout: contrastReportJson, stderr: "" });

    const firstResult = await verifyAndCheckLayout({
      renderRoot: tempDir,
      rootDir: tempDir,
      sourceFingerprint,
      renderQuality: "draft",
    });

    expect(firstResult.status).toBe("passed");
    expect(firstResult.reused).toBe(false);
    expect(mocks.execFileAsync).toHaveBeenCalledTimes(2);

    // Second run with the same sourceFingerprint: checkpoint must be reused without calling child_process
    const secondResult = await verifyAndCheckLayout({
      renderRoot: tempDir,
      rootDir: tempDir,
      sourceFingerprint,
      renderQuality: "high",
    });

    expect(secondResult.status).toBe("passed");
    expect(secondResult.reused).toBe(true);
    expect(secondResult.samplesCount).toBe(0);
    // execFileAsync should not have been called again
    expect(mocks.execFileAsync).toHaveBeenCalledTimes(2);
  });
});

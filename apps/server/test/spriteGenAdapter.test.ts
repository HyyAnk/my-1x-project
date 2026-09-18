import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DefaultSpriteGenAdapter,
  runSpriteGenProcess,
  SpriteGenProcessError,
  type SpriteGenExecutionRequest,
  type SpriteGenLogEntry,
} from "../src/quiz/mascot/animation/spriteGen/index.js";

describe("SpriteGen Adapter & Process Runner (Stage 05)", () => {
  let testOutputDir: string;

  beforeEach(async () => {
    testOutputDir = await fs.mkdtemp(path.join(os.tmpdir(), "sprite-gen-test-"));
  });

  afterEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  const baseRequest: SpriteGenExecutionRequest = {
    jobId: "job-anim-001",
    mascotId: "fox-mascot",
    styleId: "cyberpunk-fox",
    state: "thinking",
    slot: 1,
    recipeId: "thinking-01-head-tilt-left",
    prompt: "Cute robotic fox tilting head left, 12 keyframes, chroma key green",
    styleAnchorPath: "/mascot/assets/style_anchor.png",
    outputDir: "",
    sourceFingerprint: "src-fp-123456",
    fixtureMode: true,
  };

  it("generates deterministic 12-frame synthetic outputs in fixture mode without network", async () => {
    const adapter = new DefaultSpriteGenAdapter();
    const request = { ...baseRequest, outputDir: testOutputDir };

    const result = await adapter.execute(request);

    expect(result.success).toBe(true);
    expect(result.jobId).toBe("job-anim-001");
    expect(result.outputDir).toBe(path.resolve(testOutputDir));

    // Verify presence of all expected artifact files
    const manifestExists = await fs
      .access(result.manifestPath)
      .then(() => true)
      .catch(() => false);
    const atlasExists = await fs
      .access(result.atlasPath)
      .then(() => true)
      .catch(() => false);
    const qaReportExists = await fs
      .access(result.qaReportPath)
      .then(() => true)
      .catch(() => false);

    expect(manifestExists).toBe(true);
    expect(atlasExists).toBe(true);
    expect(qaReportExists).toBe(true);

    // Verify manifest contents adhere to exact 12-frame contract
    const manifestRaw = await fs.readFile(result.manifestPath, "utf8");
    const manifest = JSON.parse(manifestRaw);

    expect(manifest.version).toBe(1);
    expect(manifest.frame_count).toBe(12);
    expect(manifest.fps).toBe(8);
    expect(manifest.frames).toHaveLength(12);
    expect(manifest.frames[0].duration_ms).toBe(125);
    expect(manifest.state).toBe("thinking");
    expect(manifest.recipe_id).toBe("thinking-01-head-tilt-left");
    expect(manifest.fingerprint).toBeTruthy();

    // Verify atlas image file is valid and non-empty
    const stat = await fs.stat(result.atlasPath);
    expect(stat.size).toBeGreaterThan(500);

    // Verify QA report indicates pass
    const qaRaw = await fs.readFile(result.qaReportPath, "utf8");
    const qaReport = JSON.parse(qaRaw);
    expect(qaReport.passed).toBe(true);
    expect(qaReport.checks.frame_count.passed).toBe(true);
  });

  it("handles process execution timeout and terminates child process", async () => {
    const capturedLogs: SpriteGenLogEntry[] = [];
    const logContext = {
      jobId: "job-timeout-001",
      mascotId: "fox-mascot",
      styleId: "cyberpunk-fox",
      state: "thinking" as const,
      slot: 1,
      attempt: 1,
    };

    const promise = runSpriteGenProcess({
      executable: process.execPath,
      args: ["-e", "setTimeout(() => {}, 10000);"],
      timeoutMs: 150,
      logContext,
      onLog: (entry) => capturedLogs.push(entry),
    });

    await expect(promise).rejects.toThrowError(SpriteGenProcessError);

    try {
      await promise;
    } catch (err) {
      const processErr = err as SpriteGenProcessError;
      expect(processErr.code).toBe("PROCESS_TIMEOUT");
      expect(processErr.message).toMatch(/timed out after 150ms/);
      expect(capturedLogs.some((l) => l.message.includes("timed out"))).toBe(true);
    }
  });

  it("handles cancellation via AbortSignal immediately", async () => {
    const controller = new AbortController();
    const capturedLogs: SpriteGenLogEntry[] = [];
    const logContext = {
      jobId: "job-abort-001",
      mascotId: "fox-mascot",
      styleId: "cyberpunk-fox",
      state: "celebrate" as const,
      slot: 2,
      attempt: 1,
    };

    const promise = runSpriteGenProcess({
      executable: process.execPath,
      args: ["-e", "setTimeout(() => {}, 10000);"],
      timeoutMs: 10000,
      signal: controller.signal,
      logContext,
      onLog: (entry) => capturedLogs.push(entry),
    });

    // Abort shortly after spawning
    setTimeout(() => controller.abort(), 60);

    await expect(promise).rejects.toThrowError(SpriteGenProcessError);

    try {
      await promise;
    } catch (err) {
      const processErr = err as SpriteGenProcessError;
      expect(processErr.code).toBe("PROCESS_ABORTED");
      expect(processErr.message).toMatch(/cancelled via AbortSignal/);
    }
  });

  it("rejects immediately if AbortSignal is already aborted prior to start", async () => {
    const controller = new AbortController();
    controller.abort();

    const logContext = {
      jobId: "job-preaborted-001",
      mascotId: "fox-mascot",
      styleId: "cyberpunk-fox",
      state: "thinking" as const,
      slot: 1,
      attempt: 1,
    };

    await expect(
      runSpriteGenProcess({
        executable: process.execPath,
        args: ["-v"],
        signal: controller.signal,
        logContext,
      }),
    ).rejects.toMatchObject({
      code: "PROCESS_ABORTED",
    });
  });

  it("rejects with structured error when process exits with non-zero code", async () => {
    const logContext = {
      jobId: "job-fail-001",
      mascotId: "fox-mascot",
      styleId: "cyberpunk-fox",
      state: "celebrate" as const,
      slot: 3,
      attempt: 1,
    };

    const promise = runSpriteGenProcess({
      executable: process.execPath,
      args: ["-e", "process.exit(42);"],
      logContext,
    });

    await expect(promise).rejects.toThrowError(SpriteGenProcessError);

    try {
      await promise;
    } catch (err) {
      const processErr = err as SpriteGenProcessError;
      expect(processErr.code).toBe("PROCESS_FAILED");
      expect(processErr.exitCode).toBe(42);
      expect(processErr.message).toMatch(/non-zero code 42/);
    }
  });

  it("captures stdout and stderr lines tagged with structured context", async () => {
    const capturedLogs: SpriteGenLogEntry[] = [];
    const logContext = {
      jobId: "job-logs-001",
      mascotId: "fox-mascot",
      styleId: "cyberpunk-fox",
      state: "thinking" as const,
      slot: 5,
      attempt: 2,
      step: "gen-set" as const,
    };

    const script = `
      console.log("Generating frame set 1 to 12...");
      console.error("Warning: slight chroma fringe detected");
      console.log("Extraction complete.");
    `;

    const result = await runSpriteGenProcess({
      executable: process.execPath,
      args: ["-e", script],
      logContext,
      onLog: (entry) => capturedLogs.push(entry),
    });

    expect(result.exitCode).toBe(0);
    expect(capturedLogs.length).toBeGreaterThanOrEqual(4);

    const stdoutLogs = capturedLogs.filter((l) => l.stream === "stdout");
    const stderrLogs = capturedLogs.filter((l) => l.stream === "stderr");

    expect(stdoutLogs.some((l) => l.message.includes("Generating frame set"))).toBe(true);
    expect(stdoutLogs.some((l) => l.message.includes("Extraction complete"))).toBe(true);
    expect(stderrLogs.some((l) => l.message.includes("chroma fringe"))).toBe(true);

    // Verify all logs carry context tags
    for (const log of capturedLogs) {
      expect(log.context.jobId).toBe("job-logs-001");
      expect(log.context.mascotId).toBe("fox-mascot");
      expect(log.context.state).toBe("thinking");
      expect(log.context.slot).toBe(5);
      expect(log.context.attempt).toBe(2);
      expect(log.timestamp).toBeDefined();
    }
  });
});

import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HyperframesProcessError, runHyperframesProcess, type HyperframesProcessEvent } from "../src/tasks/video/hyperframesProcess.js";

const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "hyperframes-process-"));
  roots.push(root);
  return { root, logPath: path.join(root, "logs", "render.log") };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("runHyperframesProcess", () => {
  it("streams split stdout and stderr records through serialized callbacks", async () => {
    const { root, logPath } = await fixture();
    const events: HyperframesProcessEvent[] = [];
    let callbacksInFlight = 0;
    let maxCallbacksInFlight = 0;
    const trace =
      '[Render:trace] {"phase":"capture_streaming","framesCompleted":8,"totalFrames":20,"workerCount":3,"stageElapsedMs":400}\n';
    const fallback = "Streaming frame 12/20 (3 workers)\r";
    const script = [
      `const trace=${JSON.stringify(trace)};`,
      `const fallback=${JSON.stringify(fallback)};`,
      "process.stdout.write(trace.slice(0, 24));",
      "setTimeout(() => process.stdout.write(trace.slice(24)), 10);",
      "setTimeout(() => process.stderr.write(fallback), 20);",
      "setTimeout(() => process.exit(0), 35);",
    ].join("");

    await runHyperframesProcess({
      command: process.execPath,
      args: ["-e", script],
      cwd: root,
      env: process.env,
      timeoutMs: 2_000,
      heartbeatMs: 1_000,
      logPath,
      onProgress: async (event) => {
        callbacksInFlight += 1;
        maxCallbacksInFlight = Math.max(maxCallbacksInFlight, callbacksInFlight);
        await new Promise((resolve) => setTimeout(resolve, 15));
        events.push(event);
        callbacksInFlight -= 1;
      },
    });

    expect(events.filter((event) => event.kind === "measured").map((event) => event.sample.framesCompleted)).toEqual([8, 12]);
    const fallbackEvent = events.find((event) => event.kind === "measured" && event.sample.framesCompleted === 12);
    expect(fallbackEvent?.kind === "measured" ? fallbackEvent.sample.elapsedMs : null).not.toBeNull();
    expect(fallbackEvent?.kind === "measured" ? fallbackEvent.sample.etaSeconds : null).not.toBeNull();
    expect(maxCallbacksInFlight).toBe(1);
    const log = await readFile(logPath, "utf8");
    expect(log).toContain("framesCompleted");
    expect(log).toContain("Streaming frame 12/20");
  });

  it("emits a liveness heartbeat without inventing measured progress", async () => {
    const { root, logPath } = await fixture();
    const events: HyperframesProcessEvent[] = [];

    await runHyperframesProcess({
      command: process.execPath,
      args: ["-e", "setTimeout(() => process.exit(0), 90)"],
      cwd: root,
      env: process.env,
      timeoutMs: 2_000,
      heartbeatMs: 20,
      logPath,
      onProgress: (event) => {
        events.push(event);
        return Promise.resolve();
      },
    });

    expect(events.some((event) => event.kind === "heartbeat" && event.elapsedMs >= 20)).toBe(true);
    expect(events.some((event) => event.kind === "measured")).toBe(false);
  });

  it("aborts a running process with an explicit cancellation error", async () => {
    const { root, logPath } = await fixture();
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 40);

    const result = runHyperframesProcess({
      command: process.execPath,
      args: ["-e", "setInterval(() => {}, 1000)"],
      cwd: root,
      env: process.env,
      timeoutMs: 2_000,
      heartbeatMs: 1_000,
      logPath,
      signal: controller.signal,
      onProgress: () => Promise.resolve(),
    });

    await expect(result).rejects.toMatchObject({ code: "ABORTED" });
  });

  it("terminates a process that exceeds its timeout", async () => {
    const { root, logPath } = await fixture();
    const result = runHyperframesProcess({
      command: process.execPath,
      args: ["-e", "setInterval(() => {}, 1000)"],
      cwd: root,
      env: process.env,
      timeoutMs: 40,
      heartbeatMs: 1_000,
      logPath,
      onProgress: () => Promise.resolve(),
    });

    await expect(result).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("includes the terminal output tail when HyperFrames exits non-zero", async () => {
    const { root, logPath } = await fixture();
    const result = runHyperframesProcess({
      command: process.execPath,
      args: ["-e", 'process.stderr.write("fatal render detail\\n"); process.exit(7)'],
      cwd: root,
      env: process.env,
      timeoutMs: 2_000,
      heartbeatMs: 1_000,
      logPath,
      onProgress: () => Promise.resolve(),
    });

    await expect(result).rejects.toEqual(expect.objectContaining<Partial<HyperframesProcessError>>({ code: "EXITED" }));
    await expect(result).rejects.toThrow("fatal render detail");
    await expect(result).rejects.toThrow(logPath);
  });

  it("reports spawn and progress callback failures with the render log path", async () => {
    const { root, logPath } = await fixture();
    const spawnFailure = runHyperframesProcess({
      command: path.join(root, "missing-hyperframes-command"),
      args: [],
      cwd: root,
      env: process.env,
      timeoutMs: 2_000,
      logPath,
      onProgress: () => Promise.resolve(),
    });
    await expect(spawnFailure).rejects.toMatchObject({ code: "SPAWN_FAILED" });
    await expect(spawnFailure).rejects.toThrow(logPath);

    const callbackFailure = runHyperframesProcess({
      command: process.execPath,
      args: ["-e", 'process.stdout.write("Streaming frame 1/20 (2 workers)\\n"); setInterval(() => {}, 1000)'],
      cwd: root,
      env: process.env,
      timeoutMs: 2_000,
      logPath,
      onProgress: () => Promise.reject(new Error("persistence failed")),
    });
    await expect(callbackFailure).rejects.toMatchObject({ code: "PROGRESS_FAILED" });
    await expect(callbackFailure).rejects.toThrow(logPath);
  });

  it("rejects an already-aborted render before spawning", async () => {
    const { root, logPath } = await fixture();
    const controller = new AbortController();
    controller.abort();

    await expect(
      runHyperframesProcess({
        command: process.execPath,
        args: ["-e", "process.exit(0)"],
        cwd: root,
        env: process.env,
        timeoutMs: 2_000,
        logPath,
        signal: controller.signal,
        onProgress: () => Promise.resolve(),
      }),
    ).rejects.toMatchObject({ code: "ABORTED" });
  });

  it("fails locally when the render log cannot be opened", async () => {
    const { root } = await fixture();
    await expect(
      runHyperframesProcess({
        command: process.execPath,
        args: ["-e", "process.exit(0)"],
        cwd: root,
        env: process.env,
        timeoutMs: 2_000,
        logPath: root,
        onProgress: () => Promise.resolve(),
      }),
    ).rejects.toMatchObject({ code: "LOG_FAILED" });
  });

  it("kills a spawned descendant when the render is aborted", async () => {
    const { root, logPath } = await fixture();
    const pidPath = path.join(root, "descendant.pid");
    const childScript = "setInterval(() => {}, 1000)";
    const parentScript = [
      'const { spawn } = require("node:child_process");',
      'const { writeFileSync } = require("node:fs");',
      `const child = spawn(process.execPath, ["-e", ${JSON.stringify(childScript)}], { stdio: "ignore" });`,
      `writeFileSync(${JSON.stringify(pidPath)}, String(child.pid));`,
      "setInterval(() => {}, 1000);",
    ].join("");
    const controller = new AbortController();
    const result = runHyperframesProcess({
      command: process.execPath,
      args: ["-e", parentScript],
      cwd: root,
      env: process.env,
      timeoutMs: 2_000,
      logPath,
      signal: controller.signal,
      onProgress: () => Promise.resolve(),
    });

    let descendantPid = 0;
    for (let attempt = 0; attempt < 50 && descendantPid === 0; attempt += 1) {
      descendantPid = Number(await readFile(pidPath, "utf8").catch(() => "0"));
      if (descendantPid === 0) await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(descendantPid).toBeGreaterThan(0);
    controller.abort();
    await expect(result).rejects.toMatchObject({ code: "ABORTED" });

    const isAlive = () => {
      try {
        process.kill(descendantPid, 0);
        return true;
      } catch {
        return false;
      }
    };
    for (let attempt = 0; attempt < 20 && isAlive(); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 25));
    expect(isAlive()).toBe(false);
  });
});

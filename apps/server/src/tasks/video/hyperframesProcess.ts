import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, open } from "node:fs/promises";
import path from "node:path";
import { parseHyperframesProgress, type HyperframesProgressSample } from "./hyperframesProgress.js";

const OUTPUT_TAIL_LIMIT = 16_000;

export type HyperframesProcessEvent = { kind: "measured"; sample: HyperframesProgressSample } | { kind: "heartbeat"; elapsedMs: number };

export type HyperframesProcessErrorCode = "ABORTED" | "TIMEOUT" | "EXITED" | "SPAWN_FAILED" | "PROGRESS_FAILED" | "LOG_FAILED";

export class HyperframesProcessError extends Error {
  constructor(
    message: string,
    readonly code: HyperframesProcessErrorCode,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "HyperframesProcessError";
  }
}

export type RunHyperframesProcessOptions = {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  heartbeatMs?: number;
  logPath: string;
  signal?: AbortSignal;
  onProgress: (event: HyperframesProcessEvent) => Promise<void>;
};

type StopReason = "ABORTED" | "TIMEOUT" | "PROGRESS_FAILED" | "LOG_FAILED";

async function waitForExit(child: ChildProcess): Promise<{ code: number | null; signal: NodeJS.Signals | null; error: Error | null }> {
  return new Promise((resolve) => {
    let spawnError: Error | null = null;
    child.once("error", (error) => {
      spawnError = error;
    });
    child.once("close", (code, signal) => resolve({ code, signal, error: spawnError }));
  });
}

async function terminateProcessTree(child: ChildProcess): Promise<void> {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    await new Promise<void>((resolve) => {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      killer.once("error", () => resolve());
      killer.once("close", () => resolve());
    });
    if (child.exitCode === null) child.kill("SIGKILL");
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

function createLineConsumer(onLine: (line: string) => void): { push: (chunk: Buffer) => void; flush: () => void } {
  let buffered = "";
  return {
    push(chunk) {
      buffered += chunk.toString("utf8");
      const records = buffered.split(/[\r\n]/);
      buffered = records.pop() ?? "";
      for (const record of records) if (record.trim()) onLine(record);
    },
    flush() {
      if (buffered.trim()) onLine(buffered);
      buffered = "";
    },
  };
}

export async function runHyperframesProcess(options: RunHyperframesProcessOptions): Promise<void> {
  const resolvedLogPath = path.resolve(options.logPath);
  const withLogPath = (message: string) => `${message}. Render log: ${resolvedLogPath}`;
  if (options.signal?.aborted) throw new HyperframesProcessError(withLogPath("HyperFrames render cancelled"), "ABORTED");
  await mkdir(path.dirname(options.logPath), { recursive: true });
  if (options.signal?.aborted) throw new HyperframesProcessError(withLogPath("HyperFrames render cancelled"), "ABORTED");
  const logFile = await open(options.logPath, "w").catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "unknown log error";
    throw new HyperframesProcessError(withLogPath(`Could not open the HyperFrames render log: ${message}`), "LOG_FAILED", { cause: error });
  });
  if (options.signal?.aborted) {
    await logFile.close();
    throw new HyperframesProcessError(withLogPath("HyperFrames render cancelled"), "ABORTED");
  }
  const startedAt = Date.now();
  let outputTail = "";
  let callbackError: unknown;
  let callbackQueue = Promise.resolve();
  let logError: unknown;
  let logQueue = Promise.resolve();
  let stopReason: StopReason | null = null;
  let captureStartedAt: number | null = null;

  const child = spawn(options.command, options.args, {
    cwd: options.cwd,
    env: options.env,
    windowsHide: true,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const exitPromise = waitForExit(child);

  const stop = (reason: StopReason) => {
    if (stopReason) return;
    stopReason = reason;
    void terminateProcessTree(child);
  };
  const onAbort = () => stop("ABORTED");
  options.signal?.addEventListener("abort", onAbort, { once: true });
  if (options.signal?.aborted) stop("ABORTED");

  const appendLog = (level: "INFO" | "ERROR", source: string, message: string) => {
    const line = `${new Date().toISOString()} [${level}] [T:${child.pid ?? "spawn"}] [STEP:render] [${source}] ${message}\n`;
    outputTail = (outputTail + line).slice(-OUTPUT_TAIL_LIMIT);
    logQueue = logQueue
      .then(() => logFile.appendFile(line, "utf8"))
      .catch((error: unknown) => {
        logError ??= error;
        stop("LOG_FAILED");
      });
  };

  const enqueueProgress = (event: HyperframesProcessEvent) => {
    callbackQueue = callbackQueue.then(async () => {
      if (callbackError) return;
      try {
        await options.onProgress(event);
      } catch (error) {
        callbackError = error;
        stop("PROGRESS_FAILED");
      }
    });
  };

  const consumeLine = (source: "stdout" | "stderr", line: string) => {
    appendLog("INFO", source, line);
    const parsedSample = parseHyperframesProgress(line);
    if (!parsedSample) return;
    const now = Date.now();
    if (parsedSample.elapsedMs !== null) captureStartedAt = now - parsedSample.elapsedMs;
    else captureStartedAt ??= now;
    const elapsedMs = parsedSample.elapsedMs ?? Math.max(0, now - captureStartedAt);
    const etaSeconds =
      parsedSample.etaSeconds ??
      (parsedSample.framesCompleted > 0 && elapsedMs > 0
        ? Math.max(
            0,
            Math.round((elapsedMs * (parsedSample.totalFrames - parsedSample.framesCompleted)) / parsedSample.framesCompleted / 1000),
          )
        : null);
    enqueueProgress({ kind: "measured", sample: { ...parsedSample, elapsedMs, etaSeconds } });
  };
  const stdout = createLineConsumer((line) => consumeLine("stdout", line));
  const stderr = createLineConsumer((line) => consumeLine("stderr", line));
  child.stdout?.on("data", stdout.push);
  child.stderr?.on("data", stderr.push);

  const heartbeatMs = Math.max(10, options.heartbeatMs ?? 15_000);
  const heartbeat = setInterval(() => {
    const elapsedMs = Date.now() - startedAt;
    appendLog("INFO", "heartbeat", `Render process active for ${Math.round(elapsedMs / 1000)}s`);
    enqueueProgress({ kind: "heartbeat", elapsedMs });
  }, heartbeatMs);
  const timeout = setTimeout(() => stop("TIMEOUT"), options.timeoutMs);

  const result = await exitPromise;
  clearInterval(heartbeat);
  clearTimeout(timeout);
  options.signal?.removeEventListener("abort", onAbort);
  stdout.flush();
  stderr.flush();
  await callbackQueue;
  await logQueue;
  await logFile.close().catch((error: unknown) => {
    logError ??= error;
  });

  if (stopReason === "ABORTED") throw new HyperframesProcessError(withLogPath("HyperFrames render cancelled"), "ABORTED");
  if (stopReason === "TIMEOUT")
    throw new HyperframesProcessError(
      withLogPath(`HyperFrames render timed out after ${Math.round(options.timeoutMs / 1000)}s`),
      "TIMEOUT",
    );
  if (logError)
    throw new HyperframesProcessError(withLogPath("Failed to write the HyperFrames render log"), "LOG_FAILED", { cause: logError });
  if (callbackError)
    throw new HyperframesProcessError(withLogPath("Failed to publish HyperFrames progress"), "PROGRESS_FAILED", {
      cause: callbackError,
    });
  if (result.error)
    throw new HyperframesProcessError(withLogPath(`Could not start HyperFrames: ${result.error.message}`), "SPAWN_FAILED", {
      cause: result.error,
    });
  if (result.code !== 0) {
    const detail = outputTail.trim();
    throw new HyperframesProcessError(
      withLogPath(`HyperFrames exited with code ${result.code ?? "unknown"}${detail ? `\n${detail}` : ""}`),
      "EXITED",
    );
  }
}

import { spawn } from "node:child_process";
import readline from "node:readline";
import { SpriteGenProcessError, type SpriteGenLogContext, type SpriteGenLogEntry, type SpriteGenLogLevel } from "./spriteGenTypes.js";

export interface RunProcessOptions {
  executable: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  signal?: AbortSignal;
  logContext: SpriteGenLogContext;
  onLog?: (entry: SpriteGenLogEntry) => void;
}

export interface RunProcessResult {
  exitCode: number;
  logs: SpriteGenLogEntry[];
  durationMs: number;
}

export function runSpriteGenProcess(options: RunProcessOptions): Promise<RunProcessResult> {
  return new Promise((resolve, reject) => {
    const { executable, args, cwd, env = process.env, timeoutMs = 60_000, signal, logContext, onLog } = options;

    const startTime = Date.now();
    const logs: SpriteGenLogEntry[] = [];
    let isSettled = false;
    let timer: NodeJS.Timeout | null = null;

    const emitLog = (level: SpriteGenLogLevel, message: string, stream: "stdout" | "stderr" | "system"): void => {
      const entry: SpriteGenLogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        stream,
        context: { ...logContext },
      };
      logs.push(entry);
      onLog?.(entry);
    };

    if (signal?.aborted) {
      emitLog("error", "Process execution aborted prior to start", "system");
      return reject(
        new SpriteGenProcessError("Process execution aborted prior to start", "PROCESS_ABORTED", {
          logs,
        }),
      );
    }

    emitLog("info", `Starting child process: ${executable} ${args.join(" ")}`, "system");

    const child = spawn(executable, args, {
      cwd,
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const cleanup = (): void => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (signal && onAbort) {
        signal.removeEventListener("abort", onAbort);
      }
    };

    const onAbort = (): void => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      emitLog("error", "Process execution cancelled via AbortSignal", "system");
      try {
        child.kill("SIGTERM");
      } catch {
        // Child might already be dead
      }
      reject(
        new SpriteGenProcessError("Process execution cancelled via AbortSignal", "PROCESS_ABORTED", {
          logs,
        }),
      );
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        emitLog("error", `Process timed out after ${timeoutMs}ms`, "system");
        try {
          child.kill("SIGTERM");
        } catch {
          // Child might already be dead
        }
        reject(
          new SpriteGenProcessError(`Process timed out after ${timeoutMs}ms`, "PROCESS_TIMEOUT", {
            logs,
          }),
        );
      }, timeoutMs);
    }

    if (child.stdout) {
      const stdoutRl = readline.createInterface({ input: child.stdout });
      stdoutRl.on("line", (line) => {
        emitLog("info", line, "stdout");
      });
    }

    if (child.stderr) {
      const stderrRl = readline.createInterface({ input: child.stderr });
      stderrRl.on("line", (line) => {
        emitLog("warn", line, "stderr");
      });
    }

    child.on("error", (err) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      emitLog("error", `Spawn error: ${err.message}`, "system");
      reject(
        new SpriteGenProcessError(`Spawn error: ${err.message}`, "SPAWN_ERROR", {
          logs,
        }),
      );
    });

    child.on("close", (code) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      const durationMs = Date.now() - startTime;

      if (code !== 0) {
        emitLog("error", `Process exited with non-zero code ${code}`, "system");
        reject(new SpriteGenProcessError(`Process exited with non-zero code ${code}`, "PROCESS_FAILED", { exitCode: code, logs }));
      } else {
        emitLog("info", `Process completed successfully in ${durationMs}ms`, "system");
        resolve({ exitCode: 0, logs, durationMs });
      }
    });
  });
}

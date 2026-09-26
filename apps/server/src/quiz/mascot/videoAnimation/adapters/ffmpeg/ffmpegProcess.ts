import { spawn } from "node:child_process";

export interface RunFfmpegProcessOptions {
  ffmpegBinary?: string;
  args: string[];
  timeoutMs: number;
  signal?: AbortSignal;
  onAborted: () => Error;
  onTimeout: (timeoutMs: number) => Error;
  onCommandFailed: (details: string) => Error;
}

export async function runFfmpegProcess(options: RunFfmpegProcessOptions): Promise<string> {
  const { ffmpegBinary = "ffmpeg", args, timeoutMs, signal, onAborted, onTimeout, onCommandFailed } = options;

  if (signal?.aborted) {
    throw onAborted();
  }

  return new Promise<string>((resolve, reject) => {
    let timedOut = false;
    let aborted = false;
    let timeoutTimer: NodeJS.Timeout | null = null;
    let abortListener: (() => void) | null = null;

    const cleanup = () => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
      if (signal && abortListener) {
        signal.removeEventListener("abort", abortListener);
        abortListener = null;
      }
    };

    abortListener = () => {
      aborted = true;
      child.kill();
    };

    if (signal) {
      signal.addEventListener("abort", abortListener);
    }

    if (timeoutMs > 0) {
      timeoutTimer = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, timeoutMs);
    }

    const child = spawn(ffmpegBinary, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });

    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      cleanup();
      if (aborted || timedOut) return;
      reject(onCommandFailed(`Failed to execute ffmpeg: ${err.message}`));
    });

    child.on("close", (code) => {
      cleanup();
      if (aborted) {
        reject(onAborted());
        return;
      }
      if (timedOut) {
        reject(onTimeout(timeoutMs));
        return;
      }

      if (code !== 0) {
        reject(onCommandFailed(`FFmpeg exited with code ${code}: ${stderr.trim().slice(-500)}`));
        return;
      }

      resolve(stderr);
    });
  });
}

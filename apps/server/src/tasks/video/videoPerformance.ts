import { existsSync } from "node:fs";
import os from "node:os";

/**
 * Resolves the installed Google Chrome or Microsoft Edge executable path
 * to provide hardware-accelerated rendering on Windows and other OS.
 */
export function resolveHardwareBrowserPath(): string | undefined {
  if (process.env.HYPERFRAMES_BROWSER_PATH && existsSync(process.env.HYPERFRAMES_BROWSER_PATH)) {
    return process.env.HYPERFRAMES_BROWSER_PATH;
  }

  if (process.platform === "win32") {
    const programFiles = process.env.PROGRAMFILES || "C:\\Program Files";
    const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env.LOCALAPPDATA || "";

    const candidatePaths = [
      `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
      `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
      localAppData ? `${localAppData}\\Google\\Chrome\\Application\\chrome.exe` : "",
      `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${programFilesX86}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ].filter(Boolean);

    for (const candidate of candidatePaths) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}

/**
 * Calculates the optimal number of parallel workers for HyperFrames rendering
 * based on CPU cores, available system RAM, and environment overrides.
 */
export function calculateOptimalWorkers(configuredWorkers?: number): number {
  if (configuredWorkers && configuredWorkers > 0) {
    return Math.min(16, configuredWorkers);
  }

  const envWorkers = Number(process.env.HYPERFRAMES_WORKERS);
  if (Number.isFinite(envWorkers) && envWorkers > 0) {
    return Math.min(16, Math.max(1, Math.floor(envWorkers)));
  }

  const totalCpus = os.cpus().length || 4;
  const freeMemGb = os.freemem() / (1024 * 1024 * 1024);

  // Each Chromium worker instance typically consumes 350MB - 500MB RAM
  const memorySafeWorkers = Math.max(2, Math.floor(freeMemGb / 0.5));
  const cpuTargetWorkers = Math.max(2, Math.floor(totalCpus * 0.5));

  // Cap between 2 and 12 for stable parallelism without overwhelming I/O
  return Math.min(12, Math.max(2, Math.min(cpuTargetWorkers, memorySafeWorkers)));
}

/**
 * Builds the runtime environment variables for HyperFrames with hardware GPU acceleration.
 */
export function getHyperframesExecutionEnv(): Record<string, string> {
  const browserPath = resolveHardwareBrowserPath();

  return {
    ...process.env,
    PRODUCER_PAGE_NAVIGATION_TIMEOUT_MS: process.env.PRODUCER_PAGE_NAVIGATION_TIMEOUT_MS || "300000",
    PRODUCER_PUPPETEER_PROTOCOL_TIMEOUT_MS: process.env.PRODUCER_PUPPETEER_PROTOCOL_TIMEOUT_MS || "300000",
    PRODUCER_PLAYER_READY_TIMEOUT_MS: process.env.PRODUCER_PLAYER_READY_TIMEOUT_MS || "60000",
    PRODUCER_EXPERIMENTAL_FAST_CAPTURE: process.env.PRODUCER_EXPERIMENTAL_FAST_CAPTURE || "true",
    ...(browserPath ? { HYPERFRAMES_BROWSER_PATH: browserPath } : {}),
  };
}

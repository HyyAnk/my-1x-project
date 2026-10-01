import os from "node:os";
import { resolveHardwareBrowserPath } from "../../infrastructure/executables/browserDiscovery.js";
export { resolveHardwareBrowserPath } from "../../infrastructure/executables/browserDiscovery.js";

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

  // Each Chromium worker instance typically consumes 350MB - 500MB RAM (using 750MB safe buffer)
  const memorySafeWorkers = Math.max(2, Math.floor(freeMemGb / 0.75));
  // Allocate up to 50% of CPU threads to Chromium rendering workers to leave ample headroom for FFmpeg and OS
  const cpuTargetWorkers = Math.max(2, Math.floor(totalCpus * 0.5));

  // On Windows, each worker runs a separate GPU-accelerated Chromium process.
  // Running more than 4 workers causes severe Direct3D/GPU lock contention, IPC bottlenecks,
  // and browser launch timeouts. Cap default Windows workers at 4, while other platforms scale to 16.
  const platformMax = process.platform === "win32" ? 4 : 16;
  return Math.min(platformMax, Math.max(2, Math.min(cpuTargetWorkers, memorySafeWorkers)));
}

/**
 * Builds the runtime environment variables for HyperFrames with hardware GPU acceleration.
 */
export function getHyperframesExecutionEnv(): Record<string, string> {
  const browserPath = resolveHardwareBrowserPath();
  const { HYPERFRAMES_BROWSER_PATH: _browserOverride, ...environment } = process.env;

  return {
    ...environment,
    PRODUCER_PAGE_NAVIGATION_TIMEOUT_MS: process.env.PRODUCER_PAGE_NAVIGATION_TIMEOUT_MS || "300000",
    PRODUCER_PUPPETEER_PROTOCOL_TIMEOUT_MS: process.env.PRODUCER_PUPPETEER_PROTOCOL_TIMEOUT_MS || "300000",
    PRODUCER_PLAYER_READY_TIMEOUT_MS: process.env.PRODUCER_PLAYER_READY_TIMEOUT_MS || "60000",
    PRODUCER_EXPERIMENTAL_FAST_CAPTURE: process.env.PRODUCER_EXPERIMENTAL_FAST_CAPTURE || "true",
    PRODUCER_ENABLE_STREAMING_ENCODE: process.env.PRODUCER_ENABLE_STREAMING_ENCODE || "true",
    HF_DE_PARALLEL_STREAM: process.env.HF_DE_PARALLEL_STREAM || "true",
    HF_DE_STALL_MS: process.env.HF_DE_STALL_MS || "600000",
    HF_FAST_CAPTURE_CSSFX: process.env.HF_FAST_CAPTURE_CSSFX || "true",
    ...(browserPath ? { HYPERFRAMES_BROWSER_PATH: browserPath } : {}),
  };
}

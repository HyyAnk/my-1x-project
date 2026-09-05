import type { TaskManagerRuntime } from "./runtime.js";
import { cleanupExpiredFailedBuilds } from "./taskLifecycle.js";

const DEFAULT_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

export async function runFailedBuildCleanup(
  runtime: TaskManagerRuntime,
  nowMs?: number,
): Promise<{ removedEpisodes: number; removedTasks: number }> {
  if (runtime.failedBuildCleanupPromise) {
    return runtime.failedBuildCleanupPromise;
  }
  const cleanup = cleanupExpiredFailedBuilds.call(runtime, nowMs);
  runtime.failedBuildCleanupPromise = cleanup;
  return cleanup.finally(() => {
    if (runtime.failedBuildCleanupPromise === cleanup) {
      runtime.failedBuildCleanupPromise = null;
    }
  });
}

export function scheduleFailedBuildCleanup(runtime: TaskManagerRuntime): void {
  if (runtime.failedBuildCleanupTimer) {
    return;
  }
  runtime.failedBuildCleanupTimer = setInterval(() => {
    void runFailedBuildCleanup(runtime);
  }, DEFAULT_CLEANUP_INTERVAL_MS);
  runtime.failedBuildCleanupTimer.unref?.();
}

import type { GenerateShortReelTarget } from "@studio/shared";

/**
 * Owns abort controllers and short-reel target bookkeeping for in-flight task work.
 *
 * TaskManager exposes the underlying maps through its flat runtime fields
 * (frozen `TaskManagerRuntime` contract), but this registry is the single
 * owner of the instances and of the cancel/kill plumbing around them.
 */
export class TaskAbortRegistry {
  readonly imageControllers = new Map<string, AbortController>();
  readonly videoControllers = new Map<string, AbortController>();
  readonly shortReelControllers = new Map<string, AbortController>();
  readonly shortReelTargets = new Map<string, GenerateShortReelTarget>();

  hasActiveControllers(): boolean {
    return this.imageControllers.size > 0 || this.videoControllers.size > 0 || this.shortReelControllers.size > 0;
  }

  /** Drops short-reel bookkeeping once a task reaches a terminal state. */
  releaseCompletedShortReel(taskId: string): void {
    this.shortReelControllers.delete(taskId);
    this.shortReelTargets.delete(taskId);
  }

  /** Aborts and clears short-reel controllers/targets for the given task ids. */
  releaseShortReelsFor(taskIds: readonly string[]): void {
    for (const taskId of taskIds) {
      this.shortReelControllers.get(taskId)?.abort();
      this.shortReelControllers.delete(taskId);
      this.shortReelTargets.delete(taskId);
    }
  }

  /** Aborts short-reel controllers whose task id is no longer known. */
  reconcileShortReels(validTaskIds: ReadonlySet<string>): void {
    for (const [taskId, controller] of this.shortReelControllers) {
      if (!validTaskIds.has(taskId)) {
        controller.abort();
        this.shortReelControllers.delete(taskId);
      }
    }
    for (const taskId of this.shortReelTargets.keys()) {
      if (!validTaskIds.has(taskId)) this.shortReelTargets.delete(taskId);
    }
  }

  clearAll(): void {
    this.imageControllers.clear();
    this.videoControllers.clear();
    this.shortReelControllers.clear();
    this.shortReelTargets.clear();
  }
}

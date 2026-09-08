import type { Task } from "@studio/shared";

/** Queue admission counters and lock keys guarding queued task execution. */
export type QueueRuntimeState = {
  locks: Set<string>;
  runningCount: number;
  runningAudioCount: number;
  runningImageCount: number;
  runningVideoCount: number;
  runningPipelineCount: number;
};

/**
 * Coordinates queue admission: owns the lock set guarding queued tasks and
 * drives the shared `pumpTaskQueue` admission routine.
 *
 * The `TaskManagerRuntime` contract consumed by the pump and tests is frozen
 * and requires flat mutable counter fields, so the per-lane counters remain
 * on TaskManager. Locks and the pump wiring are owned here.
 */
export class TaskQueueCoordinator {
  private readonly locks = new Set<string>();

  constructor(private readonly pump: () => Promise<void>) {}

  /** Locks a task's lock key while it is admitted to its queue lane. */
  admit(lockKey: string): void {
    this.locks.add(lockKey);
  }

  /** Releases a task's lock key after its lane work settled. */
  release(lockKey: string): void {
    this.locks.delete(lockKey);
  }

  isLocked(lockKey: string): boolean {
    return this.locks.has(lockKey);
  }

  /** Lock set exposed for the frozen flat-field `locks` runtime contract. */
  get lockSet(): Set<string> {
    return this.locks;
  }

  /** true when any queue lane currently has at least one admitted task. */
  hasRunningWork(state: QueueRuntimeState): boolean {
    return (
      state.runningCount > 0 ||
      state.runningAudioCount > 0 ||
      state.runningImageCount > 0 ||
      state.runningVideoCount > 0 ||
      state.runningPipelineCount > 0
    );
  }

  /** Pumps the queue through the manager-provided admission routine. */
  pumpQueue(): Promise<void> {
    return this.pump();
  }

  /** Clears all lock keys (used when reloading storage). */
  reset(): void {
    this.locks.clear();
  }
}

export type TaskFilter = (task: Task) => boolean;

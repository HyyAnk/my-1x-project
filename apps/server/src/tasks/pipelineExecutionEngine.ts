import type { ActiveRun, PipelineRun } from "./runtime.js";

/**
 * Owns ActiveRun/PipelineRun lifecycle state and completion waiters for
 * in-flight tasks.
 *
 * TaskManager exposes the underlying maps through its flat runtime fields
 * (frozen `TaskManagerRuntime` contract), but this engine is the single owner
 * of the instances and of the run-completion lifecycle around them.
 */
export class PipelineExecutionEngine {
  readonly activeRuns = new Map<string, ActiveRun>();
  readonly pipelineRuns = new Map<string, PipelineRun>();
  readonly completionWaiters = new Map<string, () => void>();

  /**
   * Resolves the completion waiter and removes the run state for a task that
   * reached a terminal state.
   */
  completeRun(taskId: string): void {
    this.activeRuns.delete(taskId);
    this.completionWaiters.get(taskId)?.();
    this.completionWaiters.delete(taskId);
  }

  hasActiveRuns(): boolean {
    return this.activeRuns.size > 0 || this.pipelineRuns.size > 0;
  }
}

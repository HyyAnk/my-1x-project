import type { TaskManagerRuntime } from "../runtime.js";
import type { TaskAbortRegistry } from "../taskAbortRegistry.js";
import { TaskManagerRunnerBase } from "../delegates/runnerDispatcher.js";
import { runFailedBuildCleanup, scheduleFailedBuildCleanup } from "../taskFailedBuildCleaner.js";
import { hasActiveEpisodeTasks, hasActiveChannelTasks, pruneEpisodeTasks, pruneChannelTasks } from "./taskPruning.js";
import { reconcileQuestionHistory, reconcileOrphanedTasks, reconcileStartupState } from "./taskReconciler.js";

export type TaskLifecycleDelegates = Pick<
  TaskManagerRuntime,
  | "hasActiveEpisodeTasks"
  | "hasActiveChannelTasks"
  | "pruneEpisodeTasks"
  | "pruneChannelTasks"
  | "reconcileQuestionHistory"
  | "reconcileOrphanedTasks"
  | "reconcileStartupState"
  | "cleanupExpiredFailedBuilds"
  | "startFailedBuildCleanupTimer"
>;

export interface TaskLifecycleRuntime extends TaskManagerRuntime {
  abortRegistry: TaskAbortRegistry;
}

export const taskLifecycleMaintenanceMethods: TaskLifecycleDelegates = {
  hasActiveEpisodeTasks(this: TaskLifecycleRuntime, episodeId: string): boolean {
    return hasActiveEpisodeTasks.call(this, episodeId);
  },
  hasActiveChannelTasks(this: TaskLifecycleRuntime, channelId: string): boolean {
    return hasActiveChannelTasks.call(this, channelId);
  },
  async pruneEpisodeTasks(this: TaskLifecycleRuntime, episodeId: string): Promise<string[]> {
    const taskIds = await pruneEpisodeTasks.call(this, episodeId);
    this.abortRegistry.releaseShortReelsFor(taskIds);
    return taskIds;
  },
  async pruneChannelTasks(this: TaskLifecycleRuntime, channelId: string): Promise<string[]> {
    const taskIds = await pruneChannelTasks.call(this, channelId);
    this.abortRegistry.releaseShortReelsFor(taskIds);
    return taskIds;
  },
  reconcileQuestionHistory(this: TaskLifecycleRuntime): Promise<void> {
    return reconcileQuestionHistory.call(this);
  },
  async reconcileOrphanedTasks(this: TaskLifecycleRuntime): Promise<{ removedEpisodes: number; removedTasks: number }> {
    const result = await reconcileOrphanedTasks.call(this);
    this.abortRegistry.reconcileShortReels(new Set(this.tasks.keys()));
    return result;
  },
  reconcileStartupState(this: TaskLifecycleRuntime): Promise<{ prunedDirs: string[]; reclaimedBytes: number }> {
    return reconcileStartupState.call(this);
  },
  cleanupExpiredFailedBuilds(this: TaskLifecycleRuntime, nowMs?: number): Promise<{ removedEpisodes: number; removedTasks: number }> {
    return runFailedBuildCleanup(this, nowMs);
  },
  startFailedBuildCleanupTimer(this: TaskLifecycleRuntime): void {
    scheduleFailedBuildCleanup(this);
  },
};

export abstract class TaskManagerLifecycleBase extends TaskManagerRunnerBase implements TaskLifecycleDelegates {
  hasActiveEpisodeTasks(episodeId: string): boolean {
    return taskLifecycleMaintenanceMethods.hasActiveEpisodeTasks.call(this as unknown as TaskLifecycleRuntime, episodeId);
  }
  hasActiveChannelTasks(channelId: string): boolean {
    return taskLifecycleMaintenanceMethods.hasActiveChannelTasks.call(this as unknown as TaskLifecycleRuntime, channelId);
  }
  async pruneEpisodeTasks(episodeId: string): Promise<string[]> {
    const taskIds = await taskLifecycleMaintenanceMethods.pruneEpisodeTasks.call(this as unknown as TaskLifecycleRuntime, episodeId);
    return taskIds;
  }
  async pruneChannelTasks(channelId: string): Promise<string[]> {
    const taskIds = await taskLifecycleMaintenanceMethods.pruneChannelTasks.call(this as unknown as TaskLifecycleRuntime, channelId);
    return taskIds;
  }
  reconcileQuestionHistory(): Promise<void> {
    return taskLifecycleMaintenanceMethods.reconcileQuestionHistory.call(this as unknown as TaskLifecycleRuntime);
  }
  async reconcileOrphanedTasks(): Promise<{ removedEpisodes: number; removedTasks: number }> {
    const result = await taskLifecycleMaintenanceMethods.reconcileOrphanedTasks.call(this as unknown as TaskLifecycleRuntime);
    return result;
  }
  reconcileStartupState(): Promise<{ prunedDirs: string[]; reclaimedBytes: number }> {
    return taskLifecycleMaintenanceMethods.reconcileStartupState.call(this as unknown as TaskLifecycleRuntime);
  }
  cleanupExpiredFailedBuilds(nowMs?: number): Promise<{ removedEpisodes: number; removedTasks: number }> {
    return taskLifecycleMaintenanceMethods.cleanupExpiredFailedBuilds.call(this as unknown as TaskLifecycleRuntime, nowMs);
  }
  startFailedBuildCleanupTimer(): void {
    taskLifecycleMaintenanceMethods.startFailedBuildCleanupTimer.call(this as unknown as TaskLifecycleRuntime);
  }
}

export const TaskLifecycleMaintenance = TaskManagerLifecycleBase;

export function attachLifecycleMaintenance(_target: object): void {
  // No-op for backwards compatibility, TaskManager inherits via prototype chain
}

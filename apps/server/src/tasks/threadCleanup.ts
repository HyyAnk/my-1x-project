import type { TaskManagerRuntime } from "./runtime.js";

export async function cleanupCodexThreads(this: TaskManagerRuntime,force = false): Promise<{ removed: number }> {
  if (!this.codexCleanupConfig.auto_delete_threads) return { removed: 0 };
  const now = Date.now();
  const retentionMs = this.codexCleanupConfig.failed_thread_retention_days * 24 * 60 * 60 * 1000;
  const candidates = this.list().filter((task) => {
    if (!task.codex_thread_id || !["COMPLETED", "FAILED", "CANCELLED"].includes(task.status)) return false;
    if (force) return true;
    if (task.status !== "FAILED" && task.status !== "CANCELLED") return false;
    return Boolean(task.completed_at && now - Date.parse(task.completed_at) >= retentionMs);
  });
  let removed = 0;
  for (const task of candidates) {
    if (!task.codex_thread_id || !(await this.tryDeleteThread(task.codex_thread_id, "codex"))) continue;
    await this.update(task.task_id, { codex_thread_id: null });
    removed += 1;
  }
  return { removed };
}

export async function cleanupAntigravityThreads(this: TaskManagerRuntime,force = false): Promise<{ removed: number }> {
  if (!this.antigravityCleanupConfig.auto_delete_threads) return { removed: 0 };
  if (this.antigravity) {
    return await this.antigravity.cleanupOldSessions(force ? 0 : this.antigravityCleanupConfig.failed_thread_retention_days);
  }
  return { removed: 0 };
}

export function startCleanupTimer(this: TaskManagerRuntime): void {
  if (this.cleanupTimer) return;
  this.cleanupTimer = setInterval(() => {
    void this.cleanupCodexThreads();
    void this.cleanupAntigravityThreads();
  }, 3 * 60 * 60 * 1000);
  this.cleanupTimer.unref?.();
}

export async function tryDeleteThread(this: TaskManagerRuntime,threadId: string, engine?: "codex" | "antigravity"): Promise<boolean> {
  const targetEngine = engine ?? this.activeEngine;
  if (targetEngine === "antigravity") {
    if (!this.antigravityCleanupConfig.auto_delete_threads) return false;
    if (!this.antigravity) return false;
    try {
      return await this.antigravity.deleteThread(threadId);
    } catch (error) {
      this.logger.debug(`Antigravity session cleanup skipped: ${error instanceof Error ? error.message : "unknown error"}`, { step: "antigravity_thread_cleanup" });
      return false;
    }
  }
  const client = this.codex as unknown as { deleteThread?: (id: string) => Promise<boolean> };
  if (!client.deleteThread) return false;
  try {
    return await client.deleteThread.call(this.codex, threadId);
  } catch (error) {
    this.logger.debug(`Codex thread cleanup skipped: ${error instanceof Error ? error.message : "unknown error"}`, { step: "codex_thread_cleanup" });
    return false;
  }
}

export function isSessionCleanupEnabled(this: TaskManagerRuntime,engine = this.activeEngine): boolean {
  return engine === "antigravity" ? this.antigravityCleanupConfig.auto_delete_threads : this.codexCleanupConfig.auto_delete_threads;
}

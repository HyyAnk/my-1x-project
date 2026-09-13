import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { TaskSchema, type Task } from "@studio/shared";
import { recoverTasksAfterRestart } from "../src/tasks/taskRestartRecovery.js";
import { loadTasksFromDisk, persistTask } from "../src/tasks/taskStateStore.js";

const timestamp = "2026-09-12T12:00:00.000Z";
function task(patch: Partial<Task> = {}): Task {
  return TaskSchema.parse({
    task_id: "video",
    task_type: "GENERATE_VIDEO",
    channel_id: "channel",
    episode_id: "episode",
    lock_key: "episode",
    status: "RUNNING",
    created_at: timestamp,
    ...patch,
  });
}
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("restart recovery", () => {
  it("requeues interrupted builds while preserving task identity and progress", () => {
    const [result] = recoverTasksAfterRestart([task({ progress_percent: 74 })], timestamp);
    expect(result).toMatchObject({ task_id: "video", status: "QUEUED", restart_recovery_count: 1, progress_percent: 74, error: null });
  });
  it("does not resurrect failed, cancelled, completed or waiting-approval tasks", () => {
    for (const status of ["FAILED", "CANCELLED", "COMPLETED", "WAITING_APPROVAL"] as const) {
      const [result] = recoverTasksAfterRestart([task({ status })], timestamp);
      expect(result.status).toBe(status === "WAITING_APPROVAL" ? "FAILED" : status);
    }
  });
  it("recovers the pipeline once and supersedes its queued/running children", () => {
    const parent = task({ task_id: "parent", task_type: "GENERATE_PIPELINE", lock_key: "episode:pipeline" });
    const result = recoverTasksAfterRestart(
      [
        parent,
        task({ parent_task_id: "parent" }),
        task({ task_id: "quiz", task_type: "GENERATE_QUIZ", status: "QUEUED", parent_task_id: "parent" }),
      ],
      timestamp,
    );
    expect(result.map((item) => item.status)).toEqual(["QUEUED", "CANCELLED", "CANCELLED"]);
  });
  it("adopts legacy children without parent IDs but not another episode", () => {
    const parent = task({ task_id: "parent", task_type: "GENERATE_PIPELINE" });
    const result = recoverTasksAfterRestart([parent, task(), task({ task_id: "other", episode_id: "other" })], timestamp);
    expect(result.map((item) => item.status)).toEqual(["QUEUED", "CANCELLED", "QUEUED"]);
  });
  it("bounds crash-loop recovery and leaves an explicit manual retry path", () => {
    const [result] = recoverTasksAfterRestart([task({ restart_recovery_count: 3 })], timestamp);
    expect(result.status).toBe("FAILED");
    expect(result.error).toContain("manually");
  });
  it("persists recovery before dispatch and remains idempotent on another load", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "restart-recovery-"));
    roots.push(root);
    await persistTask(root, task());
    const first = await loadTasksFromDisk(root);
    const second = await loadTasksFromDisk(root);
    expect(first[0].status).toBe("QUEUED");
    expect(second).toEqual(first);
  });
});

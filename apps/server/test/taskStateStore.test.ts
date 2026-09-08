import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskSchema, type Task } from "@studio/shared";
import { applyTaskPatch, loadTasksFromDisk, persistTask } from "../src/tasks/taskStateStore.js";

function buildTask(patch: Partial<Task> = {}) {
  return TaskSchema.parse({
    task_id: "task-1",
    task_type: "GENERATE_VIDEO",
    channel_id: "channel-1",
    episode_id: "episode-1",
    status: "QUEUED",
    created_at: "2026-09-01T00:00:00.000Z",
    lock_key: "episode-1",
    ...patch,
  });
}

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "task-state-store-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

describe("applyTaskPatch terminal lifecycle", () => {
  it("does not resurrect a cancelled task as running", () => {
    const cancelled = TaskSchema.parse({
      task_id: "task-1",
      task_type: "GENERATE_VIDEO",
      channel_id: "channel-1",
      episode_id: "episode-1",
      status: "CANCELLED",
      created_at: "2026-09-01T00:00:00.000Z",
      completed_at: "2026-09-01T00:00:01.000Z",
      lock_key: "episode-1",
    });

    const result = applyTaskPatch(cancelled, {
      status: "RUNNING",
      started_at: "2026-09-01T00:00:02.000Z",
      progress_message: "Preparing Quiz composition",
    });

    expect(result).toBe(cancelled);
  });
});

describe("persistTask / loadTasksFromDisk", () => {
  it("ignores leftover atomic-write temp files when loading tasks", async () => {
    const root = await createTempRoot();
    await persistTask(root, buildTask({ task_id: "task-kept" }));
    await writeFile(path.join(root, "tasks", "task-1.json.123.456.ab12cd.tmp"), "{ partial write", "utf8");

    const tasks = await loadTasksFromDisk(root);

    expect(tasks.map((task) => task.task_id)).toEqual(["task-kept"]);
  });

  it("keeps task files parseable under concurrent persistence", async () => {
    const root = await createTempRoot();
    const updates = Array.from({ length: 40 }, (_, index) => buildTask({ task_id: "task-1", progress_percent: index }));

    await Promise.all(updates.map((task) => persistTask(root, task)));
    const tasks = await loadTasksFromDisk(root);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].task_id).toBe("task-1");
    expect(updates.map((task) => task.progress_percent)).toContain(tasks[0].progress_percent);
  });

  it("warns and skips a corrupt task record instead of failing the load", async () => {
    const root = await createTempRoot();
    await mkdir(path.join(root, "tasks"), { recursive: true });
    await writeFile(path.join(root, "tasks", "broken.json"), "{ not valid json", "utf8");
    await persistTask(root, buildTask({ task_id: "task-kept" }));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const tasks = await loadTasksFromDisk(root);

    expect(tasks.map((task) => task.task_id)).toEqual(["task-kept"]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain("broken.json");
  });
});

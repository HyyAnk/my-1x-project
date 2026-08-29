import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { TaskSchema, nowIso, type Task } from "@studio/shared";

export async function persistTask(runtimeRoot: string, task: Task): Promise<void> {
  const directory = path.join(runtimeRoot, "tasks");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${task.task_id}.json`), `${JSON.stringify(task, null, 2)}\n`, "utf8");
}

export async function loadTasksFromDisk(runtimeRoot: string): Promise<Task[]> {
  const directory = path.join(runtimeRoot, "tasks");
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  const tasks: Task[] = [];

  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json"))) {
    try {
      const task = TaskSchema.parse(JSON.parse(await readFile(path.join(directory, entry.name), "utf8")));
      if (task.status === "RUNNING" || task.status === "WAITING_APPROVAL") {
        task.status = "FAILED";
        task.error = "Task interrupted by dashboard restart";
        task.completed_at = nowIso();
        await persistTask(runtimeRoot, task);
      }
      tasks.push(task);
    } catch {
      // Ignore a single corrupt operational record; repository artifacts remain safe.
    }
  }

  return tasks;
}

export function applyTaskPatch(current: Task, patch: Partial<Task>): Task {
  let effectivePatch = patch;

  if (["COMPLETED", "FAILED", "CANCELLED"].includes(current.status) && patch.status === undefined) {
    const { progress_message, progress_percent, ...rest } = patch;
    if (progress_message !== undefined || progress_percent !== undefined) {
      if (Object.keys(rest).length === 0) return current;
      effectivePatch = rest;
    }
  }

  if (current.started_at && patch.started_at && patch.status === "RUNNING") {
    const { started_at, ...rest } = effectivePatch;
    effectivePatch = rest;
  }

  return TaskSchema.parse({ ...current, ...effectivePatch });
}

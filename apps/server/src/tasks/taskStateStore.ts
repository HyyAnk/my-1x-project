import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { TaskSchema, nowIso, type Task } from "@studio/shared";
import { writeJsonAtomic } from "../utils/fs.js";
import { recoverTasksAfterRestart } from "./taskRestartRecovery.js";

export async function persistTask(runtimeRoot: string, task: Task): Promise<void> {
  const directory = path.join(runtimeRoot, "tasks");
  await mkdir(directory, { recursive: true });
  await writeJsonAtomic(path.join(directory, `${task.task_id}.json`), task);
}

export async function loadTasksFromDisk(runtimeRoot: string): Promise<Task[]> {
  const directory = path.join(runtimeRoot, "tasks");
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  const tasks: Task[] = [];

  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json"))) {
    try {
      const task = TaskSchema.parse(JSON.parse(await readFile(path.join(directory, entry.name), "utf8")));
      tasks.push(task);
    } catch (error) {
      // A single corrupt operational record is skipped; repository artifacts remain safe.
      console.warn(`[taskStateStore] Skipping unreadable task record "${entry.name}": ${(error as Error).message}`);
    }
  }

  const recovered = recoverTasksAfterRestart(tasks, nowIso());
  // Persist children before their owner. A second crash during reconciliation
  // must not leave a queued child racing the recovered parent on the next boot.
  for (const task of [...recovered].sort(
    (a, b) => Number(a.task_type === "GENERATE_PIPELINE") - Number(b.task_type === "GENERATE_PIPELINE"),
  )) {
    if (task !== tasks.find((original) => original.task_id === task.task_id)) await persistTask(runtimeRoot, task);
  }
  return recovered;
}

export function applyTaskPatch(current: Task, patch: Partial<Task>): Task {
  let effectivePatch = patch;
  const terminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(current.status);

  if (terminal && patch.status !== undefined && patch.status !== current.status) return current;

  if (terminal && patch.status === undefined) {
    const { progress_message, progress_percent, ...rest } = patch;
    if (progress_message !== undefined || progress_percent !== undefined) {
      if (Object.keys(rest).length === 0) return current;
      effectivePatch = rest;
    }
  }

  if (current.started_at && patch.started_at && patch.status === "RUNNING") {
    const { started_at: _started_at, ...rest } = effectivePatch;
    effectivePatch = rest;
  }

  return TaskSchema.parse({ ...current, ...effectivePatch });
}

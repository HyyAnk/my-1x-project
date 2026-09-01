import type { Task } from "@studio/shared";

export function formatTaskType(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (char) => char.toUpperCase());
}
export function formatTaskStatus(value: Task["status"]): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (char) => char.toUpperCase());
}
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
export function formatElapsed(start: string, end: number, additionalSeconds: number = 0): string {
  const seconds = Math.max(0, Math.floor((end - new Date(start).getTime()) / 1000) + additionalSeconds);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const hours = Math.floor(mins / 60);
  if (hours > 0) {
    return `${hours}:${String(mins % 60).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
export function formatTaskElapsed(task: Task, now: number): string {
  return formatElapsed(
    task.started_at || task.created_at,
    task.completed_at ? new Date(task.completed_at).getTime() : now,
    task.accumulated_duration_seconds || 0,
  );
}
export function isTaskActive(task: Task): boolean {
  return ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(task.status);
}
export function isTaskTerminal(task: Task): boolean {
  return ["COMPLETED", "FAILED", "CANCELLED"].includes(task.status);
}
export function latestTask(tasks: Task[], types: Task["task_type"][], sceneNumber?: number): Task | null {
  return (
    tasks
      .filter((task) => types.includes(task.task_type) && (sceneNumber === undefined || task.scene_number === sceneNumber))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
  );
}

export function formatElapsedSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  const hours = Math.floor(mins / 60);
  if (hours > 0) {
    return `${hours}:${String(mins % 60).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatElapsedHuman(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  const hours = Math.floor(mins / 60);
  if (hours > 0) {
    return `${hours}h ${mins % 60}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function calculateEpisodeBuildDuration(tasks: Task[], pipelineTask?: Task | null, now: number = Date.now()): number {
  if (pipelineTask) {
    const start = new Date(pipelineTask.started_at || pipelineTask.created_at).getTime();
    const end = pipelineTask.completed_at ? new Date(pipelineTask.completed_at).getTime() : now;
    return Math.max(0, Math.floor((end - start) / 1000) + (pipelineTask.accumulated_duration_seconds || 0));
  }
  if (!tasks.length) return 0;
  // If there is any GENERATE_PIPELINE task in the list, use the latest one
  const pipeline = tasks.find((t) => t.task_type === "GENERATE_PIPELINE");
  if (pipeline) {
    const start = new Date(pipeline.started_at || pipeline.created_at).getTime();
    const end = pipeline.completed_at ? new Date(pipeline.completed_at).getTime() : now;
    return Math.max(0, Math.floor((end - start) / 1000) + (pipeline.accumulated_duration_seconds || 0));
  }
  // Otherwise aggregate the completed & active task durations
  let total = 0;
  for (const t of tasks) {
    if (t.status === "COMPLETED" || isTaskActive(t)) {
      const start = new Date(t.started_at || t.created_at).getTime();
      const end = t.completed_at ? new Date(t.completed_at).getTime() : now;
      total += Math.max(0, Math.floor((end - start) / 1000) + (t.accumulated_duration_seconds || 0));
    }
  }
  return total;
}

import { TaskSchema, type Task } from "@studio/shared";

const BUILD_TYPES = new Set<Task["task_type"]>(["GENERATE_PIPELINE", "GENERATE_VIDEO", "GENERATE_THUMBNAIL"]);
const CHILD_TYPES = new Set<Task["task_type"]>(["GENERATE_QUIZ", "GENERATE_VIDEO"]);
const RECOVERABLE = new Set<Task["status"]>(["RUNNING", "QUEUED"]);
const MAX_RESTART_RECOVERIES = 3;

/** Reconcile a complete disk snapshot before any queue lane can start work. */
export function recoverTasksAfterRestart(tasks: Task[], timestamp: string): Task[] {
  const pipelines = tasks.filter((task) => task.task_type === "GENERATE_PIPELINE");
  return tasks.map((task) => {
    const owner = pipelines.find((parent) => isPipelineChild(task, parent));
    if (owner && RECOVERABLE.has(task.status)) {
      return TaskSchema.parse({
        ...task,
        status: "CANCELLED",
        completed_at: timestamp,
        error: `Superseded by recovering pipeline ${owner.task_id}`,
        progress_message: "Pipeline child stopped during restart recovery",
      });
    }
    if (task.status !== "RUNNING" && task.status !== "WAITING_APPROVAL") return task;
    const recoveries = task.restart_recovery_count ?? 0;
    if (task.status === "RUNNING" && BUILD_TYPES.has(task.task_type) && task.episode_id && recoveries < MAX_RESTART_RECOVERIES) {
      return TaskSchema.parse({
        ...task,
        status: "QUEUED",
        started_at: null,
        completed_at: null,
        error: null,
        codex_thread_id: null,
        codex_turn_id: null,
        queue_position: 0,
        restart_recovery_count: recoveries + 1,
        progress_message: "Recovering build after restart",
      });
    }
    return TaskSchema.parse({
      ...task,
      status: "FAILED",
      completed_at: timestamp,
      error:
        recoveries >= MAX_RESTART_RECOVERIES
          ? "Automatic restart recovery limit reached. Retry the build manually."
          : "Task interrupted by dashboard restart",
    });
  });
}

function isPipelineChild(task: Task, parent: Task): boolean {
  // Thumbnail work survives a completed or recovering video pipeline independently.
  if (task.task_type === "GENERATE_THUMBNAIL") return false;
  if (task.task_id === parent.task_id || task.channel_id !== parent.channel_id || task.episode_id !== parent.episode_id) return false;
  if (task.parent_task_id) return task.parent_task_id === parent.task_id;
  // Compatibility for pre-parent-ID task records: the quiz-native pipeline only
  // submits these two child types, after its own creation timestamp.
  return RECOVERABLE.has(parent.status) && CHILD_TYPES.has(task.task_type) && task.created_at >= parent.created_at;
}

import type { Task } from "@studio/shared";
import { formatTaskElapsed, formatTaskStatus, formatTaskType } from "../../../lib/utils";

export function TaskRow({ task, now }: { task: Task; now: number }) {
  return (
    <div className="activity-row">
      <div className={`task-status-dot ${task.status.toLowerCase()}`} />
      <div>
        <strong>{formatTaskType(task.task_type)}</strong>
        <span>{task.error || task.progress_message || formatTaskStatus(task.status)}</span>
      </div>
      <span className="task-elapsed">{formatTaskElapsed(task, now)}</span>
    </div>
  );
}

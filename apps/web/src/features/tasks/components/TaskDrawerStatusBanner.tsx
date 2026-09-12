import {
  CheckCircle,
  CircleNotch,
  Clock,
  Hourglass,
  ListChecks,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { formatTaskStatus } from "../../../lib/utils";

export interface TaskDrawerStatusBannerProps {
  task: Task;
}

export function TaskDrawerStatusBanner({ task }: TaskDrawerStatusBannerProps) {
  const isRunning = task.status === "RUNNING";
  const isQueued = task.status === "QUEUED";
  const isWaiting = task.status === "WAITING_APPROVAL";
  const isFailed = task.status === "FAILED";
  const isCompleted = task.status === "COMPLETED";
  const isCancelled = task.status === "CANCELLED";

  const renderStatusIcon = () => {
    if (isRunning) return <CircleNotch size={20} className="spin accent-icon" />;
    if (isQueued) return <Clock size={20} className="yellow-icon" />;
    if (isWaiting) return <Hourglass size={20} className="yellow-icon" />;
    if (isCompleted) return <CheckCircle size={20} weight="fill" className="green-icon" />;
    if (isFailed) return <WarningCircle size={20} weight="fill" className="coral-icon" />;
    if (isCancelled) return <XCircle size={20} className="muted-icon" />;
    return <ListChecks size={20} />;
  };

  const statusDescription =
    task.progress_message ||
    (isRunning
      ? "Task currently running on engine"
      : isQueued
        ? `Position #${(task.queue_position ?? 0) + 1} in build queue`
        : isWaiting
          ? "Waiting for manual approval"
          : isCompleted
            ? "Execution finished successfully"
            : isCancelled
              ? "Execution cancelled by user"
              : "Execution failed");

  return (
    <div className={`task-drawer-status-banner is-${task.status.toLowerCase()}`}>
      <div className="task-drawer-status-left">
        {renderStatusIcon()}
        <div>
          <strong>{formatTaskStatus(task.status)}</strong>
          <span>{statusDescription}</span>
        </div>
      </div>
      {task.progress_percent !== null && task.progress_percent !== undefined && (
        <span className="task-drawer-percent">{task.progress_percent}%</span>
      )}
    </div>
  );
}

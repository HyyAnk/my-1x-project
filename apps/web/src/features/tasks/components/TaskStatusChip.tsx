import { CheckCircle, CircleNotch, Clock, Hourglass, WarningCircle, XCircle } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { formatTaskStatus } from "../../../lib/utils";

export function TaskStatusChip({ status, compact = false }: { status: Task["status"]; compact?: boolean }) {
  const isRunning = status === "RUNNING";
  const isQueued = status === "QUEUED";
  const isWaiting = status === "WAITING_APPROVAL";
  const isFailed = status === "FAILED";
  const isCompleted = status === "COMPLETED";
  const isCancelled = status === "CANCELLED";

  return (
    <span className={`task-status-chip ${compact ? "compact" : ""} is-${status.toLowerCase()}`}>
      {isRunning ? (
        <CircleNotch size={12} className="spin" />
      ) : isQueued ? (
        <Clock size={12} />
      ) : isWaiting ? (
        <Hourglass size={12} />
      ) : isFailed ? (
        <WarningCircle size={12} weight="fill" />
      ) : isCompleted ? (
        <CheckCircle size={12} weight="fill" />
      ) : isCancelled ? (
        <XCircle size={12} />
      ) : null}
      <span>{formatTaskStatus(status)}</span>
    </span>
  );
}

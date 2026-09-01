import { ArrowClockwise, ArrowUpRight, Clock, Hourglass, WarningCircle, X } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { calculateEpisodeBuildDuration, formatDate, formatElapsedSeconds, formatTaskElapsed, formatTaskType, isTaskActive } from "../../../lib/utils";
import type { ProductionItemSummary } from "../types";
import { TaskStatusChip } from "./TaskStatusChip";
import { buildHash, getNavProps } from "../../../hooks/useRouter";

export function StreamlinedTaskCard({
  item,
  now,
  onOpenEpisode,
  onCancel,
  onRetry,
  onInspect,
}: {
  item: ProductionItemSummary;
  now: number;
  onOpenEpisode?: (channelId: string, episodeId: string) => void;
  onCancel: (task: Task) => void;
  onRetry: (task: Task) => void;
  onInspect: (item: ProductionItemSummary) => void;
}) {
  const isRunning = item.status === "RUNNING";
  const isQueued = item.status === "QUEUED";
  const isWaiting = item.status === "WAITING_APPROVAL";
  const isFailed = item.status === "FAILED";
  const isCompleted = item.status === "COMPLETED";
  const isCancelled = item.status === "CANCELLED";

  const targetTask = item.activeTask || item.latestTask;
  const pipelineTask = item.tasks.find((t) => t.task_type === "GENERATE_PIPELINE") || null;
  const buildDurationSeconds = calculateEpisodeBuildDuration(item.tasks, pipelineTask, now);
  const episodeUrl =
    item.channelId && item.episodeId ? buildHash({ page: "channels", channelId: item.channelId, episodeId: item.episodeId }) : null;

  return (
    <article
      className={`streamlined-task-card is-${item.status.toLowerCase()}`}
      onClick={() => onInspect(item)}
      data-nav-href={episodeUrl || undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onInspect(item);
        }
      }}
      title="Click to view full task details"
    >
      {/* Top Header: Breadcrumb (Channel > Episode) + Status Chip */}
      <div className="task-card-header">
        <div className="task-card-breadcrumb">
          <span className="task-card-channel-name">{item.channelName}</span>
          <span className="task-card-separator">›</span>
          <span className="task-card-ep-pill">EP · {item.episodeId.slice(-4).toUpperCase()}</span>
        </div>

        <div className="task-card-status-badges">
          {item.queuePosition !== null && isQueued && <span className="queue-position-pill">Queue #{item.queuePosition + 1}</span>}
          <span className="task-card-time-pill" title={isCompleted ? "Total build time" : "Elapsed time"}>
            <Clock size={11} weight="bold" />
            <span>{formatElapsedSeconds(buildDurationSeconds)}</span>
          </span>
          <TaskStatusChip status={item.status} />
        </div>
      </div>

      {/* Main Title & Type Subtext */}
      <div className="task-card-title-row">
        <h3 className="task-card-topic-title">{item.episodeTitle || formatTaskType(targetTask.task_type)}</h3>
        <span className="task-card-type-subtext">{formatTaskType(targetTask.task_type)}</span>
      </div>

      {/* Dynamic Progress / Queue / Error Section */}
      {isQueued ? (
        <div className="task-card-queue-notice">
          <Clock size={14} className="queue-notice-icon" />
          <span>Waiting in queue · Position #{item.queuePosition !== null ? item.queuePosition + 1 : "—"}</span>
        </div>
      ) : isWaiting ? (
        <div className="task-card-waiting-notice">
          <Hourglass size={14} className="waiting-notice-icon" />
          <span>{item.progressMessage || "Waiting for user approval to proceed"}</span>
        </div>
      ) : isRunning ? (
        <div className="task-card-progress-section">
          <div className="task-card-progress-info">
            <span className="task-card-progress-msg">{item.progressMessage || "Processing in progress..."}</span>
            <span className="task-card-progress-pct">{item.progressPercent}%</span>
          </div>
          <div
            className="task-card-progress-track"
            role="progressbar"
            aria-valuenow={item.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${formatTaskType(targetTask.task_type)} progress`}
          >
            <div className="task-card-progress-fill is-running" style={{ width: `${Math.max(6, Math.min(100, item.progressPercent))}%` }} />
          </div>
        </div>
      ) : isFailed && item.error ? (
        <div className="task-card-error-callout">
          <WarningCircle size={15} weight="fill" className="coral-icon" />
          <p className="task-card-error-text">{item.error}</p>
          <span className="task-card-view-log-link">View details &rarr;</span>
        </div>
      ) : (
        <div className="task-card-done-info">
          <span className="task-card-done-msg">
            {isCompleted ? item.progressMessage || "Completed successfully" : isCancelled ? "Cancelled by user" : "Execution finished"}
          </span>
        </div>
      )}

      {/* Card Footer: Elapsed Time + Direct Action Buttons */}
      <div className="task-card-footer">
        <div className="task-card-meta">
          <Clock size={13} className="meta-icon" />
          <span>{isCompleted ? `Build time: ${formatElapsedSeconds(buildDurationSeconds)}` : formatTaskElapsed(targetTask, now)}</span>
          {targetTask.completed_at ? <span className="task-card-meta-date">· {formatDate(targetTask.completed_at)}</span> : null}
        </div>

        <div className="task-card-actions" onClick={(e) => e.stopPropagation()}>
          {isTaskActive(targetTask) ? (
            <button
              type="button"
              className="quiet-button danger compact"
              title="Cancel execution"
              aria-label="Cancel execution"
              onClick={() => onCancel(targetTask)}
            >
              <X size={14} />
              <span>Cancel</span>
            </button>
          ) : isFailed || isCancelled ? (
            <button
              type="button"
              className="primary-button compact"
              title="Retry task"
              aria-label="Retry task"
              onClick={() => onRetry(targetTask)}
            >
              <ArrowClockwise size={14} />
              <span>Retry</span>
            </button>
          ) : null}

          {onOpenEpisode && episodeUrl ? (
            <a
              className="quiet-button compact ep-rail-btn"
              title="Open in Production Rail"
              aria-label="Open in Production Rail"
              {...getNavProps(episodeUrl, () => onOpenEpisode(item.channelId, item.episodeId))}
            >
              <span>Rail</span>
              <ArrowUpRight size={13} />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

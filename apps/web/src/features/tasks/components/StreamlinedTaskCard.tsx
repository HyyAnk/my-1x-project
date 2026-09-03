import { useState } from "react";
import { ArrowClockwise, CircleNotch, Clock, X } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import type { ProductionItemSummary } from "../types";
import { buildTaskCardViewModel } from "../utils/taskCardViewModel";
import { TaskStatusChip } from "./TaskStatusChip";

type StreamlinedTaskCardProps = {
  item: ProductionItemSummary;
  now: number;
  onCancel: (task: Task) => Promise<void>;
  onRetry: (task: Task) => Promise<void>;
  onInspect: (item: ProductionItemSummary) => void;
};

export function StreamlinedTaskCard({ item, now, onCancel, onRetry, onInspect }: StreamlinedTaskCardProps) {
  const viewModel = buildTaskCardViewModel(item, now);
  const [actionPending, setActionPending] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const runAction = async () => {
    if (!viewModel.action || actionPending) return;
    setActionPending(true);
    try {
      await (viewModel.action === "cancel" ? onCancel(viewModel.targetTask) : onRetry(viewModel.targetTask));
    } finally {
      setActionPending(false);
    }
  };

  return (
    <article className={`streamlined-task-card is-${item.status.toLowerCase()} ${viewModel.action ? "has-action" : ""}`}>
      <button
        type="button"
        className="task-card-open"
        aria-label={`View task details for ${item.episodeTitle}`}
        onClick={() => onInspect(item)}
      >
        <div className="task-card-header">
          <span className="task-card-channel-name">{item.channelName}</span>
          <TaskStatusChip status={item.status} compact />
        </div>

        <div className="task-card-content-row">
          <div className="task-card-thumbnail" data-testid="task-card-thumbnail" aria-hidden={viewModel.thumbnailUrl && !thumbnailFailed ? undefined : true}>
            {viewModel.thumbnailUrl && !thumbnailFailed ? (
              <img
                src={viewModel.thumbnailUrl}
                alt={`Thumbnail for ${item.episodeTitle}`}
                loading="lazy"
                decoding="async"
                onError={() => setThumbnailFailed(true)}
              />
            ) : null}
          </div>
          <div className="task-card-content">
            <div className="task-card-title-row">
              <h3 className="task-card-topic-title">{item.episodeTitle || viewModel.taskTypeLabel}</h3>
              <span className="task-card-type-subtext">{viewModel.taskTypeLabel}</span>
            </div>

            {viewModel.detailLabel ? (
              <div className={`task-card-detail is-${item.status.toLowerCase()}`}>
                <span>{viewModel.detailLabel}</span>
                {viewModel.progressPercent !== null ? <strong>{viewModel.progressPercent}%</strong> : null}
              </div>
            ) : null}

            {viewModel.progressPercent !== null ? (
              <div
                className="task-card-progress-track"
                role="progressbar"
                aria-valuenow={viewModel.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${viewModel.taskTypeLabel} progress`}
              >
                <div className="task-card-progress-fill" style={{ width: `${Math.max(4, Math.min(100, viewModel.progressPercent))}%` }} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="task-card-meta">
          <Clock size={12} aria-hidden="true" />
          <span>{viewModel.durationLabel}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={item.completedAt || item.startedAt}>{viewModel.timeLabel}</time>
        </div>
      </button>

      {viewModel.action ? (
        <button
          type="button"
          className={`task-card-action ${viewModel.action === "cancel" ? "is-danger" : ""}`}
          aria-label={
            actionPending
              ? viewModel.action === "cancel"
                ? "Cancelling task"
                : "Retrying task"
              : `${viewModel.action === "cancel" ? "Cancel" : "Retry"} task`
          }
          title={viewModel.action === "cancel" ? "Cancel task" : "Retry task"}
          disabled={actionPending}
          onClick={() => void runAction()}
        >
          {actionPending ? (
            <CircleNotch className="spin" size={13} />
          ) : viewModel.action === "cancel" ? (
            <X size={13} />
          ) : (
            <ArrowClockwise size={13} />
          )}
          <span>
            {actionPending
              ? viewModel.action === "cancel"
                ? "Cancelling"
                : "Retrying"
              : viewModel.action === "cancel"
                ? "Cancel"
                : "Retry"}
          </span>
        </button>
      ) : null}
    </article>
  );
}

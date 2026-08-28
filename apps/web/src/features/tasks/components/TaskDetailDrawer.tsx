import { useState } from "react";
import {
  ArrowClockwise,
  ArrowUpRight,
  Check,
  CheckCircle,
  CircleNotch,
  Clock,
  Copy,
  FileText,
  Hourglass,
  ListChecks,
  WarningCircle,
  X,
  XCircle,
} from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { formatDate, formatTaskElapsed, formatTaskStatus, formatTaskType, isTaskActive } from "../../../lib/utils";
import type { ProductionItemSummary } from "../types";

export function TaskDetailDrawer({
  item,
  task,
  now,
  onClose,
  onCancel,
  onRetry,
  onOpenEpisode,
}: {
  item: ProductionItemSummary | null;
  task: Task | null;
  now: number;
  onClose: () => void;
  onCancel: (task: Task) => void;
  onRetry: (task: Task) => void;
  onOpenEpisode?: (channelId: string, episodeId: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!item && !task) return null;
  const targetTask = task || item?.activeTask || item?.latestTask;
  if (!targetTask) return null;

  const isRunning = targetTask.status === "RUNNING";
  const isQueued = targetTask.status === "QUEUED";
  const isWaiting = targetTask.status === "WAITING_APPROVAL";
  const isFailed = targetTask.status === "FAILED";
  const isCompleted = targetTask.status === "COMPLETED";
  const isCancelled = targetTask.status === "CANCELLED";

  const handleCopyError = () => {
    if (targetTask.error) {
      void navigator.clipboard.writeText(targetTask.error);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="task-drawer-overlay" onClick={onClose}>
      <aside className="task-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="task-drawer-header">
          <div className="task-drawer-title-group">
            <span className="eyebrow">Task Details</span>
            <h2>{formatTaskType(targetTask.task_type)}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Close drawer" aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>

        <div className="task-drawer-body">
          {/* Status Banner */}
          <div className={`task-drawer-status-banner is-${targetTask.status.toLowerCase()}`}>
            <div className="task-drawer-status-left">
              {isRunning ? (
                <CircleNotch size={20} className="spin accent-icon" />
              ) : isQueued ? (
                <Clock size={20} className="yellow-icon" />
              ) : isWaiting ? (
                <Hourglass size={20} className="yellow-icon" />
              ) : isCompleted ? (
                <CheckCircle size={20} weight="fill" className="green-icon" />
              ) : isFailed ? (
                <WarningCircle size={20} weight="fill" className="coral-icon" />
              ) : isCancelled ? (
                <XCircle size={20} className="muted-icon" />
              ) : (
                <ListChecks size={20} />
              )}
              <div>
                <strong>{formatTaskStatus(targetTask.status)}</strong>
                <span>
                  {targetTask.progress_message ||
                    (isRunning
                      ? "Task currently running on engine"
                      : isQueued
                      ? `Position #${(targetTask.queue_position ?? 0) + 1} in build queue`
                      : isWaiting
                      ? "Waiting for manual approval"
                      : isCompleted
                      ? "Execution finished successfully"
                      : isCancelled
                      ? "Execution cancelled by user"
                      : "Execution failed")}
                </span>
              </div>
            </div>
            {targetTask.progress_percent !== null && targetTask.progress_percent !== undefined && (
              <span className="task-drawer-percent">{targetTask.progress_percent}%</span>
            )}
          </div>

          {/* Error Callout (if Failed) */}
          {targetTask.error && (
            <div className="task-drawer-section error-section">
              <div className="section-title-row">
                <span className="section-label coral-text">
                  <WarningCircle size={14} weight="fill" /> Error Details & Stack
                </span>
                <button className="text-button copy-btn" onClick={handleCopyError}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? "Copied" : "Copy Error"}</span>
                </button>
              </div>
              <div className="task-error-code-wrap">
                <pre className="task-error-code">{targetTask.error}</pre>
              </div>
            </div>
          )}

          {/* Key-Value Information Grid */}
          <div className="task-drawer-section">
            <span className="section-label">Execution Info</span>
            <div className="task-info-grid">
              <div className="task-info-item">
                <span className="info-key">Channel</span>
                <strong className="info-val">{item?.channelName || targetTask.channel_id}</strong>
              </div>
              <div className="task-info-item">
                <span className="info-key">Episode / Topic</span>
                <strong className="info-val">{item?.episodeTitle || targetTask.episode_id || "Channel Level"}</strong>
              </div>
              {targetTask.scene_number !== null && targetTask.scene_number !== undefined && (
                <div className="task-info-item">
                  <span className="info-key">Scene</span>
                  <strong className="info-val">Scene #{targetTask.scene_number}</strong>
                </div>
              )}
              <div className="task-info-item">
                <span className="info-key">Elapsed Duration</span>
                <strong className="info-val">{formatTaskElapsed(targetTask, now)}</strong>
              </div>
              <div className="task-info-item">
                <span className="info-key">Created At</span>
                <span className="info-val">{formatDate(targetTask.created_at)}</span>
              </div>
              {targetTask.started_at && (
                <div className="task-info-item">
                  <span className="info-key">Started At</span>
                  <span className="info-val">{formatDate(targetTask.started_at)}</span>
                </div>
              )}
              {targetTask.completed_at && (
                <div className="task-info-item">
                  <span className="info-key">Completed At</span>
                  <span className="info-val">{formatDate(targetTask.completed_at)}</span>
                </div>
              )}
              <div className="task-info-item">
                <span className="info-key">Task ID</span>
                <span className="info-val code-text">{targetTask.task_id}</span>
              </div>
            </div>
          </div>

          {/* Output Files (if any) */}
          {targetTask.output_files && targetTask.output_files.length > 0 && (
            <div className="task-drawer-section">
              <span className="section-label">Generated Output Files ({targetTask.output_files.length})</span>
              <ul className="task-output-list">
                {targetTask.output_files.map((file, idx) => (
                  <li key={idx} className="task-output-item">
                    <FileText size={14} className="file-icon" />
                    <span>{file}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="task-drawer-footer">
          {isTaskActive(targetTask) ? (
            <button
              type="button"
              className="danger-button"
              onClick={() => {
                onCancel(targetTask);
                onClose();
              }}
            >
              <X size={15} />
              <span>Cancel Task</span>
            </button>
          ) : isFailed || isCancelled ? (
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                onRetry(targetTask);
                onClose();
              }}
            >
              <ArrowClockwise size={15} />
              <span>Retry Task</span>
            </button>
          ) : null}

          {targetTask.episode_id && onOpenEpisode && (
            <button
              type="button"
              className="quiet-button"
              onClick={() => {
                onOpenEpisode(targetTask.channel_id, targetTask.episode_id!);
                onClose();
              }}
            >
              <span>Production Rail</span>
              <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

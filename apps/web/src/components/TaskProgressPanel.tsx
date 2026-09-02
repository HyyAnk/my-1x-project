import { formatTaskElapsed, isTaskActive } from "../lib/utils";
import { Sparkle, Stop } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { useThinkingStatus } from "./taskProgress/thinkingSteps";
import { formatRenderProgress } from "./taskProgress/renderProgress";
import { useContinuousProgress } from "./taskProgress/useContinuousProgress";

function resolveProgressLabel(options: {
  task: Task;
  title: string;
  completionLabel: string;
  thinkingLabel: string;
  renderMetrics: string | null;
}): string {
  const { task, title, completionLabel, thinkingLabel } = options;
  if (task.status === "COMPLETED") return completionLabel.replace(new RegExp(`^${title}\\s*`, "i"), "") || "Ready";
  if (task.status === "FAILED") return "Failed";
  if (task.status === "CANCELLED") return "Cancelled";
  if (task.status === "WAITING_APPROVAL") return "Waiting for approval";
  if (task.progress_message && task.progress_message.trim()) {
    return task.progress_message;
  }
  return thinkingLabel;
}

export type TaskProgressVariant = "default" | "hero";

export function TaskProgressPanel({
  task,
  title,
  activeLabel,
  completionLabel,
  now,
  compact = false,
  variant = "default",
  progressLabel = `${title} progress`,
  onCancel,
}: {
  task: Task;
  title: string;
  activeLabel: string;
  completionLabel: string;
  now: number;
  compact?: boolean;
  variant?: TaskProgressVariant;
  progressLabel?: string;
  onCancel?: (task: Task) => void;
}) {
  const isHero = variant === "hero";
  const active = isTaskActive(task);
  const completed = task.status === "COMPLETED";
  const failed = task.status === "FAILED";
  const cancelled = task.status === "CANCELLED";
  const thinkingLabel = useThinkingStatus(task, activeLabel, active);
  const renderMetrics = formatRenderProgress(task);
  const label = resolveProgressLabel({ task, title, completionLabel, thinkingLabel, renderMetrics });

  const progressMessage = task.error || task.progress_message || task.status;
  const rawPercent = completed ? 100 : typeof task.progress_percent === "number" ? task.progress_percent : null;
  const percent = useContinuousProgress(task, rawPercent);
  const ariaProgressMessage = renderMetrics ? `${progressMessage}. ${renderMetrics}` : progressMessage;
  const percentLabel = percent === null ? null : task.render_progress ? `${Number(percent.toFixed(2))}%` : `${Math.round(percent)}%`;

  return (
    <div
      className={`task-progress-panel ${task.status.toLowerCase()} ${compact ? "is-compact" : ""} ${isHero ? "is-hero" : ""}`}
      role="status"
    >
      <div className="task-progress-head">
        <div className="task-progress-title">
          <div className="task-progress-title-row">
            {isHero && active ? <span className="task-hero-live-indicator" aria-hidden="true" /> : null}
            <span className="eyebrow">{title}</span>
          </div>
          <strong className={active ? "task-progress-thinking" : ""}>
            {active ? (
              <span className="task-thinking-pill">
                <Sparkle size={13} className="task-thinking-icon" weight="fill" />
                <span className="task-thinking-msg" key={label}>
                  {label}
                </span>
              </span>
            ) : (
              label
            )}
          </strong>
        </div>
        <div className="task-progress-meta">
          {percentLabel ? <span className="task-progress-percent-badge">{percentLabel}</span> : null}
          <span className="task-progress-time">{formatTaskElapsed(task, now)}</span>
          {active && onCancel ? (
            <button
              type="button"
              className="danger-button compact stop-icon-btn"
              onClick={() => onCancel(task)}
              title="Stop task"
              aria-label={`Stop ${title}`}
            >
              <Stop size={12} weight="fill" />
              <span>Stop</span>
            </button>
          ) : null}
        </div>
      </div>
      <div
        className={`task-progress-track ${percent === null ? "is-indeterminate" : ""}`}
        role="progressbar"
        aria-label={progressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        aria-valuetext={completed ? "Complete" : failed ? "Failed" : cancelled ? "Cancelled" : ariaProgressMessage}
      >
        <span
          className="task-progress-fill"
          style={percent === null ? undefined : { width: `${Math.max(0, Math.min(100, percent))}%` }}
        >
          {active && percent !== null && percent > 0 ? (
            <span className="task-progress-glow-head" aria-hidden="true" />
          ) : null}
          {active ? <span className="task-progress-shimmer" aria-hidden="true" /> : null}
        </span>
      </div>
      {renderMetrics ? <p className="task-progress-measurements">{renderMetrics}</p> : null}
      {!completed && (failed || cancelled || Boolean(task.error)) && progressMessage ? (
        <p className="task-progress-copy">{progressMessage}</p>
      ) : null}
    </div>
  );
}

export function TopicProgress({ task, now, onCancel }: { task: Task; now: number; onCancel?: (task: Task) => void }) {
  return (
    <TaskProgressPanel
      task={task}
      title="Topic generation"
      activeLabel="Generating 5 topics"
      completionLabel="5 topics ready"
      progressLabel="Topic generation progress"
      now={now}
      onCancel={onCancel}
    />
  );
}

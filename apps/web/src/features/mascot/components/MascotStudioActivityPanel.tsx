import { ArrowRight, CheckCircle, CircleNotch, ClockCountdown, WarningCircle, X } from "@phosphor-icons/react";
import type { MascotStudioActivityItem, MascotStudioActivityStatus } from "../types/mascotStudioActivity.types";

export interface MascotStudioActivityPanelProps {
  activities: MascotStudioActivityItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasWarnings: boolean;
  onRefresh: () => void;
  onOpen: (activity: MascotStudioActivityItem) => void;
  onDismiss: (activityId: string) => void;
}

const STATUS_LABELS: Record<MascotStudioActivityStatus, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  partial: "Partial",
  failed: "Failed",
  cancelled: "Cancelled",
};

function activityTitle(activity: MascotStudioActivityItem): string {
  if (activity.kind === "style_concepts") return "Style concepts";
  if (activity.kind === "expressive_states") return `Expressive states · ${activity.styleName || activity.styleId}`;
  return `Animation processing · ${activity.styleName || activity.styleId}`;
}

function activityDetail(activity: MascotStudioActivityItem): string {
  if (activity.kind === "animation_processing") {
    const state = activity.state === "celebrate" ? "Celebrate" : "Thinking";
    return `${state} #${activity.slotIndex ?? 1} · ${activity.percentage}%`;
  }

  const noun = activity.kind === "style_concepts" ? "styles" : "poses";
  const failed = activity.failed > 0 ? ` · ${activity.failed} failed` : "";
  return `${activity.completed}/${activity.total} ${noun} complete${failed}`;
}

function StatusIcon({ activity }: { activity: MascotStudioActivityItem }) {
  if (activity.isActive) return <CircleNotch size={15} className="spin" aria-hidden="true" />;
  if (activity.status === "completed") return <CheckCircle size={15} weight="fill" aria-hidden="true" />;
  return <WarningCircle size={15} weight="fill" aria-hidden="true" />;
}

export function MascotStudioActivityPanel({
  activities,
  isLoading,
  isRefreshing,
  error,
  hasWarnings,
  onRefresh,
  onOpen,
  onDismiss,
}: MascotStudioActivityPanelProps) {
  if (!isLoading && activities.length === 0 && !error && !hasWarnings) return null;

  const activeCount = activities.filter((activity) => activity.isActive).length;
  const recentCount = activities.length - activeCount;
  const summary = [activeCount > 0 ? `${activeCount} running` : "", recentCount > 0 ? `${recentCount} recent` : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="mascot-activity-panel" aria-labelledby="mascot-activity-title" aria-live="polite">
      <div className="mascot-activity-header">
        <div className="mascot-activity-heading">
          <ClockCountdown size={18} weight="fill" aria-hidden="true" />
          <h3 id="mascot-activity-title">Background activity</h3>
          {summary ? <span className="mascot-activity-summary">{summary}</span> : null}
        </div>
        <button
          type="button"
          className="mascot-activity-refresh"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh background activity"
          aria-label="Refresh background activity"
        >
          <CircleNotch size={16} className={isRefreshing ? "spin" : ""} aria-hidden="true" />
        </button>
      </div>

      {isLoading && activities.length === 0 ? (
        <div className="mascot-activity-loading" role="status">
          <CircleNotch size={16} className="spin" aria-hidden="true" />
          <span>Restoring background activity</span>
        </div>
      ) : null}

      {error ? (
        <div className="mascot-activity-alert" role="alert">
          <span>Activity status unavailable</span>
          <button type="button" className="quiet-button compact" onClick={onRefresh}>
            Retry
          </button>
        </div>
      ) : null}

      {hasWarnings ? (
        <div className="mascot-activity-warning" role="status">
          <WarningCircle size={14} aria-hidden="true" />
          <span>Some activity sources could not be refreshed</span>
        </div>
      ) : null}

      {activities.length > 0 ? (
        <div className="mascot-activity-list">
          {activities.map((activity) => (
            <article className={`mascot-activity-item status-${activity.status}`} key={activity.id}>
              <div className="mascot-activity-item-copy">
                <div className="mascot-activity-item-title-row">
                  <StatusIcon activity={activity} />
                  <strong>{activityTitle(activity)}</strong>
                  <span className="mascot-activity-status">{STATUS_LABELS[activity.status]}</span>
                </div>
                <span className="mascot-activity-detail">{activityDetail(activity)}</span>
              </div>

              <div
                className="mascot-activity-progress"
                role="progressbar"
                aria-label={`${activityTitle(activity)} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={activity.percentage}
              >
                <span style={{ width: `${activity.percentage}%` }} />
              </div>

              <div className="mascot-activity-actions">
                <button
                  type="button"
                  className="quiet-button compact"
                  onClick={() => onOpen(activity)}
                  aria-label={`View ${activityTitle(activity)}`}
                >
                  <span>View</span>
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
                {!activity.isActive ? (
                  <button
                    type="button"
                    className="mascot-activity-dismiss"
                    onClick={() => onDismiss(activity.id)}
                    title="Dismiss activity"
                    aria-label={`Dismiss ${activityTitle(activity)}`}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

import { Lightning, CircleNotch, Stop, ArrowCounterClockwise } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";
import type { StyleQueueProgressState } from "../hooks/styleQueue/types";

export interface MascotStyleQueueProgressCardProps {
  styleQueueProgress: StyleQueueProgressState | null;
  onStopQueue: () => void;
  onRetryFailed?: () => void;
}

export function MascotStyleQueueProgressCard({ styleQueueProgress, onStopQueue, onRetryFailed }: MascotStyleQueueProgressCardProps) {
  const { t } = useTranslation();

  if (!styleQueueProgress) return null;

  const percentage = Math.min(
    100,
    Math.round(((styleQueueProgress.completed + styleQueueProgress.failed) / Math.max(1, styleQueueProgress.total)) * 100),
  );
  const queuedCount = Math.max(0, styleQueueProgress.total - styleQueueProgress.completed - styleQueueProgress.failed);
  const isAllSettled = styleQueueProgress.completed + styleQueueProgress.failed >= styleQueueProgress.total;

  return (
    <div
      className="batch-progress-deck style-queue-deck"
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Style Concept Queue Progress"
      style={{ marginBottom: "16px", marginTop: "4px" }}
    >
      <div className="batch-progress-header">
        <div className="batch-progress-meta">
          <div className="batch-progress-title-row">
            <Lightning size={17} weight="fill" className="batch-pulse-icon" />
            <span className="batch-progress-title">{t("mascots.styleQueueTitle")}</span>
          </div>
          <span className="batch-progress-counter">
            {styleQueueProgress.completed} / {styleQueueProgress.total} {t("mascots.styleQueueCompletedShort")} ({percentage}%)
            {queuedCount > 0 ? ` • ${queuedCount} ${t("mascots.styleQueueQueuedShort")}` : ""}
            {styleQueueProgress.failed > 0 ? ` • ${styleQueueProgress.failed} ${t("mascots.styleQueueFailedShort")}` : ""}
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {styleQueueProgress.failed > 0 && onRetryFailed ? (
            <button
              type="button"
              className="quiet-button compact"
              onClick={onRetryFailed}
              title="Retry failed style concepts"
              aria-label="Retry Failed"
            >
              <ArrowCounterClockwise size={13} />
              <span>{t("mascots.styleQueueRetryBtn")}</span>
            </button>
          ) : null}

          {!isAllSettled ? (
            <button
              type="button"
              className="batch-stop-button"
              onClick={onStopQueue}
              disabled={styleQueueProgress.isStopping}
              title="Cancel remaining queued style concept generations"
              aria-label="Stop Queue"
            >
              <Stop size={14} weight="fill" />
              <span>{styleQueueProgress.isStopping ? t("mascots.styleQueueStoppingBtn") : t("mascots.styleQueueStopBtn")}</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="batch-progress-track">
        <div
          className="batch-progress-fill"
          style={{
            width: `${percentage}%`,
            background:
              styleQueueProgress.failed > 0 && styleQueueProgress.completed === 0
                ? "var(--danger, #ef4444)"
                : "linear-gradient(90deg, #06b6d4 0%, #3b82f6 100%)",
          }}
        />
      </div>

      {/* Status Message and Active Item Pills */}
      <div className="batch-progress-footer">
        <div className="batch-live-status-message">
          {!isAllSettled ? <CircleNotch size={14} className="spin" /> : null}
          <span>{styleQueueProgress.statusMessage}</span>
        </div>

        {styleQueueProgress.activeStyleNames.length > 0 ? (
          <div className="active-streams-pills" role="status" aria-label="Active style generation streams">
            <span className="active-streams-label">{t("mascots.styleQueueActiveLabel")}:</span>
            {styleQueueProgress.activeStyleNames.map((name) => (
              <span key={name} className="stream-badge" title={`Generating: ${name}`}>
                <span className="stream-dot" aria-hidden="true" />
                <span className="stream-text">{name}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { Lightning, CircleNotch, Stop } from "@phosphor-icons/react";
import type { BatchProgressState } from "../hooks/useMascotBatchGeneration";

export type MascotBatchProgressCardProps = {
  batchProgress: BatchProgressState | null;
  onStopBatch: () => void;
};

export function MascotBatchProgressCard({ batchProgress, onStopBatch }: MascotBatchProgressCardProps) {
  if (!batchProgress) return null;

  const percentage = Math.min(100, Math.round((batchProgress.completed / Math.max(1, batchProgress.total)) * 100));
  const queuedCount = Math.max(0, batchProgress.total - batchProgress.completed - batchProgress.failed);

  const isRegenerating = batchProgress.mode === "regenerate_selected" || batchProgress.statusMessage.toLowerCase().includes("selected");

  const targetStateLabel =
    batchProgress.targetState && batchProgress.targetState !== "all"
      ? batchProgress.targetState === "thinking"
        ? "Thinking "
        : "Celebrate "
      : "";

  const title =
    batchProgress.total === 1
      ? isRegenerating
        ? `Regenerating ${targetStateLabel}Variant`
        : `Generating ${targetStateLabel}Variant`
      : isRegenerating
        ? `Regenerating ${targetStateLabel}Variants (3 Concurrent Streams)`
        : `Generating ${targetStateLabel || "Style "}Variants (3 Concurrent Streams)`;

  return (
    <div
      className="batch-progress-deck"
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Batch Generation Progress"
    >
      <div className="batch-progress-header">
        <div className="batch-progress-meta">
          <div className="batch-progress-title-row">
            <Lightning size={17} weight="fill" className="batch-pulse-icon" />
            <span className="batch-progress-title">{title}</span>
          </div>
          <span className="batch-progress-counter">
            {batchProgress.completed} / {batchProgress.total} completed ({percentage}%)
            {queuedCount > 0 ? ` • ${queuedCount} queued` : ""}
            {batchProgress.failed > 0 ? ` • ${batchProgress.failed} failed` : ""}
          </span>
        </div>

        <button
          type="button"
          className="batch-stop-button"
          onClick={onStopBatch}
          disabled={batchProgress.isStopping}
          title="Cancel the remaining server-side slot generation"
          aria-label="Stop Generation"
        >
          <Stop size={14} weight="fill" />
          <span>{batchProgress.isStopping ? "Stopping Queue..." : "Stop Generation"}</span>
        </button>
      </div>

      {/* Progress Bar Track */}
      <div className="batch-progress-track">
        <div className="batch-progress-fill" style={{ width: `${percentage}%` }} />
      </div>

      {/* Status Message and Active Worker Badges */}
      <div className="batch-progress-footer">
        <div className="batch-live-status-message">
          <CircleNotch size={14} className="spin" />
          <span>{batchProgress.statusMessage}</span>
        </div>

        {batchProgress.activeSlotKeys.length > 0 ? (
          <div className="active-streams-pills" role="status" aria-label="Active generation streams">
            <span className="active-streams-label">Active Streams:</span>
            {batchProgress.activeSlotKeys.map((key, idx) => {
              const [st, num] = key.split("_");
              const stateName = st === "thinking" ? "Thinking" : st === "celebrate" ? "Celebrate" : st;
              return (
                <span key={key} className="stream-badge" title={`Stream ${idx + 1}: ${stateName} #${num}`}>
                  <span className="stream-dot" aria-hidden="true" />
                  <span className="stream-text">{`Stream ${idx + 1}: ${stateName} #${num}`}</span>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

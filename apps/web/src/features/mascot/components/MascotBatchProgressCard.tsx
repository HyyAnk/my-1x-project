import { Lightning, CircleNotch, Stop } from "@phosphor-icons/react";
import type { BatchProgressState } from "../hooks/useMascotBatchGeneration";

export type MascotBatchProgressCardProps = {
  batchProgress: BatchProgressState | null;
  onStopBatch: () => void;
};

export function MascotBatchProgressCard({ batchProgress, onStopBatch }: MascotBatchProgressCardProps) {
  if (!batchProgress) return null;

  const percentage = Math.min(100, Math.round((batchProgress.completed / batchProgress.total) * 100));

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
            <span className="batch-progress-title">Generating Style Variants (3 Concurrent Streams)</span>
          </div>
          <span className="batch-progress-counter">
            {batchProgress.completed} / {batchProgress.total} slots ({percentage}%)
            {batchProgress.failed > 0 ? ` • ${batchProgress.failed} failed` : ""}
          </span>
        </div>

        <button
          type="button"
          className="batch-stop-button"
          onClick={onStopBatch}
          disabled={batchProgress.isStopping}
          title="Cancel the remaining server-side slot generation"
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
          <div className="active-streams-pills">
            <span className="active-streams-label">Active Streams:</span>
            {batchProgress.activeSlotKeys.map((key, idx) => {
              const [st, num] = key.split("_");
              return (
                <span key={key} className="stream-badge">
                  <span className="stream-dot" />
                  Stream {idx + 1}: {st === "thinking" ? "Thinking" : "Celebrate"} #{num}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

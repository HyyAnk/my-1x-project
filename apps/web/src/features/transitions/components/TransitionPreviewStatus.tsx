import React from "react";
import type { TransitionPreviewState } from "../types/transitionPlayer.types";

export type TransitionPreviewStatusProps = {
  state: TransitionPreviewState;
  isStale?: boolean;
  onRetry?: () => void;
  isSampleSource?: boolean;
};

export const TransitionPreviewStatus: React.FC<TransitionPreviewStatusProps> = ({
  state,
  isStale = false,
  onRetry,
  isSampleSource = true,
}) => {
  return (
    <div className="transition-status-bar" data-testid="transition-status-bar">
      {isSampleSource && (
        <span className="sample-scenes-badge" title="Rendered from deterministic production sample scenes">
          Sample scenes
        </span>
      )}

      {isStale && (
        <span className="status-pill status-updating">
          Updating...
        </span>
      )}

      {!isStale && (state.kind === "queued" || state.kind === "rendering") && (
        <span className="status-pill status-rendering">
          {state.kind === "rendering" ? `Rendering (${state.phase})...` : "Queued..."}
        </span>
      )}

      {state.kind === "failed" && (
        <div className="status-error-group">
          <span className="status-pill status-failed">
            {state.error.message}
          </span>
          {state.error.retryable && onRetry && (
            <button type="button" onClick={onRetry} className="status-retry-btn">
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
};

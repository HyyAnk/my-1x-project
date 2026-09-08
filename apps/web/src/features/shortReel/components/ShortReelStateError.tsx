import { ArrowClockwise, ArrowLeft, FilmStrip } from "@phosphor-icons/react";

export interface ShortReelStateErrorProps {
  isNotFound: boolean;
  error: string | null;
  onBack: () => void;
  onRetry: () => void;
}

/** Full-state container shown when the reel cannot be loaded (not found or request failure). */
export function ShortReelStateError({ isNotFound, error, onBack, onRetry }: ShortReelStateErrorProps) {
  return (
    <div className="short-reel-state-container" role="region" aria-label="Short-Reel Error">
      <FilmStrip size={40} weight="duotone" />
      <h3>{isNotFound ? "Short-Reel Not Found" : "Failed to Load Short-Reel"}</h3>
      <p>{error || "The requested Short-Reel could not be found or loaded."}</p>
      <div className="short-reel-state-actions">
        <button type="button" className="short-reel-back-btn" onClick={onBack} aria-label="Back to channel">
          <ArrowLeft size={16} />
          <span>Back to Channel</span>
        </button>
        <button type="button" className="short-reel-primary-btn" onClick={onRetry} aria-label="Retry loading Short-Reel">
          <ArrowClockwise size={16} />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
}

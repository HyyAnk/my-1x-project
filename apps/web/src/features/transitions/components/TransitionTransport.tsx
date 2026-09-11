import React, { useState } from "react";
import type { UseTransitionTransportResult } from "../hooks/useTransitionTransport";

export type TransitionTransportProps = {
  transport: UseTransitionTransportResult;
  onToggleTiming?: () => void;
  isTimingOpen?: boolean;
  videoUrl?: string;
  onInspectNative?: () => void;
};

export const TransitionTransport: React.FC<TransitionTransportProps> = ({
  transport,
  onToggleTiming,
  isTimingOpen = false,
  videoUrl,
  onInspectNative,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const {
    isPlaying,
    isLooping,
    currentFrameIndex,
    totalFrames,
    formattedTime,
    isLoadingFrame,
    togglePlay,
    stepForward,
    stepBackward,
    seekToFrame,
    replay,
    toggleLoop,
    reviewWindow,
  } = transport;

  const minFrame = reviewWindow?.firstFrame ?? 0;
  const maxFrame = reviewWindow?.lastFrameInclusive ?? Math.max(0, totalFrames - 1);

  return (
    <div className="transition-transport-container" data-testid="transition-transport">
      {/* Primary transport row */}
      <div className="transition-transport-row">
        {/* Play/Pause Button */}
        <button
          type="button"
          className="transport-btn play-pause-btn"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause transition" : "Play transition"}
          title={isPlaying ? "Pause transition" : "Play transition"}
          data-testid="transition-play-pause-btn"
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Step Backward (1 frame) */}
        <button
          type="button"
          className="transport-btn step-btn"
          onClick={stepBackward}
          disabled={currentFrameIndex <= minFrame}
          aria-label="Previous Frame"
          title="Previous Frame"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {/* Step Forward (1 frame) */}
        <button
          type="button"
          className="transport-btn step-btn"
          onClick={stepForward}
          disabled={currentFrameIndex >= maxFrame}
          aria-label="Next Frame"
          title="Next Frame"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>

        {/* Timeline Scrubber */}
        <div className="transport-scrubber-track">
          <input
            type="range"
            min={minFrame}
            max={maxFrame}
            value={currentFrameIndex}
            onChange={(e) => seekToFrame(Number(e.target.value))}
            className="transport-scrubber"
            aria-label="Seek frame"
          />
        </div>

        {/* Frame / Time readout */}
        <div className="transport-readout">
          <span>{formattedTime}</span>
          {isLoadingFrame && <span className="readout-loading-indicator">...</span>}
        </div>

        {/* Overflow menu toggle */}
        <div className="transport-menu-anchor">
          <button
            type="button"
            className={`transport-btn menu-toggle-btn ${isMenuOpen ? "active" : ""}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="More options"
            aria-expanded={isMenuOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="transport-overflow-menu" role="menu">
              <button
                type="button"
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  replay();
                  setIsMenuOpen(false);
                }}
              >
                Replay
              </button>
              <button
                type="button"
                className={`menu-item ${isLooping ? "menu-item-active" : ""}`}
                role="menuitem"
                onClick={() => {
                  toggleLoop();
                  setIsMenuOpen(false);
                }}
              >
                Loop: {isLooping ? "On" : "Off"}
              </button>
              {onToggleTiming && (
                <button
                  type="button"
                  className={`menu-item ${isTimingOpen ? "menu-item-active" : ""}`}
                  role="menuitem"
                  onClick={() => {
                    onToggleTiming();
                    setIsMenuOpen(false);
                  }}
                >
                  Timing
                </button>
              )}
              {onInspectNative && (
                <button
                  type="button"
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    onInspectNative();
                    setIsMenuOpen(false);
                  }}
                >
                  Inspect at 100%
                </button>
              )}
              {videoUrl && (
                <a
                  href={videoUrl}
                  download="transition-preview.mp4"
                  className="menu-item menu-link"
                  role="menuitem"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Download MP4
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

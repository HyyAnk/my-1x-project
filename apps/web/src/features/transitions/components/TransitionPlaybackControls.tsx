import React from "react";
import { ArrowCounterClockwise, Pause, Play, Repeat } from "@phosphor-icons/react";

export interface TransitionPlaybackControlsProps {
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  durationSeconds: number;
  isLooping: boolean;
  onTogglePlay: () => void;
  onReplay: () => void;
  onToggleLoop: () => void;
  onSeek: (progress: number) => void;
  onPause: () => void;
}

/**
 * Playback controls bar: Play/Pause, Replay, Loop, and Timeline Scrubber.
 */
export const TransitionPlaybackControls: React.FC<TransitionPlaybackControlsProps> = ({
  isPlaying,
  progress,
  currentTime,
  durationSeconds,
  isLooping,
  onTogglePlay,
  onReplay,
  onToggleLoop,
  onSeek,
  onPause,
}) => {
  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPause();
    onSeek(parseFloat(e.target.value));
  };

  return (
    <div className="transition-controls-bar" data-testid="transition-controls-bar">
      {/* Play / Pause */}
      <button
        type="button"
        className="transition-ctrl-btn"
        aria-label={isPlaying ? "Pause transition" : "Play transition"}
        onClick={onTogglePlay}
        data-testid="transition-play-pause-btn"
      >
        {isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
      </button>

      {/* Replay */}
      <button
        type="button"
        className="transition-ctrl-btn"
        aria-label="Replay transition"
        onClick={onReplay}
        data-testid="transition-replay-btn"
      >
        <ArrowCounterClockwise size={16} weight="bold" />
      </button>

      {/* Loop Toggle */}
      <button
        type="button"
        className={`transition-ctrl-btn ${isLooping ? "is-active" : ""}`}
        aria-label="Toggle loop"
        aria-pressed={isLooping}
        onClick={onToggleLoop}
        data-testid="transition-loop-btn"
      >
        <Repeat size={16} weight="bold" />
      </button>

      {/* Scrubber Slider */}
      <div className="transition-scrubber-track">
        <input
          type="range"
          min="0"
          max="1"
          step="0.005"
          value={progress}
          onChange={handleScrubberChange}
          aria-label="Transition progress scrubber"
          className="transition-scrubber-slider"
          data-testid="transition-scrubber-slider"
        />
      </div>

      {/* Time and Percentage Readouts */}
      <div className="transition-readout-group">
        <span className="transition-time-display" data-testid="transition-time-display">
          {currentTime.toFixed(2)}s / {durationSeconds.toFixed(2)}s
        </span>
        <span className="transition-percent-badge" data-testid="transition-percent-badge">
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
};

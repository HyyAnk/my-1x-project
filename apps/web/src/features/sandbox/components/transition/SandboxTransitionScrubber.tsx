import React from "react";
import { ArrowCounterClockwise, Pause, Play, Repeat, SkipBack, SkipForward } from "@phosphor-icons/react";

export interface SandboxTransitionScrubberProps {
  progress: number;
  durationSeconds: number;
  isPlaying: boolean;
  isLooping: boolean;
  onSeek: (progress: number) => void;
  onTogglePlay: () => void;
  onReplay: () => void;
  onToggleLoop: () => void;
  onPause: () => void;
  disabled?: boolean;
}

export const SandboxTransitionScrubber: React.FC<SandboxTransitionScrubberProps> = ({
  progress,
  durationSeconds,
  isPlaying,
  isLooping,
  onSeek,
  onTogglePlay,
  onReplay,
  onToggleLoop,
  onPause,
  disabled = false,
}) => {
  const currentTime = progress * durationSeconds;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPause();
    onSeek(parseFloat(e.target.value));
  };

  const handleStep = (delta: number) => {
    onPause();
    const next = Math.max(0, Math.min(1, progress + delta));
    onSeek(Number(next.toFixed(4)));
  };

  return (
    <div
      className="sandbox-transition-scrubber"
      data-testid="sandbox-transition-scrubber"
      style={{ display: "flex", flexDirection: "column", gap: "8px" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Interactive Scrubber
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span data-testid="sandbox-scrubber-time" style={{ fontSize: "11px", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
            {currentTime.toFixed(2)}s / {durationSeconds.toFixed(2)}s
          </span>
          <span
            data-testid="sandbox-scrubber-percent"
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: "4px",
              background: "var(--surface-strong)",
              color: "var(--accent)",
              border: "1px solid var(--line)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      <input
        type="range"
        min="0"
        max="1"
        step="0.005"
        value={progress}
        onChange={handleSliderChange}
        disabled={disabled}
        aria-label="Transition timeline progress scrubber"
        data-testid="sandbox-scrubber-slider"
        style={{
          width: "100%",
          accentColor: "var(--accent)",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px",
          background: "var(--surface-strong)",
          borderRadius: "8px",
          border: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            type="button"
            data-testid="sandbox-scrubber-play-btn"
            className={isPlaying ? "primary-button compact" : "quiet-button compact"}
            style={{ padding: "4px 8px", borderRadius: "5px" }}
            onClick={onTogglePlay}
            disabled={disabled}
            aria-label={isPlaying ? "Pause transition" : "Play transition"}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={13} weight="fill" /> : <Play size={13} weight="fill" />}
            <span style={{ fontSize: "11px", fontWeight: 600 }}>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            type="button"
            data-testid="sandbox-scrubber-replay-btn"
            className="quiet-button compact"
            style={{ padding: "4px 8px", borderRadius: "5px" }}
            onClick={onReplay}
            disabled={disabled}
            aria-label="Replay transition"
            title="Replay from start"
          >
            <ArrowCounterClockwise size={13} weight="bold" />
            <span style={{ fontSize: "11px" }}>Replay</span>
          </button>

          <button
            type="button"
            data-testid="sandbox-scrubber-loop-btn"
            className={`quiet-button compact ${isLooping ? "is-active" : ""}`}
            style={{
              padding: "4px 8px",
              borderRadius: "5px",
              background: isLooping ? "var(--soft-accent)" : undefined,
              color: isLooping ? "var(--accent)" : undefined,
              borderColor: isLooping ? "var(--accent)" : undefined,
            }}
            onClick={onToggleLoop}
            disabled={disabled}
            aria-label="Toggle loop"
            aria-pressed={isLooping}
            title={isLooping ? "Looping enabled" : "Looping disabled"}
          >
            <Repeat size={13} weight="bold" />
            <span style={{ fontSize: "11px" }}>Loop</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <button
            type="button"
            data-testid="sandbox-scrubber-step-back"
            className="quiet-button compact"
            style={{ padding: "3px 6px", borderRadius: "4px", fontSize: "10px" }}
            onClick={() => handleStep(-0.05)}
            disabled={disabled || progress <= 0}
            title="Step back 5%"
            aria-label="Step back 5%"
          >
            <SkipBack size={12} weight="bold" />
          </button>
          <button
            type="button"
            data-testid="sandbox-scrubber-step-forward"
            className="quiet-button compact"
            style={{ padding: "3px 6px", borderRadius: "4px", fontSize: "10px" }}
            onClick={() => handleStep(0.05)}
            disabled={disabled || progress >= 1}
            title="Step forward 5%"
            aria-label="Step forward 5%"
          >
            <SkipForward size={12} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};

import { Play, Pause, CaretLeft, CaretRight, Repeat, RepeatOnce, SquaresFour, Monitor } from "@phosphor-icons/react";

export interface ManifestPlaybackBarProps {
  isPlaying: boolean;
  isLooping: boolean;
  currentFrameIndex: number;
  frameCount: number;
  timeSeconds: number;
  cycleSeconds: number;
  previewMode: "canvas" | "stage";
  showContactSheet: boolean;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSeekFrame: (frameIndex: number) => void;
  onChangePreviewMode: (mode: "canvas" | "stage") => void;
  onToggleContactSheet: () => void;
}

export function ManifestPlaybackBar({
  isPlaying,
  isLooping,
  currentFrameIndex,
  frameCount,
  timeSeconds,
  cycleSeconds,
  previewMode,
  showContactSheet,
  onTogglePlay,
  onToggleLoop,
  onStepForward,
  onStepBackward,
  onSeekFrame,
  onChangePreviewMode,
  onToggleContactSheet,
}: ManifestPlaybackBarProps) {
  return (
    <div
      className="manifest-playback-bar"
      data-testid="manifest-playback-bar"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "12px 16px",
        background: "var(--surface, #1e293b)",
        border: "1px solid var(--line, rgba(255,255,255,0.08))",
        borderRadius: "var(--radius, 10px)",
      }}
    >
      {/* Top Row: Mode switcher + Contact sheet toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            className={`quiet-button compact ${previewMode === "canvas" ? "is-active" : ""}`}
            style={{
              fontSize: "12px",
              fontWeight: 600,
              padding: "5px 10px",
              color: previewMode === "canvas" ? "var(--accent)" : undefined,
              borderColor: previewMode === "canvas" ? "var(--accent)" : undefined,
            }}
            onClick={() => onChangePreviewMode("canvas")}
            data-testid="mode-canvas-btn"
          >
            <SquaresFour size={14} weight={previewMode === "canvas" ? "fill" : "regular"} />
            <span>Studio Canvas</span>
          </button>

          <button
            type="button"
            className={`quiet-button compact ${previewMode === "stage" ? "is-active" : ""}`}
            style={{
              fontSize: "12px",
              fontWeight: 600,
              padding: "5px 10px",
              color: previewMode === "stage" ? "var(--accent)" : undefined,
              borderColor: previewMode === "stage" ? "var(--accent)" : undefined,
            }}
            onClick={() => onChangePreviewMode("stage")}
            data-testid="mode-stage-btn"
          >
            <Monitor size={14} weight={previewMode === "stage" ? "fill" : "regular"} />
            <span>Quiz Stage (16:9 Placement)</span>
          </button>
        </div>

        <button
          type="button"
          className={`quiet-button compact ${showContactSheet ? "is-active" : ""}`}
          style={{
            fontSize: "12px",
            padding: "5px 10px",
            color: showContactSheet ? "var(--accent)" : undefined,
            borderColor: showContactSheet ? "var(--accent)" : undefined,
          }}
          onClick={onToggleContactSheet}
          data-testid="toggle-contact-sheet-btn"
        >
          <span>{showContactSheet ? "Hide Contact Sheet" : "Contact Sheet (12 Frames)"}</span>
        </button>
      </div>

      {/* Bottom Row: Transport controls & Scrubber */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            type="button"
            className="quiet-button compact"
            onClick={onStepBackward}
            title="Step backward (Arrow Left)"
            aria-label="Step backward"
          >
            <CaretLeft size={16} weight="bold" />
          </button>

          <button
            type="button"
            className={`primary-button compact ${isPlaying ? "is-playing" : ""}`}
            style={{
              padding: "6px 14px",
              background: isPlaying ? "var(--coral, #f43f5e)" : "var(--accent)",
              borderColor: isPlaying ? "var(--coral, #f43f5e)" : "var(--accent)",
            }}
            onClick={onTogglePlay}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            aria-label={isPlaying ? "Pause animation" : "Play animation"}
            data-testid="play-pause-btn"
          >
            {isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
            <span style={{ fontSize: "12px", marginLeft: "4px" }}>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            type="button"
            className="quiet-button compact"
            onClick={onStepForward}
            title="Step forward (Arrow Right)"
            aria-label="Step forward"
          >
            <CaretRight size={16} weight="bold" />
          </button>

          <button
            type="button"
            className={`quiet-button compact ${isLooping ? "is-active" : ""}`}
            onClick={onToggleLoop}
            title={isLooping ? "Looping enabled" : "One-shot mode"}
            aria-label={isLooping ? "Disable loop" : "Enable loop"}
            data-testid="loop-toggle-btn"
          >
            {isLooping ? <Repeat size={16} weight="bold" /> : <RepeatOnce size={16} weight="bold" />}
          </button>
        </div>

        {/* Scrubber Range Input */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", minWidth: "220px" }}>
          <input
            type="range"
            min={0}
            max={frameCount - 1}
            value={currentFrameIndex}
            onChange={(e) => onSeekFrame(Number(e.target.value))}
            style={{ flex: 1, accentColor: "var(--accent)" }}
            aria-label="Scrub animation frames"
            data-testid="frame-scrubber"
          />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              fontFamily: "monospace",
              color: "var(--ink)",
              whiteSpace: "nowrap",
            }}
          >
            Frame {currentFrameIndex + 1}/{frameCount} ({timeSeconds.toFixed(3)}s / {cycleSeconds.toFixed(1)}s)
          </span>
        </div>
      </div>
    </div>
  );
}

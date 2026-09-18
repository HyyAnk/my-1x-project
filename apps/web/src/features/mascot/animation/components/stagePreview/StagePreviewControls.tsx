import React from "react";

export interface StagePreviewControlsProps {
  aspectRatio: "16:9" | "9:16";
  onAspectRatioChange?: (aspectRatio: "16:9" | "9:16") => void;
  showGuides: boolean;
  onToggleGuides?: (showGuides: boolean) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function StagePreviewControls({
  aspectRatio,
  onAspectRatioChange,
  showGuides,
  onToggleGuides,
  isPlaying,
  onTogglePlay,
  className = "",
  style,
}: StagePreviewControlsProps) {
  const buttonBaseStyle: React.CSSProperties = {
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    transition: "background 0.15s ease, color 0.15s ease",
    background: "rgba(15, 23, 42, 0.8)",
    color: "#94a3b8",
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: "#3b82f6",
    borderColor: "#60a5fa",
    color: "#ffffff",
  };

  return (
    <div
      className={`stage-preview-controls ${className}`.trim()}
      data-testid="stage-preview-controls"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 6px",
        borderRadius: "8px",
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        zIndex: 30,
        ...style,
      }}
    >
      {/* Aspect Ratio Toggle */}
      {onAspectRatioChange && (
        <div style={{ display: "inline-flex", gap: "2px" }} role="group" aria-label="Aspect ratio switcher">
          <button
            type="button"
            style={aspectRatio === "16:9" ? activeButtonStyle : buttonBaseStyle}
            onClick={() => onAspectRatioChange("16:9")}
            aria-pressed={aspectRatio === "16:9"}
          >
            16:9
          </button>
          <button
            type="button"
            style={aspectRatio === "9:16" ? activeButtonStyle : buttonBaseStyle}
            onClick={() => onAspectRatioChange("9:16")}
            aria-pressed={aspectRatio === "9:16"}
          >
            9:16
          </button>
        </div>
      )}

      {/* Guide Lines Switch */}
      {onToggleGuides && (
        <button
          type="button"
          style={showGuides ? activeButtonStyle : buttonBaseStyle}
          onClick={() => onToggleGuides(!showGuides)}
          aria-pressed={showGuides}
        >
          {showGuides ? "Guides ON" : "Guides OFF"}
        </button>
      )}

      {/* Playback Control */}
      {onTogglePlay && (
        <button
          type="button"
          style={isPlaying ? activeButtonStyle : buttonBaseStyle}
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause preview animation" : "Play preview animation"}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      )}
    </div>
  );
}

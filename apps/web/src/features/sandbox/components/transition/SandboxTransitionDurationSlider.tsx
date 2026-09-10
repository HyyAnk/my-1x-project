import React from "react";
import type { TransitionDefinition } from "@studio/shared";

export const DURATION_QUICK_PRESETS = [
  { label: "0.3s", value: 0.3 },
  { label: "0.5s", value: 0.5 },
  { label: "0.8s", value: 0.8 },
  { label: "1.0s", value: 1.0 },
  { label: "1.5s", value: 1.5 },
  { label: "2.0s", value: 2.0 },
];

export interface SandboxTransitionDurationSliderProps {
  durationSeconds: number;
  onChangeDuration: (duration: number) => void;
  transitionDef?: TransitionDefinition;
  disabled?: boolean;
}

export const SandboxTransitionDurationSlider: React.FC<SandboxTransitionDurationSliderProps> = ({
  durationSeconds,
  onChangeDuration,
  transitionDef,
  disabled = false,
}) => {
  const isInstant = transitionDef?.id === "cut" || (transitionDef?.minDuration === 0 && transitionDef?.maxDuration === 0);

  const minDuration = transitionDef?.minDuration ?? 0.2;
  const maxDuration = transitionDef?.maxDuration ?? 2.0;

  if (isInstant) {
    return (
      <div
        className="sandbox-transition-duration-slider"
        data-testid="sandbox-transition-duration-slider"
        style={{ display: "flex", flexDirection: "column", gap: "6px" }}
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
            Transition Duration
          </label>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)" }}>0.0s</span>
        </div>
        <div
          data-testid="sandbox-duration-instant-note"
          style={{
            fontSize: "11px",
            color: "var(--muted)",
            padding: "6px 10px",
            background: "var(--surface-strong)",
            borderRadius: "6px",
            border: "1px solid var(--line)",
          }}
        >
          Instant snap (0.0s) — Cut requires no animation duration.
        </div>
      </div>
    );
  }

  return (
    <div
      className="sandbox-transition-duration-slider"
      data-testid="sandbox-transition-duration-slider"
      style={{ display: "flex", flexDirection: "column", gap: "6px" }}
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
          Transition Duration
        </label>
        <span data-testid="sandbox-duration-readout" style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)" }}>
          {durationSeconds.toFixed(2)}s
        </span>
      </div>

      <input
        type="range"
        min={minDuration}
        max={maxDuration}
        step={0.05}
        value={durationSeconds}
        disabled={disabled}
        aria-label="Transition duration slider"
        data-testid="sandbox-duration-input"
        onChange={(e) => onChangeDuration(parseFloat(e.target.value))}
        style={{
          width: "100%",
          accentColor: "var(--accent)",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      />

      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "2px" }}>
        {DURATION_QUICK_PRESETS.map((preset) => {
          const isSelected = Math.abs(durationSeconds - preset.value) < 0.04;
          const isOutOfRange = preset.value < minDuration || preset.value > maxDuration;

          return (
            <button
              key={preset.value}
              type="button"
              data-testid={`duration-chip-${preset.value}`}
              className={`quiet-button compact ${isSelected ? "is-active" : ""}`}
              style={{
                fontSize: "10px",
                padding: "3px 7px",
                borderRadius: "4px",
                background: isSelected ? "var(--soft-accent)" : "var(--surface-strong)",
                borderColor: isSelected ? "var(--accent)" : "var(--line)",
                color: isSelected ? "var(--accent)" : "var(--text)",
                fontWeight: isSelected ? 700 : 500,
              }}
              onClick={() => onChangeDuration(preset.value)}
              disabled={disabled || isOutOfRange}
              title={isOutOfRange ? `Range: ${minDuration}s - ${maxDuration}s` : undefined}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

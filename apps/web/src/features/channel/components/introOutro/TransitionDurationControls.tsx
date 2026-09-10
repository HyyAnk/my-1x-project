import React from "react";
import type { TransitionDefinition } from "@studio/shared";
import { DURATION_PRESETS } from "./types";

export interface TransitionDurationControlsProps {
  durationSeconds: number;
  onChangeDuration: (duration: number) => void;
  disabled?: boolean;
  transitionDef?: TransitionDefinition;
}

export const TransitionDurationControls: React.FC<TransitionDurationControlsProps> = ({
  durationSeconds,
  onChangeDuration,
  disabled = false,
  transitionDef,
}) => {
  const isInstant = transitionDef?.id === "cut" || (transitionDef?.minDuration === 0 && transitionDef?.maxDuration === 0);

  if (isInstant) {
    return (
      <div className="settings-bar-group">
        <div className="settings-bar-label">Transition Duration</div>
        <div className="duration-instant-note" style={{ fontSize: 12, color: "var(--muted)", padding: "6px 0" }}>
          Instant snap (0.0s)
        </div>
      </div>
    );
  }

  const minDuration = transitionDef?.minDuration ?? 0.2;
  const maxDuration = transitionDef?.maxDuration ?? 2.0;

  return (
    <div className="settings-bar-group">
      <div className="settings-bar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="settings-bar-label">Transition Duration</div>
        <span style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 700 }}>{durationSeconds.toFixed(1)}s</span>
      </div>
      <div className="duration-preset-row">
        {DURATION_PRESETS.map((preset) => {
          const isSelected = Math.abs(durationSeconds - preset.value) < 0.05;
          const isOutOfRange = preset.value < minDuration || preset.value > maxDuration;

          return (
            <button
              key={preset.value}
              type="button"
              className={`duration-chip ${isSelected ? "is-active" : ""}`}
              onClick={() => onChangeDuration(preset.value)}
              disabled={disabled || isOutOfRange}
              title={isOutOfRange ? `Supported range: ${minDuration}s - ${maxDuration}s` : undefined}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

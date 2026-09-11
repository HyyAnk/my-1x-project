import React from "react";
import type { TransitionCatalogEntry } from "@studio/shared";

export type TransitionTimingPanelProps = {
  definition?: TransitionCatalogEntry;
  currentDurationSeconds: number;
  effectiveDurationSeconds?: number;
  onDurationChange: (duration: number) => void;
  onReset: () => void;
  adjustmentMessage?: string;
};

export const TransitionTimingPanel: React.FC<TransitionTimingPanelProps> = ({
  definition,
  currentDurationSeconds,
  effectiveDurationSeconds,
  onDurationChange,
  onReset,
  adjustmentMessage,
}) => {
  if (!definition || definition.id === "cut") {
    return null;
  }

  const min = definition.minDurationSeconds;
  const max = definition.maxDurationSeconds;
  const step = 0.05;

  return (
    <div className="transition-timing-panel" data-testid="transition-timing-panel">
      <div className="timing-row">
        <label htmlFor="transition-duration-slider" className="timing-label">
          Duration: {currentDurationSeconds.toFixed(2)}s
        </label>
        <input
          id="transition-duration-slider"
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentDurationSeconds}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className="timing-slider"
        />
        <button
          type="button"
          onClick={onReset}
          className="timing-reset-btn"
          title={`Reset to ${definition.defaultDurationSeconds}s`}
        >
          Reset
        </button>
      </div>

      {effectiveDurationSeconds !== undefined && Math.abs(effectiveDurationSeconds - currentDurationSeconds) > 0.01 && (
        <div className="timing-effective-note">
          Effective: {effectiveDurationSeconds.toFixed(2)}s
          {adjustmentMessage && ` (${adjustmentMessage})`}
        </div>
      )}
    </div>
  );
};

import React from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import type { SandboxTransitionState } from "../../hooks/useSandboxTransitionState";
import { SandboxTransitionCategoryToggle } from "./SandboxTransitionCategoryToggle";
import { SandboxTransitionSelector } from "./SandboxTransitionSelector";
import { SandboxTransitionDurationSlider } from "./SandboxTransitionDurationSlider";
import { SandboxTransitionScrubber } from "./SandboxTransitionScrubber";

export interface SandboxTransitionTabProps {
  transition: SandboxTransitionState;
  disabled?: boolean;
}

export const SandboxTransitionTab: React.FC<SandboxTransitionTabProps> = ({ transition, disabled = false }) => {
  return (
    <div
      className="sandbox-transition-tab"
      data-testid="sandbox-transition-tab"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Header & Reset Action */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "10px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>Transition Inspector</span>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--muted)" }}>Preview and tune video transition animations</p>
        </div>
        <button
          type="button"
          data-testid="sandbox-transition-reset-btn"
          className="quiet-button compact"
          style={{ fontSize: "10px", padding: "4px 8px" }}
          onClick={transition.resetTransition}
          title="Reset transition settings to defaults"
        >
          <ArrowCounterClockwise size={12} weight="bold" />
          <span>Reset</span>
        </button>
      </div>

      {/* 1. Category Toggle */}
      <SandboxTransitionCategoryToggle
        activeCategory={transition.transitionCategory}
        onChangeCategory={transition.setTransitionCategory}
        disabled={disabled}
      />

      {/* 2. Transition Selector */}
      <SandboxTransitionSelector
        selectedId={transition.transitionId}
        category={transition.transitionCategory}
        onSelectTransition={transition.setTransitionId}
        onPreview={transition.triggerPlay}
        disabled={disabled}
      />

      {/* 3. Duration Slider */}
      <SandboxTransitionDurationSlider
        durationSeconds={transition.transitionDuration}
        onChangeDuration={transition.setTransitionDuration}
        transitionDef={transition.activeTransitionDefinition}
        disabled={disabled}
      />

      {/* 4. Scrubber & Playback Controls */}
      <SandboxTransitionScrubber
        progress={transition.transitionProgress}
        durationSeconds={transition.transitionDuration}
        isPlaying={transition.isPlaying}
        isLooping={transition.isLooping}
        onSeek={transition.setTransitionProgress}
        onTogglePlay={transition.togglePlay}
        onReplay={transition.triggerPlay}
        onToggleLoop={transition.toggleLoop}
        onPause={() => transition.setIsPlaying(false)}
        disabled={disabled}
      />
    </div>
  );
};

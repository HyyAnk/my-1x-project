import React from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import type { SandboxTransitionState } from "../../hooks/useSandboxTransitionState";
import { useTransitionCatalog } from "../../../transitions/hooks/useTransitionCatalog";
import { TransitionSelector } from "../../../transitions/components/TransitionSelector";

export interface SandboxTransitionTabProps {
  transition: SandboxTransitionState;
  disabled?: boolean;
}

export const SandboxTransitionTab: React.FC<SandboxTransitionTabProps> = ({ transition, disabled = false }) => {
  const { entries } = useTransitionCatalog();

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
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--muted)" }}>Preview and inspect video transition output</p>
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

      {/* Grouped Transition Selector */}
      <TransitionSelector
        entries={entries}
        selectedId={transition.transitionId}
        onChange={(id) => {
          transition.setTransitionId(id);
          transition.triggerPlay();
        }}
        disabled={disabled}
      />
    </div>
  );
};

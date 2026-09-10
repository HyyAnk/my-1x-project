import React, { useMemo } from "react";
import { getTransition, listTransitions, type TransitionCategory, type TransitionDefinition } from "@studio/shared";
import { TransitionDropdown } from "../../../channel/components/introOutro/TransitionDropdown";
import { TransitionIcon } from "../../../channel/components/introOutro/TransitionIcon";
import { TransitionTagBadge } from "../../../channel/components/introOutro/TransitionTagBadge";

export interface SandboxTransitionSelectorProps {
  selectedId: string;
  category: TransitionCategory;
  onSelectTransition: (id: string, def?: TransitionDefinition) => void;
  onPreview?: (id: string) => void;
  disabled?: boolean;
}

export const SandboxTransitionSelector: React.FC<SandboxTransitionSelectorProps> = ({
  selectedId,
  category,
  onSelectTransition,
  onPreview,
  disabled = false,
}) => {
  const activeDef = useMemo(() => getTransition(selectedId), [selectedId]);
  const availableTransitions = useMemo(() => listTransitions(category), [category]);

  return (
    <div
      className="sandbox-transition-selector"
      data-testid="sandbox-transition-selector"
      style={{ display: "flex", flexDirection: "column", gap: "8px" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Transition Type
        </label>
        <span
          style={{
            fontSize: "10px",
            color: "var(--muted)",
            background: "var(--surface-strong)",
            padding: "1px 6px",
            borderRadius: "4px",
            border: "1px solid var(--line)",
          }}
        >
          {availableTransitions.length} available
        </span>
      </div>

      <TransitionDropdown
        value={selectedId}
        onChange={onSelectTransition}
        category={category}
        disabled={disabled}
        onPreview={onPreview}
        label="Select transition"
      />

      {activeDef && (
        <div
          data-testid="sandbox-transition-detail-card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: "8px 10px",
            background: "var(--surface-strong)",
            borderRadius: "8px",
            border: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <TransitionIcon iconName={activeDef.iconName} transitionId={activeDef.id} size={15} />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>{activeDef.name}</span>
            {activeDef.tag && <TransitionTagBadge tag={activeDef.tag} />}
          </div>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)", lineHeight: 1.35 }}>{activeDef.description}</p>
        </div>
      )}
    </div>
  );
};

import React from "react";
import type { TransitionCatalogEntry, TransitionPlacement } from "@studio/shared";

export type TransitionSelectorProps = {
  entries: readonly TransitionCatalogEntry[];
  selectedId: string;
  onChange: (id: string) => void;
  placementContext?: TransitionPlacement;
  disabled?: boolean;
};

export const TransitionSelector: React.FC<TransitionSelectorProps> = ({
  entries,
  selectedId,
  onChange,
  placementContext,
  disabled = false,
}) => {
  const filtered = placementContext
    ? entries.filter((e) => e.placements.includes(placementContext))
    : entries;

  const introEntries = filtered.filter((e) => e.placements.includes("intro"));
  const sceneOnlyEntries = filtered.filter(
    (e) => e.placements.includes("scene") && !e.placements.includes("intro"),
  );

  return (
    <div className="transition-selector-container">
      <label htmlFor="transition-select" className="transition-selector-label">
        Transition
      </label>
      <select
        id="transition-select"
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="transition-selector-dropdown"
        data-testid="transition-selector"
      >
        {introEntries.length > 0 && (
          <optgroup label="Intro & Scene Transitions">
            {introEntries.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </optgroup>
        )}
        {sceneOnlyEntries.length > 0 && (
          <optgroup label="Scene-Only Transitions">
            {sceneOnlyEntries.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
};

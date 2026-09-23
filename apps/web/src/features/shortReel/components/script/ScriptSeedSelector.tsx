import { useMemo } from "react";
import { Sparkle, FilmStrip } from "@phosphor-icons/react";
import {
  type ReelArchetype,
  getScriptSeedsForArchetype,
  getScriptSeedById,
  resolveDefaultSeedForArchetype,
} from "@studio/shared";
import "./ScriptSeedSelector.css";

export interface ScriptSeedSelectorProps {
  archetype: ReelArchetype;
  selectedSeedId: string | null;
  onSelectSeed: (seedId: string | null) => void;
  disabled?: boolean;
}

export function ScriptSeedSelector({
  archetype,
  selectedSeedId,
  onSelectSeed,
  disabled = false,
}: ScriptSeedSelectorProps) {
  const availableSeeds = useMemo(() => getScriptSeedsForArchetype(archetype), [archetype]);

  const activeSeed = useMemo(() => {
    if (selectedSeedId) {
      return getScriptSeedById(selectedSeedId) ?? resolveDefaultSeedForArchetype(archetype);
    }
    return resolveDefaultSeedForArchetype(archetype);
  }, [selectedSeedId, archetype]);

  return (
    <div className="short-reel-seed-selector-container" data-testid="script-seed-selector">
      <div className="short-reel-seed-header">
        <label htmlFor="script-seed-dropdown" className="short-reel-seed-label">
          <FilmStrip size={14} weight="bold" />
          <span>Director Seed</span>
        </label>
        <span className="short-reel-seed-mode-badge" title="Narrative & visual staging preset for this archetype">
          <Sparkle size={12} weight="fill" />
          {selectedSeedId ? "Manual" : "Auto (Dynamic)"}
        </span>
      </div>

      <div className="short-reel-seed-control-row">
        <select
          id="script-seed-dropdown"
          className="short-reel-seed-select"
          value={selectedSeedId ?? ""}
          onChange={(e) => onSelectSeed(e.target.value ? e.target.value : null)}
          disabled={disabled}
          aria-label="Select script director seed"
        >
          <option value="">Auto (Dynamic recommendation)</option>
          {availableSeeds.map((seed) => (
            <option key={seed.id} value={seed.id}>
              {seed.name}: {seed.tagline}
            </option>
          ))}
        </select>
      </div>

      {activeSeed && (
        <div className="short-reel-seed-preview-card" data-testid="active-seed-preview">
          <div className="short-reel-seed-preview-title">
            <strong>{activeSeed.name}</strong> &mdash; <em>{activeSeed.tagline}</em>
          </div>
          <p className="short-reel-seed-preview-desc">{activeSeed.narrative_intent}</p>
          <div className="short-reel-seed-staging-note">
            <span className="staging-label">9:16 Staging:</span> {activeSeed.visual_staging_guidance}
          </div>
        </div>
      )}
    </div>
  );
}

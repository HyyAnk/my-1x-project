import type { ReactNode } from "react";
import {
  ArrowCounterClockwise,
  ArrowsClockwise,
  CheckCircle,
  CheckSquare,
  Eye,
  Fire,
  Info,
  Lightning,
  MagnifyingGlass,
  MaskHappy,
  Sparkle,
  SquaresFour,
} from "@phosphor-icons/react";
import {
  CURIOSITY_BADGE_PRESETS,
  THUMBNAIL_LAYOUT_CATALOG,
  type CuriosityBadgeId,
  type ThumbnailLayoutType,
  type ThumbnailManifest,
} from "@studio/shared";

const LAYOUT_OPTIONS: Array<{
  id: ThumbnailLayoutType | "auto";
  name: string;
  icon: ReactNode;
  subtitle: string;
}> = [
  { id: "auto", name: "Auto Detect", icon: <Sparkle size={16} />, subtitle: "Based on script" },
  { id: "mega_grid", name: "Mega Grid", icon: <SquaresFour size={16} />, subtitle: "100 Questions / 2x2" },
  { id: "split_vs", name: "Split Screen VS", icon: <Lightning size={16} />, subtitle: "Would You Rather" },
  { id: "mystery_silhouette", name: "Mystery Clue", icon: <MagnifyingGlass size={16} />, subtitle: "Guess Who / Shadow" },
  { id: "odd_one_out", name: "Odd One Out", icon: <Eye size={16} />, subtitle: "Spot Difference" },
  { id: "difficulty_tier", name: "Difficulty Tier", icon: <Fire size={16} />, subtitle: "IQ 4 Levels" },
  { id: "true_false", name: "True or False", icon: <CheckSquare size={16} />, subtitle: "Fact vs Myth" },
];

type ThumbnailControlsDeckProps = {
  selectedLayout: ThumbnailLayoutType | "auto";
  setSelectedLayout: (layout: ThumbnailLayoutType | "auto") => void;
  selectedBadge: CuriosityBadgeId;
  setSelectedBadge: (badge: CuriosityBadgeId) => void;
  customHook: string;
  setCustomHook: (hook: string) => void;
  manifest: ThumbnailManifest | null;
  hasAnyThumbnail: boolean;
  generating: boolean;
  loading: boolean;
  onGenerateThumbnail: () => void;
  onResetDefaults: () => void;
};

export function ThumbnailControlsDeck({
  selectedLayout,
  setSelectedLayout,
  selectedBadge,
  setSelectedBadge,
  customHook,
  setCustomHook,
  manifest,
  hasAnyThumbnail,
  generating,
  loading,
  onGenerateThumbnail,
  onResetDefaults,
}: ThumbnailControlsDeckProps) {
  const activeLayoutId = manifest?.layout || "mega_grid";
  const activeLayoutInfo = THUMBNAIL_LAYOUT_CATALOG[activeLayoutId];

  return (
    <div className="thumbnail-controls-deck">
      {/* Studio Header & Reset Action */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
          Studio Controls
        </span>
        <button
          type="button"
          className="thumbnail-reset-defaults-btn"
          onClick={onResetDefaults}
          disabled={generating || !hasAnyThumbnail}
          title="Reset layout, curiosity badge, and hook headline back to automatic script intelligence"
        >
          <ArrowCounterClockwise size={13} />
          <span>Reset to Script Defaults</span>
        </button>
      </div>

      {/* Layout Archetype Selector */}
      <div className="control-field-group">
        <div className="control-field-header">
          <span className="control-field-label">Layout Archetype</span>
          <span
            className="tooltip-trigger"
            title="Different question types convert better with specific visual structures (Split VS for 1v1, Mystery for Guess Who, Mega Grid for 100 Qs)"
          >
            <Info size={14} />
          </span>
        </div>


        <div className="layout-chips-grid">
          {LAYOUT_OPTIONS.map((opt) => {
            const isSelected = selectedLayout === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`layout-chip-btn ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedLayout(opt.id)}
                disabled={!hasAnyThumbnail || generating}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {opt.icon}
                  <span className="layout-chip-name">{opt.name}</span>
                </div>
                <span className="layout-chip-sub">{opt.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Curiosity Trigger Badge Selector */}
      <div className="control-field-group">
        <div className="control-field-header">
          <span className="control-field-label">Curiosity Trigger Badge</span>
          <span
            className="tooltip-trigger"
            title="High-CTR psychological triggers (99% FAIL, GENIUS ONLY, IQ TEST) to provoke instant curiosity"
          >
            <Info size={14} />
          </span>
        </div>

        <div className="badge-chips-list">
          {CURIOSITY_BADGE_PRESETS.map((b) => {
            const isSelected = selectedBadge === b.id;
            return (
              <button
                key={b.id}
                type="button"
                className={`badge-chip-btn ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedBadge(b.id)}
                disabled={!hasAnyThumbnail || generating}
              >
                <span>{b.icon}</span>
                <span>{b.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Layout Metadata & Mascot Persona Badge */}
      {activeLayoutInfo && (
        <div className="thumbnail-meta-summary-card">
          <div className="meta-summary-header">
            <span className="meta-summary-badge">
              <CheckCircle size={14} />
              <span>{activeLayoutInfo.name}</span>
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>High-CTR Psychology</span>
          </div>
          <div style={{ color: "var(--ink-secondary)", fontSize: "0.78rem" }}>
            {activeLayoutInfo.psychologicalTrigger}
          </div>

          {manifest?.mascot_persona && (
            <div className="mascot-persona-row">
              <MaskHappy size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
              <div>
                <strong>Mascot Cosplay: </strong>
                <span>{manifest.mascot_persona}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Hook Headline Input */}
      <div className="control-field-group">
        <div className="control-field-header">
          <span className="control-field-label">Hook Headline</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {customHook.trim() !== "" && (
              <button
                type="button"
                className="thumbnail-clear-hook-btn"
                onClick={() => setCustomHook("")}
                disabled={generating}
                title="Clear custom text to let AI auto-generate topic hook from script"
              >
                ✨ Auto Script Hook
              </button>
            )}
            <span
              className="tooltip-trigger"
              title="The big bold 3D text rendered on the thumbnail banner. Leave blank to auto-generate based on episode topic."
            >
              <Info size={14} />
            </span>
          </div>
        </div>
        <input
          type="text"
          className="hook-text-input"
          value={customHook}
          onChange={(e) => setCustomHook(e.target.value)}
          placeholder="Leave blank to auto-extract from script (e.g. SOLAR SYSTEM QUIZ)"
          disabled={!hasAnyThumbnail || generating}
        />
      </div>


      {/* Primary Generation Button */}
      <button
        type="button"
        className="thumbnail-generate-btn"
        onClick={onGenerateThumbnail}
        disabled={!hasAnyThumbnail || generating || loading}
      >
        <ArrowsClockwise size={18} className={generating ? "thumbnail-spinner" : ""} />
        <span>
          {generating
            ? "Generating Dual Thumbnails (16:9 & 9:16)..."
            : !hasAnyThumbnail
              ? "Awaiting Auto-Generation in Asset Stage..."
              : "Re-roll / Generate New Thumbnail"}
        </span>
      </button>
    </div>
  );
}


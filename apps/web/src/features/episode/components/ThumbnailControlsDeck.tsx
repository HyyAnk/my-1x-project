import { ArrowsClockwise, ArrowCounterClockwise } from "@phosphor-icons/react";
import "../../../styles/features/episodes/thumbnailEditorial.css";
import {
  CURIOSITY_BADGE_PRESETS,
  THUMBNAIL_LAYOUT_CATALOG,
  type CuriosityBadgeId,
  type ThumbnailComposition,
  type ThumbnailLayoutType,
  type ThumbnailManifest,
} from "@studio/shared";

const COMPOSITION_LABELS: Record<ThumbnailComposition, string> = {
  mascot_left: "Mascot left",
  mascot_right: "Mascot right",
  hero_center: "Hero center",
  reaction_closeup: "Reaction close-up",
};

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

export function ThumbnailControlsDeck(props: ThumbnailControlsDeckProps) {
  const {
    selectedLayout,
    setSelectedLayout,
    selectedBadge,
    setSelectedBadge,
    customHook,
    setCustomHook,
    manifest,
    generating,
    loading,
    onGenerateThumbnail,
    onResetDefaults,
  } = props;
  const editorialLabel = manifest?.design_template
    ? { big_object: "Big Object", reaction: "Reaction", comparison: "Comparison" }[manifest.design_template]
    : null;
  const compositionLabel = manifest?.composition ? COMPOSITION_LABELS[manifest.composition] : null;
  const editorialName = editorialLabel && compositionLabel ? `${editorialLabel} · ${compositionLabel}` : editorialLabel;
  const activeName = editorialName || (manifest ? THUMBNAIL_LAYOUT_CATALOG[manifest.layout].name : null);

  return (
    <div className="thumbnail-controls-deck">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span className="control-field-label">Thumbnail</span>
        <button type="button" className="thumbnail-reset-defaults-btn" onClick={onResetDefaults} disabled={generating}>
          <ArrowCounterClockwise size={14} aria-hidden="true" />
          Reset
        </button>
      </div>
      <label className="control-field-group">
        <span className="control-field-label">Layout</span>
        <select
          className="hook-text-input"
          value={selectedLayout}
          disabled={generating}
          onChange={(event) => setSelectedLayout(event.target.value as ThumbnailLayoutType | "auto")}
        >
          <option value="auto">Auto Editorial</option>
          {Object.values(THUMBNAIL_LAYOUT_CATALOG).map((layout) => (
            <option key={layout.id} value={layout.id}>
              {layout.name}
            </option>
          ))}
        </select>
      </label>
      <label className="control-field-group">
        <span className="control-field-label">Badge</span>
        <select
          className="hook-text-input"
          value={selectedBadge}
          disabled={generating}
          onChange={(event) => setSelectedBadge(event.target.value as CuriosityBadgeId)}
        >
          {CURIOSITY_BADGE_PRESETS.map((badge) => (
            <option key={badge.id} value={badge.id}>
              {badge.id === "auto" && selectedLayout === "auto" ? "None" : badge.label}
            </option>
          ))}
        </select>
      </label>
      <label className="control-field-group">
        <span className="control-field-label">Headline</span>
        <input
          type="text"
          className="hook-text-input"
          value={customHook}
          disabled={generating}
          onChange={(event) => setCustomHook(event.target.value)}
          placeholder={manifest?.hook_text ? `Auto (current: ${manifest.hook_text})` : "Auto from script"}
          maxLength={60}
        />
        {customHook.length > 30 && <span role="status">Keep the headline under 30 characters to avoid shortening</span>}
      </label>
      {activeName && <span className="thumbnail-meta-summary-card">{editorialLabel ? `Editorial / ${activeName}` : activeName}</span>}
      <button
        type="button"
        className="thumbnail-generate-btn"
        onClick={onGenerateThumbnail}
        disabled={generating || loading}
        aria-busy={generating}
        aria-label={generating ? "Generating thumbnail" : "Generate"}
      >
        <ArrowsClockwise size={18} className={generating ? "thumbnail-spinner" : ""} aria-hidden="true" />
        <span role="status">{generating ? "Generating…" : "Generate"}</span>
      </button>
    </div>
  );
}

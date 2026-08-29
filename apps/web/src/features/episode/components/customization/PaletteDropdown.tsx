import { CaretDown, Swatches } from "@phosphor-icons/react";
import {
  ALL_QUIZ_PALETTES,
  QUIZ_PALETTE_COLORS,
  QUIZ_PALETTE_LABELS,
  type Channel,
  type Episode,
  type QuizPaletteId,
} from "@studio/shared";

type Props = {
  channel: Channel;
  episode: Episode;
  disabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelectPalette: (palette: QuizPaletteId) => void;
};

export function PaletteDropdown({ channel, episode, disabled, isOpen, onToggle, onSelectPalette }: Props) {
  const currentPalette = (episode.quiz_config?.palette_id as QuizPaletteId) || "auto";
  const channelDefault = (channel.default_palette_id as QuizPaletteId) || "lime";
  const resolvedPalette = currentPalette === "auto" ? channelDefault : currentPalette;

  const currentColors =
    resolvedPalette !== "auto" && QUIZ_PALETTE_COLORS[resolvedPalette]
      ? QUIZ_PALETTE_COLORS[resolvedPalette]
      : QUIZ_PALETTE_COLORS.lime;

  return (
    <div className="customization-dropdown-item">
      <button
        type="button"
        className={`customization-pill-btn ${isOpen ? "is-active" : ""}`}
        disabled={disabled}
        onClick={onToggle}
        title="Configure Color Palette theme for this episode"
      >
        <div
          className="pill-btn-icon-wrap icon-theme"
          style={{
            background: `linear-gradient(135deg, ${currentColors.primary}, ${currentColors.secondary})`,
            color: "#FFF",
          }}
        >
          <Swatches size={14} weight="bold" />
        </div>
        <div className="pill-btn-text">
          <span className="pill-label">Color Palette</span>
          <strong className="pill-value">
            {currentPalette === "auto"
              ? `Default (${QUIZ_PALETTE_LABELS[resolvedPalette === "auto" ? "lime" : resolvedPalette]})`
              : QUIZ_PALETTE_LABELS[currentPalette]}
          </strong>
        </div>
        <CaretDown size={12} className="pill-caret" />
      </button>

      {isOpen ? (
        <div className="visual-styles-popover customization-popover-sm">
          <div className="popover-header">
            <strong>🎨 Theme Palette</strong>
            <small>Select dominant color mood</small>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", padding: "4px 0" }}>
            <button
              type="button"
              className={`preset-count-btn ${currentPalette === "auto" ? "is-active" : ""}`}
              style={{ gridColumn: "1 / -1", justifyContent: "flex-start", padding: "6px 10px" }}
              onClick={() => onSelectPalette("auto")}
            >
              <span>⚙️ Channel Default</span>
            </button>

            {ALL_QUIZ_PALETTES.map((p) => {
              if (p === "auto") return null;
              const isSelected = currentPalette === p;
              const colors = QUIZ_PALETTE_COLORS[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onSelectPalette(p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 8px",
                    borderRadius: "8px",
                    background: isSelected ? "var(--soft-accent)" : "var(--surface-strong)",
                    border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: "11px", fontWeight: isSelected ? 800 : 500, color: isSelected ? "var(--accent)" : "var(--text)" }}>
                    {QUIZ_PALETTE_LABELS[p]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

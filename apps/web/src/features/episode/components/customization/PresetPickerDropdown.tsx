import { useState } from "react";
import { CaretDown, Check, Lightning } from "@phosphor-icons/react";
import { BUILT_IN_PRESETS, matchVisualPreset, type Episode, type VisualPresetItem } from "@studio/shared";
import { useTranslation } from "../../../../i18n";

type Props = {
  episode: Episode;
  disabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelectPreset: (preset: VisualPresetItem) => void;
};

export function PresetPickerDropdown({ episode, disabled, isOpen, onToggle, onSelectPreset }: Props) {
  const { t } = useTranslation();
  const [hoveredPreset, setHoveredPreset] = useState<VisualPresetItem>(BUILT_IN_PRESETS[0]);

  const activeMatchedPreset = matchVisualPreset({
    palette_id: episode.quiz_config?.palette_id,
    question_box_style: episode.quiz_config?.question_box_style,
    answer_card_style: episode.quiz_config?.answer_card_style,
    counter_style: episode.quiz_config?.question_counter_style,
    thinking_bar_style: episode.quiz_config?.thinking_bar_style,
  });

  const displayPreset =
    episode.quiz_config?.style_preset_id && episode.quiz_config.style_preset_id !== "auto" && episode.quiz_config.style_preset_id !== "custom"
      ? BUILT_IN_PRESETS.find((p) => p.id === episode.quiz_config?.style_preset_id) || activeMatchedPreset
      : activeMatchedPreset;

  const currentName = displayPreset
    ? t(displayPreset.nameKey || "") || displayPreset.name
    : episode.quiz_config?.style_preset_id === "custom"
      ? "Custom Kit 🎨"
      : "Channel Default ⚙️";

  return (
    <div className="customization-dropdown-item">
      <button
        type="button"
        className={`customization-pill-btn ${isOpen ? "is-active" : ""}`}
        disabled={disabled}
        onClick={onToggle}
        title="Apply a 1-click cohesive style preset pack to this episode"
      >
        <div className="pill-btn-icon-wrap icon-preset" style={{ color: "#a855f7", background: "rgba(168, 85, 247, 0.15)" }}>
          <Lightning size={14} weight="fill" />
        </div>
        <div className="pill-btn-text">
          <span className="pill-label">Style Preset</span>
          <strong className="pill-value">{displayPreset ? `${displayPreset.icon} ${currentName}` : currentName}</strong>
        </div>
        <CaretDown size={12} className="pill-caret" />
      </button>

      {isOpen ? (
        <div className="visual-styles-popover visual-styles-popover-wide customization-popover-wide">
          <div className="visual-styles-content-grid">
            <div className="visual-styles-list-col">
              <div className="popover-header">
                <strong>⚡ Cohesive Style Presets</strong>
                <small>1-Click complete theme, cards, badges & timer pack</small>
              </div>
              <div className="popover-list">
                {BUILT_IN_PRESETS.map((preset) => {
                  const isChecked = displayPreset?.id === preset.id;
                  const isHovered = hoveredPreset.id === preset.id;
                  const localizedName = t(preset.nameKey || "") || preset.name;
                  return (
                    <label
                      key={preset.id}
                      className={`style-checkbox-item ${isChecked ? "is-checked" : ""} ${isHovered ? "is-hovered" : ""}`}
                      onMouseEnter={() => setHoveredPreset(preset)}
                      onClick={() => onSelectPreset(preset)}
                    >
                      <input type="radio" name="preset_choice" checked={isChecked} onChange={() => onSelectPreset(preset)} />
                      <span style={{ marginRight: "6px", fontSize: "16px" }}>{preset.icon}</span>
                      <span className="style-label" style={{ fontWeight: isChecked ? 700 : 500 }}>
                        {localizedName}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="visual-styles-preview-col">
              <div className="style-preview-card">
                <div
                  className="style-preview-desc"
                  style={{
                    padding: "16px",
                    background: "rgba(15, 23, 42, 0.75)",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "28px" }}>{hoveredPreset.icon}</span>
                    <strong style={{ fontSize: "16px", color: "#FFF" }}>
                      {t(hoveredPreset.nameKey || "") || hoveredPreset.name}
                    </strong>
                  </div>
                  <p style={{ margin: "0 0 12px 0", fontSize: "13px", lineHeight: "1.45", color: "rgba(255,255,255,0.75)" }}>
                    {t(hoveredPreset.descKey || "") || hoveredPreset.description}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    <span className="badge-tag">Box: {hoveredPreset.question_box_style}</span>
                    <span className="badge-tag">Cards: {hoveredPreset.answer_card_style}</span>
                    <span className="badge-tag">Badge: {hoveredPreset.counter_style}</span>
                    <span className="badge-tag">Timer: {hoveredPreset.thinking_bar_style}</span>
                    <span className="badge-tag">Palette: {hoveredPreset.palette_id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

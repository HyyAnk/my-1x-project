import { useState } from "react";
import { CaretDown, Palette } from "@phosphor-icons/react";
import { ALL_QUIZ_IMAGE_STYLES, QUIZ_IMAGE_STYLE_LABELS, type Channel, type Episode, type QuizImageStyle } from "@studio/shared";
import { QUIZ_IMAGE_STYLE_DESCRIPTIONS } from "../../../channel/components/VisualStylesMenu";

type Props = {
  channel: Channel;
  episode: Episode;
  disabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelectStyle: (style: QuizImageStyle | "mixed") => void;
};

export function ArtStyleDropdown({ channel, episode, disabled, isOpen, onToggle, onSelectStyle }: Props) {
  const channelStyles = channel.selected_styles && channel.selected_styles.length > 0 ? channel.selected_styles : ALL_QUIZ_IMAGE_STYLES;
  const currentVisualStyle = episode.quiz_config?.visual_style ?? "mixed";
  const [hoveredStyle, setHoveredStyle] = useState<QuizImageStyle>(
    currentVisualStyle === "mixed" ? channelStyles[0] || "pixar_3d" : currentVisualStyle,
  );

  return (
    <div className="customization-dropdown-item">
      <button
        type="button"
        className={`customization-pill-btn ${isOpen ? "is-active" : ""}`}
        disabled={disabled}
        onClick={onToggle}
        title="Configure illustration visual style for AI image generation"
      >
        <div className="pill-btn-icon-wrap icon-palette">
          <Palette size={14} weight="bold" />
        </div>
        <div className="pill-btn-text">
          <span className="pill-label">Art Style</span>
          <strong className="pill-value">
            {currentVisualStyle === "mixed" ? "🎲 Mixed (Random)" : QUIZ_IMAGE_STYLE_LABELS[currentVisualStyle] || currentVisualStyle}
          </strong>
        </div>
        <CaretDown size={12} className="pill-caret" />
      </button>

      {isOpen ? (
        <div className="visual-styles-popover visual-styles-popover-wide customization-popover-wide">
          <div className="visual-styles-content-grid">
            <div className="visual-styles-list-col">
              <div className="popover-header">
                <strong>🎨 Visual Illustration Style</strong>
                <small>Choose art style for question illustrations</small>
              </div>
              <div className="popover-list">
                <label
                  className={`style-checkbox-item ${currentVisualStyle === "mixed" ? "is-checked" : ""} ${
                    hoveredStyle === (channelStyles[0] || "pixar_3d") ? "is-hovered" : ""
                  }`}
                  onMouseEnter={() => setHoveredStyle(channelStyles[0] || "pixar_3d")}
                  onClick={() => onSelectStyle("mixed")}
                >
                  <input
                    type="radio"
                    name="visual_style_choice"
                    checked={currentVisualStyle === "mixed"}
                    onChange={() => onSelectStyle("mixed")}
                  />
                  <span className="style-label">🎲 Mixed (Random from Channel)</span>
                </label>

                {channelStyles.map((style) => {
                  const isChecked = currentVisualStyle === style;
                  const isHovered = hoveredStyle === style;
                  return (
                    <label
                      key={style}
                      className={`style-checkbox-item ${isChecked ? "is-checked" : ""} ${isHovered ? "is-hovered" : ""}`}
                      onMouseEnter={() => setHoveredStyle(style)}
                      onClick={() => onSelectStyle(style)}
                    >
                      <input type="radio" name="visual_style_choice" checked={isChecked} onChange={() => onSelectStyle(style)} />
                      <span className="style-label">{QUIZ_IMAGE_STYLE_LABELS[style]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="visual-styles-preview-col">
              <div className="style-preview-card">
                <div className="style-preview-img-wrap">
                  <img
                    src={`/style-previews/${hoveredStyle}.png`}
                    alt={QUIZ_IMAGE_STYLE_LABELS[hoveredStyle]}
                    className="style-preview-img"
                  />
                  <span className="style-preview-tag">{QUIZ_IMAGE_STYLE_LABELS[hoveredStyle]}</span>
                </div>
                <div className="style-preview-desc">
                  <p>{QUIZ_IMAGE_STYLE_DESCRIPTIONS[hoveredStyle]}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

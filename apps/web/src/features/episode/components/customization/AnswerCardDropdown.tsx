import { useState } from "react";
import { CaretDown, CheckSquareOffset } from "@phosphor-icons/react";
import {
  ALL_ANSWER_CARD_STYLES,
  ANSWER_CARD_STYLE_DESCRIPTIONS,
  ANSWER_CARD_STYLE_LABELS,
  type Channel,
  type Episode,
  type QuizAnswerCardStyle,
} from "@studio/shared";

const ANSWER_CARD_ICONS: Record<Exclude<QuizAnswerCardStyle, "auto">, string> = {
  glossy_arcade: "🍬",
  comic_chunky: "💥",
  glass_neon: "🪟",
  minimal_soft: "✨",
};

type Props = {
  channel: Channel;
  episode: Episode;
  disabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelectStyle: (style: QuizAnswerCardStyle) => void;
};

export function AnswerCardDropdown({ channel, episode, disabled, isOpen, onToggle, onSelectStyle }: Props) {
  const currentCardStyle = episode.quiz_config?.answer_card_style || "auto";
  const channelDefault = channel.default_answer_card_style || "glossy_arcade";
  const resolvedCardStyle = currentCardStyle === "auto" ? channelDefault : currentCardStyle;
  const [hoveredCard, setHoveredCard] = useState<Exclude<QuizAnswerCardStyle, "auto">>(
    resolvedCardStyle === "auto" ? "glossy_arcade" : resolvedCardStyle,
  );

  return (
    <div className="customization-dropdown-item">
      <button
        type="button"
        className={`customization-pill-btn ${isOpen ? "is-active" : ""}`}
        disabled={disabled}
        onClick={onToggle}
        title="Configure Answer Choice pill/card visual style"
      >
        <div className="pill-btn-icon-wrap icon-choice" style={{ color: "#10b981", background: "rgba(16, 185, 129, 0.15)" }}>
          <CheckSquareOffset size={14} weight="bold" />
        </div>
        <div className="pill-btn-text">
          <span className="pill-label">Answer Cards</span>
          <strong className="pill-value">
            {currentCardStyle === "auto"
              ? `Default (${ANSWER_CARD_STYLE_LABELS[resolvedCardStyle === "auto" ? "glossy_arcade" : resolvedCardStyle]})`
              : `${ANSWER_CARD_ICONS[currentCardStyle]} ${ANSWER_CARD_STYLE_LABELS[currentCardStyle]}`}
          </strong>
        </div>
        <CaretDown size={12} className="pill-caret" />
      </button>

      {isOpen ? (
        <div className="visual-styles-popover visual-styles-popover-wide customization-popover-wide">
          <div className="visual-styles-content-grid">
            <div className="visual-styles-list-col">
              <div className="popover-header">
                <strong>🎴 Answer Card Style</strong>
                <small>Choose aesthetic for multiple choice answer options</small>
              </div>
              <div className="popover-list">
                <label
                  className={`style-checkbox-item ${currentCardStyle === "auto" ? "is-checked" : ""}`}
                  onMouseEnter={() => setHoveredCard(resolvedCardStyle === "auto" ? "glossy_arcade" : resolvedCardStyle)}
                  onClick={() => onSelectStyle("auto")}
                >
                  <input type="radio" name="card_choice" checked={currentCardStyle === "auto"} onChange={() => onSelectStyle("auto")} />
                  <span style={{ marginRight: "6px" }}>⚙️</span>
                  <span className="style-label">Channel Default</span>
                </label>

                {ALL_ANSWER_CARD_STYLES.map((style) => {
                  if (style === "auto") return null;
                  const isChecked = currentCardStyle === style;
                  const isHovered = hoveredCard === style;
                  return (
                    <label
                      key={style}
                      className={`style-checkbox-item ${isChecked ? "is-checked" : ""} ${isHovered ? "is-hovered" : ""}`}
                      onMouseEnter={() => setHoveredCard(style)}
                      onClick={() => onSelectStyle(style)}
                    >
                      <input type="radio" name="card_choice" checked={isChecked} onChange={() => onSelectStyle(style)} />
                      <span style={{ marginRight: "6px" }}>{ANSWER_CARD_ICONS[style]}</span>
                      <span className="style-label">{ANSWER_CARD_STYLE_LABELS[style]}</span>
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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "28px" }}>{ANSWER_CARD_ICONS[hoveredCard]}</span>
                    <strong style={{ fontSize: "16px", color: "#FFF" }}>{ANSWER_CARD_STYLE_LABELS[hoveredCard]}</strong>
                  </div>
                  <p style={{ margin: "0 0 14px 0", fontSize: "13px", lineHeight: "1.45", color: "rgba(255,255,255,0.75)" }}>
                    {ANSWER_CARD_STYLE_DESCRIPTIONS[hoveredCard]}
                  </p>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(16, 185, 129, 0.15)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      fontSize: "12px",
                      color: "#10b981",
                      fontFamily: "monospace",
                    }}
                  >
                    variant: <code>{hoveredCard}</code>
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

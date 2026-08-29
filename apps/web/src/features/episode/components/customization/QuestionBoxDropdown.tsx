import { useState } from "react";
import { Cards, CaretDown } from "@phosphor-icons/react";
import {
  ALL_QUESTION_BOX_STYLES,
  QUESTION_BOX_STYLE_DESCRIPTIONS,
  QUESTION_BOX_STYLE_LABELS,
  type Channel,
  type Episode,
  type QuizQuestionBoxStyle,
} from "@studio/shared";

const QUESTION_BOX_ICONS: Record<Exclude<QuizQuestionBoxStyle, "auto">, string> = {
  candy_pop: "🍬",
  comic_bubble: "💬",
  glass_morphism: "🪟",
  parchment_scroll: "📜",
};

type Props = {
  channel: Channel;
  episode: Episode;
  disabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelectStyle: (style: QuizQuestionBoxStyle) => void;
};

export function QuestionBoxDropdown({ channel, episode, disabled, isOpen, onToggle, onSelectStyle }: Props) {
  const currentBoxStyle = episode.quiz_config?.question_box_style || "auto";
  const channelDefault = channel.default_question_box_style || "candy_pop";
  const resolvedBoxStyle = currentBoxStyle === "auto" ? channelDefault : currentBoxStyle;
  const [hoveredBox, setHoveredBox] = useState<Exclude<QuizQuestionBoxStyle, "auto">>(
    resolvedBoxStyle === "auto" ? "candy_pop" : resolvedBoxStyle,
  );

  return (
    <div className="customization-dropdown-item">
      <button
        type="button"
        className={`customization-pill-btn ${isOpen ? "is-active" : ""}`}
        disabled={disabled}
        onClick={onToggle}
        title="Configure Question Card visual frame style"
      >
        <div className="pill-btn-icon-wrap icon-card" style={{ color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)" }}>
          <Cards size={14} weight="bold" />
        </div>
        <div className="pill-btn-text">
          <span className="pill-label">Question Card</span>
          <strong className="pill-value">
            {currentBoxStyle === "auto"
              ? `Default (${QUESTION_BOX_STYLE_LABELS[resolvedBoxStyle === "auto" ? "candy_pop" : resolvedBoxStyle]})`
              : `${QUESTION_BOX_ICONS[currentBoxStyle]} ${QUESTION_BOX_STYLE_LABELS[currentBoxStyle]}`}
          </strong>
        </div>
        <CaretDown size={12} className="pill-caret" />
      </button>

      {isOpen ? (
        <div className="visual-styles-popover visual-styles-popover-wide customization-popover-wide">
          <div className="visual-styles-content-grid">
            <div className="visual-styles-list-col">
              <div className="popover-header">
                <strong>📦 Question Card Style</strong>
                <small>Choose visual container frame for questions</small>
              </div>
              <div className="popover-list">
                <label
                  className={`style-checkbox-item ${currentBoxStyle === "auto" ? "is-checked" : ""}`}
                  onMouseEnter={() => setHoveredBox(resolvedBoxStyle === "auto" ? "candy_pop" : resolvedBoxStyle)}
                  onClick={() => onSelectStyle("auto")}
                >
                  <input type="radio" name="box_choice" checked={currentBoxStyle === "auto"} onChange={() => onSelectStyle("auto")} />
                  <span style={{ marginRight: "6px" }}>⚙️</span>
                  <span className="style-label">Channel Default</span>
                </label>

                {ALL_QUESTION_BOX_STYLES.map((style) => {
                  if (style === "auto") return null;
                  const isChecked = currentBoxStyle === style;
                  const isHovered = hoveredBox === style;
                  return (
                    <label
                      key={style}
                      className={`style-checkbox-item ${isChecked ? "is-checked" : ""} ${isHovered ? "is-hovered" : ""}`}
                      onMouseEnter={() => setHoveredBox(style)}
                      onClick={() => onSelectStyle(style)}
                    >
                      <input type="radio" name="box_choice" checked={isChecked} onChange={() => onSelectStyle(style)} />
                      <span style={{ marginRight: "6px" }}>{QUESTION_BOX_ICONS[style]}</span>
                      <span className="style-label">{QUESTION_BOX_STYLE_LABELS[style]}</span>
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
                    <span style={{ fontSize: "28px" }}>{QUESTION_BOX_ICONS[hoveredBox]}</span>
                    <strong style={{ fontSize: "16px", color: "#FFF" }}>{QUESTION_BOX_STYLE_LABELS[hoveredBox]}</strong>
                  </div>
                  <p style={{ margin: "0 0 14px 0", fontSize: "13px", lineHeight: "1.45", color: "rgba(255,255,255,0.75)" }}>
                    {QUESTION_BOX_STYLE_DESCRIPTIONS[hoveredBox]}
                  </p>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(56, 189, 248, 0.15)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      fontSize: "12px",
                      color: "#38bdf8",
                      fontFamily: "monospace",
                    }}
                  >
                    variant: <code>{hoveredBox}</code>
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

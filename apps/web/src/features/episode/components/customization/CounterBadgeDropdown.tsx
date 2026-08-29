import { useState } from "react";
import { CaretDown, Tag } from "@phosphor-icons/react";
import {
  ALL_QUESTION_COUNTER_STYLES,
  QUESTION_COUNTER_STYLE_DESCRIPTIONS,
  QUESTION_COUNTER_STYLE_LABELS,
  type Channel,
  type Episode,
  type QuizQuestionCounterStyle,
} from "@studio/shared";

const COUNTER_ICONS: Record<Exclude<QuizQuestionCounterStyle, "auto">, string> = {
  hanging_woodsign: "🪵",
  neon_badge: "⚡",
  floating_balloon: "🎈",
  golden_shield: "🛡️",
};

type Props = {
  channel: Channel;
  episode: Episode;
  disabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelectStyle: (style: QuizQuestionCounterStyle) => void;
};

export function CounterBadgeDropdown({ channel, episode, disabled, isOpen, onToggle, onSelectStyle }: Props) {
  const currentCounter = episode.quiz_config?.question_counter_style || "auto";
  const channelDefault = channel.default_counter_style || "hanging_woodsign";
  const resolvedCounter = currentCounter === "auto" ? channelDefault : currentCounter;
  const [hoveredCounter, setHoveredCounter] = useState<Exclude<QuizQuestionCounterStyle, "auto">>(
    resolvedCounter === "auto" ? "hanging_woodsign" : resolvedCounter,
  );

  return (
    <div className="customization-dropdown-item">
      <button
        type="button"
        className={`customization-pill-btn ${isOpen ? "is-active" : ""}`}
        disabled={disabled}
        onClick={onToggle}
        title="Configure question number badge indicator style"
      >
        <div className="pill-btn-icon-wrap icon-counter" style={{ color: "#f59e0b", background: "rgba(245, 158, 11, 0.15)" }}>
          <Tag size={14} weight="bold" />
        </div>
        <div className="pill-btn-text">
          <span className="pill-label">Counter Badge</span>
          <strong className="pill-value">
            {currentCounter === "auto"
              ? `Default (${QUESTION_COUNTER_STYLE_LABELS[resolvedCounter === "auto" ? "hanging_woodsign" : resolvedCounter]})`
              : `${COUNTER_ICONS[currentCounter]} ${QUESTION_COUNTER_STYLE_LABELS[currentCounter]}`}
          </strong>
        </div>
        <CaretDown size={12} className="pill-caret" />
      </button>

      {isOpen ? (
        <div className="visual-styles-popover visual-styles-popover-wide customization-popover-wide">
          <div className="visual-styles-content-grid">
            <div className="visual-styles-list-col">
              <div className="popover-header">
                <strong>🏷️ Question Counter Badge</strong>
                <small>Choose top badge style indicating question number</small>
              </div>
              <div className="popover-list">
                <label
                  className={`style-checkbox-item ${currentCounter === "auto" ? "is-checked" : ""}`}
                  onMouseEnter={() => setHoveredCounter(resolvedCounter === "auto" ? "hanging_woodsign" : resolvedCounter)}
                  onClick={() => onSelectStyle("auto")}
                >
                  <input type="radio" name="counter_choice" checked={currentCounter === "auto"} onChange={() => onSelectStyle("auto")} />
                  <span style={{ marginRight: "6px" }}>⚙️</span>
                  <span className="style-label">Channel Default</span>
                </label>

                {ALL_QUESTION_COUNTER_STYLES.map((style) => {
                  if (style === "auto") return null;
                  const isChecked = currentCounter === style;
                  const isHovered = hoveredCounter === style;
                  return (
                    <label
                      key={style}
                      className={`style-checkbox-item ${isChecked ? "is-checked" : ""} ${isHovered ? "is-hovered" : ""}`}
                      onMouseEnter={() => setHoveredCounter(style)}
                      onClick={() => onSelectStyle(style)}
                    >
                      <input type="radio" name="counter_choice" checked={isChecked} onChange={() => onSelectStyle(style)} />
                      <span style={{ marginRight: "6px" }}>{COUNTER_ICONS[style]}</span>
                      <span className="style-label">{QUESTION_COUNTER_STYLE_LABELS[style]}</span>
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
                    <span style={{ fontSize: "28px" }}>{COUNTER_ICONS[hoveredCounter]}</span>
                    <strong style={{ fontSize: "16px", color: "#FFF" }}>{QUESTION_COUNTER_STYLE_LABELS[hoveredCounter]}</strong>
                  </div>
                  <p style={{ margin: "0 0 14px 0", fontSize: "13px", lineHeight: "1.45", color: "rgba(255,255,255,0.75)" }}>
                    {QUESTION_COUNTER_STYLE_DESCRIPTIONS[hoveredCounter]}
                  </p>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      fontSize: "12px",
                      color: "#f59e0b",
                      fontFamily: "monospace",
                    }}
                  >
                    variant: <code>{hoveredCounter}</code>
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

import { useState } from "react";
import { CaretDown, Timer } from "@phosphor-icons/react";
import {
  ALL_THINKING_BAR_STYLES,
  THINKING_BAR_STYLE_DESCRIPTIONS,
  THINKING_BAR_STYLE_LABELS,
  type Channel,
  type Episode,
  type QuizThinkingBarStyle,
} from "@studio/shared";

const THINKING_BAR_ICONS: Record<Exclude<QuizThinkingBarStyle, "auto">, string> = {
  star_slider: "⭐",
  capsule_liquid: "🧪",
  energy_laser: "⚡",
  retro_pixel: "👾",
  flame_fuse: "🔥",
  minimal_glow: "✨",
};

type Props = {
  channel: Channel;
  episode: Episode;
  disabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelectStyle: (style: QuizThinkingBarStyle) => void;
};

export function ThinkingBarDropdown({ channel, episode, disabled, isOpen, onToggle, onSelectStyle }: Props) {
  const currentThinkingBar = episode.quiz_config?.thinking_bar_style || "auto";
  const channelDefaultThinkingBar = channel.default_thinking_bar_style || "star_slider";
  const resolvedThinkingBar = currentThinkingBar === "auto" ? channelDefaultThinkingBar : currentThinkingBar;
  const [hoveredThinkingBar, setHoveredThinkingBar] = useState<Exclude<QuizThinkingBarStyle, "auto">>(
    resolvedThinkingBar === "auto" ? "star_slider" : resolvedThinkingBar,
  );

  return (
    <div className="customization-dropdown-item">
      <button
        type="button"
        className={`customization-pill-btn ${isOpen ? "is-active" : ""}`}
        disabled={disabled}
        onClick={onToggle}
        title="Configure countdown timer animation style"
      >
        <div className="pill-btn-icon-wrap icon-timer">
          <Timer size={14} weight="bold" />
        </div>
        <div className="pill-btn-text">
          <span className="pill-label">Thinking Bar</span>
          <strong className="pill-value">
            {currentThinkingBar === "auto"
              ? `Default (${THINKING_BAR_STYLE_LABELS[resolvedThinkingBar === "auto" ? "star_slider" : resolvedThinkingBar]})`
              : `${THINKING_BAR_ICONS[currentThinkingBar]} ${THINKING_BAR_STYLE_LABELS[currentThinkingBar]}`}
          </strong>
        </div>
        <CaretDown size={12} className="pill-caret" />
      </button>

      {isOpen ? (
        <div className="visual-styles-popover visual-styles-popover-wide customization-popover-wide">
          <div className="visual-styles-content-grid">
            <div className="visual-styles-list-col">
              <div className="popover-header">
                <strong>⏱️ Thinking Bar Animation</strong>
                <small>Choose countdown timer animation style</small>
              </div>
              <div className="popover-list">
                <label
                  className={`style-checkbox-item ${currentThinkingBar === "auto" ? "is-checked" : ""}`}
                  onMouseEnter={() => setHoveredThinkingBar(resolvedThinkingBar === "auto" ? "star_slider" : resolvedThinkingBar)}
                  onClick={() => onSelectStyle("auto")}
                >
                  <input type="radio" name="timer_choice" checked={currentThinkingBar === "auto"} onChange={() => onSelectStyle("auto")} />
                  <span style={{ marginRight: "6px" }}>⚙️</span>
                  <span className="style-label">Channel Default</span>
                </label>

                {ALL_THINKING_BAR_STYLES.map((style) => {
                  if (style === "auto") return null;
                  const isChecked = currentThinkingBar === style;
                  const isHovered = hoveredThinkingBar === style;
                  return (
                    <label
                      key={style}
                      className={`style-checkbox-item ${isChecked ? "is-checked" : ""} ${isHovered ? "is-hovered" : ""}`}
                      onMouseEnter={() => setHoveredThinkingBar(style)}
                      onClick={() => onSelectStyle(style)}
                    >
                      <input type="radio" name="timer_choice" checked={isChecked} onChange={() => onSelectStyle(style)} />
                      <span style={{ marginRight: "6px" }}>{THINKING_BAR_ICONS[style]}</span>
                      <span className="style-label">{THINKING_BAR_STYLE_LABELS[style]}</span>
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
                    <span style={{ fontSize: "28px" }}>{THINKING_BAR_ICONS[hoveredThinkingBar]}</span>
                    <strong style={{ fontSize: "16px", color: "#FFF" }}>{THINKING_BAR_STYLE_LABELS[hoveredThinkingBar]}</strong>
                  </div>
                  <p style={{ margin: "0 0 14px 0", fontSize: "13px", lineHeight: "1.45", color: "rgba(255,255,255,0.75)" }}>
                    {THINKING_BAR_STYLE_DESCRIPTIONS[hoveredThinkingBar]}
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
                    variant: <code>{hoveredThinkingBar}</code>
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

import { useEffect, useRef, useState } from "react";
import { CaretDown, Timer } from "@phosphor-icons/react";
import {
  ALL_THINKING_BAR_STYLES,
  THINKING_BAR_STYLE_DESCRIPTIONS,
  THINKING_BAR_STYLE_LABELS,
  type Channel,
  type QuizThinkingBarStyle,
} from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

const THINKING_BAR_ICONS: Record<Exclude<QuizThinkingBarStyle, "auto">, string> = {
  star_slider: "⭐",
  capsule_liquid: "🧪",
  energy_laser: "⚡",
  construction_machine: "🚜",
  flame_fuse: "🔥",
  cosmic_rocket: "🚀",
};

export function ThinkingBarStyleMenu({
  channel,
  onRefresh,
  onNotice,
}: {
  channel: Channel;
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentStyle = channel.default_thinking_bar_style || "star_slider";
  const [selectedStyle, setSelectedStyle] = useState<QuizThinkingBarStyle>(currentStyle);
  const [hoveredStyle, setHoveredStyle] = useState<Exclude<QuizThinkingBarStyle, "auto">>(
    currentStyle === "auto" ? "star_slider" : currentStyle,
  );

  useEffect(() => {
    setSelectedStyle(channel.default_thinking_bar_style || "star_slider");
  }, [channel.default_thinking_bar_style]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelectStyle = async (style: QuizThinkingBarStyle) => {
    setSelectedStyle(style);
    try {
      await api.updateChannel(channel.channel_id, { default_thinking_bar_style: style });
      await onRefresh();
      onNotice({
        tone: "good",
        message: `Thinking bar style set to: ${style === "auto" ? "Auto (Default)" : THINKING_BAR_STYLE_LABELS[style]}`,
      });
    } catch (err) {
      setSelectedStyle(currentStyle);
      onNotice({
        tone: "bad",
        message: err instanceof Error ? err.message : "Failed to update thinking bar style",
      });
    }
  };

  const previewTarget = hoveredStyle;

  return (
    <div className="visual-styles-dropdown-wrap" ref={menuRef}>
      <button
        type="button"
        className={`quiet-button compact visual-styles-btn ${open ? "is-active" : ""}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) {
            setHoveredStyle(selectedStyle === "auto" ? "star_slider" : selectedStyle);
          }
        }}
        title="Select default Thinking Bar style for this channel"
      >
        <Timer size={15} />
        <span>Timer: {selectedStyle === "auto" ? "Auto" : THINKING_BAR_STYLE_LABELS[selectedStyle] || "Star Runner"}</span>
        <CaretDown size={12} />
      </button>

      {open ? (
        <div className="visual-styles-popover visual-styles-popover-wide">
          <div className="visual-styles-content-grid">
            <div className="visual-styles-list-col">
              <div className="popover-header">
                <strong>⏱️ Thinking Bar Styles</strong>
                <small>Select animation style for countdown timer</small>
              </div>
              <div className="popover-list">
                {ALL_THINKING_BAR_STYLES.map((style) => {
                  if (style === "auto") return null;
                  const isChecked = selectedStyle === style;
                  const isHovered = previewTarget === style;
                  const icon = THINKING_BAR_ICONS[style];
                  const label = THINKING_BAR_STYLE_LABELS[style];
                  return (
                    <label
                      key={style}
                      className={`style-checkbox-item ${isChecked ? "is-checked" : ""} ${isHovered ? "is-hovered" : ""}`}
                      onMouseEnter={() => setHoveredStyle(style)}
                      onClick={() => void handleSelectStyle(style)}
                    >
                      <input type="radio" name="thinking_bar_style" checked={isChecked} onChange={() => void handleSelectStyle(style)} />
                      <span className="style-icon-preview" style={{ marginRight: "6px" }}>
                        {icon}
                      </span>
                      <span className="style-label">{label}</span>
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
                    background: "rgba(15, 23, 42, 0.6)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>{THINKING_BAR_ICONS[previewTarget]}</span>
                    <strong style={{ fontSize: "15px", color: "var(--text-main, #FFF)" }}>
                      {THINKING_BAR_STYLE_LABELS[previewTarget]}
                    </strong>
                  </div>
                  <p style={{ margin: "0 0 12px 0", fontSize: "13px", lineHeight: "1.4", color: "var(--text-muted, #94a3b8)" }}>
                    {THINKING_BAR_STYLE_DESCRIPTIONS[previewTarget]}
                  </p>
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: "rgba(0,0,0,0.3)",
                      fontSize: "12px",
                      color: "#38bdf8",
                      fontFamily: "monospace",
                    }}
                  >
                    variant: <code>{previewTarget}</code>
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

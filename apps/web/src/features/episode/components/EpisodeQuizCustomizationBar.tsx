import { useEffect, useRef, useState } from "react";
import {
  CaretDown,
  Check,
  Hash,
  Palette,
  SlidersHorizontal,
  Timer,
} from "@phosphor-icons/react";
import {
  ALL_QUIZ_IMAGE_STYLES,
  ALL_THINKING_BAR_STYLES,
  QUIZ_IMAGE_STYLE_LABELS,
  QUIZ_MAX_QUESTION_COUNT,
  QUIZ_MIN_QUESTION_COUNT,
  THINKING_BAR_STYLE_DESCRIPTIONS,
  THINKING_BAR_STYLE_LABELS,
  type Channel,
  type Episode,
  type QuizImageStyle,
  type QuizThinkingBarStyle,
  type Task,
} from "@studio/shared";
import { QUIZ_IMAGE_STYLE_DESCRIPTIONS } from "../../channel/components/VisualStylesMenu";

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
  activeEpisodeTask: Task | null;
  busy: string | null;
  questionCountDraft: number;
  setQuestionCountDraft: (count: number) => void;
  onSaveQuestionCount: () => void;
  onSaveVisualStyle: (style: QuizImageStyle | "mixed") => void;
  onSaveThinkingBarStyle: (style: QuizThinkingBarStyle) => void;
};

const QUESTION_PRESETS = [4, 6, 8, 10, 12, 15, 20];

export function EpisodeQuizCustomizationBar({
  channel,
  episode,
  activeEpisodeTask,
  busy,
  questionCountDraft,
  setQuestionCountDraft,
  onSaveQuestionCount,
  onSaveVisualStyle,
  onSaveThinkingBarStyle,
}: Props) {
  const [openDropdown, setOpenDropdown] = useState<"questions" | "visualStyle" | "thinkingBar" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const channelStyles =
    channel.selected_styles && channel.selected_styles.length > 0
      ? channel.selected_styles
      : ALL_QUIZ_IMAGE_STYLES;

  const currentVisualStyle = episode.quiz_config?.visual_style ?? "mixed";
  const [hoveredStyle, setHoveredStyle] = useState<QuizImageStyle>(
    currentVisualStyle === "mixed" ? (channelStyles[0] || "pixar_3d") : currentVisualStyle
  );

  const currentThinkingBar = (episode.quiz_config?.thinking_bar_style as QuizThinkingBarStyle) || "auto";
  const channelDefaultThinkingBar = (channel.default_thinking_bar_style as QuizThinkingBarStyle) || "star_slider";
  const resolvedThinkingBar = currentThinkingBar === "auto" ? channelDefaultThinkingBar : currentThinkingBar;
  const [hoveredThinkingBar, setHoveredThinkingBar] = useState<Exclude<QuizThinkingBarStyle, "auto">>(
    resolvedThinkingBar === "auto" ? "star_slider" : resolvedThinkingBar
  );

  const isControlsDisabled = Boolean(activeEpisodeTask) || busy !== null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  const toggleDropdown = (name: "questions" | "visualStyle" | "thinkingBar") => {
    if (isControlsDisabled) return;
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  const handleSelectPresetCount = (count: number) => {
    setQuestionCountDraft(count);
    setTimeout(() => {
      onSaveQuestionCount();
      setOpenDropdown(null);
    }, 50);
  };

  return (
    <section className="episode-customization-bar" ref={containerRef}>
      <div className="customization-bar-header">
        <div className="customization-bar-title">
          <SlidersHorizontal size={16} weight="bold" />
          <span>Production Customization</span>
        </div>
        <small className="customization-bar-hint">Configure visuals, timing & length before building video</small>
      </div>

      <div className="customization-button-group">
        {/* 1. Question Count Dropdown */}
        <div className="customization-dropdown-item">
          <button
            type="button"
            className={`customization-pill-btn ${openDropdown === "questions" ? "is-active" : ""}`}
            disabled={isControlsDisabled}
            onClick={() => toggleDropdown("questions")}
            title="Configure number of questions in this episode"
          >
            <div className="pill-btn-icon-wrap icon-hash">
              <Hash size={14} weight="bold" />
            </div>
            <div className="pill-btn-text">
              <span className="pill-label">Questions</span>
              <strong className="pill-value">{questionCountDraft} Questions</strong>
            </div>
            <CaretDown size={12} className="pill-caret" />
          </button>

          {openDropdown === "questions" ? (
            <div className="visual-styles-popover customization-popover-sm">
              <div className="popover-header">
                <strong>🔢 Question Count</strong>
                <small>Select a quick preset or type custom number</small>
              </div>
              <div className="preset-count-grid">
                {QUESTION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`preset-count-btn ${questionCountDraft === preset ? "is-active" : ""}`}
                    onClick={() => handleSelectPresetCount(preset)}
                  >
                    <span>{preset}</span>
                    {questionCountDraft === preset ? <Check size={12} weight="bold" /> : null}
                  </button>
                ))}
              </div>
              <div className="custom-count-input-row">
                <span>Custom:</span>
                <input
                  type="number"
                  min={QUIZ_MIN_QUESTION_COUNT}
                  max={QUIZ_MAX_QUESTION_COUNT}
                  value={questionCountDraft}
                  onChange={(e) => setQuestionCountDraft(Number(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onSaveQuestionCount();
                      setOpenDropdown(null);
                    }
                  }}
                  className="custom-count-input"
                />
                <button
                  type="button"
                  className="primary-button compact"
                  onClick={() => {
                    onSaveQuestionCount();
                    setOpenDropdown(null);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* 2. Visual Image Style Dropdown */}
        <div className="customization-dropdown-item">
          <button
            type="button"
            className={`customization-pill-btn ${openDropdown === "visualStyle" ? "is-active" : ""}`}
            disabled={isControlsDisabled}
            onClick={() => toggleDropdown("visualStyle")}
            title="Configure illustration visual style for AI image generation"
          >
            <div className="pill-btn-icon-wrap icon-palette">
              <Palette size={14} weight="bold" />
            </div>
            <div className="pill-btn-text">
              <span className="pill-label">Art Style</span>
              <strong className="pill-value">
                {currentVisualStyle === "mixed"
                  ? "🎲 Mixed (Random)"
                  : QUIZ_IMAGE_STYLE_LABELS[currentVisualStyle] || currentVisualStyle}
              </strong>
            </div>
            <CaretDown size={12} className="pill-caret" />
          </button>

          {openDropdown === "visualStyle" ? (
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
                      onClick={() => {
                        onSaveVisualStyle("mixed");
                        setOpenDropdown(null);
                      }}
                    >
                      <input
                        type="radio"
                        name="visual_style_choice"
                        checked={currentVisualStyle === "mixed"}
                        onChange={() => {
                          onSaveVisualStyle("mixed");
                          setOpenDropdown(null);
                        }}
                      />
                      <span className="style-label">🎲 Mixed (Random from Channel)</span>
                    </label>

                    {channelStyles.map((style) => {
                      const isChecked = currentVisualStyle === style;
                      const isHovered = hoveredStyle === style;
                      return (
                        <label
                          key={style}
                          className={`style-checkbox-item ${isChecked ? "is-checked" : ""} ${
                            isHovered ? "is-hovered" : ""
                          }`}
                          onMouseEnter={() => setHoveredStyle(style)}
                          onClick={() => {
                            onSaveVisualStyle(style);
                            setOpenDropdown(null);
                          }}
                        >
                          <input
                            type="radio"
                            name="visual_style_choice"
                            checked={isChecked}
                            onChange={() => {
                              onSaveVisualStyle(style);
                              setOpenDropdown(null);
                            }}
                          />
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

        {/* 3. Thinking Bar Style Dropdown */}
        <div className="customization-dropdown-item">
          <button
            type="button"
            className={`customization-pill-btn ${openDropdown === "thinkingBar" ? "is-active" : ""}`}
            disabled={isControlsDisabled}
            onClick={() => toggleDropdown("thinkingBar")}
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

          {openDropdown === "thinkingBar" ? (
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
                      onMouseEnter={() =>
                        setHoveredThinkingBar(
                          resolvedThinkingBar === "auto" ? "star_slider" : resolvedThinkingBar
                        )
                      }
                      onClick={() => {
                        onSaveThinkingBarStyle("auto");
                        setOpenDropdown(null);
                      }}
                    >
                      <input
                        type="radio"
                        name="thinking_bar_choice"
                        checked={currentThinkingBar === "auto"}
                        onChange={() => {
                          onSaveThinkingBarStyle("auto");
                          setOpenDropdown(null);
                        }}
                      />
                      <span style={{ marginRight: "6px" }}>⚙️</span>
                      <span className="style-label">Channel Default</span>
                    </label>

                    {ALL_THINKING_BAR_STYLES.map((style) => {
                      if (style === "auto") return null;
                      const isChecked = currentThinkingBar === style;
                      const isHovered = hoveredThinkingBar === style;
                      const icon = THINKING_BAR_ICONS[style];
                      const label = THINKING_BAR_STYLE_LABELS[style];
                      return (
                        <label
                          key={style}
                          className={`style-checkbox-item ${isChecked ? "is-checked" : ""} ${
                            isHovered ? "is-hovered" : ""
                          }`}
                          onMouseEnter={() => setHoveredThinkingBar(style)}
                          onClick={() => {
                            onSaveThinkingBarStyle(style);
                            setOpenDropdown(null);
                          }}
                        >
                          <input
                            type="radio"
                            name="thinking_bar_choice"
                            checked={isChecked}
                            onChange={() => {
                              onSaveThinkingBarStyle(style);
                              setOpenDropdown(null);
                            }}
                          />
                          <span style={{ marginRight: "6px" }}>{icon}</span>
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
                        background: "rgba(15, 23, 42, 0.75)",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "10px",
                        }}
                      >
                        <span style={{ fontSize: "28px" }}>{THINKING_BAR_ICONS[hoveredThinkingBar]}</span>
                        <strong style={{ fontSize: "16px", color: "#FFF" }}>
                          {THINKING_BAR_STYLE_LABELS[hoveredThinkingBar]}
                        </strong>
                      </div>
                      <p
                        style={{
                          margin: "0 0 14px 0",
                          fontSize: "13px",
                          lineHeight: "1.45",
                          color: "rgba(255,255,255,0.75)",
                        }}
                      >
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
      </div>
    </section>
  );
}

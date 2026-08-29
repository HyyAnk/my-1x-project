import { useState } from "react";
import { Check, Palette, Timer } from "@phosphor-icons/react";
import {
  ALL_QUIZ_IMAGE_STYLES,
  ALL_THINKING_BAR_STYLES,
  QUIZ_IMAGE_STYLE_LABELS,
  THINKING_BAR_STYLE_LABELS,
  type Channel,
  type QuizImageStyle,
  type QuizThinkingBarStyle,
} from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";

const THINKING_BAR_ICONS: Record<Exclude<QuizThinkingBarStyle, "auto">, string> = {
  star_slider: "⭐",
  capsule_liquid: "🧪",
  energy_laser: "⚡",
  retro_pixel: "👾",
  flame_fuse: "🔥",
  minimal_glow: "✨",
};

type ChannelVisualIdentityCardProps = {
  channel: Channel;
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function ChannelVisualIdentityCard({ channel, onRefresh, onNotice }: ChannelVisualIdentityCardProps) {
  const { t } = useTranslation();
  const initialStyles = channel.selected_styles && channel.selected_styles.length > 0 ? channel.selected_styles : ALL_QUIZ_IMAGE_STYLES;
  const [selectedStyles, setSelectedStyles] = useState<QuizImageStyle[]>(initialStyles);

  const currentTimer = channel.default_thinking_bar_style || "star_slider";
  const [selectedTimer, setSelectedTimer] = useState<QuizThinkingBarStyle>(currentTimer);

  const toggleStyle = async (style: QuizImageStyle) => {
    let next: QuizImageStyle[];
    if (selectedStyles.includes(style)) {
      if (selectedStyles.length <= 1) {
        onNotice({ tone: "bad", message: "Channel must have at least 1 visual style enabled" });
        return;
      }
      next = selectedStyles.filter((s) => s !== style);
    } else {
      next = [...selectedStyles, style];
    }

    setSelectedStyles(next);
    try {
      await api.updateChannel(channel.channel_id, { selected_styles: next });
      await onRefresh();
      onNotice({ tone: "good", message: `Updated: ${next.length} visual styles active` });
    } catch (err) {
      setSelectedStyles(selectedStyles);
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to update visual styles" });
    }
  };

  const handleTimerChange = async (style: QuizThinkingBarStyle) => {
    setSelectedTimer(style);
    try {
      await api.updateChannel(channel.channel_id, { default_thinking_bar_style: style });
      await onRefresh();
      onNotice({
        tone: "good",
        message: `Thinking bar style set to: ${style === "auto" ? "Auto" : THINKING_BAR_STYLE_LABELS[style]}`,
      });
    } catch (err) {
      setSelectedTimer(currentTimer);
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to update timer style" });
    }
  };

  return (
    <div className="panel channel-identity-card">
      <div className="panel-heading">
        <div>
          <h2>{t("channelDetail.visualIdentityTitle")}</h2>
        </div>
        <div className="panel-actions">
          <span className="visual-styles-count-badge">
            <Palette size={14} />
            <span>
              {t("channelDetail.activeStylesCount", {
                active: selectedStyles.length,
                total: ALL_QUIZ_IMAGE_STYLES.length,
              })}
            </span>
          </span>
        </div>
      </div>

      <div className="channel-identity-card-body">
        {/* Visual Styles Section (Clean Thumbnail Chips) */}
        <div className="visual-styles-chips-list">
          {ALL_QUIZ_IMAGE_STYLES.map((style) => {
            const isChecked = selectedStyles.includes(style);
            return (
              <button
                key={style}
                type="button"
                className={`visual-style-toggle-card ${isChecked ? "is-selected" : ""}`}
                onClick={() => void toggleStyle(style)}
              >
                <div className="style-toggle-thumb-wrap">
                  <img src={`/style-previews/${style}.png`} alt={QUIZ_IMAGE_STYLE_LABELS[style]} className="style-toggle-thumb" />
                  {isChecked ? (
                    <span className="style-toggle-check">
                      <Check size={12} weight="bold" />
                    </span>
                  ) : null}
                </div>
                <div className="style-toggle-meta">
                  <span className="style-toggle-title">{QUIZ_IMAGE_STYLE_LABELS[style]}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Thinking Bar Timer Style Row */}
        <div className="channel-timer-setting-row">
          <div className="timer-setting-label">
            <Timer size={16} style={{ color: "var(--accent)" }} />
            <strong>{t("channelDetail.thinkingBarStyle")}</strong>
          </div>

          <div className="timer-setting-select-wrap">
            <select
              value={selectedTimer}
              className="timer-select-control"
              onChange={(e) => void handleTimerChange(e.target.value as QuizThinkingBarStyle)}
            >
              {ALL_THINKING_BAR_STYLES.map((style) => {
                if (style === "auto") return null;
                return (
                  <option key={style} value={style}>
                    {THINKING_BAR_ICONS[style]} {THINKING_BAR_STYLE_LABELS[style]}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

import { ALL_THINKING_BAR_STYLES, THINKING_BAR_STYLE_LABELS, type Channel, type Episode, type QuizThinkingBarStyle } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { resolveThinkingBarStyle } from "../../utils/quizStyleResolution";
import type { EpisodePreviewCandidate } from "../../hooks/useEpisodeStylePreview";
import { CustomizationPill } from "./CustomizationPill";
import { CustomizationPopover } from "./CustomizationPopover";
import { StyleOptionRow } from "./StyleOptionRow";
import { useStyleCatalogOptions } from "./useStyleCatalogOptions";

type Props = {
  channel: Channel;
  episode: Episode;
  disabled: boolean;
  saving: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelectStyle: (style: QuizThinkingBarStyle) => void;
  onPreview?: (candidate: EpisodePreviewCandidate | null) => void;
};

export function ThinkingBarDropdown({ channel, episode, disabled, saving, isOpen, onToggle, onSelectStyle, onPreview }: Props) {
  const { t } = useTranslation();
  const currentThinkingBar = episode.quiz_config?.thinking_bar_style || "auto";
  const resolvedThinkingBar = resolveThinkingBarStyle(channel, episode.quiz_config);
  const activeStyle = currentThinkingBar === "auto" ? resolvedThinkingBar : currentThinkingBar;
  const styleOptions = useStyleCatalogOptions("thinking-bar", ALL_THINKING_BAR_STYLES);

  const getStyleLabel = (style: string): string => {
    const key = `episodeCustomization.thinking_bar_${style}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return THINKING_BAR_STYLE_LABELS[style] ?? style;
  };

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label={t("episodeCustomization.pillThinkingBar")}
        value={getStyleLabel(activeStyle)}
        isOpen={isOpen}
        disabled={disabled}
        saving={saving}
        onToggle={onToggle}
      />
      {isOpen ? (
        <CustomizationPopover title={t("episodeCustomization.pillThinkingBar")}>
          {["auto", ...styleOptions].map((style) => {
            if (style === "auto") return null;
            const label = getStyleLabel(style);
            return (
              <StyleOptionRow
                key={style}
                name="timer_choice"
                label={label}
                checked={activeStyle === style}
                onSelect={() => onSelectStyle(style)}
                onHover={() =>
                  onPreview?.({
                    override: { thinkingBarStyle: style },
                    label,
                  })
                }
              />
            );
          })}
        </CustomizationPopover>
      ) : null}
    </div>
  );
}

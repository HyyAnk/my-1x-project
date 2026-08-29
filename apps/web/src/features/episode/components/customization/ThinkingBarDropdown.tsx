import { ALL_THINKING_BAR_STYLES, THINKING_BAR_STYLE_LABELS, type Channel, type Episode, type QuizThinkingBarStyle } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { resolveThinkingBarStyle } from "../../utils/quizStyleResolution";
import type { EpisodePreviewCandidate } from "../../hooks/useEpisodeStylePreview";
import { CustomizationPill } from "./CustomizationPill";
import { CustomizationPopover } from "./CustomizationPopover";
import { StyleOptionRow } from "./StyleOptionRow";

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
  const defaultLabel = t("episodeCustomization.valueChannelDefault", { name: THINKING_BAR_STYLE_LABELS[resolvedThinkingBar] });

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label={t("episodeCustomization.pillThinkingBar")}
        value={currentThinkingBar === "auto" ? defaultLabel : THINKING_BAR_STYLE_LABELS[currentThinkingBar]}
        isOpen={isOpen}
        disabled={disabled}
        saving={saving}
        onToggle={onToggle}
      />
      {isOpen ? (
        <CustomizationPopover title={t("episodeCustomization.pillThinkingBar")}>
          <StyleOptionRow
            name="timer_choice"
            label={defaultLabel}
            checked={currentThinkingBar === "auto"}
            onSelect={() => onSelectStyle("auto")}
            onHover={() => onPreview?.({ override: {}, label: defaultLabel })}
          />
          {ALL_THINKING_BAR_STYLES.map((style) => {
            if (style === "auto") return null;
            return (
              <StyleOptionRow
                key={style}
                name="timer_choice"
                label={THINKING_BAR_STYLE_LABELS[style]}
                checked={currentThinkingBar === style}
                onSelect={() => onSelectStyle(style)}
                onHover={() => onPreview?.({ override: { thinkingBarStyle: style }, label: THINKING_BAR_STYLE_LABELS[style] })}
              />
            );
          })}
        </CustomizationPopover>
      ) : null}
    </div>
  );
}

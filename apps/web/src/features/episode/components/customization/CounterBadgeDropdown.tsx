import {
  ALL_QUESTION_COUNTER_STYLES,
  QUESTION_COUNTER_STYLE_LABELS,
  type Channel,
  type Episode,
  type QuizQuestionCounterStyle,
} from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { resolveCounterStyle } from "../../utils/quizStyleResolution";
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
  onSelectStyle: (style: QuizQuestionCounterStyle) => void;
  onPreview?: (candidate: EpisodePreviewCandidate | null) => void;
};

export function CounterBadgeDropdown({ channel, episode, disabled, saving, isOpen, onToggle, onSelectStyle, onPreview }: Props) {
  const { t } = useTranslation();
  const currentCounter = episode.quiz_config?.question_counter_style || "auto";
  const resolvedCounter = resolveCounterStyle(channel, episode.quiz_config);
  const activeStyle = currentCounter === "auto" ? resolvedCounter : currentCounter;
  const styleOptions = useStyleCatalogOptions("counter", ALL_QUESTION_COUNTER_STYLES);

  const getStyleLabel = (style: string): string => {
    const key = `episodeCustomization.counter_${style}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return QUESTION_COUNTER_STYLE_LABELS[style] ?? style;
  };

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label={t("episodeCustomization.pillCounterBadge")}
        value={getStyleLabel(activeStyle)}
        isOpen={isOpen}
        disabled={disabled}
        saving={saving}
        onToggle={onToggle}
      />
      {isOpen ? (
        <CustomizationPopover title={t("episodeCustomization.pillCounterBadge")}>
          {["auto", ...styleOptions].map((style) => {
            if (style === "auto") return null;
            const label = getStyleLabel(style);
            return (
              <StyleOptionRow
                key={style}
                name="counter_choice"
                label={label}
                checked={activeStyle === style}
                onSelect={() => onSelectStyle(style)}
                onHover={() =>
                  onPreview?.({
                    override: { counterStyle: style },
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

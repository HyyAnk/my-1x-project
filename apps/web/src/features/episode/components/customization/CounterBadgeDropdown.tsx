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

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label={t("episodeCustomization.pillCounterBadge")}
        value={QUESTION_COUNTER_STYLE_LABELS[activeStyle]}
        isOpen={isOpen}
        disabled={disabled}
        saving={saving}
        onToggle={onToggle}
      />
      {isOpen ? (
        <CustomizationPopover title={t("episodeCustomization.pillCounterBadge")}>
          {["auto", ...styleOptions].map((style) => {
            if (style === "auto") return null;
            return (
              <StyleOptionRow
                key={style}
                name="counter_choice"
                label={QUESTION_COUNTER_STYLE_LABELS[style as keyof typeof QUESTION_COUNTER_STYLE_LABELS] ?? style}
                checked={activeStyle === style}
                onSelect={() => onSelectStyle(style)}
                onHover={() =>
                  onPreview?.({
                    override: { counterStyle: style },
                    label: QUESTION_COUNTER_STYLE_LABELS[style as keyof typeof QUESTION_COUNTER_STYLE_LABELS] ?? style,
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

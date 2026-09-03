import { ALL_ANSWER_CARD_STYLES, ANSWER_CARD_STYLE_LABELS, type Channel, type Episode, type QuizAnswerCardStyle } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { resolveAnswerCardStyle } from "../../utils/quizStyleResolution";
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
  onSelectStyle: (style: QuizAnswerCardStyle) => void;
  onPreview?: (candidate: EpisodePreviewCandidate | null) => void;
};

export function AnswerCardDropdown({ channel, episode, disabled, saving, isOpen, onToggle, onSelectStyle, onPreview }: Props) {
  const { t } = useTranslation();
  const currentCardStyle = episode.quiz_config?.answer_card_style || "auto";
  const resolvedCardStyle = resolveAnswerCardStyle(channel, episode.quiz_config);
  const activeStyle = currentCardStyle === "auto" ? resolvedCardStyle : currentCardStyle;
  const styleOptions = useStyleCatalogOptions("answer-card", ALL_ANSWER_CARD_STYLES);

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label={t("episodeCustomization.pillAnswerCards")}
        value={ANSWER_CARD_STYLE_LABELS[activeStyle as keyof typeof ANSWER_CARD_STYLE_LABELS] ?? activeStyle}
        isOpen={isOpen}
        disabled={disabled}
        saving={saving}
        onToggle={onToggle}
      />
      {isOpen ? (
        <CustomizationPopover title={t("episodeCustomization.pillAnswerCards")}>
          {["auto", ...styleOptions].map((style) => {
            if (style === "auto") return null;
            return (
              <StyleOptionRow
                key={style}
                name="card_choice"
                label={ANSWER_CARD_STYLE_LABELS[style as keyof typeof ANSWER_CARD_STYLE_LABELS] ?? style}
                checked={activeStyle === style}
                onSelect={() => onSelectStyle(style)}
                onHover={() =>
                  onPreview?.({
                    override: { answerCardStyle: style },
                    label: ANSWER_CARD_STYLE_LABELS[style as keyof typeof ANSWER_CARD_STYLE_LABELS] ?? style,
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

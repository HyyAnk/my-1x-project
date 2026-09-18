import { ALL_QUESTION_BOX_STYLES, QUESTION_BOX_STYLE_LABELS, type Channel, type Episode, type QuizQuestionBoxStyle } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { resolveQuestionBoxStyle } from "../../utils/quizStyleResolution";
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
  onSelectStyle: (style: QuizQuestionBoxStyle) => void;
  onPreview?: (candidate: EpisodePreviewCandidate | null) => void;
};

export function QuestionBoxDropdown({ channel, episode, disabled, saving, isOpen, onToggle, onSelectStyle, onPreview }: Props) {
  const { t } = useTranslation();
  const currentBoxStyle = episode.quiz_config?.question_box_style || "auto";
  const resolvedBoxStyle = resolveQuestionBoxStyle(channel, episode.quiz_config);
  const activeStyle = currentBoxStyle === "auto" ? resolvedBoxStyle : currentBoxStyle;
  const styleOptions = useStyleCatalogOptions("question-box", ALL_QUESTION_BOX_STYLES);

  const getStyleLabel = (style: string): string => {
    const key = `episodeCustomization.question_box_${style}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return QUESTION_BOX_STYLE_LABELS[style] ?? style;
  };

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label={t("episodeCustomization.pillQuestionCard")}
        value={getStyleLabel(activeStyle)}
        isOpen={isOpen}
        disabled={disabled}
        saving={saving}
        onToggle={onToggle}
      />
      {isOpen ? (
        <CustomizationPopover title={t("episodeCustomization.pillQuestionCard")}>
          {["auto", ...styleOptions].map((style) => {
            if (style === "auto") return null;
            const label = getStyleLabel(style);
            return (
              <StyleOptionRow
                key={style}
                name="box_choice"
                label={label}
                checked={activeStyle === style}
                onSelect={() => onSelectStyle(style)}
                onHover={() =>
                  onPreview?.({
                    override: { questionBoxStyle: style },
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

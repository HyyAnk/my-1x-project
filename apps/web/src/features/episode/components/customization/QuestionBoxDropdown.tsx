import { ALL_QUESTION_BOX_STYLES, QUESTION_BOX_STYLE_LABELS, type Channel, type Episode, type QuizQuestionBoxStyle } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { resolveQuestionBoxStyle } from "../../utils/quizStyleResolution";
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
  onSelectStyle: (style: QuizQuestionBoxStyle) => void;
  onPreview?: (candidate: EpisodePreviewCandidate | null) => void;
};

export function QuestionBoxDropdown({ channel, episode, disabled, saving, isOpen, onToggle, onSelectStyle, onPreview }: Props) {
  const { t } = useTranslation();
  const currentBoxStyle = episode.quiz_config?.question_box_style || "auto";
  const resolvedBoxStyle = resolveQuestionBoxStyle(channel, episode.quiz_config);
  const activeStyle = currentBoxStyle === "auto" ? resolvedBoxStyle : currentBoxStyle;

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label={t("episodeCustomization.pillQuestionCard")}
        value={QUESTION_BOX_STYLE_LABELS[activeStyle]}
        isOpen={isOpen}
        disabled={disabled}
        saving={saving}
        onToggle={onToggle}
      />
      {isOpen ? (
        <CustomizationPopover title={t("episodeCustomization.pillQuestionCard")}>
          {ALL_QUESTION_BOX_STYLES.map((style) => {
            if (style === "auto") return null;
            return (
              <StyleOptionRow
                key={style}
                name="box_choice"
                label={QUESTION_BOX_STYLE_LABELS[style]}
                checked={activeStyle === style}
                onSelect={() => onSelectStyle(style)}
                onHover={() => onPreview?.({ override: { questionBoxStyle: style }, label: QUESTION_BOX_STYLE_LABELS[style] })}
              />
            );
          })}
        </CustomizationPopover>
      ) : null}
    </div>
  );
}

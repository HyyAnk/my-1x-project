import { ALL_QUIZ_IMAGE_STYLES, QUIZ_IMAGE_STYLE_LABELS, type Channel, type Episode, type QuizImageStyle } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
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
  onSelectStyle: (style: QuizImageStyle | "mixed") => void;
};

export function ArtStyleDropdown({ channel, episode, disabled, saving, isOpen, onToggle, onSelectStyle }: Props) {
  const { t } = useTranslation();
  const channelStyles = channel.selected_styles && channel.selected_styles.length > 0 ? channel.selected_styles : ALL_QUIZ_IMAGE_STYLES;
  const currentVisualStyle = episode.quiz_config?.visual_style ?? "mixed";

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label={t("episodeCustomization.pillArtStyle")}
        value={currentVisualStyle === "mixed" ? t("episodeCustomization.valueMixed") : QUIZ_IMAGE_STYLE_LABELS[currentVisualStyle]}
        isOpen={isOpen}
        disabled={disabled}
        saving={saving}
        onToggle={onToggle}
      />
      {isOpen ? (
        <CustomizationPopover title={t("episodeCustomization.pillArtStyle")}>
          <StyleOptionRow
            name="visual_style_choice"
            label={t("episodeCustomization.valueMixed")}
            checked={currentVisualStyle === "mixed"}
            onSelect={() => onSelectStyle("mixed")}
          />
          {channelStyles.map((style) => (
            <StyleOptionRow
              key={style}
              name="visual_style_choice"
              label={QUIZ_IMAGE_STYLE_LABELS[style]}
              checked={currentVisualStyle === style}
              onSelect={() => onSelectStyle(style)}
              leading={<img className="style-option-thumb" src={`/style-previews/${style}.png`} alt="" loading="lazy" />}
            />
          ))}
        </CustomizationPopover>
      ) : null}
    </div>
  );
}

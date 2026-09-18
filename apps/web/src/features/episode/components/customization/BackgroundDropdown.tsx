import { ALL_BACKGROUND_STYLES, BACKGROUND_STYLE_LABELS, type Channel, type Episode, type QuizBackgroundStyle } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { resolveBackgroundStyle } from "../../utils/quizStyleResolution";
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
  onSelectStyle: (style: QuizBackgroundStyle) => void;
  onPreview?: (candidate: EpisodePreviewCandidate | null) => void;
};

export function BackgroundDropdown({ channel, episode, disabled, saving, isOpen, onToggle, onSelectStyle, onPreview }: Props) {
  const { t } = useTranslation();
  const currentBg = episode.quiz_config?.background_style || "auto";
  const resolvedBg = resolveBackgroundStyle(channel, episode.quiz_config);
  const activeStyle = currentBg === "auto" ? resolvedBg : currentBg;
  const styleOptions = useStyleCatalogOptions("background", ALL_BACKGROUND_STYLES);

  const getStyleLabel = (style: string): string => {
    const key = `episodeCustomization.background_${style}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return BACKGROUND_STYLE_LABELS[style] ?? style;
  };

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label={t("episodeCustomization.pillBackground")}
        value={getStyleLabel(activeStyle)}
        isOpen={isOpen}
        disabled={disabled}
        saving={saving}
        onToggle={onToggle}
      />
      {isOpen ? (
        <CustomizationPopover title={t("episodeCustomization.pillBackground")}>
          {["auto", ...styleOptions].map((style) => {
            if (style === "auto") return null;
            const label = getStyleLabel(style);
            return (
              <StyleOptionRow
                key={style}
                name="background_choice"
                label={label}
                checked={activeStyle === style}
                onSelect={() => onSelectStyle(style)}
                onHover={() =>
                  onPreview?.({
                    override: { backgroundStyle: style },
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

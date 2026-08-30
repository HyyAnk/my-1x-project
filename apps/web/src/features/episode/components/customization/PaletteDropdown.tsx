import {
  ALL_QUIZ_PALETTES,
  QUIZ_PALETTE_COLORS,
  QUIZ_PALETTE_LABELS,
  type Channel,
  type Episode,
  type QuizPaletteId,
} from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { resolvePaletteId } from "../../utils/quizStyleResolution";
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
  onSelectPalette: (palette: QuizPaletteId) => void;
  onPreview?: (candidate: EpisodePreviewCandidate | null) => void;
};

export function PaletteDropdown({ channel, episode, disabled, saving, isOpen, onToggle, onSelectPalette, onPreview }: Props) {
  const { t } = useTranslation();
  const currentPalette = episode.quiz_config?.palette_id || "auto";
  const resolvedPalette = resolvePaletteId(channel, episode.quiz_config);
  const activePalette = currentPalette === "auto" ? resolvedPalette : currentPalette;

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label={t("episodeCustomization.pillPalette")}
        value={QUIZ_PALETTE_LABELS[activePalette]}
        isOpen={isOpen}
        disabled={disabled}
        saving={saving}
        onToggle={onToggle}
      />
      {isOpen ? (
        <CustomizationPopover title={t("episodeCustomization.pillPalette")}>
          {ALL_QUIZ_PALETTES.map((palette) => {
            if (palette === "auto") return null;
            const colors = QUIZ_PALETTE_COLORS[palette];
            return (
              <StyleOptionRow
                key={palette}
                name="palette_choice"
                label={QUIZ_PALETTE_LABELS[palette]}
                checked={activePalette === palette}
                onSelect={() => onSelectPalette(palette)}
                onHover={() => onPreview?.({ override: { paletteId: palette }, label: QUIZ_PALETTE_LABELS[palette] })}
                leading={
                  <span
                    className="style-option-swatch"
                    style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
                  />
                }
              />
            );
          })}
        </CustomizationPopover>
      ) : null}
    </div>
  );
}

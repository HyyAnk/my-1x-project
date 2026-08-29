import { BUILT_IN_PRESETS, matchVisualPreset, type Episode, type VisualPresetItem } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import type { EpisodePreviewCandidate } from "../../hooks/useEpisodeStylePreview";
import { CustomizationPill } from "./CustomizationPill";
import { CustomizationPopover } from "./CustomizationPopover";
import { StyleOptionRow } from "./StyleOptionRow";

type Props = {
  episode: Episode;
  disabled: boolean;
  saving: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelectPreset: (preset: VisualPresetItem) => void;
  onPreview?: (candidate: EpisodePreviewCandidate | null) => void;
};

export function PresetPickerDropdown({ episode, disabled, saving, isOpen, onToggle, onSelectPreset, onPreview }: Props) {
  const { t } = useTranslation();

  const matchedPreset = matchVisualPreset({
    palette_id: episode.quiz_config?.palette_id,
    question_box_style: episode.quiz_config?.question_box_style,
    answer_card_style: episode.quiz_config?.answer_card_style,
    counter_style: episode.quiz_config?.question_counter_style,
    thinking_bar_style: episode.quiz_config?.thinking_bar_style,
  });
  const activePreset =
    episode.quiz_config?.style_preset_id && !["auto", "custom"].includes(episode.quiz_config.style_preset_id)
      ? BUILT_IN_PRESETS.find((preset) => preset.id === episode.quiz_config?.style_preset_id) || matchedPreset
      : matchedPreset;
  const currentValue =
    episode.quiz_config?.style_preset_id === "custom"
      ? t("episodeCustomization.valueCustomKit")
      : activePreset
        ? t(activePreset.nameKey || "") || activePreset.name
        : t("episodeCustomization.valueChannelKit");

  const previewCandidateFor = (preset: VisualPresetItem): EpisodePreviewCandidate => ({
    override: {
      theme: preset.theme,
      paletteId: preset.palette_id,
      thinkingBarStyle: preset.thinking_bar_style,
      questionBoxStyle: preset.question_box_style,
      answerCardStyle: preset.answer_card_style,
      counterStyle: preset.counter_style,
    },
    label: t(preset.nameKey || "") || preset.name,
  });

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label={t("episodeCustomization.pillPreset")}
        value={currentValue}
        isOpen={isOpen}
        disabled={disabled}
        saving={saving}
        onToggle={onToggle}
      />
      {isOpen ? (
        <CustomizationPopover title={t("episodeCustomization.pillPreset")}>
          {BUILT_IN_PRESETS.map((preset) => (
            <StyleOptionRow
              key={preset.id}
              name="preset_choice"
              label={t(preset.nameKey || "") || preset.name}
              checked={activePreset?.id === preset.id}
              onSelect={() => onSelectPreset(preset)}
              onHover={() => onPreview?.(previewCandidateFor(preset))}
              leading={<span className="style-option-emoji">{preset.icon}</span>}
            />
          ))}
        </CustomizationPopover>
      ) : null}
    </div>
  );
}

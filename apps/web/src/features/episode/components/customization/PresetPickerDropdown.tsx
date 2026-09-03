import { BUILT_IN_PRESETS, matchVisualPreset, type Episode, type StylePreset, type VisualPresetItem } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import type { EpisodePreviewCandidate } from "../../hooks/useEpisodeStylePreview";
import { CustomizationPill } from "./CustomizationPill";
import { CustomizationPopover } from "./CustomizationPopover";
import { StyleOptionRow } from "./StyleOptionRow";
import { useStylePresets } from "../../../stylePresets/hooks/useStylePresets";

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
  const { presets: savedPresets } = useStylePresets();
  const toVisualPreset = (preset: StylePreset): VisualPresetItem => ({
    ...preset,
    theme: (preset.theme as VisualPresetItem["theme"]) || "candy_arcade",
    palette_id: preset.palette_id as VisualPresetItem["palette_id"],
    thinking_bar_style: preset.thinking_bar_style as VisualPresetItem["thinking_bar_style"],
    question_box_style: preset.question_box_style as VisualPresetItem["question_box_style"],
    answer_card_style: preset.answer_card_style as VisualPresetItem["answer_card_style"],
    counter_style: preset.counter_style as VisualPresetItem["counter_style"],
    background_style: preset.background_style as VisualPresetItem["background_style"],
    preview_layout_id: preset.preview_layout_id as VisualPresetItem["preview_layout_id"],
    isBuiltIn: false,
  });
  const allPresets: VisualPresetItem[] = [...BUILT_IN_PRESETS, ...savedPresets.map(toVisualPreset)];

  const matchedPreset = matchVisualPreset({
    palette_id: episode.quiz_config?.palette_id,
    question_box_style: episode.quiz_config?.question_box_style,
    answer_card_style: episode.quiz_config?.answer_card_style,
    counter_style: episode.quiz_config?.question_counter_style,
    thinking_bar_style: episode.quiz_config?.thinking_bar_style,
  });
  const activePreset =
    episode.quiz_config?.style_preset_id && !["auto", "custom"].includes(episode.quiz_config.style_preset_id)
      ? allPresets.find((preset) => preset.id === episode.quiz_config?.style_preset_id) || matchedPreset
      : matchedPreset;
  const currentValue =
    episode.quiz_config?.style_preset_id === "custom"
      ? t("episodeCustomization.valueCustomKit")
      : activePreset
        ? t(activePreset.nameKey || "") || activePreset.name
        : t(allPresets[0].nameKey || "") || allPresets[0].name;

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
          {allPresets.map((preset) => (
            <StyleOptionRow
              key={preset.id}
              name="preset_choice"
              label={t(preset.nameKey || "") || preset.name}
              checked={activePreset?.id === preset.id}
              onSelect={() => onSelectPreset(preset)}
              onHover={() => onPreview?.(previewCandidateFor(preset))}
            />
          ))}
        </CustomizationPopover>
      ) : null}
    </div>
  );
}

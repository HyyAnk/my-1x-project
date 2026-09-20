import type {
  Channel,
  Episode,
  IntroOutroSelection,
  MascotStyle,
  MascotStyleSelection,
  QuizImageStyle,
  QuizPaletteId,
  VisualPresetItem,
} from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import type { EpisodePreviewCandidate } from "../../hooks/useEpisodeStylePreview";
import { PresetPickerDropdown } from "./PresetPickerDropdown";
import { ArtStyleDropdown } from "./ArtStyleDropdown";
import { PaletteDropdown } from "./PaletteDropdown";
import { MascotStyleDropdown } from "./MascotStyleDropdown";
import { IntroOutroStyleDropdown } from "./IntroOutroStyleDropdown";
import type { EpisodeCustomizationDropdownName } from "./useEpisodeCustomizationDropdown";

export interface EpisodeCustomizationThemeSectionProps {
  channel: Channel;
  episode: Episode;
  isPipelineRunning: boolean;
  isSaving: (key: string) => boolean;
  openDropdown: EpisodeCustomizationDropdownName;
  toggleDropdown: (name: Exclude<EpisodeCustomizationDropdownName, null>) => void;
  closeDropdown: () => void;
  onApplyStylePreset: (preset: VisualPresetItem) => void;
  onSaveVisualStyle: (style: QuizImageStyle | "mixed") => void;
  onSavePaletteId: (palette: QuizPaletteId) => void;
  onPreview: (candidate: EpisodePreviewCandidate | null) => void;
  mascotStyleSelection?: MascotStyleSelection;
  onSaveMascotStyleSelection: (selection: MascotStyleSelection) => void;
  availableMascotStyles?: MascotStyle[];
  onSaveIntroOutroSelection: (selection: IntroOutroSelection) => void;
}

export function EpisodeCustomizationThemeSection({
  channel,
  episode,
  isPipelineRunning,
  isSaving,
  openDropdown,
  toggleDropdown,
  closeDropdown,
  onApplyStylePreset,
  onSaveVisualStyle,
  onSavePaletteId,
  onPreview,
  mascotStyleSelection,
  onSaveMascotStyleSelection,
  availableMascotStyles,
  onSaveIntroOutroSelection,
}: EpisodeCustomizationThemeSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="customization-section">
      <div className="customization-section-header">
        <span className="customization-section-title">{t("episodeCustomization.groupTheme")}</span>
      </div>
      <div className="customization-controls-row">
        <PresetPickerDropdown
          episode={episode}
          disabled={isPipelineRunning}
          saving={isSaving("style-preset")}
          isOpen={openDropdown === "preset"}
          onToggle={() => toggleDropdown("preset")}
          onSelectPreset={(preset) => {
            onApplyStylePreset(preset);
            closeDropdown();
          }}
          onPreview={onPreview}
        />
        <ArtStyleDropdown
          channel={channel}
          episode={episode}
          disabled={isPipelineRunning}
          saving={isSaving("visual-style")}
          isOpen={openDropdown === "visualStyle"}
          onToggle={() => toggleDropdown("visualStyle")}
          onSelectStyle={(style) => {
            onSaveVisualStyle(style);
            closeDropdown();
          }}
        />
        <PaletteDropdown
          channel={channel}
          episode={episode}
          disabled={isPipelineRunning}
          saving={isSaving("palette-id")}
          isOpen={openDropdown === "palette"}
          onToggle={() => toggleDropdown("palette")}
          onSelectPalette={(palette) => {
            onSavePaletteId(palette);
            closeDropdown();
          }}
          onPreview={onPreview}
        />
        <MascotStyleDropdown
          channel={channel}
          episode={episode}
          disabled={isPipelineRunning}
          saving={isSaving("mascot-style")}
          isOpen={openDropdown === "mascotStyle"}
          onToggle={() => toggleDropdown("mascotStyle")}
          mascotStyleSelection={mascotStyleSelection}
          availableMascotStyles={availableMascotStyles}
          onSaveMascotStyleSelection={(selection) => {
            onSaveMascotStyleSelection(selection);
            closeDropdown();
          }}
        />
        <IntroOutroStyleDropdown
          channel={channel}
          episode={episode}
          disabled={isPipelineRunning}
          saving={isSaving("intro-outro-style")}
          isOpen={openDropdown === "introOutroStyle"}
          onToggle={() => toggleDropdown("introOutroStyle")}
          onSaveIntroOutroSelection={(selection) => {
            onSaveIntroOutroSelection(selection);
            closeDropdown();
          }}
        />
      </div>
    </div>
  );
}

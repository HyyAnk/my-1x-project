import { useRef } from "react";
import { useTranslation } from "../../../i18n";
import { useEpisodeChannelBrandName } from "../hooks/useEpisodeChannelBrandName";
import { EpisodeStylePreview } from "./preview/EpisodeStylePreview";
import {
  EpisodeCustomizationContentSection,
  EpisodeCustomizationElementsSection,
  EpisodeCustomizationThemeSection,
  useEpisodeCustomizationDropdown,
  type EpisodeCustomizationDropdownName,
  type EpisodeQuizCustomizationBarProps,
} from "./customization";

export type { EpisodeCustomizationDropdownName, EpisodeQuizCustomizationBarProps };

export function EpisodeQuizCustomizationBar({
  channel,
  episode,
  quiz,
  directorPlan,
  activeEpisodeTask,
  busy,
  questionCountDraft,
  setQuestionCountDraft,
  onSaveQuestionCount,
  onSaveVisualStyle,
  onSaveThinkingBarStyle,
  onSaveQuestionBoxStyle,
  onSaveAnswerCardStyle,
  onSaveCounterStyle,
  onSaveBackgroundStyle,
  onSavePaletteId,
  onSaveAspectRatio,
  onSaveThumbnailRatio,
  onApplyStylePreset,
  setEpisode,
  onNotice,
}: EpisodeQuizCustomizationBarProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const isPipelineRunning = Boolean(activeEpisodeTask);

  const brandNameControl = useEpisodeChannelBrandName({
    channel,
    episode,
    setEpisode: setEpisode ?? (() => {}),
    onNotice: onNotice ?? (() => {}),
    disabled: isPipelineRunning,
  });

  const dropdown = useEpisodeCustomizationDropdown(containerRef, isPipelineRunning);
  const isSaving = (busyKey: string) => busy === busyKey;

  return (
    <section className="episode-customization-bar" ref={containerRef}>
      <div className="episode-customization-controls">
        <div className="customization-bar-header">
          <h2>{t("episodeCustomization.barTitle")}</h2>
        </div>

        <div className="customization-button-group">
          <EpisodeCustomizationContentSection
            episode={episode}
            isPipelineRunning={isPipelineRunning}
            isSaving={isSaving}
            openDropdown={dropdown.openDropdown}
            toggleDropdown={dropdown.toggleDropdown}
            closeDropdown={dropdown.closeDropdown}
            questionCountDraft={questionCountDraft}
            setQuestionCountDraft={setQuestionCountDraft}
            onSaveQuestionCount={onSaveQuestionCount}
            onPreview={dropdown.setCandidate}
            brandNameControl={brandNameControl}
            onSaveAspectRatio={onSaveAspectRatio}
            onSaveThumbnailRatio={onSaveThumbnailRatio}
          />

          <EpisodeCustomizationThemeSection
            channel={channel}
            episode={episode}
            isPipelineRunning={isPipelineRunning}
            isSaving={isSaving}
            openDropdown={dropdown.openDropdown}
            toggleDropdown={dropdown.toggleDropdown}
            closeDropdown={dropdown.closeDropdown}
            onApplyStylePreset={onApplyStylePreset}
            onSaveVisualStyle={onSaveVisualStyle}
            onSavePaletteId={onSavePaletteId}
            onPreview={dropdown.setCandidate}
          />

          <EpisodeCustomizationElementsSection
            channel={channel}
            episode={episode}
            isPipelineRunning={isPipelineRunning}
            isSaving={isSaving}
            openDropdown={dropdown.openDropdown}
            toggleDropdown={dropdown.toggleDropdown}
            closeDropdown={dropdown.closeDropdown}
            onSaveQuestionBoxStyle={onSaveQuestionBoxStyle}
            onSaveAnswerCardStyle={onSaveAnswerCardStyle}
            onSaveCounterStyle={onSaveCounterStyle}
            onSaveThinkingBarStyle={onSaveThinkingBarStyle}
            onSaveBackgroundStyle={onSaveBackgroundStyle}
            onPreview={dropdown.setCandidate}
          />
        </div>
      </div>

      <EpisodeStylePreview
        channel={channel}
        episode={episode}
        quiz={quiz}
        directorPlan={directorPlan}
        candidate={dropdown.candidate}
        channelBrandName={brandNameControl.draft}
      />
    </section>
  );
}

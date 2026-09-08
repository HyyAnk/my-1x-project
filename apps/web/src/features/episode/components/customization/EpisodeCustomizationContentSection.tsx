import type { Episode, ThumbnailRatioMode } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import type { EpisodePreviewCandidate } from "../../hooks/useEpisodeStylePreview";
import type { useEpisodeChannelBrandName } from "../../hooks/useEpisodeChannelBrandName";
import { QuestionCountDropdown } from "./QuestionCountDropdown";
import { ChannelBrandNameControl } from "./ChannelBrandNameControl";
import { ThumbnailRatioDropdown } from "./ThumbnailRatioDropdown";
import type { EpisodeCustomizationDropdownName } from "./useEpisodeCustomizationDropdown";

export interface EpisodeCustomizationContentSectionProps {
  episode: Episode;
  isPipelineRunning: boolean;
  isSaving: (key: string) => boolean;
  openDropdown: EpisodeCustomizationDropdownName;
  toggleDropdown: (name: Exclude<EpisodeCustomizationDropdownName, null>) => void;
  closeDropdown: () => void;
  questionCountDraft: number;
  setQuestionCountDraft: (count: number) => void;
  onSaveQuestionCount: (count: number) => void;
  onPreview: (candidate: EpisodePreviewCandidate | null) => void;
  brandNameControl: ReturnType<typeof useEpisodeChannelBrandName>;
  onSaveThumbnailRatio?: (ratio: ThumbnailRatioMode) => void;
}

export function EpisodeCustomizationContentSection({
  episode,
  isPipelineRunning,
  isSaving,
  openDropdown,
  toggleDropdown,
  closeDropdown,
  questionCountDraft,
  setQuestionCountDraft,
  onSaveQuestionCount,
  onPreview,
  brandNameControl,
  onSaveThumbnailRatio,
}: EpisodeCustomizationContentSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="customization-section">
      <div className="customization-section-header">
        <span className="customization-section-title">{t("episodeCustomization.groupContent")}</span>
      </div>
      <div className="customization-controls-row">
        <QuestionCountDropdown
          disabled={isPipelineRunning}
          saving={isSaving("question-count")}
          isOpen={openDropdown === "questions"}
          onToggle={() => toggleDropdown("questions")}
          onClose={closeDropdown}
          questionCountDraft={questionCountDraft}
          setQuestionCountDraft={setQuestionCountDraft}
          onSaveQuestionCount={onSaveQuestionCount}
          onPreview={onPreview}
        />
        <ChannelBrandNameControl
          value={brandNameControl.draft}
          onChange={brandNameControl.setDraft}
          onSave={brandNameControl.save}
          onRevert={brandNameControl.revert}
          onRetry={brandNameControl.retry}
          saving={brandNameControl.saving}
          error={brandNameControl.error}
          disabled={isPipelineRunning}
        />
        <ThumbnailRatioDropdown
          episode={episode}
          disabled={isPipelineRunning}
          saving={isSaving("thumbnailRatio")}
          isOpen={openDropdown === "thumbnailRatio"}
          onToggle={() => toggleDropdown("thumbnailRatio")}
          onSelectRatio={(ratio) => {
            onSaveThumbnailRatio?.(ratio);
            closeDropdown();
          }}
        />
      </div>
    </div>
  );
}

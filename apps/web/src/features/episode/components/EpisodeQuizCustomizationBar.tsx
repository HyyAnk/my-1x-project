import { useEffect, useRef, useState } from "react";
import type {
  Channel,
  DirectorPlan,
  Episode,
  QuizAnswerCardStyle,
  QuizBackgroundStyle,
  QuizImageStyle,
  QuizPaletteId,
  QuizQuestionBoxStyle,
  QuizQuestionCounterStyle,
  QuizThinkingBarStyle,
  QuizV2,
  Task,
  VisualPresetItem,
} from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { Notice } from "../../../components/types";
import type { EpisodePreviewCandidate } from "../hooks/useEpisodeStylePreview";
import { useEpisodeChannelBrandName } from "../hooks/useEpisodeChannelBrandName";
import { EpisodeStylePreview } from "./preview/EpisodeStylePreview";
import { PresetPickerDropdown } from "./customization/PresetPickerDropdown";
import { QuestionCountDropdown } from "./customization/QuestionCountDropdown";
import { ChannelBrandNameControl } from "./customization/ChannelBrandNameControl";
import { ArtStyleDropdown } from "./customization/ArtStyleDropdown";
import { QuestionBoxDropdown } from "./customization/QuestionBoxDropdown";
import { AnswerCardDropdown } from "./customization/AnswerCardDropdown";
import { CounterBadgeDropdown } from "./customization/CounterBadgeDropdown";
import { BackgroundDropdown } from "./customization/BackgroundDropdown";
import { ThinkingBarDropdown } from "./customization/ThinkingBarDropdown";
import { PaletteDropdown } from "./customization/PaletteDropdown";
import { ThumbnailRatioDropdown } from "./customization/ThumbnailRatioDropdown";
import type { ThumbnailRatioMode } from "@studio/shared";

export type EpisodeCustomizationDropdownName =
  | "preset"
  | "questions"
  | "visualStyle"
  | "questionBox"
  | "answerCard"
  | "counterBadge"
  | "background"
  | "thinkingBar"
  | "palette"
  | "thumbnailRatio"
  | null;

type Props = {
  channel: Channel;
  episode: Episode;
  quiz: QuizV2 | null;
  directorPlan: DirectorPlan | null;
  activeEpisodeTask: Task | null;
  busy: string | null;
  questionCountDraft: number;
  setQuestionCountDraft: (count: number) => void;
  onSaveQuestionCount: (count: number) => void;
  onSaveVisualStyle: (style: QuizImageStyle | "mixed") => void;
  onSaveThinkingBarStyle: (style: QuizThinkingBarStyle) => void;
  onSaveQuestionBoxStyle: (style: QuizQuestionBoxStyle) => void;
  onSaveAnswerCardStyle: (style: QuizAnswerCardStyle) => void;
  onSaveCounterStyle: (style: QuizQuestionCounterStyle) => void;
  onSaveBackgroundStyle: (style: QuizBackgroundStyle) => void;
  onSavePaletteId: (palette: QuizPaletteId) => void;
  onSaveThumbnailRatio?: (ratio: ThumbnailRatioMode) => void;
  onApplyStylePreset: (preset: VisualPresetItem) => void;
  setEpisode?: (episode: Episode | null) => void;
  onNotice?: (notice: NonNullable<Notice>) => void;
};


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
  onSaveThumbnailRatio,
  onApplyStylePreset,
  setEpisode,

  onNotice,
}: Props) {
  const { t } = useTranslation();
  const [openDropdown, setOpenDropdown] = useState<EpisodeCustomizationDropdownName>(null);
  const [candidate, setCandidate] = useState<EpisodePreviewCandidate | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPipelineRunning = Boolean(activeEpisodeTask);

  const brandNameControl = useEpisodeChannelBrandName({
    channel,
    episode,
    setEpisode: setEpisode ?? (() => {}),
    onNotice: onNotice ?? (() => {}),
    disabled: isPipelineRunning,
  });

  useEffect(() => {
    if (!openDropdown) setCandidate(null);
  }, [openDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDropdown(null);
    };
    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openDropdown]);

  const toggleDropdown = (name: Exclude<EpisodeCustomizationDropdownName, null>) => {
    if (isPipelineRunning) return;
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  const isSaving = (busyKey: string) => busy === busyKey;

  return (
    <section className="episode-customization-bar" ref={containerRef}>
      <div className="episode-customization-controls">
        <div className="customization-bar-header">
          <h2>{t("episodeCustomization.barTitle")}</h2>
        </div>

        <div className="customization-button-group">
          {/* Section 1: Content & Channel Setup */}
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
                questionCountDraft={questionCountDraft}
                setQuestionCountDraft={setQuestionCountDraft}
                onSaveQuestionCount={onSaveQuestionCount}
                onPreview={setCandidate}
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
                  setOpenDropdown(null);
                }}
              />
            </div>
          </div>

          {/* Section 2: Main Theme & Presets */}
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
                  setOpenDropdown(null);
                }}
                onPreview={setCandidate}
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
                  setOpenDropdown(null);
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
                  setOpenDropdown(null);
                }}
                onPreview={setCandidate}
              />
            </div>
          </div>

          {/* Section 3: Fine-tuning Component Elements */}
          <div className="customization-section">
            <div className="customization-section-header">
              <span className="customization-section-title">{t("episodeCustomization.groupElements")}</span>
            </div>
            <div className="customization-controls-row customization-elements-grid">
              <QuestionBoxDropdown
                channel={channel}
                episode={episode}
                disabled={isPipelineRunning}
                saving={isSaving("question-box-style")}
                isOpen={openDropdown === "questionBox"}
                onToggle={() => toggleDropdown("questionBox")}
                onSelectStyle={(style) => {
                  onSaveQuestionBoxStyle(style);
                  setOpenDropdown(null);
                }}
                onPreview={setCandidate}
              />
              <AnswerCardDropdown
                channel={channel}
                episode={episode}
                disabled={isPipelineRunning}
                saving={isSaving("answer-card-style")}
                isOpen={openDropdown === "answerCard"}
                onToggle={() => toggleDropdown("answerCard")}
                onSelectStyle={(style) => {
                  onSaveAnswerCardStyle(style);
                  setOpenDropdown(null);
                }}
                onPreview={setCandidate}
              />
              <CounterBadgeDropdown
                channel={channel}
                episode={episode}
                disabled={isPipelineRunning}
                saving={isSaving("counter-style")}
                isOpen={openDropdown === "counterBadge"}
                onToggle={() => toggleDropdown("counterBadge")}
                onSelectStyle={(style) => {
                  onSaveCounterStyle(style);
                  setOpenDropdown(null);
                }}
                onPreview={setCandidate}
              />
              <ThinkingBarDropdown
                channel={channel}
                episode={episode}
                disabled={isPipelineRunning}
                saving={isSaving("thinking-bar-style")}
                isOpen={openDropdown === "thinkingBar"}
                onToggle={() => toggleDropdown("thinkingBar")}
                onSelectStyle={(style) => {
                  onSaveThinkingBarStyle(style);
                  setOpenDropdown(null);
                }}
                onPreview={setCandidate}
              />
              <BackgroundDropdown
                channel={channel}
                episode={episode}
                disabled={isPipelineRunning}
                saving={isSaving("background-style")}
                isOpen={openDropdown === "background"}
                onToggle={() => toggleDropdown("background")}
                onSelectStyle={(style) => {
                  onSaveBackgroundStyle(style);
                  setOpenDropdown(null);
                }}
                onPreview={setCandidate}
              />
            </div>
          </div>
        </div>
      </div>


      <EpisodeStylePreview
        channel={channel}
        episode={episode}
        quiz={quiz}
        directorPlan={directorPlan}
        candidate={candidate}
        channelBrandName={brandNameControl.draft}
      />
    </section>
  );
}

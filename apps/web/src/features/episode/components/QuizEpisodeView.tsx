import type React from "react";
import type { Channel, Episode, Scene } from "@studio/shared";
import type { BundleImage, QuizV2State } from "../../../api";
import type { Notice } from "../../../components/types";
import type { useEpisodePipeline } from "../hooks/useEpisodePipeline";
import { EpisodeQuizCustomizationBar } from "./EpisodeQuizCustomizationBar";
import { QuizV2Panel } from "../../../components/QuizV2Panel";
import { QuizVideoPanel } from "../QuizVideoPanel";
import { ThumbnailPreviewCard } from "./ThumbnailPreviewCard";
import { EpisodeWorkspaceTabs } from "./EpisodeWorkspaceTabs";

type QuizEpisodeViewProps = {
  channel: Channel;
  episode: Episode;
  episodeId: string;
  simplifyMode: boolean;
  pipeline: ReturnType<typeof useEpisodePipeline>;
  visualBible: string;
  bundleImages: BundleImage[];
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  setEpisode: React.Dispatch<React.SetStateAction<Episode | null>>;
  quizV2: QuizV2State | null;
  maxDuration: number;
  narrationWordsPerSecond: number;
  imageGenerationEnabled: boolean;
  imagesPerBundle: number;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function QuizEpisodeView({
  channel,
  episode,
  episodeId,
  simplifyMode,
  pipeline,
  visualBible,
  bundleImages,
  scenes,
  setScenes,
  setEpisode,
  quizV2,
  maxDuration,
  narrationWordsPerSecond,
  imageGenerationEnabled,
  imagesPerBundle,
  onNotice,
}: QuizEpisodeViewProps) {
  return (
    <>
      <EpisodeQuizCustomizationBar
        channel={channel}
        episode={episode}
        quiz={quizV2?.quiz ?? null}
        directorPlan={quizV2?.director_plan ?? null}
        activeEpisodeTask={pipeline.activeEpisodeTask}
        busy={pipeline.busy}
        questionCountDraft={pipeline.questionCountDraft}
        setQuestionCountDraft={pipeline.setQuestionCountDraft}
        onSaveQuestionCount={pipeline.saveQuestionCount}
        onSaveVisualStyle={pipeline.saveVisualStyle}
        onSaveThinkingBarStyle={pipeline.saveThinkingBarStyle}
        onSaveQuestionBoxStyle={pipeline.saveQuestionBoxStyle}
        onSaveAnswerCardStyle={pipeline.saveAnswerCardStyle}
        onSaveCounterStyle={pipeline.saveCounterStyle}
        onSaveBackgroundStyle={pipeline.saveBackgroundStyle}
        onSavePaletteId={pipeline.savePaletteId}
        onSaveThumbnailRatio={pipeline.saveThumbnailRatio}
        onApplyStylePreset={pipeline.applyStylePreset}
        setEpisode={setEpisode}
        onNotice={onNotice}
      />


      <QuizV2Panel
        state={quizV2}
        readiness={pipeline.readiness}
        pipelineTask={pipeline.pipelineTask}
        tasks={pipeline.episodeTasks}
        questionCount={episode.quiz_config?.question_count ?? 0}
      />

      <QuizVideoPanel
        channel={channel}
        episode={episode}
        episodeId={episodeId}
        episodeTasks={pipeline.episodeTasks}
        episodeClock={pipeline.episodeClock}
        busy={pipeline.busy}
        onOpenVideoFolder={pipeline.openVideoFolder}
      />

      <ThumbnailPreviewCard
        channel={channel}
        episode={episode}
        episodeId={episodeId}
        onNotice={onNotice}
      />

      <EpisodeWorkspaceTabs
        channel={channel}
        episode={episode}
        episodeId={episodeId}
        simplifyMode={simplifyMode}
        pipeline={pipeline}
        visualBible={visualBible}
        bundleImages={bundleImages}
        scenes={scenes}
        setScenes={setScenes}
        maxDuration={maxDuration}
        narrationWordsPerSecond={narrationWordsPerSecond}
        imageGenerationEnabled={imageGenerationEnabled}
        imagesPerBundle={imagesPerBundle}
      />
    </>
  );
}

import type React from "react";
import type { Channel, Episode, ProductionAssessment, Scene } from "@studio/shared";
import type { BundleImage } from "../../../api";
import type { useEpisodePipeline } from "../hooks/useEpisodePipeline";
import { PipelineRail } from "./PipelineRail";
import { AssessmentPanel } from "./AssessmentPanel";
import { QuizVideoPanel } from "../QuizVideoPanel";
import { NarrationTrackPanel } from "../NarrationTrackPanel";
import { EpisodeWorkspaceTabs } from "./EpisodeWorkspaceTabs";

type DocumentaryEpisodeViewProps = {
  channel: Channel;
  episode: Episode;
  episodeId: string;
  simplifyMode: boolean;
  pipeline: ReturnType<typeof useEpisodePipeline>;
  visualBible: string;
  bundleImages: BundleImage[];
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  assessment: ProductionAssessment | null;
  maxDuration: number;
  narrationWordsPerSecond: number;
  imageGenerationEnabled: boolean;
  imagesPerBundle: number;
};

export function DocumentaryEpisodeView({
  channel,
  episode,
  episodeId,
  simplifyMode,
  pipeline,
  visualBible,
  bundleImages,
  scenes,
  setScenes,
  assessment,
  maxDuration,
  narrationWordsPerSecond,
  imageGenerationEnabled,
  imagesPerBundle,
}: DocumentaryEpisodeViewProps) {
  return (
    <>
      <PipelineRail readiness={pipeline.readiness} quiz={false} pipelineTask={pipeline.pipelineTask} tasks={pipeline.episodeTasks} />

      {assessment ? <AssessmentPanel assessment={assessment} /> : null}

      <QuizVideoPanel
        channel={channel}
        episode={episode}
        episodeId={episodeId}
        isQuiz={false}
        readiness={pipeline.readiness}
        activeEpisodeTask={pipeline.activeEpisodeTask}
        episodeTasks={pipeline.episodeTasks}
        episodeClock={pipeline.episodeClock}
        busy={pipeline.busy}
        onCreateTask={pipeline.createTask}
        onOpenVideoFolder={pipeline.openVideoFolder}
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
        stage3Footer={
          <NarrationTrackPanel
            channel={channel}
            episode={episode}
            episodeId={episodeId}
            readiness={pipeline.readiness}
            activeEpisodeTask={pipeline.activeEpisodeTask}
            episodeTasks={pipeline.episodeTasks}
            episodeClock={pipeline.episodeClock}
            narrationWordsPerSecond={narrationWordsPerSecond}
            onCreateTask={pipeline.createTask}
          />
        }
      />
    </>
  );
}

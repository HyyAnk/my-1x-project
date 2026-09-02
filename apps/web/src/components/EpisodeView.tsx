import { useCallback } from "react";
import type { Channel, Task } from "@studio/shared";
import { isTaskActive } from "../lib/utils";
import { useEpisode } from "../hooks/useEpisode";
import { LoadingState } from "./EmptyState";
import { TaskProgressPanel } from "./TaskProgressPanel";
import { PromptFocusModal } from "./PromptFocusModal";
import type { Notice } from "./types";
import type { PreviewImageData } from "../features/episode/types";
import { ImagePreviewModal } from "../features/episode/components/ImagePreviewModal";
import { EpisodeHeader } from "../features/episode/EpisodeHeader";
import { useEpisodePipeline } from "../features/episode/hooks/useEpisodePipeline";
import { QuizEpisodeView } from "../features/episode/components/QuizEpisodeView";

export type { PreviewImageData };

export function EpisodeDetail({
  channel,
  episodeId,
  tasks,
  activeTab,
  onTabChange,
  onNavigateHome,
  onNavigateChannels,
  onNavigateChannel,
  onTaskSubmitted,
  maxDuration,
  narrationWordsPerSecond,
  imageGenerationEnabled,
  imagesPerBundle,
  onBack,
  onNotice,
  simplifyMode = true,
}: {
  channel: Channel;
  episodeId: string;
  tasks: Task[];
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
  onNavigateHome?: () => void;
  onNavigateChannels?: () => void;
  onNavigateChannel?: () => void;
  onTaskSubmitted: (task: Task) => void;
  maxDuration: number;
  narrationWordsPerSecond: number;
  imageGenerationEnabled: boolean;
  imagesPerBundle: number;
  onBack: () => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  simplifyMode?: boolean;
}) {
  const handleEpisodeError = useCallback((error: Error) => onNotice({ tone: "bad", message: error.message }), [onNotice]);
  const state = useEpisode(channel.channel_id, episodeId, handleEpisodeError);
  const { episode, visualBible, scenes, setScenes, bundleImages, quizV2 } = state;

  const pipeline = useEpisodePipeline({
    channel,
    episodeId,
    tasks,
    activeTab,
    onTabChange,
    onTaskSubmitted,
    onNotice,
    simplifyMode,
    state,
  });

  if (!episode) {
    return (
      <section className="page-wrap">
        <LoadingState />
      </section>
    );
  }

  return (
    <section className="page-wrap detail-page">
      <EpisodeHeader
        channel={channel}
        episode={episode}
        episodeTasks={pipeline.episodeTasks}
        totalImageCostVnd={pipeline.totalImageCostVnd}
        activeEpisodeTask={pipeline.activeEpisodeTask}
        busy={pipeline.busy}
        cancelling={pipeline.cancelling}
        readiness={pipeline.readiness}
        onNavigateHome={onNavigateHome}
        onNavigateChannels={onNavigateChannels}
        onNavigateChannel={onNavigateChannel}
        onBack={onBack}
        onCreateTask={pipeline.createTask}
        onCancelActiveTask={pipeline.handleCancelActiveTask}
      />

      {pipeline.pipelineTask && (isTaskActive(pipeline.pipelineTask) || pipeline.pipelineTask.status === "FAILED") ? (
        <TaskProgressPanel
          task={pipeline.pipelineTask}
          title="Production pipeline"
          activeLabel="Running the next step"
          completionLabel="Production pipeline complete"
          now={pipeline.episodeClock}
          progressLabel="Production pipeline progress"
          variant="hero"
          onCancel={pipeline.handleCancelActiveTask}
        />
      ) : null}

      <QuizEpisodeView
        channel={channel}
        episode={episode}
        episodeId={episodeId}
        simplifyMode={simplifyMode}
        pipeline={pipeline}
        visualBible={visualBible}
        bundleImages={bundleImages}
        scenes={scenes}
        setScenes={setScenes}
        setEpisode={state.setEpisode}
        quizV2={quizV2}
        maxDuration={maxDuration}
        narrationWordsPerSecond={narrationWordsPerSecond}
        imageGenerationEnabled={imageGenerationEnabled}
        imagesPerBundle={imagesPerBundle}
        onNotice={onNotice}
      />

      {pipeline.previewImage ? <ImagePreviewModal image={pipeline.previewImage} onClose={() => pipeline.setPreviewImage(null)} /> : null}

      {pipeline.promptModalScene ? (
        <PromptFocusModal
          scene={pipeline.promptModalScene}
          channelId={channel.channel_id}
          episodeId={episodeId}
          onSave={(updatedPrompt) => {
            setScenes((current) =>
              current.map((item) =>
                item.scene_id === pipeline.promptModalScene?.scene_id ? { ...item, visual_prompt: updatedPrompt } : item,
              ),
            );
          }}
          onClose={() => pipeline.setPromptModalScene(null)}
        />
      ) : null}
    </section>
  );
}

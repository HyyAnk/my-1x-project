import { useMemo } from "react";
import { LoadingState } from "../../components/EmptyState";
import { PipelineRail } from "../episode/components/PipelineRail";
import { VideoDescriptionCard } from "../episode/components/VideoDescriptionCard";
import { VideoTitleCard } from "../episode/components/VideoTitleCard";
import { useEpisodeTaskTracking } from "../episode/hooks/useEpisodeTaskTracking";
import { QuizShortCustomizationBar } from "./components/QuizShortCustomizationBar";
import { QuizShortHeader } from "./components/QuizShortHeader";
import { QuizShortPortraitPreview } from "./components/QuizShortPortraitPreview";
import { QuizShortStageList } from "./components/QuizShortStageList";
import { QuizShortThumbnailPanel } from "./components/QuizShortThumbnailPanel";
import { useQuizShort } from "./hooks/useQuizShort";
import { useQuizShortDescription } from "./hooks/useQuizShortDescription";
import { useQuizShortPipeline } from "./hooks/useQuizShortPipeline";
import { useQuizShortSettings } from "./hooks/useQuizShortSettings";
import { useQuizShortThumbnail } from "./hooks/useQuizShortThumbnail";
import { useQuizShortTitle } from "./hooks/useQuizShortTitle";
import { buildQuizShortRailReadiness, buildQuizShortStageSummaries, resolveQuizShortPipelineAction } from "./services/quizShortViewModel";
import type { QuizShortViewProps } from "./types/quizShort.types";

export function QuizShortView(props: QuizShortViewProps) {
  const { channel, quizShortId, tasks, onBack, onNavigateHome, onNavigateChannels, onNavigateChannel, onTaskSubmitted, onNotice } = props;
  const channelId = channel.channel_id;
  const state = useQuizShort({ channelId, quizShortId, onNotice });
  const { quizShort, stages, load, applyQuizShort } = state;

  const tracking = useEpisodeTaskTracking({ episodeId: quizShortId, tasks, load, onNotice });
  const pipeline = useQuizShortPipeline({
    channelId,
    quizShortId,
    activeTask: tracking.activeEpisodeTask,
    onTaskSubmitted,
    onNotice,
    load,
  });
  const settings = useQuizShortSettings({ channelId, quizShortId, quizShort, applyQuizShort, onNotice });
  const thumbnail = useQuizShortThumbnail({ channelId, quizShortId, quizShort, tasks: tracking.episodeTasks, onNotice, load });
  const titleClient = useQuizShortTitle(channelId, quizShortId);
  const descriptionClient = useQuizShortDescription(channelId, quizShortId);

  const stageSummaries = useMemo(() => buildQuizShortStageSummaries(stages), [stages]);
  const railReadiness = useMemo(() => buildQuizShortRailReadiness(stages), [stages]);
  const action = resolveQuizShortPipelineAction(quizShort, tracking.pipelineTask);

  if (state.loading && !quizShort) return <LoadingState />;
  if (!quizShort) {
    return (
      <section className="page-wrap detail-page">
        <p className="form-error" role="alert">
          {state.error ?? "Quiz Short not found."}
        </p>
        <button type="button" className="quiet-button" onClick={onBack}>
          Back to channel
        </button>
      </section>
    );
  }

  const isRunning = Boolean(tracking.activeEpisodeTask);
  const hasQuiz = Boolean(state.workspace?.quiz);

  return (
    <section className="page-wrap detail-page quiz-short-view" data-testid="quiz-short-view">
      <QuizShortHeader
        channel={channel}
        quizShort={quizShort}
        activeTask={tracking.activeEpisodeTask}
        action={action}
        starting={pipeline.starting}
        cancelling={pipeline.cancelling}
        fastRenderMode={quizShort.quiz_config.fast_render_mode ?? true}
        fastRenderBusy={settings.busy === "fast-render"}
        onToggleFastRender={() => void settings.saveFastRender(!(quizShort.quiz_config.fast_render_mode ?? true))}
        onStart={() => void pipeline.start()}
        onCancel={() => void pipeline.cancel()}
        onBack={onBack}
        onNavigateHome={onNavigateHome}
        onNavigateChannels={onNavigateChannels}
        onNavigateChannel={onNavigateChannel}
      />

      <PipelineRail readiness={railReadiness} pipelineTask={tracking.pipelineTask} tasks={tracking.episodeTasks} />

      <div className="quiz-short-workspace-grid">
        <QuizShortPortraitPreview
          quizShort={quizShort}
          coverUrl={thumbnail.imageUrl}
          activeTask={tracking.activeEpisodeTask}
          now={tracking.episodeClock}
        />
        <div className="quiz-short-workspace-side">
          <QuizShortStageList stages={stageSummaries} />
          <QuizShortCustomizationBar channel={channel} quizShort={quizShort} settings={settings} disabled={isRunning} />
          <QuizShortThumbnailPanel thumbnail={thumbnail} title={quizShort.topic.title} />
        </div>
      </div>

      <VideoTitleCard
        channelId={channelId}
        episodeId={quizShortId}
        hasQuiz={hasQuiz}
        client={titleClient}
        onNotice={onNotice}
        onUpdated={load}
      />
      <VideoDescriptionCard
        channel={channel}
        episodeId={quizShortId}
        hasQuiz={hasQuiz}
        client={descriptionClient}
        onNotice={onNotice}
        onUpdated={load}
      />
    </section>
  );
}

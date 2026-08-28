import { CircleNotch, Play, Stop } from "@phosphor-icons/react";
import {
  ALL_QUIZ_IMAGE_STYLES,
  QUIZ_IMAGE_STYLE_LABELS,
  QUIZ_MAX_QUESTION_COUNT,
  QUIZ_MIN_QUESTION_COUNT,
  type Channel,
  type Episode,
  type QuizImageStyle,
  type Task,
} from "@studio/shared";
import { EpisodeBreadcrumb } from "../../components/Breadcrumbs";
import { EpisodeAssetPills, StageBadge } from "../../components/AppChrome";

type EpisodeHeaderProps = {
  channel: Channel;
  episode: Episode;
  episodeTasks: Task[];
  totalImageCostVnd: number;
  isQuiz: boolean;
  questionCountDraft: number;
  setQuestionCountDraft: (count: number) => void;
  durationDraft: number;
  setDurationDraft: (dur: number) => void;
  activeEpisodeTask: Task | null;
  pipelineTask: Task | null;
  busy: string | null;
  cancelling: boolean;
  readiness: { narration: boolean; video: boolean };
  onNavigateHome?: () => void;
  onNavigateChannels?: () => void;
  onNavigateChannel?: () => void;
  onBack: () => void;
  onSaveQuestionCount: () => void;
  onSaveVisualStyle: (style: QuizImageStyle | "mixed") => void;
  onSaveDuration: () => void;
  onCreateTask: (type: Task["task_type"]) => void;
  onCancelActiveTask: (task?: Task | null) => void;
};

export function EpisodeHeader({
  channel,
  episode,
  episodeTasks,
  totalImageCostVnd,
  isQuiz,
  questionCountDraft,
  setQuestionCountDraft,
  durationDraft,
  setDurationDraft,
  activeEpisodeTask,
  pipelineTask,
  busy,
  cancelling,
  readiness,
  onNavigateHome,
  onNavigateChannels,
  onNavigateChannel,
  onBack,
  onSaveQuestionCount,
  onSaveVisualStyle,
  onSaveDuration,
  onCreateTask,
  onCancelActiveTask,
}: EpisodeHeaderProps) {
  const channelStyles = channel.selected_styles && channel.selected_styles.length > 0 ? channel.selected_styles : ALL_QUIZ_IMAGE_STYLES;

  return (
    <>
      <EpisodeBreadcrumb
        channelName={channel.display_name}
        channelId={channel.channel_id}
        episodeTitle={episode.topic.title}
        engine={channel.engine}
        onNavigateHome={onNavigateHome}
        onNavigateChannels={onNavigateChannels}
        onNavigateChannel={onNavigateChannel || onBack}
      />

      <header className="detail-header episode-detail-header">
        <div>
          <h1>{episode.topic.title}</h1>
          <p className="detail-copy">{episode.topic.premise}</p>
        </div>
        <div className="detail-actions">
          <div className="episode-detail-badges">
            <StageBadge stage={episode.stage} />
            <EpisodeAssetPills episode={episode} tasks={episodeTasks} />
          </div>
          {totalImageCostVnd > 0 ? (
            <span className="bundle-image-cost-tag" title="Total image generation cost for this episode">
              💰 {totalImageCostVnd.toLocaleString("en-US")} VND
            </span>
          ) : null}
          {!isQuiz ? (
            <label className="duration-target">
              Target
              <input
                aria-label="Target duration in minutes"
                type="number"
                min="3"
                max="60"
                value={durationDraft}
                onChange={(event) => setDurationDraft(Number(event.target.value))}
                onBlur={() => void onSaveDuration()}
              />
              min
            </label>
          ) : null}
          <button
            className="primary-button"
            disabled={Boolean(activeEpisodeTask) || busy === "GENERATE_PIPELINE"}
            onClick={() => void onCreateTask("GENERATE_PIPELINE")}
          >
            {activeEpisodeTask || busy === "GENERATE_PIPELINE" ? (
              <CircleNotch className="spin" size={16} />
            ) : (
              <Play size={16} />
            )}
            <span>
              {activeEpisodeTask
                ? "Working…"
                : isQuiz && readiness.video
                ? "Render again"
                : pipelineTask?.status === "FAILED"
                ? "Retry pipeline"
                : isQuiz
                ? "Build video"
                : readiness.narration
                ? "Run pipeline again"
                : "Start production"}
            </span>
          </button>
          {activeEpisodeTask ? (
            <button
              type="button"
              className="danger-button"
              disabled={cancelling}
              onClick={() => void onCancelActiveTask(activeEpisodeTask)}
              title="Stop current task immediately"
              aria-label="Stop current task"
            >
              {cancelling ? (
                <CircleNotch className="spin" size={16} />
              ) : (
                <Stop size={16} weight="fill" />
              )}
              <span>Stop</span>
            </button>
          ) : null}
        </div>
      </header>
    </>
  );
}

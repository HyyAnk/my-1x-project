import { CircleNotch, Lightning, Play, Stop } from "@phosphor-icons/react";
import type { Channel, QuizShort, Task } from "@studio/shared";
import { StageBadge } from "../../../components/AppChrome";
import { EpisodeBreadcrumb } from "../../../components/Breadcrumbs";
import type { QuizShortPipelineAction } from "../types/quizShort.types";

export type QuizShortHeaderProps = {
  channel: Channel;
  quizShort: QuizShort;
  activeTask: Task | null;
  action: QuizShortPipelineAction;
  starting: boolean;
  cancelling: boolean;
  fastRenderMode: boolean;
  fastRenderBusy: boolean;
  onToggleFastRender: () => void;
  onStart: () => void;
  onCancel: () => void;
  onBack: () => void;
  onNavigateHome?: () => void;
  onNavigateChannels?: () => void;
  onNavigateChannel?: () => void;
};

export function QuizShortHeader(props: QuizShortHeaderProps) {
  const { channel, quizShort, activeTask, action, starting, cancelling, fastRenderMode, fastRenderBusy } = props;
  const isBusy = Boolean(activeTask) || starting;

  return (
    <>
      <EpisodeBreadcrumb
        channelName={channel.display_name}
        channelId={channel.channel_id}
        episodeTitle={quizShort.topic.title}
        onNavigateHome={props.onNavigateHome}
        onNavigateChannels={props.onNavigateChannels}
        onNavigateChannel={props.onNavigateChannel ?? props.onBack}
      />
      <header className="detail-header episode-detail-header quiz-short-header">
        <div>
          <p className="eyebrow">Quiz Short / 9:16</p>
          <h1>{quizShort.topic.title}</h1>
          <p className="detail-copy">{quizShort.topic.premise}</p>
        </div>
        <div className="detail-actions">
          <div className="episode-detail-badges">
            <StageBadge stage={quizShort.stage} />
            <span className="quiz-short-count-badge">{quizShort.quiz_config.question_count} questions</span>
          </div>
          <button
            type="button"
            className={`fast-render-toggle-btn ${fastRenderMode ? "is-active" : ""}`}
            onClick={props.onToggleFastRender}
            disabled={isBusy || fastRenderBusy}
            aria-pressed={fastRenderMode}
            aria-label="Toggle Fast Render Mode"
            title={
              fastRenderMode
                ? "Fast Render enabled: skips layout and media preflight checks"
                : "Standard mode: runs preflight checks before rendering"
            }
          >
            <Lightning size={14} weight={fastRenderMode ? "fill" : "regular"} />
            <span>Fast Render: {fastRenderMode ? "ON" : "OFF"}</span>
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={isBusy}
            onClick={props.onStart}
            data-testid="quiz-short-start-pipeline"
          >
            {isBusy ? <CircleNotch className="spin" size={16} /> : <Play size={16} />}
            <span>{isBusy ? "Producing..." : action.label}</span>
          </button>
          {activeTask ? (
            <button type="button" className="danger-button" disabled={cancelling} onClick={props.onCancel} aria-label="Stop current task">
              {cancelling ? <CircleNotch className="spin" size={16} /> : <Stop size={16} weight="fill" />}
              <span>Stop</span>
            </button>
          ) : null}
        </div>
      </header>
    </>
  );
}

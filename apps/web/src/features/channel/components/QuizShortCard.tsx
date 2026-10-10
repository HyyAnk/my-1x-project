import { useState } from "react";
import { Clock, DeviceMobile, ListNumbers, Trash } from "@phosphor-icons/react";
import type { QuizShort, Task } from "@studio/shared";
import { getNavProps } from "../../../hooks/useRouter";
import { buildQuizShortCardViewModel } from "../utils/quizShortCardViewModel";

export interface QuizShortCardProps {
  quizShort: QuizShort;
  tasks: Task[];
  onOpen: (channelId: string, quizShortId: string) => void;
  onDelete: (quizShort: QuizShort) => void;
}

/** Portrait card for the channel Quiz Shorts tab. Shares the short-reel card styles. */
export function QuizShortCard({ quizShort, tasks, onOpen, onDelete }: QuizShortCardProps) {
  const [imageError, setImageError] = useState(false);
  const vm = buildQuizShortCardViewModel(quizShort, tasks);
  const showCover = Boolean(vm.coverUrl && !imageError);

  return (
    <article
      className={`short-reel-card quiz-short-card is-${vm.status} ${vm.hasActiveTask ? "is-task-active" : ""}`}
      data-testid={`quiz-short-card-${quizShort.quiz_short_id}`}
      aria-label={`Quiz Short: ${vm.cleanTitle}`}
    >
      <a
        className="short-reel-card-link"
        aria-label={`Open Quiz Short ${vm.cleanTitle}`}
        {...getNavProps(vm.workspaceUrl, () => onOpen(quizShort.channel_id, quizShort.quiz_short_id))}
      >
        <div className="short-reel-media-wrap">
          {showCover ? (
            <img
              src={vm.coverUrl ?? undefined}
              alt={`Cover for ${vm.cleanTitle}`}
              className="short-reel-cover-img"
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="short-reel-fallback-visual" data-testid="quiz-short-fallback-visual">
              <div className="fallback-inner">
                <DeviceMobile size={28} weight="duotone" className="fallback-icon" />
                <span className="fallback-aspect">9:16 Quiz Short</span>
                <p className="fallback-hook">{quizShort.topic.hook || vm.cleanTitle}</p>
              </div>
            </div>
          )}

          <div className="short-reel-top-badges">
            <span className={`short-reel-status-pill status-${vm.status}`}>
              <span className="status-dot" aria-hidden="true" />
              <span>{vm.statusLabel}</span>
            </span>
            {vm.durationLabel ? (
              <span className="short-reel-duration-badge" title="Rendered duration">
                <Clock size={11} aria-hidden="true" />
                <span>{vm.durationLabel}</span>
              </span>
            ) : null}
          </div>

          <div className="short-reel-archetype-wrap">
            <span className="short-reel-archetype-badge" title="Question count">
              <ListNumbers size={10} weight="bold" aria-hidden="true" />
              <span>{vm.questionCountLabel}</span>
            </span>
          </div>
        </div>

        <div className="short-reel-content">
          <h3 className="short-reel-title" title={vm.cleanTitle}>
            {vm.cleanTitle}
          </h3>
          <p className="short-reel-premise quiz-short-stage" data-testid="quiz-short-stage">
            {vm.stageLabel}
          </p>
          {vm.hasActiveTask && vm.activeProgressMessage ? (
            <div className="short-reel-live-task-bar" data-testid="quiz-short-live-task">
              <div className="live-task-pulse" />
              <span className="live-task-message" title={vm.activeProgressMessage}>
                {vm.activeProgressMessage}
              </span>
            </div>
          ) : null}
        </div>
      </a>

      <div className="short-reel-overlay-actions">
        <button
          type="button"
          className="short-reel-overlay-btn delete-btn"
          title={`Delete ${vm.cleanTitle}`}
          aria-label={`Delete Quiz Short ${vm.cleanTitle}`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(quizShort);
          }}
          data-testid={`delete-quiz-short-${quizShort.quiz_short_id}`}
        >
          <Trash size={13} />
        </button>
      </div>
    </article>
  );
}

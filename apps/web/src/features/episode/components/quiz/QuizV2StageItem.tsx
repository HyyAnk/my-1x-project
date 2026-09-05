import { CheckCircle, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import type { RailStage, RailStatus, StageProgress, StageTimingInfo } from "../../utils/quizRailCalculations";
import { statusLabel } from "../../utils/quizRailCalculations";

type QuizV2StageItemProps = {
  stageKey: RailStage;
  label: string;
  index: number;
  status: RailStatus;
  progress: StageProgress;
  timing?: StageTimingInfo | null;
};

export function QuizV2StageItem({ stageKey, label, index, status, progress, timing }: QuizV2StageItemProps) {
  return (
    <li
      key={stageKey}
      className={"quiz-v2-stage is-" + status}
      aria-label={`${label}: ${statusLabel(status)}, ${progress.completed} of ${progress.total} ${progress.unit} complete, ${progress.percent}%${timing ? `, ${timing.tooltip}` : ""}`}
    >
      <span className="quiz-v2-stage-icon">
        {status === "ready" ? (
          <CheckCircle size={16} weight="fill" />
        ) : status === "failed" ? (
          <WarningCircle size={16} weight="fill" />
        ) : status === "running" ? (
          <CircleNotch className="spin" size={16} />
        ) : (
          <span>{index + 1}</span>
        )}
      </span>
      <div>
        <strong>{label}</strong>
        <div className="quiz-v2-stage-meta">
          <span>{statusLabel(status)}</span>
          {timing ? (
            <span
              className={`quiz-v2-stage-timing${timing.isRunning ? " is-running" : ""}${timing.isParallel ? " is-parallel" : ""}`}
              title={timing.tooltip}
            >
              ⏱ {timing.formattedDuration}
              {timing.isParallel && timing.parallelTotalSeconds ? (
                <span className="quiz-v2-stage-parallel-badge" title={`Thời gian song song: ${timing.parallelTotalSeconds}s`}>
                  //{timing.parallelTotalSeconds}s
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
        <span className="quiz-v2-stage-progress">
          {progress.completed}/{progress.total} {progress.unit} · {progress.percent}%
        </span>
        <span className="quiz-v2-stage-track" aria-hidden="true">
          <span style={{ width: `${progress.percent}%` }} />
        </span>
      </div>
    </li>
  );
}

import { CheckCircle, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import type { RailStage, RailStatus, StageProgress } from "../../utils/quizRailCalculations";
import { statusLabel } from "../../utils/quizRailCalculations";

type QuizV2StageItemProps = {
  stageKey: RailStage;
  label: string;
  index: number;
  status: RailStatus;
  progress: StageProgress;
};

export function QuizV2StageItem({ stageKey, label, index, status, progress }: QuizV2StageItemProps) {
  return (
    <li
      key={stageKey}
      className={"quiz-v2-stage is-" + status}
      aria-label={`${label}: ${progress.completed} of ${progress.total} ${progress.unit} complete, ${progress.percent}%`}
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
        <span>{statusLabel(status)}</span>
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

import { CheckCircle, CircleNotch, Warning, WarningCircle } from "@phosphor-icons/react";
import type { QuizShortStageSummary } from "../types/quizShort.types";

export type QuizShortStageListProps = {
  stages: QuizShortStageSummary[];
};

function stageIcon(state: QuizShortStageSummary["state"], index: number) {
  if (state === "running") return <CircleNotch className="spin" size={15} />;
  if (state === "ready") return <CheckCircle size={15} weight="fill" />;
  if (state === "stale") return <Warning size={15} weight="fill" />;
  if (state === "failed") return <WarningCircle size={15} weight="fill" />;
  return index + 1;
}

/** Five-stage detail list that sits under the shared streamlined rail. */
export function QuizShortStageList({ stages }: QuizShortStageListProps) {
  return (
    <ol className="quiz-short-stage-list" aria-label="Quiz Short stages" data-testid="quiz-short-stage-list">
      {stages.map((stage, index) => (
        <li key={stage.key} className={`quiz-short-stage is-${stage.state}`} data-testid={`quiz-short-stage-${stage.key}`}>
          <span className="quiz-short-stage-icon">{stageIcon(stage.state, index)}</span>
          <strong>{stage.label}</strong>
          <span className="quiz-short-stage-state">{stage.stateLabel}</span>
        </li>
      ))}
    </ol>
  );
}

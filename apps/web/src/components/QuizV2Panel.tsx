import type { Task } from "@studio/shared";
import type { QuizV2State } from "../api";
import { STAGES, pipelineStage, resolveProgress, resolveStatus, type Readiness } from "../features/episode/utils/quizRailCalculations";
import { QuizV2Assessment, QuizV2PendingAssessment } from "../features/episode/components/quiz/QuizV2Assessment";
import { QuizV2StageItem } from "../features/episode/components/quiz/QuizV2StageItem";

export type { Readiness } from "../features/episode/utils/quizRailCalculations";

type QuizV2PanelProps = {
  state: QuizV2State | null;
  readiness: Readiness;
  pipelineTask: Task | null;
  tasks: Task[];
  questionCount?: number;
};

export function QuizV2Panel({ state, readiness, pipelineTask, tasks, questionCount = 0 }: QuizV2PanelProps) {
  if (!state) {
    return (
      <section className="panel quiz-v2-panel">
        <p className="artifact-empty">Loading Quiz Engine V2 state</p>
      </section>
    );
  }

  const currentStage = pipelineStage(pipelineTask);

  return (
    <section className="panel quiz-v2-panel" aria-label="Quiz production stages">
      <h2
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          border: 0,
        }}
      >
        Production rail
      </h2>
      {currentStage ? (
        <p className="quiz-v2-panel-note">
          {pipelineTask?.status === "FAILED" ? "Stopped at" : "Current"}: {currentStage.label}
          {pipelineTask?.progress_message && pipelineTask.status !== "FAILED" ? ` · ${pipelineTask.progress_message}` : ""}
        </p>
      ) : null}
      <ol className="quiz-v2-rail" aria-label="Quiz production stages">
        {STAGES.map((stage, index) => {
          const status = resolveStatus(stage.key, index, readiness, state, pipelineTask, tasks, currentStage);
          const progress = resolveProgress(stage.key, readiness, state, tasks, questionCount, pipelineTask);
          return (
            <QuizV2StageItem key={stage.key} stageKey={stage.key} label={stage.label} index={index} status={status} progress={progress} />
          );
        })}
      </ol>
      {state.assessment ? <QuizV2Assessment assessment={state.assessment} /> : <QuizV2PendingAssessment />}
    </section>
  );
}

import { useMemo } from "react";
import type { Episode, Task } from "@studio/shared";
import type { QuizV2State } from "../api";
import { calculateEpisodeBuildDuration } from "../lib/utils";
import {
  STAGES,
  STREAMLINED_STAGES,
  pipelineStage,
  pipelineStreamlinedStage,
  resolveProgress,
  resolveStreamlinedProgress,
  resolveStatus,
  resolveStreamlinedStatus,
  resolveStageTiming,
  resolveParallelSummary,
  type Readiness,
} from "../features/episode/utils/quizRailCalculations";
import { QuizV2Assessment, QuizV2PendingAssessment } from "../features/episode/components/quiz/QuizV2Assessment";
import { QuizV2StageItem } from "../features/episode/components/quiz/QuizV2StageItem";

export type { Readiness } from "../features/episode/utils/quizRailCalculations";

type QuizV2PanelProps = {
  state: QuizV2State | null;
  readiness: Readiness;
  pipelineTask: Task | null;
  tasks: Task[];
  questionCount?: number;
  streamlined?: boolean;
  episode?: Episode | null;
};

export function QuizV2Panel({ state, readiness, pipelineTask, tasks, questionCount = 0, streamlined = true, episode = null }: QuizV2PanelProps) {
  const buildDurationSeconds = useMemo(() => {
    return calculateEpisodeBuildDuration(tasks, pipelineTask);
  }, [tasks, pipelineTask]);

  const effectiveReadiness: Readiness = useMemo(
    () => ({
      ...readiness,
      thumbnail: readiness.thumbnail ?? Boolean(episode?.thumbnail_asset_path_16_9 || episode?.thumbnail_asset_path_9_16),
      description: readiness.description ?? Boolean(state?.description),
    }),
    [readiness, episode?.thumbnail_asset_path_16_9, episode?.thumbnail_asset_path_9_16, state?.description],
  );

  if (!state) {
    return (
      <section className="panel quiz-v2-panel">
        <p className="artifact-empty">Loading Quiz Engine V2 state</p>
      </section>
    );
  }

  const currentStreamlinedStage = pipelineStreamlinedStage(pipelineTask);
  const currentLegacyStage = pipelineStage(pipelineTask);
  const currentStage = streamlined ? currentStreamlinedStage : currentLegacyStage;

  const parallelSummaries = useMemo(() => resolveParallelSummary(state), [state]);

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
      {parallelSummaries.length > 0 ? (
        <div className="quiz-v2-parallel-summary" aria-label="Parallel execution summary">
          {parallelSummaries.map((summary) => (
            <span key={summary.groupKey} className="quiz-v2-parallel-tag">
              <span className="quiz-v2-parallel-icon">⚡</span>
              <strong>{summary.label}:</strong> {summary.totalDurationSeconds}s total (
              {summary.stages.map((st) => `${st.label}: ${st.durationSeconds}s`).join(" | ")}
              )
            </span>
          ))}
        </div>
      ) : null}
      <ol className={`quiz-v2-rail${streamlined ? " is-streamlined" : ""}`} aria-label="Quiz production stages">
        {streamlined
          ? STREAMLINED_STAGES.map((stage, index) => {
              const status = resolveStreamlinedStatus(stage.key, index, effectiveReadiness, state, pipelineTask, tasks, currentStreamlinedStage);
              const progress = resolveStreamlinedProgress(stage.key, effectiveReadiness, state, tasks, questionCount, pipelineTask);
              const timing = resolveStageTiming(stage.key, status, state, tasks, pipelineTask);
              return (
                <QuizV2StageItem
                  key={stage.key}
                  stageKey={stage.key}
                  label={stage.label}
                  index={index}
                  status={status}
                  progress={progress}
                  timing={timing}
                />
              );
            })
          : STAGES.map((stage, index) => {
              const status = resolveStatus(stage.key, index, readiness, state, pipelineTask, tasks, currentLegacyStage);
              const progress = resolveProgress(stage.key, readiness, state, tasks, questionCount, pipelineTask);
              const timing = resolveStageTiming(stage.key, status, state, tasks, pipelineTask);
              return (
                <QuizV2StageItem
                  key={stage.key}
                  stageKey={stage.key}
                  label={stage.label}
                  index={index}
                  status={status}
                  progress={progress}
                  timing={timing}
                />
              );
            })}
      </ol>
      {state.assessment ? (
        <QuizV2Assessment assessment={state.assessment} buildDurationSeconds={buildDurationSeconds} />
      ) : (
        <QuizV2PendingAssessment buildDurationSeconds={buildDurationSeconds} />
      )}
    </section>
  );
}

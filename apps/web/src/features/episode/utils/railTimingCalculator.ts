import type { Task } from "@studio/shared";
import type { QuizV2State } from "../../../api";
import { formatElapsedHuman, isTaskActive } from "../../../lib/utils";
import {
  STAGES,
  STREAMLINED_STAGES,
  type ParallelSummary,
  type RailStage,
  type RailStatus,
  type StageTimingInfo,
  type StreamlinedRailStage,
} from "./railStageDefinitions";
import { isStreamlinedStageActive, latestRelevantTask, latestStreamlinedChildTask } from "./railStatusResolver";

function calculateRecordedTiming(stage: RailStage, state: QuizV2State | null) {
  const recorded = state?.timings?.stages?.[stage];
  let durationSeconds: number | null = null;
  let isParallel = false;
  let parallelTotalSeconds: number | null = null;

  if (recorded) {
    durationSeconds = recorded.duration_seconds;
    if (recorded.parallel_group && (recorded.parallel_total_seconds ?? 0) > 0) {
      isParallel = true;
      parallelTotalSeconds = recorded.parallel_total_seconds ?? null;
    }
  }

  return { recorded, durationSeconds, isParallel, parallelTotalSeconds };
}

function calculateRunningDuration(
  stage: RailStage,
  recorded: ReturnType<typeof calculateRecordedTiming>["recorded"],
  tasks: Task[],
  pipelineTask: Task | null | undefined,
  now: number,
): number | null {
  if (recorded?.started_at) {
    const startMs = new Date(recorded.started_at).getTime();
    return Math.max(0, Math.floor((now - startMs) / 1000));
  }

  const childTask = latestStreamlinedChildTask(stage as StreamlinedRailStage, tasks) ?? latestRelevantTask(stage, tasks);
  if (childTask && isTaskActive(childTask)) {
    const startMs = new Date(childTask.started_at || childTask.created_at).getTime();
    return Math.max(0, Math.floor((now - startMs) / 1000) + (childTask.accumulated_duration_seconds || 0));
  }

  if (pipelineTask && isTaskActive(pipelineTask) && isStreamlinedStageActive(stage as StreamlinedRailStage, pipelineTask)) {
    const startMs = new Date(pipelineTask.started_at || pipelineTask.created_at).getTime();
    return Math.max(0, Math.floor((now - startMs) / 1000));
  }

  return null;
}

function calculateTaskFallbackDuration(stage: RailStage, tasks: Task[], now: number): number | null {
  const childTask = latestStreamlinedChildTask(stage as StreamlinedRailStage, tasks) ?? latestRelevantTask(stage, tasks);
  if (childTask && (childTask.status === "COMPLETED" || isTaskActive(childTask))) {
    const startMs = new Date(childTask.started_at || childTask.created_at).getTime();
    const endMs = childTask.completed_at ? new Date(childTask.completed_at).getTime() : now;
    return Math.max(0, Math.floor((endMs - startMs) / 1000) + (childTask.accumulated_duration_seconds || 0));
  }
  return null;
}

function calculateScenesFallback(tasks: Task[], now: number) {
  const seqTasks = tasks.filter((t) => t.task_type === "GENERATE_SEQUENCE_SCENES" && (t.status === "COMPLETED" || isTaskActive(t)));
  if (seqTasks.length === 0) return null;

  const starts = seqTasks.map((t) => new Date(t.started_at || t.created_at).getTime());
  const ends = seqTasks.map((t) => (t.completed_at ? new Date(t.completed_at).getTime() : now));
  const minStart = Math.min(...starts);
  const maxEnd = Math.max(...ends);
  const durationSeconds = Math.max(0, Math.floor((maxEnd - minStart) / 1000));

  return {
    durationSeconds,
    isParallel: seqTasks.length > 1,
    parallelTotalSeconds: seqTasks.length > 1 ? durationSeconds : null,
  };
}

function formatTimingLabels(durationSeconds: number, isRunning: boolean, isParallel: boolean, parallelTotalSeconds: number | null) {
  const formattedDuration = formatElapsedHuman(durationSeconds) + (isRunning ? "..." : "");
  let tooltip = `Duration: ${formattedDuration}`;
  if (isParallel && parallelTotalSeconds && parallelTotalSeconds > 0) {
    const parallelFormatted = formatElapsedHuman(parallelTotalSeconds);
    tooltip = `Individual: ${formattedDuration} · Parallel total: ${parallelFormatted}`;
  }
  return { formattedDuration, tooltip };
}

export function resolveStageTiming(
  stage: RailStage,
  status: RailStatus,
  state: QuizV2State | null,
  tasks: Task[] = [],
  pipelineTask?: Task | null,
  now: number = Date.now(),
): StageTimingInfo | null {
  const isRunning = status === "running";
  const timing = calculateRecordedTiming(stage, state);
  let durationSeconds = timing.durationSeconds;
  let isParallel = timing.isParallel;
  let parallelTotalSeconds = timing.parallelTotalSeconds;

  if (isRunning) {
    const runningDuration = calculateRunningDuration(stage, timing.recorded, tasks, pipelineTask, now);
    if (runningDuration !== null) {
      durationSeconds = runningDuration;
    }
  }

  if (durationSeconds === null || durationSeconds === 0) {
    durationSeconds = calculateTaskFallbackDuration(stage, tasks, now);
  }

  if (stage === "scenes" && (durationSeconds === null || durationSeconds === 0)) {
    const scenesTiming = calculateScenesFallback(tasks, now);
    if (scenesTiming) {
      durationSeconds = scenesTiming.durationSeconds;
      if (scenesTiming.isParallel) {
        isParallel = true;
        parallelTotalSeconds = scenesTiming.parallelTotalSeconds;
      }
    }
  }

  if (durationSeconds === null || (durationSeconds === 0 && !isRunning)) {
    return null;
  }

  const { formattedDuration, tooltip } = formatTimingLabels(durationSeconds, isRunning, isParallel, parallelTotalSeconds);

  return {
    durationSeconds,
    isRunning,
    parallelTotalSeconds,
    isParallel,
    formattedDuration,
    tooltip,
  };
}

export function resolveParallelSummary(state: QuizV2State | null): ParallelSummary[] {
  if (!state?.timings?.parallel_groups) return [];
  const summaries: ParallelSummary[] = [];

  for (const [groupKey, group] of Object.entries(state.timings.parallel_groups)) {
    if (group && group.duration_seconds > 0) {
      const stageItems = group.stages.map((stageKey) => {
        const foundStreamlined = STREAMLINED_STAGES.find((s) => s.key === stageKey);
        const foundLegacy = STAGES.find((s) => s.key === stageKey);
        const label = foundStreamlined?.label ?? foundLegacy?.label ?? stageKey;
        const durationSeconds = state.timings?.stages?.[stageKey]?.duration_seconds ?? 0;
        return { key: stageKey, label, durationSeconds };
      });

      let label = "Parallel execution";
      if (groupKey === "assets_voice") {
        label = "Parallel (Visual Assets & Voice)";
      }

      summaries.push({
        groupKey,
        label,
        totalDurationSeconds: group.duration_seconds,
        stages: stageItems,
      });
    }
  }

  return summaries;
}

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
import {
  isStreamlinedStageActive,
  latestRelevantTask,
  latestStreamlinedChildTask,
} from "./railStatusResolver";

export function resolveStageTiming(
  stage: RailStage,
  status: RailStatus,
  state: QuizV2State | null,
  tasks: Task[] = [],
  pipelineTask?: Task | null,
  now: number = Date.now(),
): StageTimingInfo | null {
  const recorded = state?.timings?.stages?.[stage];
  const isRunning = status === "running";

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

  // Active / running timing
  if (isRunning) {
    if (recorded?.started_at) {
      const startMs = new Date(recorded.started_at).getTime();
      durationSeconds = Math.max(0, Math.floor((now - startMs) / 1000));
    } else {
      const childTask = latestStreamlinedChildTask(stage as StreamlinedRailStage, tasks) ?? latestRelevantTask(stage, tasks);
      if (childTask && isTaskActive(childTask)) {
        const startMs = new Date(childTask.started_at || childTask.created_at).getTime();
        durationSeconds = Math.max(0, Math.floor((now - startMs) / 1000) + (childTask.accumulated_duration_seconds || 0));
      } else if (
        pipelineTask &&
        isTaskActive(pipelineTask) &&
        isStreamlinedStageActive(stage as StreamlinedRailStage, pipelineTask)
      ) {
        // Active pipeline stage fallback
        const startMs = new Date(pipelineTask.started_at || pipelineTask.created_at).getTime();
        durationSeconds = Math.max(0, Math.floor((now - startMs) / 1000));
      }
    }
  }

  // Fallback to task timestamps when no recorded timing exists
  if (durationSeconds === null || durationSeconds === 0) {
    const childTask = latestStreamlinedChildTask(stage as StreamlinedRailStage, tasks) ?? latestRelevantTask(stage, tasks);
    if (childTask && (childTask.status === "COMPLETED" || isTaskActive(childTask))) {
      const startMs = new Date(childTask.started_at || childTask.created_at).getTime();
      const endMs = childTask.completed_at ? new Date(childTask.completed_at).getTime() : now;
      durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000) + (childTask.accumulated_duration_seconds || 0));
    }
  }

  // Special fallback for parallel sequence scenes in legacy mode
  if (stage === "scenes" && (durationSeconds === null || durationSeconds === 0)) {
    const seqTasks = tasks.filter((t) => t.task_type === "GENERATE_SEQUENCE_SCENES" && (t.status === "COMPLETED" || isTaskActive(t)));
    if (seqTasks.length > 0) {
      const starts = seqTasks.map((t) => new Date(t.started_at || t.created_at).getTime());
      const ends = seqTasks.map((t) => (t.completed_at ? new Date(t.completed_at).getTime() : now));
      const minStart = Math.min(...starts);
      const maxEnd = Math.max(...ends);
      durationSeconds = Math.max(0, Math.floor((maxEnd - minStart) / 1000));
      if (seqTasks.length > 1) {
        isParallel = true;
        parallelTotalSeconds = durationSeconds;
      }
    }
  }

  if (durationSeconds === null || (durationSeconds === 0 && !isRunning)) {
    return null;
  }

  const formattedDuration = formatElapsedHuman(durationSeconds) + (isRunning ? "..." : "");
  let tooltip = `Duration: ${formattedDuration}`;
  if (isParallel && parallelTotalSeconds && parallelTotalSeconds > 0) {
    const parallelFormatted = formatElapsedHuman(parallelTotalSeconds);
    tooltip = `Individual: ${formattedDuration} · Parallel total: ${parallelFormatted}`;
  }

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

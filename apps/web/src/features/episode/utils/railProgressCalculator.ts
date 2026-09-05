import type { Task } from "@studio/shared";
import type { QuizV2State } from "../../../api";
import { isTaskActive, latestTask } from "../../../lib/utils";
import {
  QUIZ_PREPRODUCTION_TASK_MAP,
  type RailStage,
  type Readiness,
  type StageProgress,
  type StreamlinedRailStage,
} from "./railStageDefinitions";
import { latestRelevantTask } from "./railStatusResolver";

export function itemProgress(completed: number, total: number, unit: string): StageProgress {
  const safeTotal = Math.max(1, total);
  const safeCompleted = Math.min(safeTotal, Math.max(0, completed));
  return { completed: safeCompleted, total: safeTotal, percent: Math.round((safeCompleted / safeTotal) * 100), unit };
}

export function taskProgress(tasks: Task[], unit: string): StageProgress {
  const completed = tasks.filter((task) => task.status === "COMPLETED").length;
  const fallback = itemProgress(completed, tasks.length, unit);
  if (tasks.length === 1 && isTaskActive(tasks[0]) && typeof tasks[0].progress_percent === "number") {
    return { ...fallback, percent: tasks[0].progress_percent };
  }
  return fallback;
}

export function sequenceTaskProgress(tasks: Task[], expectedTotal: number): StageProgress {
  const latestBySequence = new Map<number, Task>();
  for (const task of [...tasks].sort((left, right) => right.created_at.localeCompare(left.created_at))) {
    if (task.scene_number !== null && !latestBySequence.has(task.scene_number)) {
      latestBySequence.set(task.scene_number, task);
    }
  }
  const total = Math.max(expectedTotal, latestBySequence.size);
  const completed = [...latestBySequence.values()].filter((task) => task.status === "COMPLETED").length;
  return itemProgress(completed, total, "tasks");
}

function resolveAssetsProgress(state: QuizV2State, pipelineTask?: Task | null): StageProgress {
  if (pipelineTask && isTaskActive(pipelineTask) && pipelineTask.progress_message) {
    const match = /(?:resolving\s+)?assets\s+(\d+)\/(\d+)/i.exec(pipelineTask.progress_message);
    if (match) {
      return itemProgress(Number(match[1]), Number(match[2]), "assets");
    }
  }
  const total = state.asset_plan?.assets.length ?? 0;
  return total > 0
    ? itemProgress(state.asset_resolution?.assets.length ?? 0, total, "assets")
    : itemProgress(state.asset_plan ? 1 : 0, 1, "task");
}

function resolveVoiceProgress(state: QuizV2State, pipelineTask?: Task | null): StageProgress {
  if (pipelineTask && isTaskActive(pipelineTask) && pipelineTask.progress_message) {
    const match = /(?:generating|reusing)?\s*voice\s+(\d+)\/(\d+)/i.exec(pipelineTask.progress_message);
    if (match) {
      return itemProgress(Number(match[1]), Number(match[2]), "segments");
    }
  }
  const segments = state.voice_plan?.segments ?? [];
  return segments.length > 0
    ? itemProgress(segments.filter((segment) => segment.duration_seconds !== null).length, segments.length, "segments")
    : itemProgress(0, 1, "task");
}

function resolveScenesProgress(
  readiness: Readiness,
  tasks: Task[],
  questionTotal: number,
  pipelineTask?: Task | null,
): StageProgress {
  if (pipelineTask && isTaskActive(pipelineTask) && pipelineTask.progress_message) {
    const match = /(?:sequences|shots)\s+(\d+)\/(\d+)/i.exec(pipelineTask.progress_message);
    if (match) {
      return itemProgress(Number(match[1]), Number(match[2]), "tasks");
    }
  }
  const sequenceTasks = tasks.filter((task) => task.task_type === "GENERATE_SEQUENCE_SCENES");
  return sequenceTasks.length > 0
    ? sequenceTaskProgress(sequenceTasks, questionTotal)
    : itemProgress(readiness.scenes ? 1 : 0, 1, "task");
}

function resolveRenderProgress(
  state: QuizV2State,
  tasks: Task[],
  readiness: Readiness,
  pipelineTask?: Task | null,
): StageProgress {
  const videoTask = latestRelevantTask("render", tasks);
  const renderProgress = videoTask?.render_progress ?? pipelineTask?.render_progress;
  if (renderProgress && renderProgress.total_frames > 0) {
    return itemProgress(renderProgress.frames_completed, renderProgress.total_frames, "frames");
  }
  const message = videoTask?.progress_message || pipelineTask?.progress_message;
  if (message) {
    const match = /(?:rendering|streaming|render)?\s*frames?\s*(\d[\d,]*)\s*(?:\/|of)\s*(\d[\d,]*)/i.exec(message);
    if (match) {
      const completed = Number(match[1].replace(/,/g, ""));
      const total = Number(match[2].replace(/,/g, ""));
      if (total > 0) {
        return itemProgress(completed, total, "frames");
      }
    }
  }
  if (videoTask) {
    if (videoTask.status === "COMPLETED" || readiness.video || state.stages.render === "ready") {
      return itemProgress(1, 1, "task");
    }
    if (isTaskActive(videoTask) && typeof videoTask.progress_percent === "number") {
      return {
        completed: 0,
        total: 1,
        percent: Math.max(0, Math.min(100, Math.round(videoTask.progress_percent))),
        unit: "task",
      };
    }
  }
  if (readiness.video || state.stages.render === "ready") {
    return itemProgress(1, 1, "task");
  }
  return itemProgress(0, 1, "task");
}

export function resolveProgress(
  stage: RailStage,
  readiness: Readiness,
  state: QuizV2State,
  tasks: Task[],
  questionCount: number,
  pipelineTask?: Task | null,
): StageProgress {
  const questionTotal = Math.max(0, questionCount || state.quiz?.questions.length || 0);

  if (stage === "questions") {
    return itemProgress(state.quiz?.questions.length ?? 0, questionTotal, "questions");
  }
  if (stage === "director") {
    return itemProgress(state.director_plan?.beats.length ?? 0, questionTotal || state.director_plan?.beats.length || 1, "beats");
  }
  if (stage === "assets") {
    return resolveAssetsProgress(state, pipelineTask);
  }
  if (stage === "voice") {
    return resolveVoiceProgress(state, pipelineTask);
  }
  if (stage === "timeline") {
    const coveredQuestions = new Set(
      (state.timeline?.events ?? []).filter((event) => event.question_id).map((event) => event.question_id),
    ).size;
    return questionTotal > 0
      ? itemProgress(coveredQuestions, questionTotal, "questions")
      : itemProgress(state.timeline ? 1 : 0, 1, "task");
  }
  if (stage === "qa") {
    return itemProgress(state.assessment ? 1 : 0, 1, "check");
  }
  if (stage === "scenes") {
    return resolveScenesProgress(readiness, tasks, questionTotal, pipelineTask);
  }
  if (stage === "render") {
    return resolveRenderProgress(state, tasks, readiness, pipelineTask);
  }

  const mapping = QUIZ_PREPRODUCTION_TASK_MAP[stage];
  if (mapping) {
    const task = latestTask(tasks, mapping.types);
    return task ? taskProgress([task], "task") : itemProgress(Number(readiness[mapping.readyKey]), 1, "task");
  }

  return itemProgress(0, 1, "task");
}

export function resolveStreamlinedProgress(
  stage: StreamlinedRailStage,
  readiness: Readiness,
  state: QuizV2State,
  tasks: Task[],
  questionCount: number,
  pipelineTask?: Task | null,
): StageProgress {
  const questionTotal = Math.max(0, questionCount || state.quiz?.questions.length || 0);

  if (stage === "quizContent") {
    const completed = state.quiz?.questions.length ?? (readiness.script ? questionTotal || 1 : 0);
    const total = Math.max(1, questionTotal || completed);
    return itemProgress(completed, total, "questions");
  }

  if (stage === "assets") {
    return resolveAssetsProgress(state, pipelineTask);
  }

  if (stage === "voice") {
    return resolveVoiceProgress(state, pipelineTask);
  }

  if (stage === "thumbnail") {
    const ready = Boolean(readiness.thumbnail);
    return itemProgress(ready ? 1 : 0, 1, "cover");
  }

  if (stage === "description") {
    const ready = Boolean(readiness.description || state.description);
    return itemProgress(ready ? 1 : 0, 1, "meta");
  }

  if (stage === "qaGates") {
    if (state.assessment) {
      return itemProgress(1, 1, "qa pass");
    }
    if (state.timeline) {
      return itemProgress(1, 2, "timeline");
    }
    return itemProgress(0, 1, "qa");
  }

  if (stage === "render") {
    return resolveRenderProgress(state, tasks, readiness, pipelineTask);
  }

  return itemProgress(0, 1, "task");
}

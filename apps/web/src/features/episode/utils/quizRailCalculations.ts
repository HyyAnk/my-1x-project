import type { Task } from "@studio/shared";
import type { QuizV2Stages, QuizV2State } from "../../../api";
import { isTaskActive, latestTask } from "../../../lib/utils";

export type RailStage = "research" | "treatment" | "script" | "visualBible" | "scenes" | keyof QuizV2Stages;
export type RailStatus = QuizV2Stages["research"] | "queued";
export type StageProgress = { completed: number; total: number; percent: number; unit: string };
export type Readiness = { research: boolean; treatment: boolean; script: boolean; visualBible: boolean; scenes: boolean; video: boolean };

export const STAGES: Array<{ key: RailStage; label: string }> = [
  { key: "research", label: "Research" },
  { key: "treatment", label: "Treatment" },
  { key: "script", label: "Script" },
  { key: "visualBible", label: "Visual bible" },
  { key: "scenes", label: "Scenes" },
  { key: "questions", label: "Questions" },
  { key: "director", label: "Director" },
  { key: "assets", label: "Assets" },
  { key: "voice", label: "Voice" },
  { key: "timeline", label: "Timeline" },
  { key: "qa", label: "QA" },
  { key: "render", label: "Render" },
];

export function resolveStatus(
  stage: RailStage,
  index: number,
  readiness: Readiness,
  state: QuizV2State,
  pipelineTask: Task | null,
  tasks: Task[],
  currentStage: { key: RailStage; label: string } | null,
): RailStatus {
  const base = baseStatus(stage, readiness, state);
  const failedStage = pipelineTask?.status === "FAILED" ? currentStage?.key : null;
  if (failedStage === stage) return "failed";

  const currentIndex = currentStage ? STAGES.findIndex((candidate) => candidate.key === currentStage.key) : -1;
  if (pipelineTask && isTaskActive(pipelineTask) && currentIndex >= 0) {
    if (index < currentIndex) return "ready";
    if (index === currentIndex) return "running";
    if (base !== "ready") return "queued";
  }

  const childTask = latestRelevantTask(stage, tasks);
  if ((childTask?.status === "FAILED" || childTask?.status === "CANCELLED") && base !== "ready") return "failed";
  if (childTask && isTaskActive(childTask)) return "running";
  if (currentStage && pipelineTask?.status === "FAILED" && index < currentIndex) {
    return "ready";
  }
  return base;
}

export function baseStatus(stage: RailStage, readiness: Readiness, state: QuizV2State): RailStatus {
  if (stage === "research") return readiness.research ? "ready" : "not_started";
  if (stage === "treatment") return readiness.treatment ? "ready" : "not_started";
  if (stage === "script") return readiness.script ? "ready" : "not_started";
  if (stage === "visualBible") return readiness.visualBible ? "ready" : "not_started";
  if (stage === "scenes") return readiness.scenes ? "ready" : "not_started";
  if (stage === "render") return readiness.video ? "ready" : state.stages.render;
  return state.stages[stage];
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

function resolveScenesProgress(readiness: Readiness, tasks: Task[], questionTotal: number, pipelineTask?: Task | null): StageProgress {
  if (pipelineTask && isTaskActive(pipelineTask) && pipelineTask.progress_message) {
    const match = /(?:sequences|shots)\s+(\d+)\/(\d+)/i.exec(pipelineTask.progress_message);
    if (match) {
      return itemProgress(Number(match[1]), Number(match[2]), "tasks");
    }
  }
  const sequenceTasks = tasks.filter((task) => task.task_type === "GENERATE_SEQUENCE_SCENES");
  return sequenceTasks.length > 0 ? sequenceTaskProgress(sequenceTasks, questionTotal) : itemProgress(readiness.scenes ? 1 : 0, 1, "task");
}

const QUIZ_PREPRODUCTION_TASK_MAP: Partial<Record<RailStage, { types: Task["task_type"][]; readyKey: keyof Readiness }>> = {
  research: { types: ["GENERATE_RESEARCH"], readyKey: "research" },
  treatment: { types: ["GENERATE_TREATMENT"], readyKey: "treatment" },
  script: { types: ["GENERATE_SCRIPT"], readyKey: "script" },
  visualBible: { types: ["GENERATE_VISUAL_BIBLE"], readyKey: "visualBible" },
  render: { types: ["GENERATE_VIDEO"], readyKey: "video" },
};

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
    const coveredQuestions = new Set((state.timeline?.events ?? []).filter((event) => event.question_id).map((event) => event.question_id))
      .size;
    return questionTotal > 0 ? itemProgress(coveredQuestions, questionTotal, "questions") : itemProgress(state.timeline ? 1 : 0, 1, "task");
  }
  if (stage === "qa") {
    return itemProgress(state.assessment ? 1 : 0, 1, "check");
  }
  if (stage === "scenes") {
    return resolveScenesProgress(readiness, tasks, questionTotal, pipelineTask);
  }

  const mapping = QUIZ_PREPRODUCTION_TASK_MAP[stage];
  if (mapping) {
    const task = latestTask(tasks, mapping.types);
    return task ? taskProgress([task], "task") : itemProgress(Number(readiness[mapping.readyKey]), 1, "task");
  }

  return itemProgress(0, 1, "task");
}

export function itemProgress(completed: number, total: number, unit: string): StageProgress {
  const safeTotal = Math.max(1, total);
  const safeCompleted = Math.min(safeTotal, Math.max(0, completed));
  return { completed: safeCompleted, total: safeTotal, percent: Math.round((safeCompleted / safeTotal) * 100), unit };
}

export function taskProgress(tasks: Task[], unit: string): StageProgress {
  const completed = tasks.filter((task) => task.status === "COMPLETED").length;
  const fallback = itemProgress(completed, tasks.length, unit);
  if (tasks.length === 1 && isTaskActive(tasks[0]) && typeof tasks[0].progress_percent === "number")
    return { ...fallback, percent: tasks[0].progress_percent };
  return fallback;
}

export function sequenceTaskProgress(tasks: Task[], expectedTotal: number): StageProgress {
  const latestBySequence = new Map<number, Task>();
  for (const task of [...tasks].sort((left, right) => right.created_at.localeCompare(left.created_at))) {
    if (task.scene_number !== null && !latestBySequence.has(task.scene_number)) latestBySequence.set(task.scene_number, task);
  }
  const total = Math.max(expectedTotal, latestBySequence.size);
  const completed = [...latestBySequence.values()].filter((task) => task.status === "COMPLETED").length;
  return itemProgress(completed, total, "tasks");
}

export function latestRelevantTask(stage: RailStage, tasks: Task[]): Task | null {
  const types: Partial<Record<RailStage, Task["task_type"][]>> = {
    research: ["GENERATE_RESEARCH"],
    treatment: ["GENERATE_TREATMENT"],
    script: ["GENERATE_SCRIPT"],
    visualBible: ["GENERATE_VISUAL_BIBLE"],
    scenes: ["GENERATE_SCENES", "GENERATE_SEQUENCE_SCENES"],
    render: ["GENERATE_VIDEO"],
  };
  const stageTypes = types[stage];
  if (!stageTypes) return null;
  const matching = tasks.filter((task) => stageTypes.includes(task.task_type));
  if (stage === "scenes")
    return (
      matching
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .find((task) => isTaskActive(task) || task.status === "FAILED" || task.status === "CANCELLED") ?? null
    );
  return latestTask(tasks, stageTypes);
}

const STAGE_KEYWORD_PATTERNS: Array<{ pattern: RegExp; stageKey: RailStage }> = [
  { pattern: /research/, stageKey: "research" },
  { pattern: /treatment/, stageKey: "treatment" },
  { pattern: /narration script|script/, stageKey: "script" },
  { pattern: /visual bible|style anchor/, stageKey: "visualBible" },
  { pattern: /shot plan|sequence/, stageKey: "scenes" },
  { pattern: /question facts|quiz · locking/, stageKey: "questions" },
  { pattern: /directing|director/, stageKey: "director" },
  { pattern: /semantic assets|resolving|assets/, stageKey: "assets" },
  { pattern: /voice|narration/, stageKey: "voice" },
  { pattern: /timeline/, stageKey: "timeline" },
  { pattern: /qa|quality/, stageKey: "qa" },
  { pattern: /video|render|composition/, stageKey: "render" },
];

export function pipelineStage(task: Task | null): { key: RailStage; label: string } | null {
  if (!task || (!isTaskActive(task) && task.status !== "FAILED")) return null;
  const text = `${task.error ?? ""} ${task.progress_message ?? ""}`.toLowerCase();

  for (const { pattern, stageKey } of STAGE_KEYWORD_PATTERNS) {
    if (pattern.test(text)) {
      return STAGES.find((stage) => stage.key === stageKey) ?? null;
    }
  }

  return null;
}

export function statusLabel(status: RailStatus): string {
  if (status === "not_started") return "Not started";
  if (status === "queued") return "Waiting";
  if (status === "running") return "Generating";
  if (status === "ready") return "Ready";
  if (status === "failed") return "Failed";
  return status.replaceAll("_", " ");
}

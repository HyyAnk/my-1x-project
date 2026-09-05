import type { Task } from "@studio/shared";
import type { QuizV2Stages, QuizV2State } from "../../../api";
import { formatElapsedHuman, isTaskActive, latestTask } from "../../../lib/utils";

export type StreamlinedRailStage =
  | "quizContent"
  | "assets"
  | "voice"
  | "thumbnail"
  | "description"
  | "qaGates"
  | "render";

export type RailStage =
  | "research"
  | "treatment"
  | "script"
  | "visualBible"
  | "scenes"
  | "quizContent"
  | "voiceAndAssets"
  | "thumbnail"
  | "description"
  | "qaGates"
  | keyof QuizV2Stages;
export type RailStatus = QuizV2Stages["research"] | "queued";
export type StageProgress = { completed: number; total: number; percent: number; unit: string };
export type StageTimingInfo = {
  durationSeconds: number | null;
  isRunning: boolean;
  parallelTotalSeconds: number | null;
  isParallel: boolean;
  formattedDuration: string;
  tooltip: string;
};
export type ParallelSummary = {
  groupKey: string;
  label: string;
  totalDurationSeconds: number;
  stages: Array<{ key: string; label: string; durationSeconds: number }>;
};
export type Readiness = {
  research: boolean;
  treatment: boolean;
  script: boolean;
  visualBible: boolean;
  scenes: boolean;
  video: boolean;
  thumbnail?: boolean;
  description?: boolean;
};

export const STREAMLINED_STAGES: Array<{ key: StreamlinedRailStage; label: string }> = [
  { key: "quizContent", label: "Quiz Content" },
  { key: "assets", label: "Visual Assets" },
  { key: "voice", label: "Voice (TTS)" },
  { key: "thumbnail", label: "Thumbnail" },
  { key: "description", label: "Description" },
  { key: "qaGates", label: "QA Gates" },
  { key: "render", label: "Video Render" },
];

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
  if (
    stage === "quizContent" ||
    stage === "voiceAndAssets" ||
    stage === "thumbnail" ||
    stage === "description" ||
    stage === "qaGates"
  ) {
    return baseStreamlinedStatus(stage as StreamlinedRailStage, readiness, state);
  }
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

function resolveRenderProgress(state: QuizV2State, tasks: Task[], readiness: Readiness, pipelineTask?: Task | null): StageProgress {
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

const QUIZ_PREPRODUCTION_TASK_MAP: Partial<Record<RailStage, { types: Task["task_type"][]; readyKey: keyof Readiness }>> = {
  research: { types: ["GENERATE_RESEARCH"], readyKey: "research" },
  treatment: { types: ["GENERATE_TREATMENT"], readyKey: "treatment" },
  script: { types: ["GENERATE_SCRIPT"], readyKey: "script" },
  visualBible: { types: ["GENERATE_VISUAL_BIBLE"], readyKey: "visualBible" },
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
    questions: ["GENERATE_QUIZ"],
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
  { pattern: /question facts|quiz · locking|generating structured questions|quiz · questions/, stageKey: "questions" },
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

export function baseStreamlinedStatus(stage: StreamlinedRailStage, readiness: Readiness, state: QuizV2State): RailStatus {
  if (stage === "quizContent") {
    if (state.stages.questions === "failed") return "failed";
    if (state.stages.questions === "running") return "running";
    if (state.stages.questions === "ready" || state.quiz !== null || readiness.script) return "ready";
    return state.stages.questions ?? "not_started";
  }
  if (stage === "assets") {
    if (state.stages.assets === "failed") return "failed";
    if (state.stages.assets === "running") return "running";
    if (state.stages.assets === "ready") return "ready";
    const total = state.asset_plan?.assets.length ?? 0;
    const resolved = state.asset_resolution?.assets.length ?? 0;
    if (total > 0 && resolved >= total) return "ready";
    return state.stages.assets ?? "not_started";
  }
  if (stage === "voice") {
    if (state.stages.voice === "failed") return "failed";
    if (state.stages.voice === "running") return "running";
    if (state.stages.voice === "ready") return "ready";
    const segments = state.voice_plan?.segments ?? [];
    if (segments.length > 0 && segments.every((s) => s.duration_seconds !== null)) return "ready";
    return state.stages.voice ?? "not_started";
  }
  if (stage === "thumbnail") {
    if (readiness.thumbnail) return "ready";
    return "not_started";
  }
  if (stage === "description") {
    if (readiness.description || state.description) return "ready";
    return "not_started";
  }
  if (stage === "qaGates") {
    if (state.stages.qa === "failed" || state.stages.timeline === "failed") return "failed";
    if (state.stages.qa === "running" || state.stages.timeline === "running") return "running";
    if (state.assessment !== null || state.stages.qa === "ready") return "ready";
    if (state.stages.timeline === "ready") return "running";
    return "not_started";
  }
  if (stage === "render") {
    if (state.stages.render === "failed") return "failed";
    if (state.stages.render === "running") return "running";
    if (readiness.video || state.stages.render === "ready") return "ready";
    return state.stages.render ?? "not_started";
  }
  return "not_started";
}

export function latestStreamlinedChildTask(stage: StreamlinedRailStage, tasks: Task[]): Task | null {
  const types: Partial<Record<StreamlinedRailStage, Task["task_type"][]>> = {
    quizContent: ["GENERATE_QUIZ", "GENERATE_SCRIPT", "GENERATE_TREATMENT", "GENERATE_RESEARCH"],
    assets: ["GENERATE_BUNDLE_IMAGE", "GENERATE_VISUAL_BIBLE"],
    voice: ["GENERATE_AUDIO"],
    qaGates: ["GENERATE_SCENES", "GENERATE_SEQUENCE_SCENES"],
    render: ["GENERATE_VIDEO"],
  };
  const stageTypes = types[stage];
  if (!stageTypes || stageTypes.length === 0) return null;
  return latestTask(tasks, stageTypes);
}

export function isStreamlinedStageActive(stage: StreamlinedRailStage, pipelineTask: Task | null): boolean {
  if (!pipelineTask || (!isTaskActive(pipelineTask) && pipelineTask.status !== "FAILED")) return false;
  const text = `${pipelineTask.error ?? ""} ${pipelineTask.progress_message ?? ""}`.toLowerCase();

  if (stage === "quizContent") {
    return /quiz · locking|generating structured questions|quiz · generating|question facts|quiz · questions/.test(text);
  }
  if (stage === "assets") {
    return /assets|planning semantic assets|resolving assets|semantic assets/.test(text);
  }
  if (stage === "voice") {
    return /voice|generating per-question voice|reusing voice|voice pacing/.test(text);
  }
  if (stage === "thumbnail") {
    return /thumbnail/.test(text);
  }
  if (stage === "description") {
    return /description/.test(text);
  }
  if (stage === "qaGates") {
    return /timeline|deterministic timeline|qa|quality|assessment/.test(text);
  }
  if (stage === "render") {
    return /video|rendering frame|render|linting quiz composition/.test(text);
  }
  return false;
}

export function resolveStreamlinedStatus(
  stage: StreamlinedRailStage,
  index: number,
  readiness: Readiness,
  state: QuizV2State,
  pipelineTask: Task | null,
  tasks: Task[],
  currentStage: { key: StreamlinedRailStage; label: string } | null,
): RailStatus {
  const base = baseStreamlinedStatus(stage, readiness, state);

  const failedStage = pipelineTask?.status === "FAILED" ? currentStage?.key : null;
  if (failedStage === stage) return "failed";

  if (pipelineTask && isTaskActive(pipelineTask) && isStreamlinedStageActive(stage, pipelineTask)) {
    return "running";
  }

  const childTask = latestStreamlinedChildTask(stage, tasks);
  if ((childTask?.status === "FAILED" || childTask?.status === "CANCELLED") && base !== "ready") return "failed";
  if (childTask && isTaskActive(childTask)) return "running";

  const currentIndex = currentStage ? STREAMLINED_STAGES.findIndex((candidate) => candidate.key === currentStage.key) : -1;
  if (pipelineTask && isTaskActive(pipelineTask) && currentIndex >= 0) {
    if (index < currentIndex) return "ready";
    if (index === currentIndex) return "running";
    if (base !== "ready") return "queued";
  }

  return base;
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

const STREAMLINED_KEYWORD_PATTERNS: Array<{ pattern: RegExp; stageKey: StreamlinedRailStage }> = [
  { pattern: /question facts|quiz · locking|generating structured questions|quiz · questions|questions|research|treatment|script/, stageKey: "quizContent" },
  { pattern: /thumbnail/, stageKey: "thumbnail" },
  { pattern: /description/, stageKey: "description" },
  { pattern: /voice|narration/, stageKey: "voice" },
  { pattern: /asset|visual/, stageKey: "assets" },
  { pattern: /qa|quality|timeline|assessment/, stageKey: "qaGates" },
  { pattern: /video|render|composition|frame/, stageKey: "render" },
];

export function pipelineStreamlinedStage(task: Task | null): { key: StreamlinedRailStage; label: string } | null {
  if (!task || (!isTaskActive(task) && task.status !== "FAILED")) return null;
  const text = `${task.error ?? ""} ${task.progress_message ?? ""}`.toLowerCase();

  for (const { pattern, stageKey } of STREAMLINED_KEYWORD_PATTERNS) {
    if (pattern.test(text)) {
      return STREAMLINED_STAGES.find((stage) => stage.key === stageKey) ?? null;
    }
  }

  return null;
}

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
      } else if (pipelineTask && isTaskActive(pipelineTask) && isStreamlinedStageActive(stage as StreamlinedRailStage, pipelineTask)) {
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


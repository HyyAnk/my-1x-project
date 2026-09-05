import type { Task } from "@studio/shared";
import type { QuizV2State } from "../../../api";
import { isTaskActive, latestTask } from "../../../lib/utils";
import {
  STAGES,
  STREAMLINED_STAGES,
  STAGE_KEYWORD_PATTERNS,
  STREAMLINED_KEYWORD_PATTERNS,
  type RailStage,
  type RailStatus,
  type Readiness,
  type StreamlinedRailStage,
} from "./railStageDefinitions";

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
  if (stage === "scenes") {
    return (
      matching
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .find((task) => isTaskActive(task) || task.status === "FAILED" || task.status === "CANCELLED") ?? null
    );
  }
  return latestTask(tasks, stageTypes);
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

export function baseStatus(stage: RailStage, readiness: Readiness, state: QuizV2State): RailStatus {
  if (stage === "research") return readiness.research ? "ready" : "not_started";
  if (stage === "treatment") return readiness.treatment ? "ready" : "not_started";
  if (stage === "script") return readiness.script ? "ready" : "not_started";
  if (stage === "visualBible") return readiness.visualBible ? "ready" : "not_started";
  if (stage === "scenes") return readiness.scenes ? "ready" : "not_started";
  if (stage === "render") return readiness.video ? "ready" : state.stages.render;
  if (stage === "quizContent" || stage === "voiceAndAssets" || stage === "thumbnail" || stage === "description" || stage === "qaGates") {
    return baseStreamlinedStatus(stage as StreamlinedRailStage, readiness, state);
  }
  return state.stages[stage];
}

function resolveQuizContentStatus(readiness: Readiness, state?: Partial<QuizV2State> | null): RailStatus {
  const stageStatus = state?.stages?.questions;
  if (stageStatus === "failed") return "failed";
  if (stageStatus === "running") return "running";
  if (stageStatus === "ready" || (state?.quiz !== null && state?.quiz !== undefined) || readiness.script) {
    return "ready";
  }
  return stageStatus ?? "not_started";
}

function resolveAssetsStatus(state?: Partial<QuizV2State> | null): RailStatus {
  const stageStatus = state?.stages?.assets;
  if (stageStatus === "failed") return "failed";
  if (stageStatus === "running") return "running";
  if (stageStatus === "ready") return "ready";
  const total = state?.asset_plan?.assets.length ?? 0;
  const resolved = state?.asset_resolution?.assets.length ?? 0;
  if (total > 0 && resolved >= total) return "ready";
  return stageStatus ?? "not_started";
}

function resolveVoiceStatus(state?: Partial<QuizV2State> | null): RailStatus {
  const stageStatus = state?.stages?.voice;
  if (stageStatus === "failed") return "failed";
  if (stageStatus === "running") return "running";
  if (stageStatus === "ready") return "ready";
  const segments = state?.voice_plan?.segments ?? [];
  if (segments.length > 0 && segments.every((s) => s.duration_seconds !== null)) return "ready";
  return stageStatus ?? "not_started";
}

function resolveQaGatesStatus(state?: Partial<QuizV2State> | null): RailStatus {
  const stages = state?.stages;
  if (stages?.qa === "failed" || stages?.timeline === "failed") return "failed";
  if (stages?.qa === "running" || stages?.timeline === "running") return "running";
  if ((state?.assessment !== null && state?.assessment !== undefined) || stages?.qa === "ready") return "ready";
  if (stages?.timeline === "ready") return "running";
  return "not_started";
}

function resolveRenderStatus(readiness: Readiness, state?: Partial<QuizV2State> | null): RailStatus {
  const stageStatus = state?.stages?.render;
  if (stageStatus === "failed") return "failed";
  if (stageStatus === "running") return "running";
  if (readiness.video || stageStatus === "ready") return "ready";
  return stageStatus ?? "not_started";
}

export function baseStreamlinedStatus(stage: StreamlinedRailStage, readiness: Readiness, state?: Partial<QuizV2State> | null): RailStatus {
  switch (stage) {
    case "quizContent":
      return resolveQuizContentStatus(readiness, state);
    case "assets":
      return resolveAssetsStatus(state);
    case "voice":
      return resolveVoiceStatus(state);
    case "thumbnail":
      return readiness.thumbnail ? "ready" : "not_started";
    case "description":
      return readiness.description || state?.description ? "ready" : "not_started";
    case "qaGates":
      return resolveQaGatesStatus(state);
    case "render":
      return resolveRenderStatus(readiness, state);
    default:
      return "not_started";
  }
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

import type { QuizShort, Task } from "@studio/shared";
import type { PipelineRailReadiness } from "../../episode/components/PipelineRail";
import type { QuizShortPipelineAction, QuizShortStageKey, QuizShortStageState, QuizShortStageSummary, QuizShortWorkspaceResponse } from "../types/quizShort.types";

const STAGE_LABELS: Record<QuizShortStageKey, string> = {
  questions: "Questions",
  director: "Director plan",
  timeline: "Voice & timeline",
  qa: "QA gates",
  render: "Portrait render",
};

const STATE_LABELS: Record<QuizShortStageState, string> = {
  not_started: "Waiting",
  ready: "Ready",
  stale: "Stale",
  running: "Generating",
  failed: "Blocked",
};

const STAGE_ORDER: readonly QuizShortStageKey[] = ["questions", "director", "timeline", "qa", "render"];

export function buildQuizShortStageSummaries(stages: QuizShortWorkspaceResponse["stages"] | null): QuizShortStageSummary[] {
  return STAGE_ORDER.map((key) => {
    const state = stages?.[key] ?? "not_started";
    return { key, label: STAGE_LABELS[key], state, stateLabel: STATE_LABELS[state] };
  });
}

/** Maps the five Quiz Short stages onto the four streamlined rail steps shared with Episodes. */
export function buildQuizShortRailReadiness(stages: QuizShortWorkspaceResponse["stages"] | null): PipelineRailReadiness {
  const isReady = (key: QuizShortStageKey) => stages?.[key] === "ready";
  return {
    quizContent: isReady("questions") && isReady("director"),
    voiceAndAssets: isReady("timeline"),
    qaGates: isReady("qa"),
    finalVideo: isReady("render"),
  };
}

export function resolveQuizShortPipelineAction(quizShort: QuizShort | null, pipelineTask: Task | null): QuizShortPipelineAction {
  if (pipelineTask && (pipelineTask.status === "FAILED" || pipelineTask.status === "CANCELLED") && !quizShort?.video_asset_path) {
    return { label: "Retry production", intent: "retry" };
  }
  if (quizShort?.video_asset_path) return { label: "Rebuild Quiz Short", intent: "rebuild" };
  return { label: "Start production", intent: "start" };
}

export function formatQuizShortDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "--";
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return minutes > 0 ? `${minutes}m ${rest.toString().padStart(2, "0")}s` : `${rest}s`;
}

export function describeQuizShortRender(quizShort: QuizShort | null): string {
  if (!quizShort?.video_asset_path) return "No portrait render yet. Start production to build the 9:16 video.";
  if (quizShort.render_stale) return "Settings changed since the last render. Rebuild to refresh the video.";
  return `Rendered ${formatQuizShortDuration(quizShort.video_duration_seconds)} portrait video.`;
}

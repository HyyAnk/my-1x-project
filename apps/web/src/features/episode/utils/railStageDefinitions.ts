import type { Task } from "@studio/shared";
import type { QuizV2Stages } from "../../../api";

export type StreamlinedRailStage = "quizContent" | "assets" | "voice" | "thumbnail" | "description" | "qaGates" | "render";

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

export type StageProgress = {
  completed: number;
  total: number;
  percent: number;
  unit: string;
};

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

export const QUIZ_PREPRODUCTION_TASK_MAP: Partial<Record<RailStage, { types: Task["task_type"][]; readyKey: keyof Readiness }>> = {
  research: { types: ["GENERATE_RESEARCH"], readyKey: "research" },
  treatment: { types: ["GENERATE_TREATMENT"], readyKey: "treatment" },
  script: { types: ["GENERATE_SCRIPT"], readyKey: "script" },
  visualBible: { types: ["GENERATE_VISUAL_BIBLE"], readyKey: "visualBible" },
};

export const STAGE_KEYWORD_PATTERNS: Array<{ pattern: RegExp; stageKey: RailStage }> = [
  { pattern: /research/, stageKey: "research" },
  { pattern: /treatment/, stageKey: "treatment" },
  { pattern: /narration script|script/, stageKey: "script" },
  { pattern: /visual bible|style anchor/, stageKey: "visualBible" },
  { pattern: /shot plan|sequence/, stageKey: "scenes" },
  {
    pattern: /question facts|quiz · locking|generating structured questions|quiz · questions/,
    stageKey: "questions",
  },
  { pattern: /directing|director/, stageKey: "director" },
  { pattern: /semantic assets|resolving|assets/, stageKey: "assets" },
  { pattern: /voice|narration/, stageKey: "voice" },
  { pattern: /timeline/, stageKey: "timeline" },
  { pattern: /qa|quality/, stageKey: "qa" },
  { pattern: /video|render|composition/, stageKey: "render" },
];

export const STREAMLINED_KEYWORD_PATTERNS: Array<{ pattern: RegExp; stageKey: StreamlinedRailStage }> = [
  {
    pattern: /question facts|quiz · locking|generating structured questions|quiz · questions|questions|research|treatment|script/,
    stageKey: "quizContent",
  },
  { pattern: /thumbnail/, stageKey: "thumbnail" },
  { pattern: /description/, stageKey: "description" },
  { pattern: /voice|narration/, stageKey: "voice" },
  { pattern: /asset|visual/, stageKey: "assets" },
  { pattern: /qa|quality|timeline|assessment/, stageKey: "qaGates" },
  { pattern: /video|render|composition|frame/, stageKey: "render" },
];

export function statusLabel(status: RailStatus): string {
  if (status === "not_started") return "Not started";
  if (status === "queued") return "Waiting";
  if (status === "running") return "Generating";
  if (status === "ready") return "Ready";
  if (status === "stale") return "Stale (Re-render Recommended)";
  if (status === "failed") return "Failed";
  return (status as string).replace(/_/g, " ");
}

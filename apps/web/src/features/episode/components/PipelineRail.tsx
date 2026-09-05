import { CheckCircle, CircleNotch } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { isTaskActive } from "../../../lib/utils";

export type PipelineRailReadiness = {
  // Legacy 7-stage flags
  research?: boolean;
  treatment?: boolean;
  script?: boolean;
  visualBible?: boolean;
  scenes?: boolean;
  narration?: boolean;
  video?: boolean;
  // Streamlined 4-stage flags
  quizContent?: boolean;
  voiceAndAssets?: boolean;
  qaGates?: boolean;
  finalVideo?: boolean;
};

interface KeywordStageRule {
  readonly keywords: readonly string[];
  readonly stage: string;
}

const STREAMLINED_KEYWORD_RULES: readonly KeywordStageRule[] = [
  { keywords: ["quiz", "research", "treatment", "facts", "director", "script"], stage: "quizContent" },
  { keywords: ["asset", "voice", "audio", "visual"], stage: "voiceAndAssets" },
  { keywords: ["qa", "timeline", "quality", "scene", "sequence", "shot"], stage: "qaGates" },
  { keywords: ["video", "render", "composition"], stage: "finalVideo" },
];

const LEGACY_KEYWORD_RULES: readonly KeywordStageRule[] = [
  { keywords: ["research"], stage: "research" },
  { keywords: ["treatment", "facts", "director"], stage: "treatment" },
  { keywords: ["script"], stage: "script" },
  { keywords: ["visual bible", "asset"], stage: "visualBible" },
  { keywords: ["scene", "sequence", "shot"], stage: "scenes" },
  { keywords: ["voice", "audio", "narration"], stage: "narration" },
  { keywords: ["video", "render"], stage: "video" },
];

const STREAMLINED_TASK_TYPE_MAP: Partial<Record<Task["task_type"], string>> = {
  GENERATE_QUIZ: "quizContent",
  GENERATE_RESEARCH: "quizContent",
  GENERATE_TREATMENT: "quizContent",
  GENERATE_SCRIPT: "quizContent",
  GENERATE_VISUAL_BIBLE: "voiceAndAssets",
  GENERATE_BUNDLE_IMAGE: "voiceAndAssets",
  GENERATE_SCENES: "qaGates",
  GENERATE_SEQUENCE_SCENES: "qaGates",
  GENERATE_VIDEO: "finalVideo",
};

const LEGACY_TASK_TYPE_MAP: Partial<Record<Task["task_type"], string>> = {
  GENERATE_RESEARCH: "research",
  GENERATE_TREATMENT: "treatment",
  GENERATE_SCRIPT: "script",
  GENERATE_VISUAL_BIBLE: "visualBible",
  GENERATE_BUNDLE_IMAGE: "visualBible",
  GENERATE_SCENES: "scenes",
  GENERATE_SEQUENCE_SCENES: "scenes",
  GENERATE_VIDEO: "video",
};

function matchStageFromText(text: string, rules: readonly KeywordStageRule[]): string | null {
  for (const { keywords, stage } of rules) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return stage;
    }
  }
  return null;
}

function resolveActivePipelineStage(task: Task, streamlined: boolean): string | null {
  const text = `${task.error ?? ""} ${task.progress_message ?? ""}`.toLowerCase();
  const rules = streamlined ? STREAMLINED_KEYWORD_RULES : LEGACY_KEYWORD_RULES;
  return matchStageFromText(text, rules);
}

function resolveActiveChildStage(child: Task, streamlined: boolean): string | null {
  const mapping = streamlined ? STREAMLINED_TASK_TYPE_MAP : LEGACY_TASK_TYPE_MAP;
  return mapping[child.task_type] ?? null;
}

export function resolveQuizPipelineStage(pipelineTask: Task | null, tasks: Task[], streamlined: boolean = true): string | null {
  if (pipelineTask && isTaskActive(pipelineTask)) {
    const stage = resolveActivePipelineStage(pipelineTask, streamlined);
    if (stage) return stage;
  }

  const child = tasks.find((task) => isTaskActive(task));
  if (child) {
    return resolveActiveChildStage(child, streamlined);
  }

  return null;
}

export function PipelineRail({
  readiness,
  pipelineTask = null,
  tasks = [],
  streamlined = true,
}: {
  readiness: PipelineRailReadiness;
  pipelineTask?: Task | null;
  tasks?: Task[];
  streamlined?: boolean;
}) {
  const steps = streamlined
    ? [
        {
          key: "quizContent",
          label: "Quiz Content",
          ready: Boolean(readiness.quizContent ?? (readiness.script || readiness.treatment)),
        },
        {
          key: "voiceAndAssets",
          label: "Voice & Assets",
          ready: Boolean(readiness.voiceAndAssets ?? (readiness.visualBible && readiness.narration)),
        },
        {
          key: "qaGates",
          label: "QA Gates",
          ready: Boolean(readiness.qaGates ?? readiness.scenes),
        },
        {
          key: "finalVideo",
          label: "Video Render",
          ready: Boolean(readiness.finalVideo ?? readiness.video),
        },
      ]
    : [
        { key: "research", label: "Research", ready: Boolean(readiness.research) },
        { key: "treatment", label: "Quiz plan", ready: Boolean(readiness.treatment) },
        { key: "script", label: "Script", ready: Boolean(readiness.script) },
        { key: "visualBible", label: "Design", ready: Boolean(readiness.visualBible) },
        { key: "scenes", label: "Scenes", ready: Boolean(readiness.scenes) },
        { key: "narration", label: "Audio", ready: Boolean(readiness.narration) },
        { key: "video", label: "Video", ready: Boolean(readiness.video) },
      ];

  const activeStageKey = resolveQuizPipelineStage(pipelineTask, tasks, streamlined);

  return (
    <ol className="pipeline-rail" aria-label="Episode production progress">
      {steps.map((step, index) => {
        const isRunning = activeStageKey === step.key;
        const isReady = step.ready;
        const className = isRunning ? "is-running" : isReady ? "is-ready" : "";
        return (
          <li className={className} key={step.label}>
            <span>
              {isRunning ? <CircleNotch className="spin" size={15} /> : isReady ? <CheckCircle size={15} weight="fill" /> : index + 1}
            </span>
            <div className="pipeline-rail-content">
              <strong>{step.label}</strong>
              <span className="pipeline-rail-status">{isRunning ? "Generating" : isReady ? "Ready" : "Waiting"}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

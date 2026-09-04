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

export function resolveQuizPipelineStage(
  pipelineTask: Task | null,
  tasks: Task[],
  streamlined: boolean = true,
): string | null {
  if (pipelineTask && isTaskActive(pipelineTask)) {
    const text = `${pipelineTask.error ?? ""} ${pipelineTask.progress_message ?? ""}`.toLowerCase();
    if (streamlined) {
      if (
        text.includes("quiz") ||
        text.includes("research") ||
        text.includes("treatment") ||
        text.includes("facts") ||
        text.includes("director") ||
        text.includes("script")
      )
        return "quizContent";
      if (text.includes("asset") || text.includes("voice") || text.includes("audio") || text.includes("visual"))
        return "voiceAndAssets";
      if (text.includes("qa") || text.includes("timeline") || text.includes("quality") || text.includes("scene") || text.includes("sequence") || text.includes("shot"))
        return "qaGates";
      if (text.includes("video") || text.includes("render") || text.includes("composition"))
        return "finalVideo";
    } else {
      if (text.includes("research")) return "research";
      if (text.includes("treatment") || text.includes("facts") || text.includes("director")) return "treatment";
      if (text.includes("script")) return "script";
      if (text.includes("visual bible") || text.includes("asset")) return "visualBible";
      if (text.includes("scene") || text.includes("sequence") || text.includes("shot")) return "scenes";
      if (text.includes("voice") || text.includes("audio") || text.includes("narration")) return "narration";
      if (text.includes("video") || text.includes("render")) return "video";
    }
  }

  const child = tasks.find((task) => isTaskActive(task));
  if (child) {
    if (streamlined) {
      if (
        child.task_type === "GENERATE_QUIZ" ||
        child.task_type === "GENERATE_RESEARCH" ||
        child.task_type === "GENERATE_TREATMENT" ||
        child.task_type === "GENERATE_SCRIPT"
      )
        return "quizContent";
      if (child.task_type === "GENERATE_VISUAL_BIBLE" || child.task_type === "GENERATE_BUNDLE_IMAGE")
        return "voiceAndAssets";
      if (child.task_type === "GENERATE_SCENES" || child.task_type === "GENERATE_SEQUENCE_SCENES")
        return "qaGates";
      if (child.task_type === "GENERATE_VIDEO")
        return "finalVideo";
    } else {
      if (child.task_type === "GENERATE_RESEARCH") return "research";
      if (child.task_type === "GENERATE_TREATMENT") return "treatment";
      if (child.task_type === "GENERATE_SCRIPT") return "script";
      if (child.task_type === "GENERATE_VISUAL_BIBLE" || child.task_type === "GENERATE_BUNDLE_IMAGE") return "visualBible";
      if (child.task_type === "GENERATE_SCENES" || child.task_type === "GENERATE_SEQUENCE_SCENES") return "scenes";
      if (child.task_type === "GENERATE_VIDEO") return "video";
    }
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

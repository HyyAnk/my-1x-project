import { CheckCircle, CircleNotch } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { isTaskActive } from "../../../lib/utils";

export function resolveQuizPipelineStage(pipelineTask: Task | null, tasks: Task[]): string | null {
  if (pipelineTask && isTaskActive(pipelineTask)) {
    const text = `${pipelineTask.error ?? ""} ${pipelineTask.progress_message ?? ""}`.toLowerCase();
    if (text.includes("research")) return "research";
    if (text.includes("treatment") || text.includes("facts") || text.includes("director")) return "treatment";
    if (text.includes("script")) return "script";
    if (text.includes("visual bible") || text.includes("asset")) return "visualBible";
    if (text.includes("scene") || text.includes("sequence") || text.includes("shot")) return "scenes";
    if (text.includes("voice") || text.includes("audio") || text.includes("narration")) return "narration";
    if (text.includes("video") || text.includes("render")) return "video";
  }
  const child = tasks.find((task) => isTaskActive(task));
  if (child) {
    if (child.task_type === "GENERATE_RESEARCH") return "research";
    if (child.task_type === "GENERATE_TREATMENT") return "treatment";
    if (child.task_type === "GENERATE_SCRIPT") return "script";
    if (child.task_type === "GENERATE_VISUAL_BIBLE" || child.task_type === "GENERATE_BUNDLE_IMAGE") return "visualBible";
    if (child.task_type === "GENERATE_SCENES" || child.task_type === "GENERATE_SEQUENCE_SCENES") return "scenes";
    if (child.task_type === "GENERATE_NARRATION") return "narration";
    if (child.task_type === "GENERATE_VIDEO") return "video";
  }
  return null;
}

export function PipelineRail({
  readiness,
  pipelineTask = null,
  tasks = [],
}: {
  readiness: {
    research: boolean;
    treatment: boolean;
    script: boolean;
    visualBible: boolean;
    scenes: boolean;
    narration: boolean;
    video: boolean;
  };
  quiz?: boolean;
  pipelineTask?: Task | null;
  tasks?: Task[];
}) {
  const steps = [
    { key: "research", label: "Research", ready: readiness.research },
    { key: "treatment", label: "Quiz plan", ready: readiness.treatment },
    { key: "script", label: "Script", ready: readiness.script },
    { key: "visualBible", label: "Design", ready: readiness.visualBible },
    { key: "scenes", label: "Scenes", ready: readiness.scenes },
    { key: "narration", label: "Audio", ready: readiness.narration },
    { key: "video", label: "Video", ready: readiness.video },
  ] as const;

  const activeStageKey = resolveQuizPipelineStage(pipelineTask, tasks);

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

import { useEffect, useState } from "react";
import type { Task } from "@studio/shared";

export const THINKING_STEPS_BY_STAGE: Record<string, string[]> = {
  research: [
    "Analyzing historical context & semantic topic depth",
    "Extracting high-engagement narrative hooks & facts",
    "Verifying pedagogical reference sources & truth consistency",
    "Synthesizing structured topic breakdown",
  ],
  treatment: [
    "Structuring 3-act narrative progression & tension curves",
    "Balancing question difficulty & cognitive engagement",
    "Calibrating viewer pacing & suspense checkpoints",
    "Generating creative treatment blueprint",
  ],
  script: [
    "Drafting conversational narration cadence & dialogue flow",
    "Refining punchy hooks, calibrated words & comedic timing",
    "Optimizing retention milestones across all sequences",
    "Validating speech rhythm & sentence clarity",
  ],
  visualBible: [
    "Constructing character & environment continuity anchors",
    "Locking visual DNA style tokens & prompt matrices",
    "Calibrating cinematic aspect ratios, lighting & palette",
    "Validating visual consistency gates across all bundles",
  ],
  scenes: [
    "Decomposing script into parallel shot compositions",
    "Computing camera angles, depth of field & kinetic zooms",
    "Harmonizing continuity bundle tags with scene visuals",
    "Synthesizing multi-sequence shot manifests",
  ],
  narration: [
    "Synthesizing neural voice audio with emotional inflection",
    "Calibrating phoneme durations & natural conversational pauses",
    "Balancing speech velocity against scene duration cuts",
    "Mastering audio waveforms & loudness normalization",
  ],
  video: [
    "Assembling HyperFrames render graph & multi-track timeline",
    "Composing dynamic motion overlays & countdown FX",
    "Synchronizing audio narration cues with visual transitions",
    "Compiling GPU hardware-accelerated master 1080p stream",
  ],
  general: [
    "Evaluating contextual dependencies & neural inputs",
    "Executing multi-agent generation pipeline",
    "Running automated production gate verifications",
    "Optimizing assembly artifacts & asset caches",
  ],
};

function resolveCategoryFromTask(type: Task["task_type"], msg: string): string | null {
  if (type === "GENERATE_RESEARCH" || msg.includes("research")) return "research";
  if (type === "GENERATE_TREATMENT" || msg.includes("treatment")) return "treatment";
  if (type === "GENERATE_SCRIPT" || msg.includes("script") || msg.includes("writing")) return "script";
  if (type === "GENERATE_VISUAL_BIBLE" || msg.includes("visual") || msg.includes("bible")) return "visualBible";
  if (
    type === "GENERATE_SCENES" ||
    type === "GENERATE_SEQUENCE_SCENES" ||
    msg.includes("shot") ||
    msg.includes("scene") ||
    msg.includes("sequence")
  ) {
    return "scenes";
  }
  if (type === "GENERATE_AUDIO" || msg.includes("audio") || msg.includes("narration") || msg.includes("voice")) {
    return "narration";
  }
  if (type === "GENERATE_VIDEO" || msg.includes("video") || msg.includes("render")) return "video";
  return null;
}

function resolveCategoryFromProgress(p: number): string {
  if (p < 8) return "research";
  if (p < 16) return "treatment";
  if (p < 25) return "script";
  if (p < 35) return "visualBible";
  if (p < 55) return "scenes";
  if (p < 75) return "narration";
  if (p < 95) return "video";
  return "general";
}

export function resolveThinkingCategory(task: Task): string {
  const msg = (task.progress_message || "").toLowerCase();
  const matched = resolveCategoryFromTask(task.task_type, msg);
  if (matched) return matched;

  if (typeof task.progress_percent === "number") {
    return resolveCategoryFromProgress(task.progress_percent);
  }

  return "general";
}

export function useThinkingStatus(task: Task, defaultActiveLabel: string, isActive: boolean): string {
  const [stepIndex, setStepIndex] = useState(0);
  const category = resolveThinkingCategory(task);
  const pool = THINKING_STEPS_BY_STAGE[category] ?? THINKING_STEPS_BY_STAGE.general;

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % pool.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isActive, pool]);

  if (!isActive) return defaultActiveLabel;

  const currentThought = pool[stepIndex % pool.length];

  if (task.progress_message && task.progress_message.includes(" · ")) {
    const stagePrefix = task.progress_message.split(" · ")[0].trim();
    return `${stagePrefix} · ${currentThought}…`;
  }

  return `${currentThought}…`;
}

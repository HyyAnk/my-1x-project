import type { Task } from "@studio/shared";

export type PreviewImageData = {
  url: string;
  filename: string;
  bundleId: string;
  title: string;
  prompt: string;
  priceVnd?: number;
  model?: string;
  aspectRatio?: string;
};

export type ArtifactName = "research.md" | "treatment.md" | "script.md" | "visual_bible.md";

export const artifactConfig: Array<{
  filename: ArtifactName;
  title: string;
  taskType: Task["task_type"];
  active: string;
  complete: string;
}> = [
  { filename: "research.md", title: "Research", taskType: "GENERATE_RESEARCH", active: "Verifying sources", complete: "Research ready" },
  {
    filename: "treatment.md",
    title: "Treatment",
    taskType: "GENERATE_TREATMENT",
    active: "Structuring the story",
    complete: "Treatment ready",
  },
  { filename: "script.md", title: "Narration script", taskType: "GENERATE_SCRIPT", active: "Writing narration", complete: "Script ready" },
  {
    filename: "visual_bible.md",
    title: "Visual bible",
    taskType: "GENERATE_VISUAL_BIBLE",
    active: "Locking visual identity",
    complete: "Visual bible ready",
  },
];

export function isReady(content: string): boolean {
  return Boolean(content.trim()) && !/(?:has not started|generation has not started|breakdown has not started)/i.test(content);
}

export function taskLabel(type: Task["task_type"]): string {
  const labels: Partial<Record<Task["task_type"], string>> = {
    GENERATE_RESEARCH: "Research",
    GENERATE_TREATMENT: "Build",
    GENERATE_SCRIPT: "Write",
    GENERATE_VISUAL_BIBLE: "Build",
    GENERATE_SCENES: "Generate shots",
    GENERATE_PIPELINE: "Start production",
    GENERATE_NARRATION: "Generate narration",
    GENERATE_AUDIO: "Generate preview",
    GENERATE_VIDEO: "Render video",
  };
  return labels[type] ?? "Generate";
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

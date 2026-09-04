import { QUIZ_SECONDS_PER_QUESTION, type Episode, type Task } from "@studio/shared";
import { isTaskActive } from "../../../lib/utils";

export type EpisodeThumbnailRatio = "16:9" | "9:16";

export type EpisodeCardViewModel = {
  layoutLabel: string;
  statusLabel: string;
  durationLabel: string;
  thumbnailRatio: EpisodeThumbnailRatio | null;
  createdDateLabel: string;
};

const stageLabels: Record<Episode["stage"], string> = {
  IDEA: "Not started",
  SELECTED: "Not started",
  RESEARCH: "Researching",
  RESEARCH_READY: "Research ready",
  TREATMENT: "Drafting story",
  TREATMENT_READY: "Treatment ready",
  SCRIPT: "Writing script",
  SCRIPT_READY: "Script ready",
  VISUAL_BIBLE: "Styling visuals",
  VISUAL_BIBLE_READY: "Visuals ready",
  SCENE_BREAKDOWN: "Building scenes",
  SCENE_READY: "Scenes ready",
  NARRATION_READY: "Audio ready",
  READY_FOR_GENERATION: "Ready to render",
  QUIZ_READY: "Quiz ready",
  VIDEO_RENDERING: "Rendering video",
  VIDEO_READY: "Video ready",
};

const taskLabels: Record<Task["task_type"], string> = {
  GENERATE_DNA: "Building channel",
  SUGGEST_TOPICS: "Finding topics",
  GENERATE_RESEARCH: "Researching",
  GENERATE_TREATMENT: "Drafting story",
  GENERATE_SCRIPT: "Writing script",
  GENERATE_VISUAL_BIBLE: "Styling visuals",
  GENERATE_SCENES: "Building scenes",
  GENERATE_SEQUENCE_SCENES: "Building scenes",
  GENERATE_PIPELINE: "Building episode",
  REGENERATE_DIALOGUE: "Updating dialogue",
  REGENERATE_PROMPT: "Updating prompt",
  REGENERATE_BOTH: "Updating scene",
  GENERATE_AUDIO: "Generating audio",
  GENERATE_BUNDLE_IMAGE: "Generating visuals",
  GENERATE_VIDEO: "Rendering video",
  GENERATE_QUIZ: "Drafting quiz",
};

function resolveLayoutLabel(format: Episode["quiz_config"]["quiz_format"]): string {
  if (format === "odd_one_out") return "Visual choices";
  if (format === "image_guess") return "Image + choices";
  if (format === "true_false") return "True / false";
  return "Media + choices";
}

function resolveStatusLabel(episode: Episode, tasks: Task[]): string {
  const latestActiveTask = tasks.filter(isTaskActive).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (latestActiveTask) return latestActiveTask.progress_message.trim() || taskLabels[latestActiveTask.task_type];

  const latestTask = [...tasks].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (latestTask?.status === "FAILED") return `${taskLabels[latestTask.task_type]} failed`;
  return stageLabels[episode.stage];
}

function formatVideoDuration(seconds: number): string {
  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainder = roundedSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function resolveDurationLabel(episode: Episode): string {
  const questionCount = episode.quiz_config.question_count;
  if (episode.video_asset_path && episode.video_duration_seconds) {
    return `${questionCount} Q · ${formatVideoDuration(episode.video_duration_seconds)}`;
  }
  const estimatedMinutes = Math.max(3, Math.round((questionCount * QUIZ_SECONDS_PER_QUESTION) / 60));
  return `${questionCount} Q · ~${estimatedMinutes}m`;
}

function resolveThumbnailRatio(episode: Episode): EpisodeThumbnailRatio | null {
  if (!episode.video_asset_path) return null;
  if (episode.thumbnail_asset_path_16_9) return "16:9";
  if (episode.thumbnail_asset_path_9_16) return "9:16";
  return null;
}

export function buildEpisodeCardViewModel(episode: Episode, tasks: Task[]): EpisodeCardViewModel {
  return {
    layoutLabel: resolveLayoutLabel(episode.quiz_config.quiz_format),
    statusLabel: resolveStatusLabel(episode, tasks),
    durationLabel: resolveDurationLabel(episode),
    thumbnailRatio: resolveThumbnailRatio(episode),
    createdDateLabel: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(episode.created_at)),
  };
}

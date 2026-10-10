import type { QuizShort, Task } from "@studio/shared";
import { quizShortApi } from "../../../api/quizShortApi";
import { buildHash } from "../../../hooks/useRouter";
import { isTaskActive } from "../../../lib/utils";

export type QuizShortCardStatus = "draft" | "generating" | "stale" | "ready";

export interface QuizShortCardViewModel {
  status: QuizShortCardStatus;
  statusLabel: string;
  stageLabel: string;
  hasActiveTask: boolean;
  activeProgressMessage: string | null;
  questionCountLabel: string;
  durationLabel: string | null;
  coverUrl: string | null;
  cleanTitle: string;
  workspaceUrl: string;
}

/** Strips trailing dots from a topic title so cards read cleanly. */
export function cleanQuizShortTitle(title: string): string {
  return title.replace(/\.+$/, "").trim();
}

/** Turns an EpisodeStage such as "SCENE_READY" into "Scene ready". */
export function formatQuizShortStage(stage: QuizShort["stage"]): string {
  const words = stage.toLowerCase().split("_");
  return words.map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)).join(" ");
}

export function formatQuizShortDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  return `${Math.round(seconds)}s`;
}

/** Tasks for a Quiz Short carry its id in `episode_id` with `product_kind: "quiz_short"`. */
export function selectQuizShortTasks(quizShort: QuizShort, tasks: Task[]): Task[] {
  return tasks.filter((task) => task.episode_id === quizShort.quiz_short_id);
}

export function computeQuizShortStatus(
  quizShort: QuizShort,
  tasks: Task[],
): { status: QuizShortCardStatus; label: string; activeProgressMessage: string | null } {
  const activeTask = selectQuizShortTasks(quizShort, tasks).find(isTaskActive);
  if (activeTask) {
    return { status: "generating", label: "Generating", activeProgressMessage: activeTask.progress_message || "Building Quiz Short..." };
  }
  if (quizShort.video_asset_path && quizShort.render_stale) return { status: "stale", label: "Render stale", activeProgressMessage: null };
  if (quizShort.video_asset_path) return { status: "ready", label: "Ready", activeProgressMessage: null };
  return { status: "draft", label: "Draft", activeProgressMessage: null };
}

export function matchesQuizShortSearch(quizShort: QuizShort, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  const haystack = [quizShort.topic.title, quizShort.topic.premise, quizShort.topic.hook ?? ""].join(" ").toLowerCase();
  return haystack.includes(query);
}

export function buildQuizShortCardViewModel(quizShort: QuizShort, tasks: Task[]): QuizShortCardViewModel {
  const { status, label: statusLabel, activeProgressMessage } = computeQuizShortStatus(quizShort, tasks);
  const questionCount = quizShort.quiz_config.question_count;
  const coverUrl = quizShort.thumbnail_asset_path_9_16
    ? quizShortApi.quizShortThumbnailFileUrl(quizShort.channel_id, quizShort.quiz_short_id, quizShort.updated_at)
    : null;
  return {
    status,
    statusLabel,
    stageLabel: formatQuizShortStage(quizShort.stage),
    hasActiveTask: status === "generating",
    activeProgressMessage,
    questionCountLabel: `${questionCount} ${questionCount === 1 ? "question" : "questions"}`,
    durationLabel: formatQuizShortDuration(quizShort.video_duration_seconds),
    coverUrl,
    cleanTitle: cleanQuizShortTitle(quizShort.topic.title),
    workspaceUrl: buildHash({ page: "channels", channelId: quizShort.channel_id, quizShortId: quizShort.quiz_short_id }),
  };
}

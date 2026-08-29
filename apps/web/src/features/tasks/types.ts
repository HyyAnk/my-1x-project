import type { Task } from "@studio/shared";

export type StatusFilter = "all" | "running" | "queued" | "waiting_approval" | "failed" | "completed" | "cancelled";

export type ProductionItemSummary = {
  id: string;
  channelId: string;
  channelName: string;
  episodeId: string;
  episodeTitle: string;
  tasks: Task[];
  activeTask: Task | null;
  latestTask: Task;
  status: Task["status"];
  progressPercent: number;
  progressMessage: string;
  queuePosition: number | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  accumulatedSeconds: number;
};

export function calculateProgress(task: Task | null, fallbackStatus: Task["status"]): number {
  if (!task) {
    return fallbackStatus === "COMPLETED" ? 100 : 0;
  }
  if (task.status === "COMPLETED") return 100;
  if (task.status === "CANCELLED") return 0;
  if (task.progress_percent !== null && task.progress_percent !== undefined && task.progress_percent > 0) {
    return task.progress_percent;
  }
  if (task.status === "QUEUED") return 0;
  if (task.status === "WAITING_APPROVAL") return 50;

  switch (task.task_type) {
    case "GENERATE_RESEARCH":
      return 5;
    case "GENERATE_TREATMENT":
      return 10;
    case "GENERATE_SCRIPT":
      return 20;
    case "GENERATE_VISUAL_BIBLE":
      return 30;
    case "GENERATE_SEQUENCE_SCENES":
    case "GENERATE_SCENES":
      return 40;
    case "GENERATE_BUNDLE_IMAGE":
      return 55;
    case "GENERATE_NARRATION":
    case "GENERATE_AUDIO":
      return 75;
    case "GENERATE_VIDEO":
      return 90;
    case "GENERATE_PIPELINE":
      return 10;
    default:
      return 15;
  }
}

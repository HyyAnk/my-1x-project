import type { Task } from "@studio/shared";
import { episodeApi } from "../../../api/episodeApi";
import { calculateEpisodeBuildDuration, formatElapsedSeconds, formatTaskType, isTaskActive } from "../../../lib/utils";
import type { ProductionItemSummary } from "../types";

export type TaskCardAction = "cancel" | "retry" | null;

export type TaskCardViewModel = {
  targetTask: Task;
  taskTypeLabel: string;
  durationLabel: string;
  timeLabel: string;
  detailLabel: string | null;
  progressPercent: number | null;
  thumbnailUrl: string | null;
  action: TaskCardAction;
};

export function buildTaskCardViewModel(
  item: ProductionItemSummary,
  now: number,
  locale: string | string[] | undefined = undefined,
): TaskCardViewModel {
  const targetTask = item.activeTask || item.latestTask;
  const pipelineTask = item.tasks.find((task) => task.task_type === "GENERATE_PIPELINE") ?? null;
  const durationSeconds = calculateEpisodeBuildDuration(item.tasks, pipelineTask, now);
  const timestamp = item.completedAt || item.startedAt;

  return {
    targetTask,
    taskTypeLabel: formatTaskType(targetTask.task_type),
    durationLabel: formatElapsedSeconds(durationSeconds),
    timeLabel: formatTaskTime(timestamp, locale),
    detailLabel: getDetailLabel(item),
    progressPercent: item.status === "RUNNING" ? item.progressPercent : null,
    thumbnailUrl: item.episodeId
      ? episodeApi.thumbnailFileUrl(item.channelId, item.episodeId, "16:9", item.completedAt || item.startedAt)
      : null,
    action: isTaskActive(targetTask) ? "cancel" : item.status === "FAILED" || item.status === "CANCELLED" ? "retry" : null,
  };
}

function getDetailLabel(item: ProductionItemSummary): string | null {
  if (item.status === "QUEUED") return `Queue #${item.queuePosition === null ? "—" : item.queuePosition + 1}`;
  if (item.status === "WAITING_APPROVAL") return item.progressMessage || "Approval required";
  if (item.status === "RUNNING") return item.progressMessage || "Processing";
  if (item.status === "FAILED") return item.error || "Open details to review the failure";
  return null;
}

function formatTaskTime(value: string, locale: string | string[] | undefined): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(timestamp);
}

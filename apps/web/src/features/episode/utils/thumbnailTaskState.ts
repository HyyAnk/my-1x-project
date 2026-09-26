import type { Task } from "@studio/shared";
import { isTaskActive, latestTask } from "../../../lib/utils";
import type { RailStatus } from "./railStageDefinitions";

export function thumbnailTaskStatus(tasks: Task[], ready: boolean): RailStatus {
  const task = latestTask(tasks, ["GENERATE_THUMBNAIL"]);
  if (task?.status === "QUEUED") return "queued";
  if (task && isTaskActive(task)) return "running";
  if (ready) return "ready";
  if (task?.status === "FAILED" || task?.status === "CANCELLED") return "failed";
  return "not_started";
}

export function thumbnailTaskMessage(task?: Task | null): string | null {
  if (task?.status === "QUEUED") return "Thumbnail queued";
  if (task?.status === "RUNNING") return task.progress_message ?? "Generating thumbnail";
  if (task?.status === "FAILED") return "Thumbnail failed. Retry with Generate.";
  if (task?.status === "CANCELLED") return "Thumbnail cancelled. Retry with Generate.";
  return null;
}

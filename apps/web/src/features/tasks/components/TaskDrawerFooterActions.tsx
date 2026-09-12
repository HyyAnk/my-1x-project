import { ArrowClockwise, ArrowUpRight, X } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { isTaskActive } from "../../../lib/utils";

export interface TaskDrawerFooterActionsProps {
  task: Task;
  onCancel: (task: Task) => void;
  onRetry: (task: Task) => void;
  onOpenEpisode?: (channelId: string, episodeId: string) => void;
  onClose: () => void;
}

export function TaskDrawerFooterActions({
  task,
  onCancel,
  onRetry,
  onOpenEpisode,
  onClose,
}: TaskDrawerFooterActionsProps) {
  const isFailed = task.status === "FAILED";
  const isCancelled = task.status === "CANCELLED";

  return (
    <div className="task-drawer-footer">
      {isTaskActive(task) ? (
        <button
          type="button"
          className="danger-button"
          onClick={() => {
            onCancel(task);
            onClose();
          }}
        >
          <X size={15} />
          <span>Cancel Task</span>
        </button>
      ) : isFailed || isCancelled ? (
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            onRetry(task);
            onClose();
          }}
        >
          <ArrowClockwise size={15} />
          <span>Retry Task</span>
        </button>
      ) : null}

      {task.episode_id && onOpenEpisode && (
        <button
          type="button"
          className="quiet-button"
          onClick={() => {
            onOpenEpisode(task.channel_id, task.episode_id!);
            onClose();
          }}
        >
          <span>Production Rail</span>
          <ArrowUpRight size={14} />
        </button>
      )}
    </div>
  );
}

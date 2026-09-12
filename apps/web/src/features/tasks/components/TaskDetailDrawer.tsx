import { X } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { formatTaskType } from "../../../lib/utils";
import type { ProductionItemSummary } from "../types";
import { TaskDrawerErrorSection } from "./TaskDrawerErrorSection";
import { TaskDrawerExecutionInfo } from "./TaskDrawerExecutionInfo";
import { TaskDrawerFooterActions } from "./TaskDrawerFooterActions";
import { TaskDrawerStatusBanner } from "./TaskDrawerStatusBanner";

export function TaskDetailDrawer({
  item,
  task,
  now,
  onClose,
  onCancel,
  onRetry,
  onOpenEpisode,
}: {
  item: ProductionItemSummary | null;
  task: Task | null;
  now: number;
  onClose: () => void;
  onCancel: (task: Task) => void;
  onRetry: (task: Task) => void;
  onOpenEpisode?: (channelId: string, episodeId: string) => void;
}) {
  if (!item && !task) return null;
  const targetTask = task || item?.activeTask || item?.latestTask;
  if (!targetTask) return null;

  return (
    <div className="task-drawer-overlay" onClick={onClose}>
      <aside className="task-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="task-drawer-header">
          <div className="task-drawer-title-group">
            <span className="eyebrow">Task Details</span>
            <h2>{formatTaskType(targetTask.task_type)}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Close drawer" aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>

        <div className="task-drawer-body">
          <TaskDrawerStatusBanner task={targetTask} />
          {targetTask.error && <TaskDrawerErrorSection error={targetTask.error} />}
          <TaskDrawerExecutionInfo task={targetTask} item={item} now={now} />
        </div>

        <TaskDrawerFooterActions
          task={targetTask}
          onCancel={onCancel}
          onRetry={onRetry}
          onOpenEpisode={onOpenEpisode}
          onClose={onClose}
        />
      </aside>
    </div>
  );
}

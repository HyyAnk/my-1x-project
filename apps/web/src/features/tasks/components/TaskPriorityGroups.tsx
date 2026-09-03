import { Trash, X } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import type { ProductionItemSummary } from "../types";
import { TaskDateGroups } from "./TaskDateGroups";

const DONE_PREVIEW_LIMIT = 10;

export type TaskPriorityGroupsProps = {
  attentionItems: ProductionItemSummary[];
  inProgressItems: ProductionItemSummary[];
  doneItems: ProductionItemSummary[];
  queuedCount: number;
  showAllDone: boolean;
  setShowAllDone: (updater: (prev: boolean) => boolean) => void;
  now: number;
  onCancel: (task: Task) => Promise<void>;
  onRetry: (task: Task) => Promise<void>;
  onInspect: (item: ProductionItemSummary) => void;
  cancelAllQueued: () => Promise<void>;
  clearCompleted: () => void;
};

export function TaskPriorityGroups({
  attentionItems,
  inProgressItems,
  doneItems,
  queuedCount,
  showAllDone,
  setShowAllDone,
  now,
  onCancel,
  onRetry,
  onInspect,
  cancelAllQueued,
  clearCompleted,
}: TaskPriorityGroupsProps) {
  return (
    <div className="task-priority-groups">
      {/* Group 1: Needs Attention */}
      {attentionItems.length > 0 && (
        <section className="task-group-section is-attention" aria-label="Tasks needing attention">
          <div className="task-group-header">
            <div className="task-group-title-wrap">
              <span className="task-group-badge is-attention">Needs Attention</span>
              <span className="task-group-count">{attentionItems.length}</span>
            </div>
          </div>
          <TaskDateGroups
            items={attentionItems}
            now={now}
            onCancel={onCancel}
            onRetry={onRetry}
            onInspect={onInspect}
            sectionId="attention"
          />
        </section>
      )}

      {/* Group 2: In Progress & Queue */}
      {inProgressItems.length > 0 && (
        <section className="task-group-section is-in-progress" aria-label="Tasks in progress and queue">
          <div className="task-group-header">
            <div className="task-group-title-wrap">
              <span className="task-group-badge is-in-progress">In Progress & Queue</span>
              <span className="task-group-count">{inProgressItems.length}</span>
            </div>
            {queuedCount > 0 && (
              <button type="button" className="text-button compact" onClick={() => void cancelAllQueued()}>
                <X size={13} />
                <span>Cancel Queue</span>
              </button>
            )}
          </div>
          <TaskDateGroups
            items={inProgressItems}
            now={now}
            onCancel={onCancel}
            onRetry={onRetry}
            onInspect={onInspect}
            sectionId="progress"
          />
        </section>
      )}

      {/* Group 3: Completed & Cancelled */}
      {doneItems.length > 0 && (
        <section className="task-group-section is-done" aria-label="Finished and cancelled tasks">
          <div className="task-group-header">
            <div className="task-group-title-wrap">
              <span className="task-group-badge is-done">Completed & Cancelled</span>
              <span className="task-group-count">{doneItems.length}</span>
            </div>
            <button type="button" className="text-button compact" onClick={clearCompleted}>
              <Trash size={13} />
              <span>Clear List</span>
            </button>
          </div>
          <TaskDateGroups
            items={showAllDone ? doneItems : doneItems.slice(0, DONE_PREVIEW_LIMIT)}
            now={now}
            onCancel={onCancel}
            onRetry={onRetry}
            onInspect={onInspect}
            sectionId="done"
          />
          {doneItems.length > DONE_PREVIEW_LIMIT && (
            <div className="task-group-expand-row">
              <button type="button" className="quiet-button compact" onClick={() => setShowAllDone((prev) => !prev)}>
                <span>{showAllDone ? "Show fewer" : `Show all ${doneItems.length}`}</span>
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

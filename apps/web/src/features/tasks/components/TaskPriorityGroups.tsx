import { Trash, X } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import type { ProductionItemSummary } from "../types";
import { StreamlinedTaskCard } from "./StreamlinedTaskCard";

export type TaskPriorityGroupsProps = {
  attentionItems: ProductionItemSummary[];
  inProgressItems: ProductionItemSummary[];
  doneItems: ProductionItemSummary[];
  queuedCount: number;
  showAllDone: boolean;
  setShowAllDone: (updater: (prev: boolean) => boolean) => void;
  now: number;
  onOpenEpisode?: (channelId: string, episodeId: string) => void;
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
  onOpenEpisode,
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
          <div className="streamlined-task-grid">
            {attentionItems.map((item) => (
              <StreamlinedTaskCard
                key={item.id}
                item={item}
                now={now}
                onOpenEpisode={onOpenEpisode}
                onCancel={onCancel}
                onRetry={onRetry}
                onInspect={onInspect}
              />
            ))}
          </div>
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
          <div className="streamlined-task-grid">
            {inProgressItems.map((item) => (
              <StreamlinedTaskCard
                key={item.id}
                item={item}
                now={now}
                onOpenEpisode={onOpenEpisode}
                onCancel={onCancel}
                onRetry={onRetry}
                onInspect={onInspect}
              />
            ))}
          </div>
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
          <div className="streamlined-task-grid">
            {(showAllDone ? doneItems : doneItems.slice(0, 6)).map((item) => (
              <StreamlinedTaskCard
                key={item.id}
                item={item}
                now={now}
                onOpenEpisode={onOpenEpisode}
                onCancel={onCancel}
                onRetry={onRetry}
                onInspect={onInspect}
              />
            ))}
          </div>
          {doneItems.length > 6 && (
            <div className="task-group-expand-row">
              <button type="button" className="quiet-button compact" onClick={() => setShowAllDone((prev) => !prev)}>
                <span>{showAllDone ? "Show Less" : `Show All ${doneItems.length} Finished Tasks`}</span>
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

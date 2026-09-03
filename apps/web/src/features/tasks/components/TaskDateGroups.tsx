import type { Task } from "@studio/shared";
import type { ProductionItemSummary } from "../types";
import { groupTaskItemsByDate } from "../utils/taskDateGroups";
import { StreamlinedTaskCard } from "./StreamlinedTaskCard";

type TaskDateGroupsProps = {
  items: ProductionItemSummary[];
  now: number;
  onCancel: (task: Task) => Promise<void>;
  onRetry: (task: Task) => Promise<void>;
  onInspect: (item: ProductionItemSummary) => void;
  sectionId: string;
};

export function TaskDateGroups({ items, now, onCancel, onRetry, onInspect, sectionId }: TaskDateGroupsProps) {
  return (
    <div className="task-date-groups">
      {groupTaskItemsByDate(items, now).map((group) => (
        <section className="task-date-group" key={group.key} aria-labelledby={`task-date-${sectionId}-${group.key}`}>
          <div className="task-date-heading">
            <h3 id={`task-date-${sectionId}-${group.key}`}>{group.label}</h3>
            <span>{group.items.length}</span>
          </div>
          <div className="streamlined-task-grid">
            {group.items.map((item) => (
              <StreamlinedTaskCard key={item.id} item={item} now={now} onCancel={onCancel} onRetry={onRetry} onInspect={onInspect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

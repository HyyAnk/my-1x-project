import { useCallback } from "react";
import type { Task } from "@studio/shared";
import { api } from "../../../api";
import { formatTaskType } from "../../../lib/utils";
import type { Notice } from "../../../components/types";
import type { ProductionItemSummary } from "../types";

export function useTaskActions(options: {
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
  productionItems: ProductionItemSummary[];
  setIsRefreshing: (val: boolean) => void;
  setDismissedTaskIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const { onRefresh, onNotice, productionItems, setIsRefreshing, setDismissedTaskIds } = options;

  const cancel = useCallback(
    async (task: Task) => {
      try {
        await api.cancelTask(task.task_id);
        onNotice({ tone: "good", message: "Task cancelled" });
        await onRefresh();
      } catch (error) {
        onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Failed to cancel task" });
      }
    },
    [onNotice, onRefresh],
  );

  const retry = useCallback(
    async (task: Task) => {
      try {
        await api.createTask({
          task_type: task.task_type,
          channel_id: task.channel_id,
          episode_id: task.episode_id,
          scene_number: task.scene_number,
        });
        onNotice({ tone: "good", message: `${formatTaskType(task.task_type)} added to queue` });
        await onRefresh();
      } catch (error) {
        onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Failed to retry task" });
      }
    },
    [onNotice, onRefresh],
  );

  const clearCompleted = useCallback(() => {
    const completedIds = new Set<string>();
    productionItems
      .filter((i) => i.status === "COMPLETED" || i.status === "CANCELLED")
      .forEach((item) => {
        item.tasks.forEach((t) => completedIds.add(t.task_id));
      });

    setDismissedTaskIds((prev) => {
      const next = new Set(prev);
      completedIds.forEach((id) => next.add(id));
      return next;
    });
    onNotice({ tone: "good", message: "Cleared finished tasks from view" });
  }, [productionItems, onNotice, setDismissedTaskIds]);

  const cancelAllQueued = useCallback(async () => {
    const queuedTasks = productionItems
      .filter((i) => i.status === "QUEUED")
      .map((i) => i.activeTask || i.latestTask)
      .filter((t): t is Task => Boolean(t && t.status === "QUEUED"));
    if (queuedTasks.length === 0) return;

    try {
      await Promise.all(queuedTasks.map((t) => api.cancelTask(t.task_id)));
      onNotice({ tone: "good", message: `Cancelled ${queuedTasks.length} queued tasks` });
      await onRefresh();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to cancel queue" });
    }
  }, [productionItems, onNotice, onRefresh]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, setIsRefreshing]);

  return {
    cancel,
    retry,
    clearCompleted,
    cancelAllQueued,
    handleManualRefresh,
  };
}

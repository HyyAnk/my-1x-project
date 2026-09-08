import { useEffect } from "react";
import type { Task } from "@studio/shared";
import { subscribeEvents } from "../../../api/client";

export interface UseShortReelTaskSyncOptions {
  reelId: string;
  onTaskUpdate: (task: Task) => void;
  onTaskSettled: (task: Task) => void;
}

const TERMINAL_TASK_STATUSES = ["COMPLETED", "FAILED", "CANCELLED"];

/**
 * Subscribes to realtime task events for a specific reel and forwards
 * matched task updates to the studio, triggering a silent reload once a task settles.
 */
export function useShortReelTaskSync({ reelId, onTaskUpdate, onTaskSettled }: UseShortReelTaskSyncOptions) {
  useEffect(() => {
    const unsubscribe = subscribeEvents((event) => {
      if (event.type !== "task.updated" || !event.task) return;
      if (event.task.reel_id !== reelId) return;

      onTaskUpdate(event.task);
      if (TERMINAL_TASK_STATUSES.includes(event.task.status)) {
        onTaskSettled(event.task);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [reelId, onTaskUpdate, onTaskSettled]);
}

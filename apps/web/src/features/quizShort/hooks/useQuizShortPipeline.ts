import { useState } from "react";
import type { Task } from "@studio/shared";
import { quizShortApi } from "../../../api/quizShortApi";
import { taskApi } from "../../../api/taskApi";
import type { Notice } from "../../../components/types";

export type UseQuizShortPipelineProps = {
  channelId: string;
  quizShortId: string;
  activeTask: Task | null;
  onTaskSubmitted: (task: Task) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  load: () => Promise<void>;
};

/**
 * Starts, retries and cancels the Quiz Short pipeline. Start and retry are the same POST: the
 * server resumes from the first stale artifact, so a failed run picks up where it stopped.
 */
export function useQuizShortPipeline({ channelId, quizShortId, activeTask, onTaskSubmitted, onNotice, load }: UseQuizShortPipelineProps) {
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const start = async () => {
    if (activeTask || starting) return;
    setStarting(true);
    try {
      const task = await quizShortApi.startQuizShortPipeline(channelId, quizShortId);
      onTaskSubmitted(task);
      onNotice({ tone: "good", message: "Quiz Short production started" });
    } catch (reason) {
      onNotice({ tone: "bad", message: reason instanceof Error ? reason.message : "Could not start the Quiz Short pipeline" });
    } finally {
      setStarting(false);
    }
  };

  const cancel = async (task: Task | null = activeTask) => {
    if (!task || cancelling) return;
    setCancelling(true);
    try {
      const cancelled = await taskApi.cancelTask(task.task_id);
      onTaskSubmitted(cancelled);
      onNotice({ tone: "neutral", message: "Quiz Short task cancelled" });
      await load();
    } catch (reason) {
      onNotice({ tone: "bad", message: reason instanceof Error ? reason.message : "Could not cancel the task" });
    } finally {
      setCancelling(false);
    }
  };

  return { start, cancel, starting, cancelling, isRunning: Boolean(activeTask) };
}

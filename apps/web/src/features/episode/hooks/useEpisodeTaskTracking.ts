import { useEffect, useMemo, useState } from "react";
import type { Task } from "@studio/shared";
import { isTaskActive, isTaskTerminal, latestTask } from "../../../lib/utils";
import type { Notice } from "../../../components/types";

type UseEpisodeTaskTrackingProps = {
  episodeId: string;
  tasks: Task[];
  load: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function useEpisodeTaskTracking({ episodeId, tasks, load, onNotice }: UseEpisodeTaskTrackingProps) {
  const [episodeClock, setEpisodeClock] = useState(() => Date.now());
  const [observedTerminalTasks, setObservedTerminalTasks] = useState(() => new Set<string>());

  const episodeTasks = useMemo(() => tasks.filter((task) => task.episode_id === episodeId), [tasks, episodeId]);
  const sequenceShotTasks = useMemo(() => episodeTasks.filter((task) => task.task_type === "GENERATE_SEQUENCE_SCENES"), [episodeTasks]);

  const latestShotBatchStartedAt = useMemo(
    () =>
      sequenceShotTasks
        .map((task) => task.created_at)
        .sort()
        .at(-1) ?? null,
    [sequenceShotTasks],
  );

  const currentShotBatch = useMemo(
    () =>
      latestShotBatchStartedAt
        ? sequenceShotTasks.filter((task) => Math.abs(Date.parse(task.created_at) - Date.parse(latestShotBatchStartedAt)) < 5_000)
        : [],
    [sequenceShotTasks, latestShotBatchStartedAt],
  );

  const completedShotSequences = useMemo(() => currentShotBatch.filter((task) => task.status === "COMPLETED").length, [currentShotBatch]);

  const activeEpisodeTask = useMemo(() => episodeTasks.find(isTaskActive) ?? null, [episodeTasks]);
  const pipelineTask = useMemo(() => latestTask(episodeTasks, ["GENERATE_PIPELINE"]), [episodeTasks]);

  useEffect(() => {
    setObservedTerminalTasks(new Set(episodeTasks.filter(isTaskTerminal).map((task) => task.task_id)));
  }, [episodeId]);

  const hasActiveTask = episodeTasks.some(isTaskActive);

  useEffect(() => {
    if (!hasActiveTask) return;
    const timer = window.setInterval(() => setEpisodeClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasActiveTask]);

  const episodeTaskFingerprint = episodeTasks.map((task) => `${task.task_id}:${task.status}`).join("|");

  useEffect(() => {
    const newlyTerminal = episodeTasks.filter((task) => isTaskTerminal(task) && !observedTerminalTasks.has(task.task_id));
    if (newlyTerminal.length === 0) return;
    setObservedTerminalTasks((current) => new Set([...current, ...newlyTerminal.map((task) => task.task_id)]));
    void load().catch((err: Error) => onNotice({ tone: "bad", message: err.message }));
  }, [episodeTaskFingerprint, load, observedTerminalTasks, onNotice]);

  return {
    episodeClock,
    episodeTasks,
    sequenceShotTasks,
    currentShotBatch,
    completedShotSequences,
    activeEpisodeTask,
    pipelineTask,
  };
}

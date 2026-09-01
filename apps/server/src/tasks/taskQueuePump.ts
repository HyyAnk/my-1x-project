import type { Task, TaskType } from "@studio/shared";
import type { TaskManagerRuntime } from "./runtime.js";

export const channelTaskTypes = new Set<TaskType>(["GENERATE_DNA", "SUGGEST_TOPICS"]);
export const audioTaskTypes = new Set<TaskType>(["GENERATE_AUDIO"]);
export const imageTaskTypes = new Set<TaskType>(["GENERATE_BUNDLE_IMAGE"]);
export const videoTaskTypes = new Set<TaskType>(["GENERATE_VIDEO"]);
export const pipelineTaskTypes = new Set<TaskType>(["GENERATE_PIPELINE"]);

export type QueueCounters = {
  runningCount: number;
  runningAudioCount: number;
  runningImageCount: number;
  runningVideoCount: number;
  runningPipelineCount: number;
};

export async function pumpTaskQueue(
  runtime: TaskManagerRuntime & {
    runningCount: number;
    runningAudioCount: number;
    runningImageCount: number;
    runningVideoCount: number;
    runningPipelineCount: number;
  },
): Promise<void> {
  const maxVideoConcurrent = runtime.videoConfig.max_concurrent_tasks ?? 1;

  // 1. Video Queue Lane
  while (runtime.runningVideoCount < maxVideoConcurrent) {
    const next = runtime
      .list()
      .reverse()
      .find((task) => task.status === "QUEUED" && task.task_type === "GENERATE_VIDEO" && !runtime.locks.has(task.lock_key));
    if (!next) break;
    runtime.locks.add(next.lock_key);
    runtime.runningVideoCount += 1;
    void runtime.run(next).finally(() => {
      runtime.locks.delete(next.lock_key);
      runtime.runningVideoCount -= 1;
      void pumpTaskQueue(runtime);
    });
  }

  // 2. Pipeline Queue Lane
  while (runtime.runningPipelineCount < maxVideoConcurrent) {
    const next = runtime
      .list()
      .reverse()
      .find((task) => task.status === "QUEUED" && task.task_type === "GENERATE_PIPELINE" && !runtime.locks.has(task.lock_key));
    if (!next) break;
    runtime.locks.add(next.lock_key);
    runtime.runningPipelineCount += 1;
    void runtime.run(next).finally(() => {
      runtime.locks.delete(next.lock_key);
      runtime.runningPipelineCount -= 1;
      void pumpTaskQueue(runtime);
    });
  }

  // 3. General / Codex / Antigravity Text Tasks Lane
  while (runtime.runningCount < runtime.maxConcurrent) {
    const next = runtime
      .list()
      .reverse()
      .find(
        (task) =>
          task.status === "QUEUED" &&
          !audioTaskTypes.has(task.task_type) &&
          !imageTaskTypes.has(task.task_type) &&
          !videoTaskTypes.has(task.task_type) &&
          !pipelineTaskTypes.has(task.task_type) &&
          !runtime.locks.has(task.lock_key),
      );
    if (!next) break;
    runtime.locks.add(next.lock_key);
    runtime.runningCount += 1;
    void runtime.run(next).finally(() => {
      runtime.locks.delete(next.lock_key);
      runtime.runningCount -= 1;
      void pumpTaskQueue(runtime);
    });
  }

  // 4. Image Generation Lane
  const maxImageConcurrent = runtime.imageConfig.max_concurrent_tasks ?? 3;
  while (runtime.runningImageCount < maxImageConcurrent) {
    const next = runtime
      .list()
      .reverse()
      .find((task) => task.status === "QUEUED" && imageTaskTypes.has(task.task_type) && !runtime.locks.has(task.lock_key));
    if (!next) break;
    runtime.locks.add(next.lock_key);
    runtime.runningImageCount += 1;
    void runtime.run(next).finally(() => {
      runtime.locks.delete(next.lock_key);
      runtime.runningImageCount -= 1;
      void pumpTaskQueue(runtime);
    });
  }

  // 5. Scene Audio Lane
  while (runtime.runningAudioCount < runtime.audioConfig.max_concurrent_tasks) {
    const next = runtime
      .list()
      .reverse()
      .find((task) => task.status === "QUEUED" && audioTaskTypes.has(task.task_type) && !runtime.locks.has(task.lock_key));
    if (!next) break;
    runtime.locks.add(next.lock_key);
    runtime.runningAudioCount += 1;
    void runtime.runAudioTask(next).finally(() => {
      runtime.locks.delete(next.lock_key);
      runtime.runningAudioCount -= 1;
      void pumpTaskQueue(runtime);
    });
  }
}

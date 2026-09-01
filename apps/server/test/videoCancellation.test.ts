import { describe, expect, it, vi } from "vitest";
import { TaskSchema, type Task } from "@studio/shared";
import { cancelTask } from "../src/tasks/taskSubmission.js";
import type { TaskManagerRuntime } from "../src/tasks/runtime.js";

describe("video task cancellation", () => {
  it("aborts an already-dispatched controller when the persisted task still appears queued", async () => {
    const controller = new AbortController();
    let task = TaskSchema.parse({
      task_id: "video-task-queued",
      task_type: "GENERATE_VIDEO",
      channel_id: "channel-1",
      episode_id: "episode-1",
      status: "QUEUED",
      created_at: "2026-09-01T00:00:00.000Z",
      lock_key: "episode-1",
    });
    const runtime = {
      get: () => task,
      update: (_id: string, patch: Partial<Task>) => {
        task = TaskSchema.parse({ ...task, ...patch });
        return Promise.resolve();
      },
      activeVideoControllers: new Map([[task.task_id, controller]]),
      imageVariants: new Map(),
      topicHints: new Map(),
    } as unknown as TaskManagerRuntime;

    const cancelled = await cancelTask(runtime, task.task_id);

    expect(controller.signal.aborted).toBe(true);
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("aborts the active video controller and finishes the task as cancelled", async () => {
    const controller = new AbortController();
    let task = TaskSchema.parse({
      task_id: "video-task-1",
      task_type: "GENERATE_VIDEO",
      channel_id: "channel-1",
      episode_id: "episode-1",
      status: "RUNNING",
      created_at: "2026-09-01T00:00:00.000Z",
      started_at: "2026-09-01T00:00:01.000Z",
      lock_key: "episode-1",
      progress_message: "Video · rendering MP4",
      progress_percent: 72,
    });
    const finish = vi.fn((_id: string, status: Task["status"], error: string | null) => {
      task = TaskSchema.parse({ ...task, status, error, completed_at: "2026-09-01T00:00:02.000Z" });
      return Promise.resolve();
    });
    const runtime = {
      get: () => task,
      update: (_id: string, patch: Partial<Task>) => {
        task = TaskSchema.parse({ ...task, ...patch });
        return Promise.resolve();
      },
      finish,
      active: new Map(),
      activeAudio: new Set(),
      activeImageControllers: new Map(),
      activeVideoControllers: new Map([[task.task_id, controller]]),
      pipelineRuns: new Map(),
      imageVariants: new Map(),
      topicHints: new Map(),
    } as unknown as TaskManagerRuntime;

    const cancelled = await cancelTask(runtime, task.task_id);

    expect(controller.signal.aborted).toBe(true);
    expect(cancelled.status).toBe("CANCELLED");
    expect(finish).toHaveBeenCalledWith(task.task_id, "CANCELLED", "Cancelled by user");
  });
});

import { describe, expect, it, vi } from "vitest";
import { TaskSchema, type Task } from "@studio/shared";
import type { TaskManagerRuntime } from "../src/tasks/runtime.js";
import { runVideoTask } from "../src/tasks/videoRunner.js";

describe("runVideoTask cancellation lifecycle", () => {
  it("stops before composition work when cancellation wins the startup race", async () => {
    let current = TaskSchema.parse({
      task_id: "task-cancel-startup",
      task_type: "GENERATE_VIDEO",
      channel_id: "channel-1",
      episode_id: "episode-1",
      status: "QUEUED",
      created_at: "2026-09-01T00:00:00.000Z",
      lock_key: "episode-1",
    });
    const getEpisode = vi.fn();
    const finish = vi.fn(() => Promise.resolve());
    const runtime = {
      activeVideoControllers: new Map<string, AbortController>(),
      videoConfig: { aspect_ratio: "16:9" },
      repository: {
        getEpisode,
        removeQuestionHistoryEntries: () => Promise.resolve(),
      },
      update: (_taskId: string, patch: Partial<Task>) => {
        current = TaskSchema.parse({ ...current, ...patch });
        if (patch.status === "RUNNING") {
          runtime.activeVideoControllers.get(current.task_id)?.abort();
          current = TaskSchema.parse({ ...current, status: "CANCELLED", completed_at: "2026-09-01T00:00:01.000Z" });
        }
        return Promise.resolve();
      },
      get: () => current,
      finish,
      logger: { ok: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as TaskManagerRuntime;

    await runVideoTask.call(runtime, current);

    expect(getEpisode).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalledWith(current.task_id, "FAILED", expect.anything());
    expect(runtime.activeVideoControllers.has(current.task_id)).toBe(false);
  });
});

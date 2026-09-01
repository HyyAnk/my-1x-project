import { describe, expect, it } from "vitest";
import { TaskSchema } from "@studio/shared";
import { applyTaskPatch } from "../src/tasks/taskStateStore.js";

describe("applyTaskPatch terminal lifecycle", () => {
  it("does not resurrect a cancelled task as running", () => {
    const cancelled = TaskSchema.parse({
      task_id: "task-1",
      task_type: "GENERATE_VIDEO",
      channel_id: "channel-1",
      episode_id: "episode-1",
      status: "CANCELLED",
      created_at: "2026-09-01T00:00:00.000Z",
      completed_at: "2026-09-01T00:00:01.000Z",
      lock_key: "episode-1",
    });

    const result = applyTaskPatch(cancelled, {
      status: "RUNNING",
      started_at: "2026-09-01T00:00:02.000Z",
      progress_message: "Preparing Quiz composition",
    });

    expect(result).toBe(cancelled);
  });
});

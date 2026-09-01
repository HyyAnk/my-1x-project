import { describe, expect, it } from "vitest";
import { TaskSchema } from "@studio/shared";

const legacyTask = {
  task_id: "task-1",
  task_type: "GENERATE_VIDEO",
  channel_id: "channel-1",
  episode_id: "episode-1",
  status: "RUNNING",
  created_at: "2026-09-01T00:00:00.000Z",
  lock_key: "episode-1",
};

describe("Task render progress schema", () => {
  it("keeps legacy persisted tasks backward compatible", () => {
    expect(TaskSchema.parse(legacyTask).render_progress).toBeNull();
  });

  it("accepts measured render progress and rejects invalid counters", () => {
    const progress = {
      phase: "capture_streaming",
      frames_completed: 2130,
      total_frames: 3840,
      worker_count: 6,
      elapsed_ms: 60_017,
      eta_seconds: 42,
    };

    expect(TaskSchema.parse({ ...legacyTask, render_progress: progress }).render_progress).toEqual(progress);
    expect(() => TaskSchema.parse({ ...legacyTask, render_progress: { ...progress, frames_completed: -1 } })).toThrow();
    expect(() => TaskSchema.parse({ ...legacyTask, render_progress: { ...progress, total_frames: 0 } })).toThrow();
  });
});

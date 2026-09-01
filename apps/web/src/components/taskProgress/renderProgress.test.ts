import { describe, expect, it } from "vitest";
import { TaskSchema } from "@studio/shared";
import { formatRenderProgress } from "./renderProgress";

describe("formatRenderProgress", () => {
  it("formats measured frames, workers, and ETA concisely", () => {
    const task = TaskSchema.parse({
      task_id: "task-1",
      task_type: "GENERATE_VIDEO",
      channel_id: "channel-1",
      episode_id: "episode-1",
      status: "RUNNING",
      created_at: "2026-09-01T00:00:00.000Z",
      lock_key: "episode-1",
      render_progress: {
        phase: "capture_streaming",
        frames_completed: 2130,
        total_frames: 3840,
        worker_count: 6,
        elapsed_ms: 60_017,
        eta_seconds: 42,
      },
    });

    expect(formatRenderProgress(task)).toBe("2,130 / 3,840 frames · 6 workers · 42s left");
  });

  it("omits unavailable ETA and returns null for non-render tasks", () => {
    const measured = TaskSchema.parse({
      task_id: "task-2",
      task_type: "GENERATE_VIDEO",
      channel_id: "channel-1",
      episode_id: "episode-1",
      status: "RUNNING",
      created_at: "2026-09-01T00:00:00.000Z",
      lock_key: "episode-1",
      render_progress: {
        phase: "capture_streaming",
        frames_completed: 100,
        total_frames: 400,
        worker_count: 1,
        elapsed_ms: null,
        eta_seconds: null,
      },
    });
    const legacy = TaskSchema.parse({ ...measured, task_id: "task-3", render_progress: null });

    expect(formatRenderProgress(measured)).toBe("100 / 400 frames · 1 worker");
    expect(formatRenderProgress(legacy)).toBeNull();
  });
});

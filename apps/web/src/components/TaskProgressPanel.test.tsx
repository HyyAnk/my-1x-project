import { cleanup, render, screen } from "@testing-library/react";
import { TaskSchema } from "@studio/shared";
import { afterEach, describe, expect, it } from "vitest";
import { TaskProgressPanel } from "./TaskProgressPanel";

afterEach(cleanup);

describe("TaskProgressPanel measured render", () => {
  it("shows the real server message, exact percent, and frame metrics", () => {
    const task = TaskSchema.parse({
      task_id: "task-1",
      task_type: "GENERATE_VIDEO",
      channel_id: "channel-1",
      episode_id: "episode-1",
      status: "RUNNING",
      created_at: "2026-09-01T00:00:00.000Z",
      started_at: "2026-09-01T00:00:01.000Z",
      lock_key: "episode-1",
      progress_message: "Video · rendering frame 2,130 / 3,840",
      progress_percent: 81.65,
      render_progress: {
        phase: "capture_streaming",
        frames_completed: 2130,
        total_frames: 3840,
        worker_count: 6,
        elapsed_ms: 60_017,
        eta_seconds: 42,
      },
    });

    render(
      <TaskProgressPanel
        task={task}
        title="Video"
        activeLabel="Rendering video"
        completionLabel="Video ready"
        now={Date.parse("2026-09-01T00:01:01.000Z")}
      />,
    );

    expect(screen.getByText("Video · rendering frame 2,130 / 3,840")).toBeTruthy();
    expect(screen.getByText("2,130 / 3,840 frames · 6 workers · 42s left")).toBeTruthy();
    expect(screen.getByText("81.65%")).toBeTruthy();
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("81.65");
    expect(progressbar.getAttribute("aria-valuetext")).toContain("2,130 / 3,840 frames");
  });
});

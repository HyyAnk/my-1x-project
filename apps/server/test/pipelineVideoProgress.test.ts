import { describe, expect, it } from "vitest";
import type { Task } from "@studio/shared";
import { waitForTaskTerminal } from "../src/tasks/pipeline/pipelineHelpers.js";
import type { PipelineRun, TaskManagerRuntime } from "../src/tasks/runtime.js";

describe("pipeline video progress forwarding", () => {
  it("calls onProgress when watched task updates its render progress", async () => {
    let currentProgressPercent = 5;
    let currentProgressMessage = "Starting";
    let currentRenderProgress: Task["render_progress"] = null;
    let currentStatus: Task["status"] = "RUNNING";

    const mockTask: Task = {
      task_id: "task_video_1",
      task_type: "GENERATE_VIDEO",
      channel_id: "ch_1",
      episode_id: "ep_1",
      status: "RUNNING",
      created_at: "2026-09-01T00:00:00Z",
      started_at: "2026-09-01T00:00:00Z",
      completed_at: null,
      error: null,
      output_files: [],
      progress_message: "Starting",
      progress_percent: 5,
      render_progress: null,
      queue_position: null,
      scene_number: null,
      lock_key: "task_video_1",
      accumulated_duration_seconds: 0,
      codex_thread_id: null,
      codex_turn_id: null,
    };

    const mockRuntime = {
      get: (_id: string) => ({
        ...mockTask,
        status: currentStatus,
        progress_percent: currentProgressPercent,
        progress_message: currentProgressMessage,
        render_progress: currentRenderProgress,
      }),
    } as unknown as TaskManagerRuntime;

    const run: PipelineRun = { cancelled: false, children: new Set(["task_video_1"]) };
    const progressHistory: Array<{ message: string; percent: number | null; framesCompleted: number | null }> = [];

    const waitPromise = waitForTaskTerminal.call(mockRuntime, "task_video_1", run, async (childTask) => {
      progressHistory.push({
        message: childTask.progress_message ?? "",
        percent: childTask.progress_percent,
        framesCompleted: childTask.render_progress?.frames_completed ?? null,
      });
    });

    // Simulate task update 1: rendering frame 1000/2000
    await new Promise((resolve) => setTimeout(resolve, 60));
    currentProgressMessage = "Video · rendering frame 1,000 / 2,000";
    currentProgressPercent = 75;
    currentRenderProgress = {
      phase: "capture_streaming",
      frames_completed: 1000,
      total_frames: 2000,
      worker_count: 4,
      elapsed_ms: 10000,
      eta_seconds: 10,
    };

    // Simulate task update 2: rendering frame 2000/2000
    await new Promise((resolve) => setTimeout(resolve, 60));
    currentProgressMessage = "Video · rendering frame 2,000 / 2,000";
    currentProgressPercent = 89;
    currentRenderProgress = {
      phase: "capture_streaming",
      frames_completed: 2000,
      total_frames: 2000,
      worker_count: 4,
      elapsed_ms: 20000,
      eta_seconds: 0,
    };

    // Simulate completion
    await new Promise((resolve) => setTimeout(resolve, 60));
    currentStatus = "COMPLETED";

    const result = await waitPromise;
    expect(result.status).toBe("COMPLETED");
    expect(progressHistory.length).toBeGreaterThanOrEqual(2);
    expect(progressHistory.some((p) => p.framesCompleted === 1000)).toBe(true);
    expect(progressHistory.some((p) => p.framesCompleted === 2000)).toBe(true);
  });
});

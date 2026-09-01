import { act, cleanup, renderHook } from "@testing-library/react";
import { TaskSchema } from "@studio/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useContinuousProgress } from "./useContinuousProgress";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderTask(measured: boolean) {
  return TaskSchema.parse({
    task_id: measured ? "measured" : "legacy",
    task_type: "GENERATE_VIDEO",
    channel_id: "channel-1",
    episode_id: "episode-1",
    status: "RUNNING",
    created_at: "2026-09-01T00:00:00.000Z",
    lock_key: "episode-1",
    progress_percent: 80.75,
    render_progress: measured
      ? {
          phase: "capture_streaming",
          frames_completed: 200,
          total_frames: 400,
          worker_count: 6,
          elapsed_ms: 10_000,
          eta_seconds: 10,
        }
      : null,
  });
}

describe("useContinuousProgress", () => {
  it("never advances ahead of measured backend render progress", () => {
    vi.useFakeTimers();
    const task = renderTask(true);
    const { result } = renderHook(() => useContinuousProgress(task, task.progress_percent));

    void act(() => vi.advanceTimersByTime(5_000));

    expect(result.current).toBe(80.75);
  });

  it("retains smooth trickle for legacy tasks without measurements", () => {
    vi.useFakeTimers();
    const task = renderTask(false);
    const { result } = renderHook(() => useContinuousProgress(task, task.progress_percent));

    void act(() => vi.advanceTimersByTime(1_000));

    expect(result.current).toBeGreaterThan(80.75);
  });
});

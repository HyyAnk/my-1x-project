import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { MascotSlotProjection, MascotVideoProcessingJob } from "@studio/shared";
import { useSlotPolling } from "./useSlotPolling";
import { mascotAnimationApi } from "../services/mascotAnimationApi";

afterEach(() => {
  vi.restoreAllMocks();
});

const mockThinkingSlots: MascotSlotProjection[] = Array.from({ length: 10 }, (_, i) => ({
  style_id: "core",
  state: "thinking",
  slot_index: i + 1,
  status: i === 0 ? "ready" : "empty",
  active_job_id: null,
  source_video_url: null,
  updated_at: "2026-09-01T00:00:00.000Z",
}));

const mockCelebrateSlots: MascotSlotProjection[] = Array.from({ length: 10 }, (_, i) => ({
  style_id: "core",
  state: "celebrate",
  slot_index: i + 1,
  status: "empty",
  active_job_id: null,
  source_video_url: null,
  updated_at: "2026-09-01T00:00:00.000Z",
}));

describe("useSlotPolling", () => {
  beforeEach(() => {
    vi.spyOn(mascotAnimationApi, "getStyleAnimationSlots").mockResolvedValue({
      ok: true,
      mascot_id: "m1",
      style_id: "core",
      slots: {
        thinking: mockThinkingSlots,
        celebrate: mockCelebrateSlots,
      },
    });
  });

  it("loads slots on mount", async () => {
    const { result } = renderHook(() => useSlotPolling({ mascotId: "m1", styleId: "core" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.slots.thinking).toHaveLength(10);
    expect(result.current.slots.celebrate).toHaveLength(10);
    expect(result.current.error).toBeNull();
  });

  it("fetches active job states for in-flight slots", async () => {
    const inFlightThinking = [...mockThinkingSlots];
    inFlightThinking[1] = {
      ...inFlightThinking[1],
      status: "processing",
      active_job_id: "job_123",
    };

    vi.spyOn(mascotAnimationApi, "getStyleAnimationSlots").mockResolvedValue({
      ok: true,
      mascot_id: "m1",
      style_id: "core",
      slots: {
        thinking: inFlightThinking,
        celebrate: mockCelebrateSlots,
      },
    });

    const mockJob: MascotVideoProcessingJob = {
      id: "job_123",
      mascot_id: "m1",
      style_id: "core",
      state: "thinking",
      slot_index: 2,
      status: "processing",
      progress: 50,
      source_video_url: "https://example.com/video.mp4",
      source_video_fingerprint: "fp123",
      attempt: 1,
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    };

    vi.spyOn(mascotAnimationApi, "getProcessingJob").mockResolvedValue({
      ok: true,
      job: mockJob,
    });

    const { result } = renderHook(() => useSlotPolling({ mascotId: "m1", styleId: "core" }));

    await waitFor(() => {
      expect(result.current.activeJobs["job_123"]).toBeDefined();
    });

    expect(result.current.activeJobs["job_123"].status).toBe("processing");
    expect(result.current.hasInFlightProcessing).toBe(true);
  });

  it("handles fetch errors gracefully", async () => {
    vi.spyOn(mascotAnimationApi, "getStyleAnimationSlots").mockRejectedValue(new Error("Network connection failed"));

    const { result } = renderHook(() => useSlotPolling({ mascotId: "m1", styleId: "core" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network connection failed");
  });
});

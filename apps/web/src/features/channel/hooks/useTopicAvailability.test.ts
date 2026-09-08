import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TopicAvailabilityBatch } from "@studio/shared";
import { channelApi } from "../../../api/channelApi";
import { useTopicAvailability } from "./useTopicAvailability";

vi.mock("../../../api/channelApi", () => ({
  channelApi: {
    topicAvailability: vi.fn(),
  },
}));

describe("useTopicAvailability Hook", () => {
  const mockChannelId = "test-channel-123";

  const mockBatch: TopicAvailabilityBatch = {
    scan_status: "complete_nonempty",
    checked_at: "2026-09-08T15:00:00.000Z",
    snapshot_token: "token-abc-123",
    topics: [
      {
        topic_id: "topic-1",
        content_kind: "episode",
        can_confirm: true,
        reason_code: "AVAILABLE",
        retryable: false,
        recovery_action: "Ready to confirm.",
        source_capacity: 5,
      },
      {
        topic_id: "topic-2",
        content_kind: "short_reel",
        can_confirm: false,
        reason_code: "UNBOUND_LEGACY_TOPIC",
        retryable: true,
        recovery_action: "Re-suggest topics to bind canonical sources.",
        source_capacity: 0,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("fetches and maps topic availability on mount", async () => {
    vi.mocked(channelApi.topicAvailability).mockResolvedValueOnce(mockBatch);

    const { result } = renderHook(() => useTopicAvailability({ channelId: mockChannelId }));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.availability).toEqual(mockBatch);
    expect(result.current.availabilityMap.size).toBe(2);
    expect(result.current.availabilityMap.get("topic-1")?.can_confirm).toBe(true);
    expect(result.current.availabilityMap.get("topic-2")?.can_confirm).toBe(false);
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderHook(() => useTopicAvailability({ channelId: mockChannelId, enabled: false }));

    expect(result.current.loading).toBe(false);
    expect(channelApi.topicAvailability).not.toHaveBeenCalled();
    expect(result.current.availability).toBeNull();
  });

  it("rejects out-of-order slow responses", async () => {
    let resolveFirst: (batch: TopicAvailabilityBatch) => void;
    const firstPromise = new Promise<TopicAvailabilityBatch>((resolve) => {
      resolveFirst = resolve;
    });

    const secondBatch: TopicAvailabilityBatch = {
      ...mockBatch,
      checked_at: "2026-09-08T15:05:00.000Z",
      snapshot_token: "token-second",
      topics: [
        {
          topic_id: "topic-new",
          content_kind: "episode",
          can_confirm: true,
          reason_code: "AVAILABLE",
          retryable: false,
          recovery_action: "Ready to confirm.",
          source_capacity: 3,
        },
      ],
    };

    vi.mocked(channelApi.topicAvailability)
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValueOnce(secondBatch);

    const { result } = renderHook(() => useTopicAvailability({ channelId: mockChannelId }));

    // Trigger second refresh while first is in flight
    await act(async () => {
      await result.current.refresh();
    });

    // Resolve the first slow request now
    await act(async () => {
      resolveFirst!(mockBatch);
      await Promise.resolve();
    });

    // The second batch must win
    expect(result.current.availability?.snapshot_token).toBe("token-second");
    expect(result.current.availabilityMap.has("topic-new")).toBe(true);
  });

  it("handles errors and allows retry via refresh", async () => {
    vi.mocked(channelApi.topicAvailability).mockRejectedValueOnce(new Error("Network disconnect")).mockResolvedValueOnce(mockBatch);

    const { result } = renderHook(() => useTopicAvailability({ channelId: mockChannelId }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe("Network disconnect");
    expect(result.current.availability).toBeNull();

    // Retry via refresh
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.availability).toEqual(mockBatch);
  });

  it("aborts in-flight request and cleans up on unmount", () => {
    let capturedSignal: AbortSignal | undefined;
    vi.mocked(channelApi.topicAvailability).mockImplementation((_id, options) => {
      capturedSignal = options?.signal;
      return new Promise(() => {}); // never resolves
    });

    const { unmount } = renderHook(() => useTopicAvailability({ channelId: mockChannelId }));

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it("refreshes on window focus", async () => {
    vi.mocked(channelApi.topicAvailability).mockResolvedValue(mockBatch);

    renderHook(() => useTopicAvailability({ channelId: mockChannelId }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(channelApi.topicAvailability).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(channelApi.topicAvailability).toHaveBeenCalledTimes(2);
  });
});

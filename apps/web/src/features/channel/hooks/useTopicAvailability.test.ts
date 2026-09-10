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

  it("clears the old channel while the next channel is loading", async () => {
    vi.mocked(channelApi.topicAvailability)
      .mockResolvedValueOnce(mockBatch)
      .mockImplementationOnce(() => new Promise(() => {}));
    const { result, rerender } = renderHook(({ channelId }) => useTopicAvailability({ channelId }), {
      initialProps: { channelId: "first" },
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.availabilityMap.size).toBe(2);
    rerender({ channelId: "second" });
    expect(result.current.availabilityMap.size).toBe(0);
  });

  it("rejects a late response after disabling even when abort is ignored", async () => {
    let finish!: (batch: TopicAvailabilityBatch) => void;
    vi.mocked(channelApi.topicAvailability).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result, rerender } = renderHook(({ enabled }) => useTopicAvailability({ channelId: mockChannelId, enabled }), {
      initialProps: { enabled: true },
    });
    rerender({ enabled: false });
    await act(async () => {
      finish(mockBatch);
      await Promise.resolve();
    });
    expect(result.current.availability).toBeNull();
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

  it("accepts newer request B even if B.checked_at is earlier than prior state (clock skew)", async () => {
    const batchEarlierCheckedAt: TopicAvailabilityBatch = {
      ...mockBatch,
      checked_at: "2026-09-08T14:00:00.000Z", // earlier than mockBatch (15:00)
      snapshot_token: "token-earlier-skew",
      topics: [
        {
          topic_id: "topic-skew",
          content_kind: "episode",
          can_confirm: true,
          reason_code: "AVAILABLE",
          retryable: false,
          recovery_action: "Ready to confirm.",
          source_capacity: 4,
        },
      ],
    };

    vi.mocked(channelApi.topicAvailability).mockResolvedValueOnce(mockBatch).mockResolvedValueOnce(batchEarlierCheckedAt);

    const { result } = renderHook(() => useTopicAvailability({ channelId: mockChannelId }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.availability?.snapshot_token).toBe("token-abc-123");

    // Dispatch request B with earlier checked_at
    await act(async () => {
      await result.current.refresh();
    });

    // Request B must win regardless of checked_at timestamp
    expect(result.current.availability?.snapshot_token).toBe("token-earlier-skew");
    expect(result.current.availabilityMap.has("topic-skew")).toBe(true);
  });
});

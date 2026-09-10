import { act, renderHook, waitFor } from "@testing-library/react";
import { EpisodeSchema } from "@studio/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../api";
import { useChannelEpisodes } from "./useChannelEpisodes";

vi.mock("../../../api", () => ({
  api: {
    episodes: vi.fn(),
  },
}));

function createMockEpisode(id: string, title: string) {
  return EpisodeSchema.parse({
    episode_id: id,
    channel_id: "channel-1",
    slug: id,
    topic: { title, premise: `Premise for ${title}`, hook: "Hook" },
    stage: "VIDEO_READY",
    script_path: "script.md",
    scene_plan_path: "scenes.json",
    dialogue_script_path: "dialogue.md",
    video_prompts_path: "prompts.md",
    quiz_config: { question_count: 5, quiz_format: "odd_one_out" },
    video_asset_path: "video/master.mp4",
    video_duration_seconds: 120,
    thumbnail_asset_path_16_9: "assets/thumb.jpg",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  });
}

describe("useChannelEpisodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches the initial page of episodes with default parameters", async () => {
    const mockEpisodes = [createMockEpisode("ep-1", "Ocean Giants"), createMockEpisode("ep-2", "Deep Coral")];
    vi.mocked(api.episodes).mockResolvedValue({
      episodes: mockEpisodes,
      total: 2,
      page: 1,
      limit: 20,
      total_pages: 1,
      pagination: { total: 2, page: 1, limit: 20, total_pages: 1 },
    });

    const { result } = renderHook(() => useChannelEpisodes({ channelId: "channel-1" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.episodes).toEqual(mockEpisodes);
    expect(result.current.paginationMeta.total).toBe(2);
    expect(api.episodes).toHaveBeenCalledWith("channel-1", {
      page: 1,
      limit: 20,
      search: undefined,
      sort: "updated_desc",
      status: undefined,
    });
  });

  it("debounces search input and resets to page 1", async () => {
    vi.useFakeTimers();
    vi.mocked(api.episodes).mockResolvedValue({
      episodes: [],
      total: 0,
      page: 1,
      limit: 20,
      total_pages: 0,
    });

    const { result } = renderHook(() => useChannelEpisodes({ channelId: "channel-1", debounceMs: 200 }));

    // Initial fetch triggered
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    act(() => {
      result.current.setSearch("giants");
    });
    expect(result.current.search).toBe("giants");

    // Fast-forward debounce timer
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(result.current.page).toBe(1);
    expect(api.episodes).toHaveBeenLastCalledWith("channel-1", {
      page: 1,
      limit: 20,
      search: "giants",
      sort: "updated_desc",
      status: undefined,
    });
  });

  it("resets page to 1 when limit, sort, or status changes", async () => {
    vi.mocked(api.episodes).mockResolvedValue({
      episodes: [],
      total: 0,
      page: 1,
      limit: 20,
      total_pages: 0,
    });

    const { result } = renderHook(() => useChannelEpisodes({ channelId: "channel-1" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setPage(4);
    });
    expect(result.current.page).toBe(4);

    act(() => {
      result.current.setLimit(50);
    });
    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(50);

    act(() => {
      result.current.setPage(3);
    });
    act(() => {
      result.current.setSort("title_asc");
    });
    expect(result.current.page).toBe(1);
    expect(result.current.sort).toBe("title_asc");

    act(() => {
      result.current.setPage(2);
    });
    act(() => {
      result.current.setStatus("video_ready");
    });
    expect(result.current.page).toBe(1);
    expect(result.current.status).toBe("video_ready");
  });

  it("handles episode deletion and optimistically updates pagination total", async () => {
    const ep1 = createMockEpisode("ep-1", "Ocean Giants");
    const ep2 = createMockEpisode("ep-2", "Deep Coral");
    vi.mocked(api.episodes)
      .mockResolvedValueOnce({
        episodes: [ep1, ep2],
        total: 2,
        page: 1,
        limit: 20,
        total_pages: 1,
        pagination: { total: 2, page: 1, limit: 20, total_pages: 1 },
      })
      .mockResolvedValueOnce({
        episodes: [ep2],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
        pagination: { total: 1, page: 1, limit: 20, total_pages: 1 },
      });

    const { result } = renderHook(() => useChannelEpisodes({ channelId: "channel-1" }));

    await waitFor(() => {
      expect(result.current.episodes.length).toBe(2);
    });

    await act(async () => {
      await result.current.handleEpisodeDeleted(ep1);
    });

    expect(result.current.episodes.length).toBe(1);
    expect(result.current.episodes[0].episode_id).toBe("ep-2");
    expect(result.current.paginationMeta.total).toBe(1);
  });
});

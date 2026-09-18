import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EpisodeSchema } from "@studio/shared";
import { useChannelEpisodesFilter } from "./useChannelEpisodesFilter";

function createMockEpisode(id: string, title: string, isReady = true, hook = "hook") {
  return EpisodeSchema.parse({
    episode_id: id,
    channel_id: "channel-1",
    slug: id,
    topic: { title, premise: `Premise of ${title}`, hook },
    stage: isReady ? "VIDEO_READY" : "SELECTED",
    script_path: "script.md",
    scene_plan_path: "scenes.json",
    dialogue_script_path: "dialogue.md",
    video_prompts_path: "prompts.md",
    quiz_config: { question_count: 5, quiz_format: "odd_one_out" },
    video_asset_path: isReady ? "video/master.mp4" : null,
    video_duration_seconds: isReady ? 120 : null,
    thumbnail_asset_path_16_9: isReady ? "assets/thumb_16_9.jpg" : null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  });
}

describe("useChannelEpisodesFilter", () => {
  it("computes pagination and filtering correctly in uncontrolled mode", () => {
    const ep1 = createMockEpisode("ep-1", "Ocean Giants", true);
    const ep2 = createMockEpisode("ep-2", "Desert Mystery", false);
    const ep3 = createMockEpisode("ep-3", "Mountain Secrets", true);

    const { result } = renderHook(() =>
      useChannelEpisodesFilter({
        episodes: [ep1, ep2, ep3],
      }),
    );

    expect(result.current.isControlled).toBe(false);
    expect(result.current.currentTotalItems).toBe(3);
    expect(result.current.currentTotalPages).toBe(1);
    expect(result.current.displayedEpisodes).toHaveLength(3);

    // Search filter
    act(() => {
      result.current.handleSearchChange("Desert");
    });
    expect(result.current.currentSearch).toBe("Desert");
    expect(result.current.displayedEpisodes).toHaveLength(1);
    expect(result.current.displayedEpisodes[0].topic.title).toBe("Desert Mystery");

    // Clear search and filter by video_ready
    act(() => {
      result.current.handleSearchChange("");
      result.current.handleFilterChange("video_ready");
    });
    expect(result.current.currentFilter).toBe("video_ready");
    expect(result.current.displayedEpisodes).toHaveLength(2);

    // Filter by in_progress
    act(() => {
      result.current.handleFilterChange("in_progress");
    });
    expect(result.current.currentFilter).toBe("in_progress");
    expect(result.current.displayedEpisodes).toHaveLength(1);
    expect(result.current.displayedEpisodes[0].topic.title).toBe("Desert Mystery");

    // Sorting and page change in uncontrolled mode
    act(() => {
      result.current.handleSortChange("title_asc");
      result.current.handlePageChange(2);
      result.current.handleLimitChange(10);
    });
    expect(result.current.currentSort).toBe("title_asc");
    expect(result.current.currentPage).toBe(1); // Limit change resets to page 1
    expect(result.current.currentLimit).toBe(10);
  });

  it("delegates to callbacks when in controlled mode", () => {
    const ep1 = createMockEpisode("ep-1", "Ocean Giants");
    const onSearchChange = vi.fn();
    const onStatusChange = vi.fn();
    const onSortChange = vi.fn();
    const onPageChange = vi.fn();
    const onLimitChange = vi.fn();

    const { result } = renderHook(() =>
      useChannelEpisodesFilter({
        episodes: [ep1],
        page: 2,
        totalPages: 10,
        totalItems: 100,
        limit: 10,
        search: "Ocean",
        sort: "title_asc",
        status: "video_ready",
        onPageChange,
        onLimitChange,
        onSearchChange,
        onSortChange,
        onStatusChange,
      }),
    );

    expect(result.current.isControlled).toBe(true);
    expect(result.current.currentSearch).toBe("Ocean");
    expect(result.current.currentFilter).toBe("video_ready");
    expect(result.current.currentSort).toBe("title_asc");
    expect(result.current.currentPage).toBe(2);
    expect(result.current.currentLimit).toBe(10);
    expect(result.current.currentTotalItems).toBe(100);
    expect(result.current.currentTotalPages).toBe(10);

    act(() => {
      result.current.handleSearchChange("New Term");
    });
    expect(onSearchChange).toHaveBeenCalledWith("New Term");

    act(() => {
      result.current.handleFilterChange("in_progress");
    });
    expect(onStatusChange).toHaveBeenCalledWith("in_progress");

    act(() => {
      result.current.handleSortChange("created_desc");
    });
    expect(onSortChange).toHaveBeenCalledWith("created_desc");

    act(() => {
      result.current.handlePageChange(3);
    });
    expect(onPageChange).toHaveBeenCalledWith(3);

    act(() => {
      result.current.handleLimitChange(25);
    });
    expect(onLimitChange).toHaveBeenCalledWith(25);
  });

  it("flags hasNoEpisodesEver when total items is 0, no filters applied, and not loading", () => {
    const { result } = renderHook(() =>
      useChannelEpisodesFilter({
        episodes: [],
        loading: false,
      }),
    );

    expect(result.current.hasNoEpisodesEver).toBe(true);
  });
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EpisodeSchema } from "@studio/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockChannel } from "../../../../test/helpers/shortReelFixture";
import { ChannelEpisodesTab } from "./ChannelEpisodesTab";

afterEach(cleanup);

function createMockEpisode(id: string, title: string, isReady = true) {
  return EpisodeSchema.parse({
    episode_id: id,
    channel_id: "channel-1",
    slug: id,
    topic: { title, premise: `Premise of ${title}`, hook: `Hook for ${title}` },
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

describe("ChannelEpisodesTab", () => {
  it("renders empty state when there are no episodes confirmed yet", () => {
    render(
      <ChannelEpisodesTab
        channel={createMockChannel()}
        episodes={[]}
        tasks={[]}
        totalItems={0}
        totalPages={0}
        page={1}
        limit={20}
        onOpenEpisode={vi.fn()}
        onDeleteEpisode={vi.fn()}
        onGoToTopics={vi.fn()}
      />,
    );

    expect(screen.getByText("No episodes confirmed yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Explore Idea Lab" })).toBeTruthy();
  });

  it("renders paginated episode cards and pagination control with range info", () => {
    const ep1 = createMockEpisode("ep-1", "Ocean Giants");
    const ep2 = createMockEpisode("ep-2", "Deep Trench Mysteries");

    const onPageChange = vi.fn();
    const onLimitChange = vi.fn();

    render(
      <ChannelEpisodesTab
        channel={createMockChannel()}
        episodes={[ep1, ep2]}
        tasks={[]}
        totalItems={100}
        totalPages={5}
        page={1}
        limit={20}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
        onOpenEpisode={vi.fn()}
        onDeleteEpisode={vi.fn()}
        onGoToTopics={vi.fn()}
      />,
    );

    expect(screen.getByText("Ocean Giants")).toBeTruthy();
    expect(screen.getByText("Deep Trench Mysteries")).toBeTruthy();
    expect(screen.getByTestId("pagination-range-info").textContent).toContain("Showing 1–20 of 100");
    expect(screen.getByTestId("pagination-control")).toBeTruthy();

    // Clicking Next page
    const nextBtn = screen.getByRole("button", { name: "Go to next page" });
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);

    // Changing limit selector
    const limitSelect = screen.getByLabelText("Episodes per page");
    fireEvent.change(limitSelect, { target: { value: "50" } });
    expect(onLimitChange).toHaveBeenCalledWith(50);
  });

  it("triggers search and filter callbacks in controlled mode", () => {
    const ep1 = createMockEpisode("ep-1", "Ocean Giants");
    const onSearchChange = vi.fn();
    const onStatusChange = vi.fn();
    const onSortChange = vi.fn();

    render(
      <ChannelEpisodesTab
        channel={createMockChannel()}
        episodes={[ep1]}
        tasks={[]}
        totalItems={1}
        totalPages={1}
        page={1}
        limit={20}
        search="Ocean"
        onSearchChange={onSearchChange}
        onStatusChange={onStatusChange}
        onSortChange={onSortChange}
        onOpenEpisode={vi.fn()}
        onDeleteEpisode={vi.fn()}
        onGoToTopics={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );

    const searchInput = screen.getByRole("textbox", { name: "Search episodes" });
    fireEvent.change(searchInput, { target: { value: "Pacific" } });
    expect(onSearchChange).toHaveBeenCalledWith("Pacific");

    const inProductionFilterBtn = screen.getByRole("button", { name: "In Production" });
    fireEvent.click(inProductionFilterBtn);
    expect(onStatusChange).toHaveBeenCalledWith("in_progress");

    const sortSelect = screen.getByRole("combobox", { name: "Sort episodes" });
    fireEvent.change(sortSelect, { target: { value: "title_asc" } });
    expect(onSortChange).toHaveBeenCalledWith("title_asc");
  });

  it("renders empty search results message and reset button when search yields no results", () => {
    const onSearchChange = vi.fn();
    const onStatusChange = vi.fn();

    render(
      <ChannelEpisodesTab
        channel={createMockChannel()}
        episodes={[]}
        tasks={[]}
        totalItems={0}
        totalPages={0}
        page={1}
        limit={20}
        search="Unmatched Query"
        onSearchChange={onSearchChange}
        onStatusChange={onStatusChange}
        onOpenEpisode={vi.fn()}
        onDeleteEpisode={vi.fn()}
        onGoToTopics={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("episode-empty-search")).toBeTruthy();
    expect(screen.getByText(/No episodes matching/)).toBeTruthy();
    expect(screen.getByText(/"Unmatched Query"/)).toBeTruthy();

    const resetBtn = screen.getByRole("button", { name: "Reset Filters" });
    fireEvent.click(resetBtn);
    expect(onSearchChange).toHaveBeenCalledWith("");
    expect(onStatusChange).toHaveBeenCalledWith("all");
  });

  it("handles standalone uncontrolled fallback mode seamlessly", () => {
    const ep1 = createMockEpisode("ep-1", "Ocean Giants", true);
    const ep2 = createMockEpisode("ep-2", "Desert Storms", false);

    render(
      <ChannelEpisodesTab
        channel={createMockChannel()}
        episodes={[ep1, ep2]}
        tasks={[]}
        onOpenEpisode={vi.fn()}
        onDeleteEpisode={vi.fn()}
        onGoToTopics={vi.fn()}
      />,
    );

    expect(screen.getByText("Ocean Giants")).toBeTruthy();
    expect(screen.getByText("Desert Storms")).toBeTruthy();

    // Type in search filter
    const searchInput = screen.getByRole("textbox", { name: "Search episodes" });
    fireEvent.change(searchInput, { target: { value: "Desert" } });

    expect(screen.queryByText("Ocean Giants")).toBeNull();
    expect(screen.getByText("Desert Storms")).toBeTruthy();
  });
});

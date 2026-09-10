import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { createMockChannel, createMockShortReel } from "../../../../test/helpers/shortReelFixture";
import { ChannelShortReelsTab } from "./ChannelShortReelsTab";

describe("ChannelShortReelsTab Component", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders empty state when there are no short reels", () => {
    const channel = createMockChannel();
    const onGoToTopics = vi.fn();

    render(
      <ChannelShortReelsTab
        channel={channel}
        shortReels={[]}
        tasks={[]}
        onOpenStudio={vi.fn()}
        onDeleteShortReel={vi.fn()}
        onGoToTopics={onGoToTopics}
      />,
    );

    expect(screen.getByRole("heading", { name: "Confirmed Short-Reels (9:16)" })).toBeTruthy();
    expect(screen.getByText("0 short-reels")).toBeTruthy();
    expect(screen.getByText(/No short-reels confirmed yet/i)).toBeTruthy();

    const exploreBtn = screen.getByRole("link", { name: /Explore Idea Lab/i });
    fireEvent.click(exploreBtn);
    expect(onGoToTopics).toHaveBeenCalled();
  });

  it("renders short reels grid and filter chips with counts", () => {
    const channel = createMockChannel();
    const reelDraft = createMockShortReel({
      reel_id: "reel_draft_1",
      topic: {
        topic_id: "t1",
        channel_id: channel.channel_id,
        title: "Draft Speed Showdown",
        premise: "Comparing predator speeds",
        hook: "Fastest predators",
        origin: "discovery",
      },
    });
    const reelReady = createMockShortReel({
      reel_id: "reel_ready_2",
      topic: {
        topic_id: "t2",
        channel_id: channel.channel_id,
        title: "Ready Deep Trivia",
        premise: "Ocean trench facts",
        hook: "Deepest trenches",
        origin: "discovery",
      },
      units: {
        references: { state: "ready", last_accepted_payload: null, current_attempt: null, accepted_dependency_fingerprint: null },
        script: { state: "ready", last_accepted_payload: null, current_attempt: null, accepted_dependency_fingerprint: null },
        cover: { state: "ready", last_accepted_payload: null, current_attempt: null, accepted_dependency_fingerprint: null },
        publishing: { state: "ready", last_accepted_payload: null, current_attempt: null, accepted_dependency_fingerprint: null },
      },
    });

    render(
      <ChannelShortReelsTab
        channel={channel}
        shortReels={[reelDraft, reelReady]}
        tasks={[]}
        onOpenStudio={vi.fn()}
        onDeleteShortReel={vi.fn()}
        onGoToTopics={vi.fn()}
      />,
    );

    expect(screen.getByText("2 short-reels")).toBeTruthy();
    expect(screen.getByRole("button", { name: "All (2)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "In Production (1)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ready (1)" })).toBeTruthy();

    expect(screen.getByText("Draft Speed Showdown")).toBeTruthy();
    expect(screen.getByText("Ready Deep Trivia")).toBeTruthy();
  });

  it("filters short-reels by In Production and Ready status", () => {
    const channel = createMockChannel();
    const reelDraft = createMockShortReel({
      reel_id: "reel_draft_1",
      topic: {
        topic_id: "t1",
        channel_id: channel.channel_id,
        title: "Draft Speed Showdown",
        premise: "Comparing predator speeds",
        hook: "Fastest predators",
        origin: "discovery",
      },
    });
    const reelReady = createMockShortReel({
      reel_id: "reel_ready_2",
      topic: {
        topic_id: "t2",
        channel_id: channel.channel_id,
        title: "Ready Deep Trivia",
        premise: "Ocean trench facts",
        hook: "Deepest trenches",
        origin: "discovery",
      },
      units: {
        references: { state: "ready", last_accepted_payload: null, current_attempt: null, accepted_dependency_fingerprint: null },
        script: { state: "ready", last_accepted_payload: null, current_attempt: null, accepted_dependency_fingerprint: null },
        cover: { state: "ready", last_accepted_payload: null, current_attempt: null, accepted_dependency_fingerprint: null },
        publishing: { state: "ready", last_accepted_payload: null, current_attempt: null, accepted_dependency_fingerprint: null },
      },
    });

    render(
      <ChannelShortReelsTab
        channel={channel}
        shortReels={[reelDraft, reelReady]}
        tasks={[]}
        onOpenStudio={vi.fn()}
        onDeleteShortReel={vi.fn()}
        onGoToTopics={vi.fn()}
      />,
    );

    // Filter by Ready
    fireEvent.click(screen.getByRole("button", { name: "Ready (1)" }));
    expect(screen.queryByText("Draft Speed Showdown")).toBeNull();
    expect(screen.getByText("Ready Deep Trivia")).toBeTruthy();

    // Filter by In Production
    fireEvent.click(screen.getByRole("button", { name: "In Production (1)" }));
    expect(screen.getByText("Draft Speed Showdown")).toBeTruthy();
    expect(screen.queryByText("Ready Deep Trivia")).toBeNull();

    // Filter by All
    fireEvent.click(screen.getByRole("button", { name: "All (2)" }));
    expect(screen.getByText("Draft Speed Showdown")).toBeTruthy();
    expect(screen.getByText("Ready Deep Trivia")).toBeTruthy();
  });

  it("searches and filters by text and resets on clear", () => {
    const channel = createMockChannel();
    const reel1 = createMockShortReel({
      reel_id: "reel_1",
      topic: {
        topic_id: "t1",
        channel_id: channel.channel_id,
        title: "Cheetah Speed",
        premise: "Fastest animal on land",
        hook: "Speed contest",
        origin: "discovery",
      },
    });
    const reel2 = createMockShortReel({
      reel_id: "reel_2",
      topic: {
        topic_id: "t2",
        channel_id: channel.channel_id,
        title: "Blue Whale Size",
        premise: "Largest mammal in ocean",
        hook: "Giant creatures",
        origin: "discovery",
      },
    });

    render(
      <ChannelShortReelsTab
        channel={channel}
        shortReels={[reel1, reel2]}
        tasks={[]}
        onOpenStudio={vi.fn()}
        onDeleteShortReel={vi.fn()}
        onGoToTopics={vi.fn()}
      />,
    );

    const searchInput = screen.getByLabelText("Search short-reels");
    fireEvent.change(searchInput, { target: { value: "Whale" } });

    expect(screen.queryByText("Cheetah Speed")).toBeNull();
    expect(screen.getByText("Blue Whale Size")).toBeTruthy();

    // Search clear button
    const clearBtn = screen.getByRole("button", { name: "Clear search" });
    fireEvent.click(clearBtn);

    expect(screen.getByText("Cheetah Speed")).toBeTruthy();
    expect(screen.getByText("Blue Whale Size")).toBeTruthy();

    // Search yielding 0 results
    fireEvent.change(searchInput, { target: { value: "NonExistent" } });
    expect(screen.getByTestId("short-reels-empty-search")).toBeTruthy();

    // Reset filters
    const resetBtn = screen.getByRole("button", { name: "Reset Filters" });
    fireEvent.click(resetBtn);

    expect(screen.getByText("Cheetah Speed")).toBeTruthy();
    expect(screen.getByText("Blue Whale Size")).toBeTruthy();
  });
});

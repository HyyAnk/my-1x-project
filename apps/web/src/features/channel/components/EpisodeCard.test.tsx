import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EpisodeSchema } from "@studio/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EpisodeCard } from "./EpisodeCard";

afterEach(cleanup);

function createEpisode(overrides: Record<string, unknown> = {}) {
  return EpisodeSchema.parse({
    episode_id: "episode-1",
    channel_id: "channel-1",
    slug: "episode-1",
    topic: { title: "Ocean Giants", premise: "Premise that should stay hidden", hook: "Hook" },
    stage: "VIDEO_READY",
    script_path: "script.md",
    scene_plan_path: "scenes.json",
    dialogue_script_path: "dialogue.md",
    video_prompts_path: "prompts.md",
    quiz_config: { question_count: 8, quiz_format: "odd_one_out" },
    video_asset_path: "video/master.mp4",
    video_duration_seconds: 222,
    thumbnail_asset_path_16_9: "assets/thumbnail_16_9.jpg",
    created_at: "2026-09-03T01:02:03.000Z",
    updated_at: "2026-09-03T01:02:03.000Z",
    ...overrides,
  });
}

describe("EpisodeCard", () => {
  it("renders only the compact episode summary requested for a completed video", () => {
    render(<EpisodeCard episode={createEpisode()} tasks={[]} onOpen={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByRole("img", { name: "Thumbnail for Ocean Giants" }).getAttribute("src")).toContain("/thumbnail/file/16_9");
    expect(screen.getByText("Ocean Giants")).toBeTruthy();
    expect(screen.getByText("Visual choices")).toBeTruthy();
    expect(screen.getByText("Video ready")).toBeTruthy();
    expect(screen.getByText("8 Q · 03:42")).toBeTruthy();
    expect(screen.getByText("Sep 3")).toBeTruthy();
    expect(screen.queryByText("Premise that should stay hidden")).toBeNull();
    expect(screen.queryByText("Open Studio")).toBeNull();
  });

  it("uses a black thumbnail placeholder before the video is ready", () => {
    render(
      <EpisodeCard
        episode={createEpisode({ stage: "SELECTED", video_asset_path: null, video_duration_seconds: null })}
        tasks={[]}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByRole("img", { name: "Thumbnail for Ocean Giants" })).toBeNull();
    expect(screen.getByTestId("episode-thumbnail-placeholder")).toBeTruthy();
    expect(screen.getByText("Not started")).toBeTruthy();
  });

  it("opens from the card and keeps delete as a separate action", () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    const episode = createEpisode();
    render(<EpisodeCard episode={episode} tasks={[]} onOpen={onOpen} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("link", { name: "Open Ocean Giants" }));
    expect(onOpen).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Delete episode Ocean Giants" }));
    expect(onDelete).toHaveBeenCalledWith(episode);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

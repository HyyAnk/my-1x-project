import { EpisodeSchema, TaskSchema } from "@studio/shared";
import { describe, expect, it } from "vitest";
import { buildEpisodeCardViewModel } from "./episodeCardViewModel";

const createdAt = "2026-09-03T01:02:03.000Z";

function createEpisode(overrides: Record<string, unknown> = {}) {
  return EpisodeSchema.parse({
    episode_id: "episode-1",
    channel_id: "channel-1",
    slug: "episode-1",
    topic: {
      title: "Ocean Giants",
      premise: "A quiz about the largest animals in the ocean",
      hook: "Can you spot the biggest one?",
    },
    stage: "SELECTED",
    script_path: "script.md",
    scene_plan_path: "scenes.json",
    dialogue_script_path: "dialogue.md",
    video_prompts_path: "prompts.md",
    quiz_config: { question_count: 8, quiz_format: "odd_one_out" },
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  });
}

function createTask(overrides: Record<string, unknown> = {}) {
  return TaskSchema.parse({
    task_id: "task-1",
    task_type: "GENERATE_PIPELINE",
    channel_id: "channel-1",
    episode_id: "episode-1",
    status: "RUNNING",
    created_at: createdAt,
    lock_key: "episode-1",
    ...overrides,
  });
}

describe("buildEpisodeCardViewModel", () => {
  it("uses the completed video thumbnail and actual duration", () => {
    const episode = createEpisode({
      stage: "VIDEO_READY",
      video_asset_path: "video/master.mp4",
      video_duration_seconds: 222,
      thumbnail_asset_path_16_9: "assets/thumbnail_16_9.jpg",
    });

    expect(buildEpisodeCardViewModel(episode, [])).toEqual(
      expect.objectContaining({
        layoutLabel: "Visual choices",
        statusLabel: "Video ready",
        durationLabel: "8 Q · 03:42",
        thumbnailRatio: "16:9",
        createdDateLabel: "Sep 3",
      }),
    );
  });

  it("keeps the thumbnail black until the video and thumbnail are both ready", () => {
    const episode = createEpisode({ thumbnail_asset_path_16_9: "assets/thumbnail_16_9.jpg" });

    expect(buildEpisodeCardViewModel(episode, []).thumbnailRatio).toBeNull();
    expect(buildEpisodeCardViewModel(episode, []).durationLabel).toBe("8 Q · ~4m");
  });

  it("shows only the latest active progress as the current status", () => {
    const tasks = [
      createTask({ task_id: "old", created_at: "2026-09-03T01:00:00.000Z", progress_message: "Researching sources" }),
      createTask({ task_id: "new", created_at: "2026-09-03T02:00:00.000Z", progress_message: "Rendering frame 120 / 900" }),
    ];

    expect(buildEpisodeCardViewModel(createEpisode({ stage: "VIDEO_RENDERING" }), tasks).statusLabel).toBe("Rendering frame 120 / 900");
  });

  it("marks a selected episode without active work as not started", () => {
    expect(buildEpisodeCardViewModel(createEpisode(), []).statusLabel).toBe("Not started");
  });

  it("prioritizes 9:16 thumbnail when render_aspect_ratio is 9:16", () => {
    const episode = createEpisode({
      stage: "VIDEO_READY",
      video_asset_path: "video/master.mp4",
      thumbnail_asset_path_16_9: "assets/thumbnail_16_9.jpg",
      thumbnail_asset_path_9_16: "assets/thumbnail_9_16.jpg",
      quiz_config: { question_count: 8, quiz_format: "odd_one_out", render_aspect_ratio: "9:16" },
    });

    expect(buildEpisodeCardViewModel(episode, []).thumbnailRatio).toBe("9:16");
  });
});

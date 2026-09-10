import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { Channel, Task } from "@studio/shared";
import { api } from "../../../api";
import { useTasksViewData } from "./useTasksViewData";

function makeMockTask(overrides: Partial<Task>): Task {
  return {
    task_id: "task-test-1",
    task_type: "GENERATE_VIDEO",
    channel_id: "ch-1",
    episode_id: null,
    status: "COMPLETED",
    created_at: "2026-09-09T00:00:00.000Z",
    started_at: "2026-09-09T00:00:01.000Z",
    completed_at: "2026-09-09T00:00:05.000Z",
    codex_thread_id: null,
    codex_turn_id: null,
    error: null,
    output_files: [],
    lock_key: "lock-1",
    queue_position: null,
    progress_message: "Done",
    progress_percent: 100,
    render_progress: null,
    scene_number: null,
    accumulated_duration_seconds: 4,
    ...overrides,
  };
}

const mockChannels: Channel[] = Array.from({ length: 20 }, (_, i) => ({
  channel_id: `ch-${i}`,
  slug: `channel-${i}`,
  name: `Channel ${i}`,
  display_name: `Channel ${i}`,
  description: "",
  target_audience: "",
  language: "English",
  market: "Global",
  default_visual_style: "cinematic",
  default_thinking_bar_style: "auto",
  default_counter_style: "auto",
  default_question_box_style: "auto",
  default_answer_card_style: "auto",
  default_background_style: "auto",
  created_at: "2026-09-09T00:00:00.000Z",
  updated_at: "2026-09-09T00:00:00.000Z",
  episodes_count: 50,
  topics_count: 0,
  short_reels_count: 0,
})) as unknown as Channel[];

describe("useTasksViewData - Elimination of N+1 Query Storm (Stage 6)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("makes 0 network calls when there are 20 channels but no tasks have episode_id", () => {
    const episodesSpy = vi.spyOn(api, "episodes");
    const batchTitlesSpy = vi.spyOn(api, "batchEpisodeTitles");

    const tasks: Task[] = [makeMockTask({ task_id: "t1", episode_id: null }), makeMockTask({ task_id: "t2", episode_id: null })];

    renderHook(() =>
      useTasksViewData({
        tasks,
        channels: mockChannels,
        now: Date.now(),
        onRefresh: async () => {},
        onNotice: () => {},
      }),
    );

    // Completely eliminated N+1 cascade
    expect(episodesSpy).not.toHaveBeenCalled();
    expect(batchTitlesSpy).not.toHaveBeenCalled();
  });

  it("makes a single batch title lookup for unique episode IDs and bypasses channel scanning", async () => {
    const episodesSpy = vi.spyOn(api, "episodes");
    const batchTitlesSpy = vi.spyOn(api, "batchEpisodeTitles").mockResolvedValue({
      titles: {
        "ep-101": "Space Exploration History",
        "ep-102": "Deep Ocean Secrets",
      },
    });

    const tasks: Task[] = [
      makeMockTask({ task_id: "t1", episode_id: "ep-101" }),
      makeMockTask({ task_id: "t2", episode_id: "ep-102" }),
      makeMockTask({ task_id: "t3", episode_id: "ep-101" }), // Duplicate ID
    ];

    const { result } = renderHook(() =>
      useTasksViewData({
        tasks,
        channels: mockChannels,
        now: Date.now(),
        onRefresh: async () => {},
        onNotice: () => {},
      }),
    );

    // Channels must NEVER be iterated with api.episodes
    expect(episodesSpy).not.toHaveBeenCalled();

    // Exactly 1 batch call with unique IDs
    expect(batchTitlesSpy).toHaveBeenCalledTimes(1);
    expect(batchTitlesSpy).toHaveBeenCalledWith(["ep-101", "ep-102"]);

    await waitFor(() => {
      expect(result.current.productionItems.length).toBeGreaterThan(0);
      const titles = result.current.productionItems.map((item) => item.episodeTitle);
      expect(titles).toContain("Space Exploration History");
      expect(titles).toContain("Deep Ocean Secrets");
    });
  });

  it("uses pre-attached episode_title on tasks and makes 0 network calls", () => {
    const episodesSpy = vi.spyOn(api, "episodes");
    const batchTitlesSpy = vi.spyOn(api, "batchEpisodeTitles");

    const tasks: Task[] = [
      makeMockTask({
        task_id: "t1",
        episode_id: "ep-201",
        episode_title: "Pre-attached Episode Title",
      }),
    ];

    const { result } = renderHook(() =>
      useTasksViewData({
        tasks,
        channels: mockChannels,
        now: Date.now(),
        onRefresh: async () => {},
        onNotice: () => {},
      }),
    );

    expect(episodesSpy).not.toHaveBeenCalled();
    expect(batchTitlesSpy).not.toHaveBeenCalled();

    const titles = result.current.productionItems.map((item) => item.episodeTitle);
    expect(titles).toContain("Pre-attached Episode Title");
  });
});

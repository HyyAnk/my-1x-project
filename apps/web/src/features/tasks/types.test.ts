import { describe, expect, it } from "vitest";
import { FAILED_TASK_ATTENTION_WINDOW_MS, type Task } from "@studio/shared";
import { needsAttention, type ProductionItemSummary } from "./types";

function failedItem(completedAt: string): ProductionItemSummary {
  const task = {
    task_id: "task-failed",
    task_type: "GENERATE_VIDEO",
    channel_id: "channel-1",
    episode_id: "episode-1",
    status: "FAILED",
    created_at: completedAt,
    started_at: completedAt,
    completed_at: completedAt,
    codex_thread_id: null,
    codex_turn_id: null,
    error: "Render failed",
    output_files: [],
    lock_key: "episode-1",
    queue_position: null,
    progress_message: "Render failed",
    progress_percent: 50,
    scene_number: null,
    accumulated_duration_seconds: 0,
  } satisfies Task;
  return {
    id: "episode-1",
    channelId: task.channel_id,
    channelName: "Channel",
    episodeId: task.episode_id,
    episodeTitle: "Episode",
    tasks: [task],
    activeTask: null,
    latestTask: task,
    status: task.status,
    progressPercent: 50,
    progressMessage: task.progress_message,
    queuePosition: null,
    error: task.error,
    startedAt: completedAt,
    completedAt,
    accumulatedSeconds: 0,
  };
}

describe("task attention lifecycle", () => {
  it("expires failed builds after exactly ten hours", () => {
    const now = Date.parse("2026-08-29T12:00:00.000Z");
    expect(needsAttention(failedItem(new Date(now - FAILED_TASK_ATTENTION_WINDOW_MS).toISOString()), now)).toBe(true);
    expect(needsAttention(failedItem(new Date(now - FAILED_TASK_ATTENTION_WINDOW_MS - 1).toISOString()), now)).toBe(false);
  });

  it("rejects future and malformed failure timestamps", () => {
    const now = Date.parse("2026-08-29T12:00:00.000Z");
    expect(needsAttention(failedItem(new Date(now + 1).toISOString()), now)).toBe(false);
    expect(needsAttention(failedItem("invalid"), now)).toBe(false);
  });
});

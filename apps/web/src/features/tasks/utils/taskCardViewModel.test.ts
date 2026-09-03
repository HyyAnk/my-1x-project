import { TaskSchema } from "@studio/shared";
import { describe, expect, it } from "vitest";
import type { ProductionItemSummary } from "../types";
import { buildTaskCardViewModel } from "./taskCardViewModel";

function summary(status: "COMPLETED" | "QUEUED" | "RUNNING"): ProductionItemSummary {
  const task = TaskSchema.parse({
    task_id: `task-${status.toLowerCase()}`,
    task_type: "GENERATE_VIDEO",
    channel_id: "channel-1",
    episode_id: "episode-1",
    status,
    created_at: "2026-09-03T02:00:00.000Z",
    started_at: status === "QUEUED" ? null : "2026-09-03T02:00:00.000Z",
    completed_at: status === "COMPLETED" ? "2026-09-03T02:02:30.000Z" : null,
    error: null,
    output_files: [],
    lock_key: "episode-1",
    queue_position: status === "QUEUED" ? 1 : null,
    progress_message: status === "COMPLETED" ? "Completed" : status === "QUEUED" ? "Queued" : "Rendering frames",
    progress_percent: status === "COMPLETED" ? 100 : status === "RUNNING" ? 42 : 0,
    scene_number: null,
    accumulated_duration_seconds: 0,
  });
  return {
    id: "episode-1",
    channelId: task.channel_id,
    channelName: "Quiz Lab",
    episodeId: task.episode_id!,
    episodeTitle: "Ocean Giants",
    tasks: [task],
    activeTask: status === "COMPLETED" ? null : task,
    latestTask: task,
    status,
    progressPercent: task.progress_percent ?? 0,
    progressMessage: task.progress_message,
    queuePosition: task.queue_position,
    error: null,
    startedAt: task.started_at || task.created_at,
    completedAt: task.completed_at,
    accumulatedSeconds: 0,
  };
}

describe("buildTaskCardViewModel", () => {
  it("omits duplicate completion copy and keeps compact metadata", () => {
    const viewModel = buildTaskCardViewModel(summary("COMPLETED"), Date.parse("2026-09-03T03:00:00.000Z"), "en-US");

    expect(viewModel.detailLabel).toBeNull();
    expect(viewModel.durationLabel).toBe("02:30");
    expect(viewModel.timeLabel).toBe("9:02 AM");
    expect(viewModel.action).toBeNull();
  });

  it("describes queue position once and exposes the relevant action", () => {
    const viewModel = buildTaskCardViewModel(summary("QUEUED"), Date.parse("2026-09-03T03:00:00.000Z"), "en-US");

    expect(viewModel.detailLabel).toBe("Queue #2");
    expect(viewModel.action).toBe("cancel");
  });

  it("keeps real progress for running work", () => {
    const viewModel = buildTaskCardViewModel(summary("RUNNING"), Date.parse("2026-09-03T02:01:00.000Z"), "en-US");

    expect(viewModel.detailLabel).toBe("Rendering frames");
    expect(viewModel.progressPercent).toBe(42);
  });

  it("points episode cards at the generated 16:9 thumbnail asset", () => {
    const viewModel = buildTaskCardViewModel(summary("COMPLETED"), Date.parse("2026-09-03T03:00:00.000Z"), "en-US");

    expect(viewModel.thumbnailUrl).toBe("/api/channels/channel-1/episodes/episode-1/thumbnail/file/16_9?t=2026-09-03T02%3A02%3A30.000Z");
  });
});

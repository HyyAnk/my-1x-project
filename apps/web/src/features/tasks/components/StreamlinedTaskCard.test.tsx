import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TaskSchema } from "@studio/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProductionItemSummary } from "../types";
import { StreamlinedTaskCard } from "./StreamlinedTaskCard";

afterEach(cleanup);

function item(status: "COMPLETED" | "RUNNING"): ProductionItemSummary {
  const task = TaskSchema.parse({
    task_id: `task-${status.toLowerCase()}`,
    task_type: "GENERATE_VIDEO",
    channel_id: "channel-1",
    episode_id: "episode-1",
    status,
    created_at: "2026-09-03T02:00:00.000Z",
    started_at: "2026-09-03T02:00:00.000Z",
    completed_at: status === "COMPLETED" ? "2026-09-03T02:02:30.000Z" : null,
    error: null,
    output_files: [],
    lock_key: "episode-1",
    queue_position: null,
    progress_message: status === "COMPLETED" ? "Completed" : "Rendering frames",
    progress_percent: status === "COMPLETED" ? 100 : 42,
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
    activeTask: status === "RUNNING" ? task : null,
    latestTask: task,
    status,
    progressPercent: task.progress_percent ?? 0,
    progressMessage: task.progress_message,
    queuePosition: null,
    error: null,
    startedAt: task.started_at!,
    completedAt: task.completed_at,
    accumulatedSeconds: 0,
  };
}

function renderCard(value: ProductionItemSummary, onInspect = vi.fn(), onCancel = vi.fn()) {
  render(
    <StreamlinedTaskCard
      item={value}
      now={Date.parse("2026-09-03T03:00:00.000Z")}
      onCancel={onCancel}
      onRetry={vi.fn()}
      onInspect={onInspect}
    />,
  );
  return onInspect;
}

describe("StreamlinedTaskCard", () => {
  it("shows one completion state and removes duplicate card actions", () => {
    renderCard(item("COMPLETED"));

    expect(screen.getAllByText("Completed")).toHaveLength(1);
    expect(screen.queryByText("Completed successfully")).toBeNull();
    expect(screen.queryByText("Rail")).toBeNull();
    expect(screen.getByText("Ocean Giants")).toBeTruthy();
    expect(screen.getByText("Quiz Lab")).toBeTruthy();
    expect(screen.getByText("02:30")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Thumbnail for Ocean Giants" }).getAttribute("src")).toContain(
      "/api/channels/channel-1/episodes/episode-1/thumbnail/file/16_9",
    );
  });

  it("keeps a black thumbnail surface when the generated asset is unavailable", () => {
    renderCard(item("COMPLETED"));

    const thumbnail = screen.getByTestId("task-card-thumbnail");
    const image = screen.getByRole("img", { name: "Thumbnail for Ocean Giants" });
    fireEvent.error(image);

    expect(screen.queryByRole("img", { name: "Thumbnail for Ocean Giants" })).toBeNull();
    expect(thumbnail.className).toBe("task-card-thumbnail");
  });

  it("opens details from a natively keyboard-accessible button", () => {
    const onInspect = renderCard(item("COMPLETED"));
    const card = screen.getByRole("button", { name: "View task details for Ocean Giants" });

    fireEvent.click(card);
    expect(card.tagName).toBe("BUTTON");
    expect(onInspect).toHaveBeenCalledTimes(1);
  });

  it("keeps measurable progress and only the active cancel action", () => {
    renderCard(item("RUNNING"));

    expect(screen.getByRole("progressbar", { name: "Generate video progress" }).getAttribute("aria-valuenow")).toBe("42");
    expect(screen.getByRole("button", { name: "Cancel task" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open in Production Rail" })).toBeNull();
  });

  it("acknowledges a pending action and prevents duplicate submission", async () => {
    let finishCancel: (() => void) | undefined;
    const onCancel = vi.fn(() => new Promise<void>((resolve) => (finishCancel = resolve)));
    renderCard(item("RUNNING"), vi.fn(), onCancel);
    const button = screen.getByRole("button", { name: "Cancel task" });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Cancelling task" }).hasAttribute("disabled")).toBe(true);
    finishCancel?.();
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel task" }).hasAttribute("disabled")).toBe(false));
  });
});

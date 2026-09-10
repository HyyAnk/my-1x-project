import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { createMockShortReel } from "../../../../test/helpers/shortReelFixture";
import { ShortReelCard } from "./ShortReelCard";
import type { Task } from "@studio/shared";

describe("ShortReelCard Component", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders reel title, premise, archetype, duration, and draft status pill", () => {
    const reel = createMockShortReel();
    const onOpenStudio = vi.fn();
    const onDelete = vi.fn();

    render(<ShortReelCard reel={reel} tasks={[]} onOpenStudio={onOpenStudio} onDelete={onDelete} />);

    expect(screen.getByText("Cheetah vs Greyhound Speed")).toBeTruthy();
    expect(screen.getByText("Comparing raw sprint acceleration across terrain.")).toBeTruthy();
    expect(screen.getByText("Versus Faceoff")).toBeTruthy();
    expect(screen.getByText("24–30s")).toBeTruthy();
    expect(screen.getByText("Draft")).toBeTruthy();
    expect(screen.getByTestId("short-reel-fallback-visual")).toBeTruthy();
  });

  it("renders generating status when there is an active task", () => {
    const reel = createMockShortReel();
    const activeTask: Task = {
      task_id: "task-gen-001",
      task_type: "GENERATE_SHORT_REEL",
      channel_id: reel.channel_id,
      episode_id: null,
      reel_id: reel.reel_id,
      status: "RUNNING",
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: null,
      codex_thread_id: null,
      codex_turn_id: null,
      error: null,
      output_files: [],
      lock_key: `lock-${reel.reel_id}`,
      queue_position: null,
      progress_message: "Generating script...",
      progress_percent: 50,
      render_progress: null,
      scene_number: null,
      accumulated_duration_seconds: 0,
    };

    render(<ShortReelCard reel={reel} tasks={[activeTask]} onOpenStudio={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Generating")).toBeTruthy();
    const article = screen.getByRole("article", { name: /Short-Reel: Cheetah vs Greyhound Speed/i });
    expect(article.classList.contains("is-generating")).toBe(true);
    expect(article.classList.contains("is-task-active")).toBe(true);
  });

  it("renders ready status when all deliverable units are ready", () => {
    const reel = createMockShortReel({
      units: {
        references: { state: "ready", last_accepted_payload: null, current_attempt: null },
        script: { state: "ready", last_accepted_payload: null, current_attempt: null },
        cover: {
          state: "ready",
          last_accepted_payload: {
            asset_id: "cover_asset_001",
            path: "cover.png",
            mime_type: "image/png",
            width: 1080,
            height: 1920,
            checksum: "checksum_123",
          },
          current_attempt: null,
        },
        publishing: { state: "ready", last_accepted_payload: null, current_attempt: null },
      },
    });

    render(<ShortReelCard reel={reel} tasks={[]} onOpenStudio={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Ready")).toBeTruthy();
    const img = screen.getByAltText("Cover for Cheetah vs Greyhound Speed") as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain("cover_asset_001");
  });

  it("renders exported status when package task is completed", () => {
    const reel = createMockShortReel();
    const packageTask: Task = {
      task_id: "task-pkg-001",
      task_type: "GENERATE_SHORT_REEL",
      channel_id: reel.channel_id,
      episode_id: null,
      reel_id: reel.reel_id,
      short_reel_request: {
        request_id: "req-1",
        expected_revision: 1,
        target: "package",
      },
      status: "COMPLETED",
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      codex_thread_id: null,
      codex_turn_id: null,
      error: null,
      output_files: [],
      lock_key: `lock-${reel.reel_id}`,
      queue_position: null,
      progress_message: "Export package created",
      progress_percent: 100,
      render_progress: null,
      scene_number: null,
      accumulated_duration_seconds: 0,
    };

    render(<ShortReelCard reel={reel} tasks={[packageTask]} onOpenStudio={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Exported")).toBeTruthy();
  });

  it("handles Open Studio and Delete click interactions", () => {
    const reel = createMockShortReel();
    const onOpenStudio = vi.fn();
    const onDelete = vi.fn();

    render(<ShortReelCard reel={reel} tasks={[]} onOpenStudio={onOpenStudio} onDelete={onDelete} />);

    const openStudioBtn = screen.getByRole("link", { name: /Open Studio for Cheetah vs Greyhound Speed/i });
    fireEvent.click(openStudioBtn);
    expect(onOpenStudio).toHaveBeenCalledWith(reel.channel_id, reel.reel_id);

    const deleteBtn = screen.getByRole("button", { name: /Delete Short-Reel Cheetah vs Greyhound Speed/i });
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(reel);
  });

  it("renders live task progress message when task is actively running", () => {
    const reel = createMockShortReel();
    const activeTask: Task = {
      task_id: "task-live-1",
      task_type: "GENERATE_SHORT_REEL",
      channel_id: reel.channel_id,
      episode_id: null,
      reel_id: reel.reel_id,
      status: "RUNNING",
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: null,
      codex_thread_id: null,
      codex_turn_id: null,
      error: null,
      output_files: [],
      lock_key: `lock-${reel.reel_id}`,
      queue_position: null,
      progress_message: "Composing vertical storyboard visuals...",
      progress_percent: 65,
      render_progress: null,
      scene_number: null,
      accumulated_duration_seconds: 0,
    };

    render(<ShortReelCard reel={reel} tasks={[activeTask]} onOpenStudio={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByTestId("short-reel-live-task")).toBeTruthy();
    expect(screen.getByText("Composing vertical storyboard visuals...")).toBeTruthy();
  });

  it("renders quick ZIP export button when reel is ready or exported", () => {
    const reel = createMockShortReel();
    const packageTask: Task = {
      task_id: "task-pkg-done",
      task_type: "GENERATE_SHORT_REEL",
      channel_id: reel.channel_id,
      episode_id: null,
      reel_id: reel.reel_id,
      short_reel_request: {
        request_id: "req-1",
        expected_revision: 1,
        target: "package",
      },
      status: "COMPLETED",
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      codex_thread_id: null,
      codex_turn_id: null,
      error: null,
      output_files: [],
      lock_key: `lock-${reel.reel_id}`,
      queue_position: null,
      progress_message: "Done",
      progress_percent: 100,
      render_progress: null,
      scene_number: null,
      accumulated_duration_seconds: 0,
    };

    render(<ShortReelCard reel={reel} tasks={[packageTask]} onOpenStudio={vi.fn()} onDelete={vi.fn()} />);

    const zipLink = screen.getByTestId(`quick-export-${reel.reel_id}`);
    expect(zipLink).toBeTruthy();
    expect(zipLink.getAttribute("download")).toBe(`short-reel-${reel.reel_id}.zip`);
  });
});

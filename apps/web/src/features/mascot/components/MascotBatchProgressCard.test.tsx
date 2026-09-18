import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MascotBatchProgressCard } from "./MascotBatchProgressCard";
import type { BatchProgressState } from "../hooks/useMascotBatchGeneration";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MascotBatchProgressCard Component", () => {
  const defaultProgress: BatchProgressState = {
    total: 10,
    completed: 4,
    failed: 1,
    activeSlotKeys: ["thinking_5", "thinking_6"],
    statusMessage: "Generating thinking slots 5 and 6...",
    startTime: Date.now(),
    isStopping: false,
    targetState: "thinking",
    mode: "batch_empty",
  };

  it("returns null when batchProgress is null", () => {
    const { container } = render(<MascotBatchProgressCard batchProgress={null} onStopBatch={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders standard empty slot generation title dynamically", () => {
    render(
      <MascotBatchProgressCard
        batchProgress={{
          ...defaultProgress,
          mode: "batch_empty",
          targetState: "thinking",
        }}
        onStopBatch={vi.fn()}
      />,
    );

    expect(screen.getByText("Generating Thinking Variants (3 Concurrent Streams)")).toBeDefined();
  });

  it("renders regenerating selected variants title dynamically when in regenerate mode", () => {
    render(
      <MascotBatchProgressCard
        batchProgress={{
          ...defaultProgress,
          mode: "regenerate_selected",
          targetState: "celebrate",
        }}
        onStopBatch={vi.fn()}
      />,
    );

    expect(screen.getByText("Regenerating Celebrate Variants (3 Concurrent Streams)")).toBeDefined();
  });

  it("renders queue counter accurately with completed count, percentage, queued items, and failed count", () => {
    // total: 10, completed: 4, failed: 1 => queued: 10 - 4 - 1 = 5
    render(<MascotBatchProgressCard batchProgress={defaultProgress} onStopBatch={vi.fn()} />);

    const counter = screen.getByText(/4 \/ 10 completed \(40%\) • 5 queued • 1 failed/);
    expect(counter).toBeDefined();
  });

  it("omits failed count when there are 0 failures", () => {
    render(
      <MascotBatchProgressCard
        batchProgress={{
          ...defaultProgress,
          completed: 6,
          failed: 0,
        }}
        onStopBatch={vi.fn()}
      />,
    );

    // 10 - 6 - 0 = 4 queued
    expect(screen.getByText("6 / 10 completed (60%) • 4 queued")).toBeDefined();
    expect(screen.queryByText(/failed/)).toBeNull();
  });

  it("renders active stream pills with pulse indicators", () => {
    render(
      <MascotBatchProgressCard
        batchProgress={{
          ...defaultProgress,
          activeSlotKeys: ["thinking_3", "celebrate_7"],
        }}
        onStopBatch={vi.fn()}
      />,
    );

    expect(screen.getByText("Active Streams:")).toBeDefined();
    expect(screen.getByText(/Stream 1: Thinking #3/)).toBeDefined();
    expect(screen.getByText(/Stream 2: Celebrate #7/)).toBeDefined();
  });

  it("calls onStopBatch when Stop Generation button is clicked", () => {
    const onStopBatch = vi.fn();
    render(<MascotBatchProgressCard batchProgress={defaultProgress} onStopBatch={onStopBatch} />);

    const stopButton = screen.getByRole("button", { name: "Stop Generation" });
    expect(stopButton).toBeDefined();
    fireEvent.click(stopButton);

    expect(onStopBatch).toHaveBeenCalledTimes(1);
  });

  it("disables Stop button and shows stopping label when isStopping is true", () => {
    render(
      <MascotBatchProgressCard
        batchProgress={{
          ...defaultProgress,
          isStopping: true,
        }}
        onStopBatch={vi.fn()}
      />,
    );

    const stopButton = screen.getByRole("button", { name: "Stop Generation" });
    expect(stopButton).toHaveProperty("disabled", true);
    expect(stopButton.textContent).toContain("Stopping Queue...");
  });
});

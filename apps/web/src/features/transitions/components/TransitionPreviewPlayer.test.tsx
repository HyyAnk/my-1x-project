import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { TransitionPreviewPlayer } from "./TransitionPreviewPlayer";

describe("TransitionPreviewPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders correctly with default 16:9 aspect ratio and transport controls", () => {
    render(<TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={0.5} />);

    expect(screen.getByTestId("transition-preview-player")).toBeDefined();
    const viewport = screen.getByTestId("transition-preview-viewport");
    expect(viewport.className).toContain("aspect-16-9");

    // Transport controls
    expect(screen.getByTestId("transition-transport")).toBeDefined();
    expect(screen.getByTestId("transition-play-pause-btn")).toBeDefined();

    // No legacy visual simulation overlays or fake scenes
    expect(screen.queryByTestId("transition-scene-a")).toBeNull();
    expect(screen.queryByTestId("transition-scene-b")).toBeNull();
    expect(screen.queryByTestId("transition-overlay-stinger")).toBeNull();
    expect(screen.queryByTestId("transition-overlay-crossfade")).toBeNull();
  });

  it("supports 9:16 vertical aspect ratio", () => {
    render(<TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={0.5} aspectRatio="9:16" />);

    const viewport = screen.getByTestId("transition-preview-viewport");
    expect(viewport.className).toContain("aspect-9-16");
  });

  it("handles direct cut without timing controls or overlay errors", () => {
    render(<TransitionPreviewPlayer transitionType="cut" durationSeconds={0} />);

    expect(screen.getByTestId("transition-preview-player")).toBeDefined();
    expect(screen.queryByTestId("transition-timing-panel")).toBeNull();
  });

  it("toggles play and pause on user transport click", () => {
    render(<TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={1.0} />);

    const playBtn = screen.getByTestId("transition-play-pause-btn");
    expect(playBtn.getAttribute("aria-label")).toBe("Play transition");

    fireEvent.click(playBtn);
    expect(playBtn.getAttribute("aria-label")).toBe("Pause transition");

    fireEvent.click(playBtn);
    expect(playBtn.getAttribute("aria-label")).toBe("Play transition");
  });

  it("opens overflow menu with Replay, Loop, Timing, and Native Inspection", () => {
    render(<TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={0.8} />);

    const menuToggle = screen.getByRole("button", { name: /more options/i });
    expect(menuToggle).toBeDefined();

    fireEvent.click(menuToggle);

    expect(screen.getByRole("menuitem", { name: /^Replay$/i })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: /Loop:/i })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: /^Timing$/i })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: /Inspect at 100%/i })).toBeDefined();
  });

  it("toggles Timing panel from overflow menu for configurable effects", () => {
    const onDurationChange = vi.fn();
    render(
      <TransitionPreviewPlayer
        transitionType="stinger_swipe"
        durationSeconds={0.8}
        onDurationChange={onDurationChange}
      />,
    );

    expect(screen.queryByTestId("transition-timing-panel")).toBeNull();

    // Open overflow menu
    const menuToggle = screen.getByRole("button", { name: /more options/i });
    fireEvent.click(menuToggle);

    // Click Timing
    const timingBtn = screen.getByRole("menuitem", { name: /^Timing$/i });
    fireEvent.click(timingBtn);

    expect(screen.getByTestId("transition-timing-panel")).toBeDefined();
    expect(screen.getByText(/Duration:/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Reset/i })).toBeDefined();
  });

  it("toggles Inspect at 100% mode to allow native-size pixel inspection", () => {
    render(<TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={0.5} />);

    const viewport = screen.getByTestId("transition-preview-viewport");
    expect(viewport.className).not.toContain("inspect-native-mode");

    // Open overflow menu
    const menuToggle = screen.getByRole("button", { name: /more options/i });
    fireEvent.click(menuToggle);

    // Click Inspect at 100%
    const inspectBtn = screen.getByRole("menuitem", { name: /Inspect at 100%/i });
    fireEvent.click(inspectBtn);

    expect(viewport.className).toContain("inspect-native-mode");
  });

  it("applies custom brand theme colors to CSS variables", () => {
    render(
      <TransitionPreviewPlayer
        transitionType="stinger_swipe"
        durationSeconds={0.5}
        themeColors={{ from: "#3B82F6", to: "#8B5CF6" }}
      />,
    );

    const viewport = screen.getByTestId("transition-preview-viewport");
    expect(viewport.style.getPropertyValue("--from")).toBe("#3B82F6");
    expect(viewport.style.getPropertyValue("--to")).toBe("#8B5CF6");
  });

  it("supports hiding transport controls when showControls is false", () => {
    render(<TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={0.5} showControls={false} />);

    expect(screen.queryByTestId("transition-transport")).toBeNull();
  });
});

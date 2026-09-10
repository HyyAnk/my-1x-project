import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransitionPreviewPlayer } from "./TransitionPreviewPlayer";

describe("TransitionPreviewPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders correctly with default 16:9 aspect ratio and shows controls", () => {
    render(<TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={0.5} />);

    expect(screen.getByTestId("transition-preview-player")).toBeDefined();
    const viewport = screen.getByTestId("transition-preview-viewport");
    expect(viewport.className).toContain("aspect-16-9");

    // Header info
    expect(screen.getByText("Stinger Swipe")).toBeDefined();
    expect(screen.getByText("Recommended")).toBeDefined();
    expect(screen.getByText("0.5s duration")).toBeDefined();

    // Scene mockups
    expect(screen.getByTestId("transition-scene-a")).toBeDefined();
    expect(screen.getByTestId("transition-scene-b")).toBeDefined();

    // Controls
    expect(screen.getByTestId("transition-controls-bar")).toBeDefined();
    expect(screen.getByTestId("transition-play-pause-btn")).toBeDefined();
    expect(screen.getByTestId("transition-replay-btn")).toBeDefined();
    expect(screen.getByTestId("transition-loop-btn")).toBeDefined();
    expect(screen.getByTestId("transition-scrubber-slider")).toBeDefined();
  });

  it("supports 9:16 vertical aspect ratio", () => {
    render(<TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={0.5} aspectRatio="9:16" />);

    const viewport = screen.getByTestId("transition-preview-viewport");
    expect(viewport.className).toContain("aspect-9-16");
    expect(screen.getByText("9:16 Reel")).toBeDefined();
  });

  it("renders stinger_swipe transition overlay elements properly", () => {
    const { container } = render(<TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={0.5} />);

    const overlay = screen.getByTestId("transition-overlay-stinger");
    expect(overlay).toBeDefined();
    expect(overlay.className).toContain("transition-stinger");

    const slashes = container.querySelectorAll(".stinger-slash");
    expect(slashes.length).toBe(2);
    expect(container.querySelector(".stinger-flash")).toBeDefined();
  });

  it("renders crossfade transition overlay properly", () => {
    render(<TransitionPreviewPlayer transitionType="crossfade" durationSeconds={0.8} />);

    const overlay = screen.getByTestId("transition-overlay-crossfade");
    expect(overlay).toBeDefined();
    expect(overlay.className).toContain("transition-crossfade");
    expect(screen.getByText("Smooth Crossfade")).toBeDefined();
  });

  it("handles direct cut cleanly without overlay errors", () => {
    render(<TransitionPreviewPlayer transitionType="cut" durationSeconds={0} />);

    // Direct cut has no transition overlay
    expect(screen.queryByTestId("transition-overlay-stinger")).toBeNull();
    expect(screen.queryByTestId("transition-overlay-crossfade")).toBeNull();
    expect(screen.getByText("Direct Cut")).toBeDefined();
  });

  it("renders scene transitions (bubble_splash, brush_wave, lightning_brush)", () => {
    const { unmount: unmount1 } = render(<TransitionPreviewPlayer transitionType="bubble_splash" durationSeconds={0.86} />);
    expect(screen.getByTestId("transition-overlay-bubble_splash")).toBeDefined();
    unmount1();

    const { unmount: unmount2 } = render(<TransitionPreviewPlayer transitionType="brush_wave" durationSeconds={0.8} />);
    expect(screen.getByTestId("transition-overlay-transition-brush_wave")).toBeDefined();
    unmount2();

    render(<TransitionPreviewPlayer transitionType="lightning_brush" durationSeconds={0.8} />);
    expect(screen.getByTestId("transition-overlay-transition-lightning_brush")).toBeDefined();
    expect(screen.getByText("⚡")).toBeDefined();
  });

  it("toggles play and pause on user click", () => {
    render(<TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={1.0} />);

    const playBtn = screen.getByTestId("transition-play-pause-btn");
    expect(playBtn.getAttribute("aria-label")).toBe("Play transition");

    fireEvent.click(playBtn);
    expect(playBtn.getAttribute("aria-label")).toBe("Pause transition");

    fireEvent.click(playBtn);
    expect(playBtn.getAttribute("aria-label")).toBe("Play transition");
  });

  it("replays transition from beginning when clicking replay", () => {
    render(<TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={0.5} />);

    const replayBtn = screen.getByTestId("transition-replay-btn");
    fireEvent.click(replayBtn);

    const playBtn = screen.getByTestId("transition-play-pause-btn");
    expect(playBtn.getAttribute("aria-label")).toBe("Pause transition");
    expect(screen.getByTestId("transition-time-display").textContent).toBe("0.00s / 0.50s");
  });

  it("toggles loop mode on button click", () => {
    render(<TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={0.5} />);

    const loopBtn = screen.getByTestId("transition-loop-btn");
    expect(loopBtn.getAttribute("aria-pressed")).toBe("false");
    expect(loopBtn.className).not.toContain("is-active");

    fireEvent.click(loopBtn);
    expect(loopBtn.getAttribute("aria-pressed")).toBe("true");
    expect(loopBtn.className).toContain("is-active");
  });

  it("allows scrubbing progress and updates readout and scene visibility", () => {
    render(<TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={1.0} />);

    const slider = screen.getByTestId<HTMLInputElement>("transition-scrubber-slider");
    expect(slider.value).toBe("0");

    // Scrub to 20% (Scene A visible, Scene B hidden)
    fireEvent.change(slider, { target: { value: "0.2" } });
    expect(screen.getByTestId("transition-time-display").textContent).toBe("0.20s / 1.00s");
    expect(screen.getByTestId("transition-percent-badge").textContent).toBe("20%");

    const sceneA = screen.getByTestId("transition-scene-a");
    const sceneB = screen.getByTestId("transition-scene-b");
    expect(sceneA.style.opacity).toBe("1");
    expect(sceneB.style.opacity).toBe("0");

    // Scrub to 80% (Scene A hidden, Scene B visible)
    fireEvent.change(slider, { target: { value: "0.8" } });
    expect(screen.getByTestId("transition-time-display").textContent).toBe("0.80s / 1.00s");
    expect(screen.getByTestId("transition-percent-badge").textContent).toBe("80%");
    expect(sceneA.style.opacity).toBe("0");
    expect(sceneB.style.opacity).toBe("1");
  });

  it("hides controls bar when showControls is false", () => {
    render(<TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={0.5} showControls={false} />);

    expect(screen.queryByTestId("transition-controls-bar")).toBeNull();
  });

  it("applies custom theme colors to CSS variables", () => {
    render(
      <TransitionPreviewPlayer transitionType="stinger_swipe" durationSeconds={0.5} themeColors={{ from: "#3B82F6", to: "#8B5CF6" }} />,
    );

    const viewport = screen.getByTestId("transition-preview-viewport");
    expect(viewport.style.getPropertyValue("--from")).toBe("#3B82F6");
    expect(viewport.style.getPropertyValue("--to")).toBe("#8B5CF6");
  });

  it("invokes onComplete when duration is 0 (cut) and played", () => {
    const onComplete = vi.fn();
    render(<TransitionPreviewPlayer transitionType="cut" durationSeconds={0} onComplete={onComplete} />);

    const playBtn = screen.getByTestId("transition-play-pause-btn");
    act(() => {
      fireEvent.click(playBtn);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

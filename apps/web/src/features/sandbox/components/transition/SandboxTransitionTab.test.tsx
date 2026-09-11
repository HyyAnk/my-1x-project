import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SandboxTransitionState } from "../../hooks/useSandboxTransitionState";
import { SandboxTransitionTab } from "./SandboxTransitionTab";
import { SandboxTransitionCategoryToggle } from "./SandboxTransitionCategoryToggle";
import { SandboxTransitionSelector } from "./SandboxTransitionSelector";
import { SandboxTransitionDurationSlider } from "./SandboxTransitionDurationSlider";
import { SandboxTransitionScrubber } from "./SandboxTransitionScrubber";
import { LanguageProvider } from "../../../../i18n";
import { VisualSandboxTab } from "../../VisualSandboxTab";
import { getTransition } from "@studio/shared";

function createMockTransitionState(overrides?: Partial<SandboxTransitionState>): SandboxTransitionState {
  const initialId = overrides?.transitionId ?? "stinger_swipe";
  return {
    transitionId: initialId,
    transitionDuration: overrides?.transitionDuration ?? 0.5,
    transitionCategory: overrides?.transitionCategory ?? "intro_outro",
    transitionProgress: overrides?.transitionProgress ?? 0.0,
    isTransitionActive: overrides?.isTransitionActive ?? false,
    isPlaying: overrides?.isPlaying ?? false,
    isLooping: overrides?.isLooping ?? false,
    playTrigger: overrides?.playTrigger ?? 0,
    setTransitionId: vi.fn(),
    setTransitionDuration: vi.fn(),
    setTransitionCategory: vi.fn(),
    setTransitionProgress: vi.fn(),
    setIsTransitionActive: vi.fn(),
    setIsPlaying: vi.fn(),
    setIsLooping: vi.fn(),
    triggerPlay: vi.fn(),
    togglePlay: vi.fn(),
    toggleLoop: vi.fn(),
    resetTransition: vi.fn(),
    syncFromChannel: vi.fn(),
    syncFromPreset: vi.fn(),
    activeTransitionDefinition: getTransition(initialId),
    availableTransitions: [],
    allTransitions: [],
    ...overrides,
  };
}

describe("SandboxTransitionTab and Subcomponents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("SandboxTransitionTab", () => {
    it("renders header, reset button, and unified grouped transition selector", () => {
      const mockState = createMockTransitionState();
      render(<SandboxTransitionTab transition={mockState} />);

      expect(screen.getByTestId("sandbox-transition-tab")).toBeDefined();
      expect(screen.getByText("Transition Inspector")).toBeDefined();
      expect(screen.getByTestId("sandbox-transition-reset-btn")).toBeDefined();
      expect(screen.getByTestId("transition-selector")).toBeDefined();
    });

    it("triggers resetTransition when clicking reset button", () => {
      const mockState = createMockTransitionState();
      render(<SandboxTransitionTab transition={mockState} />);

      const resetBtn = screen.getByTestId("sandbox-transition-reset-btn");
      fireEvent.click(resetBtn);

      expect(mockState.resetTransition).toHaveBeenCalledTimes(1);
    });

    it("triggers setTransitionId and play when selecting an option in the grouped selector", () => {
      const mockState = createMockTransitionState();
      render(<SandboxTransitionTab transition={mockState} />);

      const selector = screen.getByTestId("transition-selector");
      fireEvent.change(selector, { target: { value: "crossfade" } });

      expect(mockState.setTransitionId).toHaveBeenCalledWith("crossfade");
      expect(mockState.triggerPlay).toHaveBeenCalledTimes(1);
    });
  });

  describe("SandboxTransitionCategoryToggle", () => {
    it("switches category between Intro/Outro and In-Scene Questions", () => {
      const onChangeCategory = vi.fn();
      render(<SandboxTransitionCategoryToggle activeCategory="intro_outro" onChangeCategory={onChangeCategory} />);

      const sceneBtn = screen.getByTestId("category-btn-scene");
      fireEvent.click(sceneBtn);
      expect(onChangeCategory).toHaveBeenCalledWith("scene");

      const introBtn = screen.getByTestId("category-btn-intro_outro");
      fireEvent.click(introBtn);
      expect(onChangeCategory).toHaveBeenCalledWith("intro_outro");
    });
  });

  describe("SandboxTransitionSelector", () => {
    it("renders selected transition definition details card", () => {
      const onSelect = vi.fn();
      render(<SandboxTransitionSelector selectedId="stinger_swipe" category="intro_outro" onSelectTransition={onSelect} />);

      const detailCard = screen.getByTestId("sandbox-transition-detail-card");
      expect(detailCard).toBeDefined();
      expect(screen.getAllByText("Stinger Swipe").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Dynamic full-screen wipe animation with channel momentum.")).toBeDefined();
    });
  });

  describe("SandboxTransitionDurationSlider", () => {
    it("renders slider and triggers onChangeDuration on slide and chip click", () => {
      const onChangeDuration = vi.fn();
      const def = getTransition("stinger_swipe");
      render(<SandboxTransitionDurationSlider durationSeconds={0.5} onChangeDuration={onChangeDuration} transitionDef={def} />);

      expect(screen.getByTestId("sandbox-duration-readout").textContent).toBe("0.50s");

      const slider = screen.getByTestId<HTMLInputElement>("sandbox-duration-input");
      fireEvent.change(slider, { target: { value: "0.8" } });
      expect(onChangeDuration).toHaveBeenCalledWith(0.8);

      const chip = screen.getByTestId("duration-chip-1");
      fireEvent.click(chip);
      expect(onChangeDuration).toHaveBeenCalledWith(1.0);
    });

    it("displays instant snap note when transition is cut", () => {
      const onChangeDuration = vi.fn();
      const cutDef = getTransition("cut");
      render(<SandboxTransitionDurationSlider durationSeconds={0.0} onChangeDuration={onChangeDuration} transitionDef={cutDef} />);

      expect(screen.getByTestId("sandbox-duration-instant-note")).toBeDefined();
      expect(screen.queryByTestId("sandbox-duration-input")).toBeNull();
    });
  });

  describe("SandboxTransitionScrubber", () => {
    it("handles play/pause, replay, loop, and step controls", () => {
      const onSeek = vi.fn();
      const onTogglePlay = vi.fn();
      const onReplay = vi.fn();
      const onToggleLoop = vi.fn();
      const onPause = vi.fn();

      render(
        <SandboxTransitionScrubber
          progress={0.25}
          durationSeconds={1.0}
          isPlaying={false}
          isLooping={false}
          onSeek={onSeek}
          onTogglePlay={onTogglePlay}
          onReplay={onReplay}
          onToggleLoop={onToggleLoop}
          onPause={onPause}
        />,
      );

      expect(screen.getByTestId("sandbox-scrubber-time").textContent).toBe("0.25s / 1.00s");
      expect(screen.getByTestId("sandbox-scrubber-percent").textContent).toBe("25%");

      // Play
      fireEvent.click(screen.getByTestId("sandbox-scrubber-play-btn"));
      expect(onTogglePlay).toHaveBeenCalledTimes(1);

      // Replay
      fireEvent.click(screen.getByTestId("sandbox-scrubber-replay-btn"));
      expect(onReplay).toHaveBeenCalledTimes(1);

      // Loop
      fireEvent.click(screen.getByTestId("sandbox-scrubber-loop-btn"));
      expect(onToggleLoop).toHaveBeenCalledTimes(1);

      // Slider seek
      const slider = screen.getByTestId<HTMLInputElement>("sandbox-scrubber-slider");
      fireEvent.change(slider, { target: { value: "0.5" } });
      expect(onPause).toHaveBeenCalledTimes(1);
      expect(onSeek).toHaveBeenCalledWith(0.5);

      // Step forward (+5%)
      fireEvent.click(screen.getByTestId("sandbox-scrubber-step-forward"));
      expect(onSeek).toHaveBeenCalledWith(0.3);

      // Step back (-5%)
      fireEvent.click(screen.getByTestId("sandbox-scrubber-step-back"));
      expect(onSeek).toHaveBeenCalledWith(0.2);
    });
  });

  describe("VisualSandboxTab Workspace Integration", () => {
    it("activates SandboxTransitionTab and displays live TransitionPreviewPlayer on canvas when transition tab is active", () => {
      render(
        <LanguageProvider>
          <VisualSandboxTab channels={[]} />
        </LanguageProvider>,
      );

      // Initially on design tab
      expect(screen.queryByTestId("sandbox-transition-tab")).toBeNull();
      expect(screen.queryByTestId("sandbox-transition-canvas-area")).toBeNull();

      // Click the Transition inspector tab button
      const transitionTabBtn = screen.getByRole("button", { name: /transition/i });
      fireEvent.click(transitionTabBtn);

      // Inspector panel displays SandboxTransitionTab
      expect(screen.getByTestId("sandbox-transition-tab")).toBeDefined();

      // Canvas stage displays live TransitionPreviewPlayer
      expect(screen.getByTestId("sandbox-transition-canvas-area")).toBeDefined();
      expect(screen.getByTestId("transition-preview-player")).toBeDefined();
    });
  });
});

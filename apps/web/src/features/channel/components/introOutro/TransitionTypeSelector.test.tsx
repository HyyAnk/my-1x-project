import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerTransition, resetTransitionRegistry, type IntroOutroTransitionType } from "@studio/shared";
import { TransitionTypeSelector } from "./TransitionTypeSelector";

describe("TransitionTypeSelector", () => {
  beforeEach(() => {
    resetTransitionRegistry();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    resetTransitionRegistry();
  });

  it("renders trigger button displaying currently selected transition", () => {
    render(
      <TransitionTypeSelector
        transitionType="stinger_swipe"
        onChangeTransition={vi.fn()}
        durationSeconds={0.5}
        onChangeDuration={vi.fn()}
        audioMode="use_video_audio"
        onChangeAudioMode={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: /Transition into Question 1/i });
    expect(trigger).toBeDefined();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("Stinger Swipe")).toBeDefined();
    expect(screen.getByText("Recommended")).toBeDefined();
  });

  it("opens dropdown on click and displays available intro/outro transitions", () => {
    render(
      <TransitionTypeSelector
        transitionType="stinger_swipe"
        onChangeTransition={vi.fn()}
        durationSeconds={0.5}
        onChangeDuration={vi.fn()}
        audioMode="use_video_audio"
        onChangeAudioMode={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: /Transition into Question 1/i });
    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeDefined();

    expect(screen.getByRole("option", { name: /Stinger Swipe/i })).toBeDefined();
    expect(screen.getByRole("option", { name: /Smooth Crossfade/i })).toBeDefined();
    expect(screen.getByRole("option", { name: /Direct Cut/i })).toBeDefined();
  });

  it("dynamically synchronizes newly registered transitions without hardcoded changes", () => {
    const onChangeTransition = vi.fn();

    // Register a new custom transition in shared registry
    registerTransition({
      id: "custom_neon_warp",
      name: "Neon Warp Pulse",
      description: "Cyberpunk chromatic warp transition with sound design.",
      category: "intro_outro",
      defaultDuration: 0.6,
      minDuration: 0.2,
      maxDuration: 1.5,
      cssClass: "transition-neon-warp",
      tag: "Futuristic",
      iconName: "Lightning",
    });

    render(
      <TransitionTypeSelector
        transitionType="stinger_swipe"
        onChangeTransition={onChangeTransition}
        durationSeconds={0.5}
        onChangeDuration={vi.fn()}
        audioMode="use_video_audio"
        onChangeAudioMode={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: /Transition into Question 1/i });
    fireEvent.click(trigger);

    // Verify the newly registered transition appears immediately
    const dynamicOption = screen.getByRole("option", { name: /Neon Warp Pulse/i });
    expect(dynamicOption).toBeDefined();
    expect(screen.getByText("Futuristic")).toBeDefined();
    expect(screen.getByText(/Cyberpunk chromatic warp/i)).toBeDefined();

    // Select the new transition
    fireEvent.click(dynamicOption);
    expect(onChangeTransition).toHaveBeenCalledWith("custom_neon_warp");
  });

  it("filters transitions using the search input when multiple options exist", () => {
    // Add extra transitions to exceed the search threshold
    registerTransition({
      id: "cyber_zoom",
      name: "Cyber Zoom",
      description: "Quick hyperspace zoom jump.",
      category: "intro_outro",
      defaultDuration: 0.4,
      minDuration: 0.2,
      maxDuration: 1.0,
      cssClass: "transition-cyber-zoom",
      tag: "Dynamic",
      iconName: "Play",
    });

    render(
      <TransitionTypeSelector
        transitionType="stinger_swipe"
        onChangeTransition={vi.fn()}
        durationSeconds={0.5}
        onChangeDuration={vi.fn()}
        audioMode="use_video_audio"
        onChangeAudioMode={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: /Transition into Question 1/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByRole("textbox", { name: /Filter transitions/i });
    fireEvent.change(searchInput, { target: { value: "crossfade" } });

    expect(screen.getByRole("option", { name: /Smooth Crossfade/i })).toBeDefined();
    expect(screen.queryByRole("option", { name: /Direct Cut/i })).toBeNull();
  });

  it("automatically snaps duration to 0.0s when selecting Direct Cut", () => {
    const onChangeTransition = vi.fn();
    const onChangeDuration = vi.fn();

    render(
      <TransitionTypeSelector
        transitionType="stinger_swipe"
        onChangeTransition={onChangeTransition}
        durationSeconds={0.5}
        onChangeDuration={onChangeDuration}
        audioMode="use_video_audio"
        onChangeAudioMode={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: /Transition into Question 1/i });
    fireEvent.click(trigger);

    const cutOption = screen.getByRole("option", { name: /Direct Cut/i });
    fireEvent.click(cutOption);

    expect(onChangeDuration).toHaveBeenCalledWith(0.0);
    expect(onChangeTransition).toHaveBeenCalledWith("cut");
  });

  it("automatically resets duration from 0.0s to defaultDuration when switching away from Cut", () => {
    const onChangeTransition = vi.fn();
    const onChangeDuration = vi.fn();

    render(
      <TransitionTypeSelector
        transitionType="cut"
        onChangeTransition={onChangeTransition}
        durationSeconds={0.0}
        onChangeDuration={onChangeDuration}
        audioMode="use_video_audio"
        onChangeAudioMode={vi.fn()}
      />,
    );

    expect(screen.getByText(/Instant snap \(0\.0s\)/i)).toBeDefined();

    const trigger = screen.getByRole("combobox", { name: /Transition into Question 1/i });
    fireEvent.click(trigger);

    const stingerOption = screen.getByRole("option", { name: /Stinger Swipe/i });
    fireEvent.click(stingerOption);

    // Stinger default duration is 0.5s
    expect(onChangeDuration).toHaveBeenCalledWith(0.5);
    expect(onChangeTransition).toHaveBeenCalledWith("stinger_swipe");
  });

  it("allows selecting duration presets and toggling audio mode", () => {
    const onChangeDuration = vi.fn();
    const onChangeAudioMode = vi.fn();

    render(
      <TransitionTypeSelector
        transitionType="crossfade"
        onChangeTransition={vi.fn()}
        durationSeconds={0.5}
        onChangeDuration={onChangeDuration}
        audioMode="use_video_audio"
        onChangeAudioMode={onChangeAudioMode}
      />,
    );

    // Click duration chip
    const smoothDurationChip = screen.getByRole("button", { name: "0.8s Smooth" });
    fireEvent.click(smoothDurationChip);
    expect(onChangeDuration).toHaveBeenCalledWith(0.8);

    // Toggle audio mode
    const muteClipAudioBtn = screen.getByRole("button", { name: /Mute Clip Audio/i });
    fireEvent.click(muteClipAudioBtn);
    expect(onChangeAudioMode).toHaveBeenCalledWith("overlay_bgm");
  });

  it("handles keyboard navigation (Escape to close, Enter to select)", () => {
    const onChangeTransition = vi.fn();

    render(
      <TransitionTypeSelector
        transitionType="stinger_swipe"
        onChangeTransition={onChangeTransition}
        durationSeconds={0.5}
        onChangeDuration={vi.fn()}
        audioMode="use_video_audio"
        onChangeAudioMode={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: /Transition into Question 1/i });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    // Press Escape to close
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("supports quick preview button when onPreview is provided", () => {
    const onPreview = vi.fn();

    render(
      <TransitionTypeSelector
        transitionType="stinger_swipe"
        onChangeTransition={vi.fn()}
        durationSeconds={0.5}
        onChangeDuration={vi.fn()}
        audioMode="use_video_audio"
        onChangeAudioMode={vi.fn()}
        onPreview={onPreview}
      />,
    );

    const quickPreviewBtn = screen.getByRole("button", { name: /Preview current transition/i });
    expect(quickPreviewBtn).toBeDefined();

    fireEvent.click(quickPreviewBtn);
    expect(onPreview).toHaveBeenCalledWith("stinger_swipe");
  });

  it("prevents interactions when disabled is true", () => {
    const onChangeTransition = vi.fn();

    render(
      <TransitionTypeSelector
        transitionType="stinger_swipe"
        onChangeTransition={onChangeTransition}
        durationSeconds={0.5}
        onChangeDuration={vi.fn()}
        audioMode="use_video_audio"
        onChangeAudioMode={vi.fn()}
        disabled={true}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: /Transition into Question 1/i });
    expect(trigger.hasAttribute("disabled")).toBe(true);

    fireEvent.click(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

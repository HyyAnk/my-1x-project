import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSandboxTransitionState } from "./useSandboxTransitionState";

describe("useSandboxTransitionState", () => {
  it("initializes with correct defaults and derived helpers", () => {
    const { result } = renderHook(() => useSandboxTransitionState());

    expect(result.current.transitionId).toBe("stinger_swipe");
    expect(result.current.transitionDuration).toBe(0.5);
    expect(result.current.transitionCategory).toBe("intro_outro");
    expect(result.current.transitionProgress).toBe(0.0);
    expect(result.current.isTransitionActive).toBe(false);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isLooping).toBe(false);
    expect(result.current.playTrigger).toBe(0);

    expect(result.current.activeTransitionDefinition?.id).toBe("stinger_swipe");
    expect(result.current.activeTransitionDefinition?.name).toBe("Stinger Swipe");
    expect(result.current.availableTransitions.map((t) => t.id)).toEqual(["stinger_swipe", "crossfade", "cut"]);
    expect(result.current.allTransitions.length).toBe(6);
  });

  it("updates transition, duration, and category when switching transitions", () => {
    const { result } = renderHook(() => useSandboxTransitionState());

    // Switch to scene transition
    act(() => {
      result.current.setTransitionId("bubble_splash");
    });

    expect(result.current.transitionId).toBe("bubble_splash");
    expect(result.current.transitionCategory).toBe("scene");
    expect(result.current.transitionDuration).toBe(0.86);

    // Switch to instant cut (defaultDuration: 0.0)
    act(() => {
      result.current.setTransitionId("cut");
    });

    expect(result.current.transitionId).toBe("cut");
    expect(result.current.transitionCategory).toBe("intro_outro");
    expect(result.current.transitionDuration).toBe(0.0);

    // Switch from cut (0.0s out of range) to crossfade (0.2s - 1.5s range) -> auto-adjusts to default 0.5s
    act(() => {
      result.current.setTransitionId("crossfade");
    });

    expect(result.current.transitionId).toBe("crossfade");
    expect(result.current.transitionCategory).toBe("intro_outro");
    expect(result.current.transitionDuration).toBe(0.5);

    // Custom duration within range should be preserved across transitions in the same range
    act(() => {
      result.current.setTransitionDuration(0.75);
    });
    expect(result.current.transitionDuration).toBe(0.75);

    act(() => {
      result.current.setTransitionId("stinger_swipe");
    });
    expect(result.current.transitionId).toBe("stinger_swipe");
    expect(result.current.transitionDuration).toBe(0.75);
  });

  it("switches category and auto-selects the first valid transition in that category", () => {
    const { result } = renderHook(() => useSandboxTransitionState());

    expect(result.current.transitionCategory).toBe("intro_outro");
    expect(result.current.transitionId).toBe("stinger_swipe");

    // Switch category to scene
    act(() => {
      result.current.setTransitionCategory("scene");
    });

    expect(result.current.transitionCategory).toBe("scene");
    expect(result.current.transitionId).toBe("bubble_splash");
    expect(result.current.transitionDuration).toBe(0.86);
    expect(result.current.availableTransitions.every((t) => t.category === "scene")).toBe(true);

    // Switch back to intro_outro
    act(() => {
      result.current.setTransitionCategory("intro_outro");
    });

    expect(result.current.transitionCategory).toBe("intro_outro");
    expect(result.current.transitionId).toBe("stinger_swipe");
    expect(result.current.transitionDuration).toBe(0.5);
  });

  it("clamps transition progress and validates duration against bounds", () => {
    const { result } = renderHook(() => useSandboxTransitionState());

    // Valid progress
    act(() => {
      result.current.setTransitionProgress(0.42);
    });
    expect(result.current.transitionProgress).toBe(0.42);

    // Negative progress clamps to 0.0
    act(() => {
      result.current.setTransitionProgress(-0.5);
    });
    expect(result.current.transitionProgress).toBe(0.0);

    // Over-boundary progress clamps to 1.0
    act(() => {
      result.current.setTransitionProgress(1.8);
    });
    expect(result.current.transitionProgress).toBe(1.0);

    // NaN progress clamps to 0.0
    act(() => {
      result.current.setTransitionProgress(Number.NaN);
    });
    expect(result.current.transitionProgress).toBe(0.0);

    // Duration clamping for stinger_swipe (min: 0.2, max: 1.5)
    act(() => {
      result.current.setTransitionDuration(0.05);
    });
    expect(result.current.transitionDuration).toBe(0.2);

    act(() => {
      result.current.setTransitionDuration(2.4);
    });
    expect(result.current.transitionDuration).toBe(1.5);

    act(() => {
      result.current.setTransitionDuration(0.85);
    });
    expect(result.current.transitionDuration).toBe(0.85);
  });

  it("handles playback controls, looping toggles, and state reset", () => {
    const { result } = renderHook(() => useSandboxTransitionState());

    // Trigger play
    act(() => {
      result.current.triggerPlay();
    });
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.playTrigger).toBe(1);

    // Trigger play again
    act(() => {
      result.current.triggerPlay();
    });
    expect(result.current.playTrigger).toBe(2);

    // Toggle play
    act(() => {
      result.current.togglePlay();
    });
    expect(result.current.isPlaying).toBe(false);

    // Toggle loop
    act(() => {
      result.current.toggleLoop();
    });
    expect(result.current.isLooping).toBe(true);

    act(() => {
      result.current.toggleLoop();
    });
    expect(result.current.isLooping).toBe(false);

    // Set transition active
    act(() => {
      result.current.setIsTransitionActive(true);
      result.current.setTransitionProgress(0.7);
    });
    expect(result.current.isTransitionActive).toBe(true);
    expect(result.current.transitionProgress).toBe(0.7);

    // Reset transition
    act(() => {
      result.current.resetTransition();
    });
    expect(result.current.transitionId).toBe("stinger_swipe");
    expect(result.current.transitionDuration).toBe(0.5);
    expect(result.current.transitionCategory).toBe("intro_outro");
    expect(result.current.transitionProgress).toBe(0.0);
    expect(result.current.isTransitionActive).toBe(false);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isLooping).toBe(false);
    expect(result.current.playTrigger).toBe(0);
  });

  it("synchronizes transition style from channel configuration and presets", () => {
    const { result } = renderHook(() => useSandboxTransitionState());

    // Sync from channel
    act(() => {
      result.current.syncFromChannel({
        transition_type: "crossfade",
        transition_duration_seconds: 0.7,
      });
    });
    expect(result.current.transitionId).toBe("crossfade");
    expect(result.current.transitionDuration).toBe(0.7);
    expect(result.current.transitionCategory).toBe("intro_outro");

    // Sync from preset with snake_case
    act(() => {
      result.current.syncFromPreset({
        transition_id: "brush_wave",
        transition_duration: 0.8,
      });
    });
    expect(result.current.transitionId).toBe("brush_wave");
    expect(result.current.transitionDuration).toBe(0.8);
    expect(result.current.transitionCategory).toBe("scene");

    // Sync from preset with camelCase
    act(() => {
      result.current.syncFromPreset({
        transitionId: "lightning_brush",
        transitionDuration: 1.2,
      });
    });
    expect(result.current.transitionId).toBe("lightning_brush");
    expect(result.current.transitionDuration).toBe(1.2);
    expect(result.current.transitionCategory).toBe("scene");

    // Null/undefined handling
    act(() => {
      result.current.syncFromChannel(null);
      result.current.syncFromPreset(undefined);
    });
    expect(result.current.transitionId).toBe("lightning_brush");
  });
});

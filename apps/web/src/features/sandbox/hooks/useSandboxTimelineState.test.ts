import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSandboxTimelineState } from "./useSandboxTimelineState";

describe("useSandboxTimelineState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with default thinking phase and scrubber disabled", () => {
    const { result } = renderHook(() => useSandboxTimelineState());
    expect(result.current.phase).toBe("thinking");
    expect(result.current.timelineSeconds).toBe(3.5);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.useScrubber).toBe(false);
    expect(result.current.isMuted).toBe(false);
  });

  it("updates phase and resets timeline time on handlePhaseChange", () => {
    const { result } = renderHook(() => useSandboxTimelineState());

    act(() => {
      result.current.handlePhaseChange("reveal");
    });

    expect(result.current.phase).toBe("reveal");
    expect(result.current.timelineSeconds).toBeGreaterThanOrEqual(8.0);
    expect(result.current.useScrubber).toBe(false);
    expect(result.current.isPlaying).toBe(false);
  });

  it("enables scrubber when handleScrubberChange is called", () => {
    const { result } = renderHook(() => useSandboxTimelineState());

    act(() => {
      result.current.handleScrubberChange(5.2);
    });

    expect(result.current.useScrubber).toBe(true);
    expect(result.current.timelineSeconds).toBe(5.2);
    expect(result.current.phase).toBe("thinking");
  });

  it("toggles mute state properly", () => {
    const { result } = renderHook(() => useSandboxTimelineState());
    expect(result.current.isMuted).toBe(false);

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(true);
  });
});

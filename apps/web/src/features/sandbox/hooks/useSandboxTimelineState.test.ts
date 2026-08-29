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
  });

  it("updates phase and resets timeline time on handlePhaseChange", () => {
    const { result } = renderHook(() => useSandboxTimelineState());

    act(() => {
      result.current.handlePhaseChange("reveal");
    });

    expect(result.current.phase).toBe("reveal");
    expect(result.current.timelineSeconds).toBe(8);
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
  });

  it("advances timeline seconds when isPlaying is true and stops at 10.0s", () => {
    const { result } = renderHook(() => useSandboxTimelineState());

    act(() => {
      result.current.setTimelineSeconds(9.8);
      result.current.setIsPlaying(true);
    });

    expect(result.current.isPlaying).toBe(true);

    act(() => {
      vi.advanceTimersByTime(100); // 9.9
    });
    expect(result.current.timelineSeconds).toBe(9.9);

    act(() => {
      vi.advanceTimersByTime(100); // 10.0
    });
    expect(result.current.timelineSeconds).toBe(10.0);

    act(() => {
      vi.advanceTimersByTime(100); // reaches > 10.0 -> stops and loops to 0
    });
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.timelineSeconds).toBe(0);
  });
});

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
    expect(result.current.timelineSeconds).toBeGreaterThanOrEqual(7.5);
    expect(result.current.useScrubber).toBe(false);
    expect(result.current.isPlaying).toBe(false);
  });

  it("jumps to canonical phase timestamps for question, choices, thinking, reveal, and explain", () => {
    const { result } = renderHook(() => useSandboxTimelineState());

    act(() => {
      result.current.handlePhaseChange("question");
    });
    expect(result.current.phase).toBe("question");
    expect(result.current.timelineSeconds).toBe(0.3);

    act(() => {
      result.current.handlePhaseChange("choices");
    });
    expect(result.current.phase).toBe("choices");
    expect(result.current.timelineSeconds).toBe(1.1);

    act(() => {
      result.current.handlePhaseChange("thinking");
    });
    expect(result.current.phase).toBe("thinking");
    expect(result.current.timelineSeconds).toBe(3.5);

    act(() => {
      result.current.handlePhaseChange("reveal");
    });
    expect(result.current.phase).toBe("reveal");
    expect(result.current.timelineSeconds).toBe(7.7);

    act(() => {
      result.current.handlePhaseChange("explain");
    });
    expect(result.current.phase).toBe("explain");
    expect(result.current.timelineSeconds).toBe(8.5);
  });

  it("enables scrubber when handleScrubberChange is called and clamps within duration", () => {
    const { result } = renderHook(() => useSandboxTimelineState());

    act(() => {
      result.current.handleScrubberChange(5.2);
    });

    expect(result.current.useScrubber).toBe(true);
    expect(result.current.timelineSeconds).toBe(5.2);
    expect(result.current.phase).toBe("thinking");

    act(() => {
      result.current.handleScrubberChange(-5);
    });
    expect(result.current.timelineSeconds).toBe(0);

    act(() => {
      result.current.handleScrubberChange(999);
    });
    expect(result.current.timelineSeconds).toBe(result.current.totalDuration);
  });

  it("handles handleTogglePlay snapping from thinking snapshot to thinkingStart countdown", () => {
    const { result } = renderHook(() => useSandboxTimelineState());

    expect(result.current.phase).toBe("thinking");
    expect(result.current.timelineSeconds).toBe(3.5);

    act(() => {
      result.current.handleTogglePlay();
    });

    expect(result.current.isPlaying).toBe(true);
    // Snapped from 3.5s to 2.47s so countdown 5 tick plays
    expect(result.current.timelineSeconds).toBe(2.47);

    act(() => {
      result.current.handleTogglePlay();
    });
    expect(result.current.isPlaying).toBe(false);
  });

  it("restarts from 0 when handleTogglePlay is called near the end of total duration", () => {
    const { result } = renderHook(() => useSandboxTimelineState());

    act(() => {
      result.current.handleScrubberChange(result.current.totalDuration - 0.05);
    });

    act(() => {
      result.current.handleTogglePlay();
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.timelineSeconds).toBe(0);
  });

  it("communicates with iframe via postMessage and __hyperframesRehearsal", () => {
    const { result } = renderHook(() => useSandboxTimelineState());

    const postMessageSpy = vi.fn();
    const mockRehearsal = {
      seek: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
    };

    const mockIframe = {
      contentWindow: {
        postMessage: postMessageSpy,
        __hyperframesRehearsal: mockRehearsal,
      },
    } as unknown as HTMLIFrameElement;

    result.current.iframeRef.current = mockIframe;

    act(() => {
      result.current.seekIframe(4.5);
    });
    expect(postMessageSpy).toHaveBeenCalledWith({ type: "REHEARSAL_SEEK", time: 4.5 }, "*");
    expect(mockRehearsal.seek).toHaveBeenCalledWith(4.5);

    act(() => {
      result.current.playIframe(4.5);
    });
    expect(postMessageSpy).toHaveBeenCalledWith({ type: "REHEARSAL_PLAY", time: 4.5 }, "*");
    expect(mockRehearsal.play).toHaveBeenCalledWith(4.5);

    act(() => {
      result.current.pauseIframe();
    });
    expect(postMessageSpy).toHaveBeenCalledWith({ type: "REHEARSAL_PAUSE" }, "*");
    expect(mockRehearsal.pause).toHaveBeenCalled();
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

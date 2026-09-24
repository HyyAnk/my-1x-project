import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSandboxTimelineState } from "./useSandboxTimelineState";

describe("useSandboxTimelineState", () => {
  it("uses server gameplay timing for seeking and phase jumps", () => {
    const { result } = renderHook(() => useSandboxTimelineState());
    act(() => result.current.setTimeline({ questionStart: 0, choicesStart: 1, thinkingStart: 8,
      revealStart: 18, rewardStart: 18.58, explainStart: 21, totalDuration: 27, countdownSeconds: 3 }));
    expect(result.current.totalDuration).toBe(27);
    act(() => result.current.handleScrubberChange(17));
    expect(result.current.phase).toBe("thinking");
    act(() => result.current.handlePhaseChange("reveal"));
    expect(result.current.timelineSeconds).toBeCloseTo(18.65);
    act(() => result.current.handleTogglePlay());
    expect(result.current.timelineSeconds).toBe(18);
  });
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
    expect(result.current.timelineSeconds).toBe(0.6);

    act(() => {
      result.current.handlePhaseChange("choices");
    });
    expect(result.current.phase).toBe("choices");
    expect(result.current.timelineSeconds).toBe(2.0);

    act(() => {
      result.current.handlePhaseChange("thinking");
    });
    expect(result.current.phase).toBe("thinking");
    expect(result.current.timelineSeconds).toBe(3.5);

    act(() => {
      result.current.handlePhaseChange("reveal");
    });
    expect(result.current.phase).toBe("reveal");
    expect(result.current.timelineSeconds).toBe(8.1);

    act(() => {
      result.current.handlePhaseChange("explain");
    });
    expect(result.current.phase).toBe("explain");
    expect(result.current.timelineSeconds).toBe(8.8);
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

    act(() => {
      result.current.setMuted(false);
    });
    expect(result.current.isMuted).toBe(false);
  });

  it("properly marks elapsed cues and resets ahead cues on handlePhaseChange", () => {
    const { result } = renderHook(() => useSandboxTimelineState());

    // Jump to choices (2.0s) -> choices-enter (0.85s) is elapsed; cd-5 (2.47s) onwards are reset
    act(() => {
      result.current.handlePhaseChange("choices");
    });
    expect(result.current.firedCuesRef.current.has("choices-enter")).toBe(true);
    expect(result.current.firedCuesRef.current.has("cd-5")).toBe(false);
    expect(result.current.firedCuesRef.current.has("answer-reveal")).toBe(false);

    // Jump to question (0.6s) -> all cues are ahead of 0.6s, so all cues are reset
    act(() => {
      result.current.handlePhaseChange("question");
    });
    expect(result.current.firedCuesRef.current.has("choices-enter")).toBe(false);
    expect(result.current.firedCuesRef.current.has("cd-5")).toBe(false);

    // Jump to reveal (8.1s) -> choices-enter, cd-5..1, cd-final, answer-reveal (7.47s) are elapsed; reward-fact (8.27s) is reset
    act(() => {
      result.current.handlePhaseChange("reveal");
    });
    expect(result.current.firedCuesRef.current.has("choices-enter")).toBe(true);
    expect(result.current.firedCuesRef.current.has("cd-5")).toBe(true);
    expect(result.current.firedCuesRef.current.has("cd-final")).toBe(true);
    expect(result.current.firedCuesRef.current.has("answer-reveal")).toBe(true);
    expect(result.current.firedCuesRef.current.has("reward-fact")).toBe(false);

    // Jump to explain (8.8s) -> all cues including reward-fact (8.27s) are elapsed
    act(() => {
      result.current.handlePhaseChange("explain");
    });
    expect(result.current.firedCuesRef.current.has("reward-fact")).toBe(true);
  });

  it("pauses cleanly and manages fired cues when scrubber is dragged", () => {
    const { result } = renderHook(() => useSandboxTimelineState());

    // Start playback
    act(() => {
      result.current.handleTogglePlay();
    });
    expect(result.current.isPlaying).toBe(true);

    // Scrub to 4.0s while playing -> must pause cleanly
    act(() => {
      result.current.handleScrubberChange(4.0);
    });
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.timelineSeconds).toBe(4.0);

    // At 4.0s: choices-enter (0.85s), cd-5 (2.47s), cd-4 (3.47s) are elapsed (< 4.0s)
    // cd-3 (4.47s), cd-2 (5.47s), cd-1, cd-final, answer-reveal, reward-fact are reset (>= 4.0s)
    expect(result.current.firedCuesRef.current.has("choices-enter")).toBe(true);
    expect(result.current.firedCuesRef.current.has("cd-5")).toBe(true);
    expect(result.current.firedCuesRef.current.has("cd-4")).toBe(true);
    expect(result.current.firedCuesRef.current.has("cd-3")).toBe(false);
    expect(result.current.firedCuesRef.current.has("cd-2")).toBe(false);

    // Scrub backward to 1.0s -> cd-5 and cd-4 must be reactivated (reset)
    act(() => {
      result.current.handleScrubberChange(1.0);
    });
    expect(result.current.timelineSeconds).toBe(1.0);
    expect(result.current.firedCuesRef.current.has("choices-enter")).toBe(true);
    expect(result.current.firedCuesRef.current.has("cd-5")).toBe(false);
    expect(result.current.firedCuesRef.current.has("cd-4")).toBe(false);
  });

  it("handles animated reveal rehearsal from revealStart (7.47s) settling at 8.1s", () => {
    const { result } = renderHook(() => useSandboxTimelineState());

    const postMessageSpy = vi.fn();
    const mockRehearsal = {
      seek: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
    };
    result.current.iframeRef.current = {
      contentWindow: {
        postMessage: postMessageSpy,
        __hyperframesRehearsal: mockRehearsal,
      },
    } as unknown as HTMLIFrameElement;

    // Trigger animated reveal preview
    act(() => {
      result.current.handlePhaseChange("reveal", { previewAnimation: true });
    });

    // Starts at revealStart (7.47s)
    expect(result.current.phase).toBe("reveal");
    expect(result.current.timelineSeconds).toBe(7.47);
    expect(postMessageSpy).toHaveBeenCalledWith({ type: "REHEARSAL_SEEK", time: 7.47 }, "*");
    expect(postMessageSpy).toHaveBeenCalledWith({ type: "REHEARSAL_PLAY", time: 7.47 }, "*");
    expect(result.current.firedCuesRef.current.has("answer-reveal")).toBe(true);

    // Advance fake timers by 800ms (more than the 630ms duration from 7.47s to 8.10s)
    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Settles at 8.1s resting keyframe
    expect(result.current.timelineSeconds).toBe(8.1);
    expect(result.current.phase).toBe("reveal");
    expect(mockRehearsal.pause).toHaveBeenCalled();
  });

  it("rehearseReveal triggers preview animation correctly", () => {
    const { result } = renderHook(() => useSandboxTimelineState());

    act(() => {
      result.current.rehearseReveal();
    });

    expect(result.current.phase).toBe("reveal");
    expect(result.current.timelineSeconds).toBe(7.47);
  });

  it("handles handleTogglePlay snapping from reveal settled snapshot (8.1s) back to revealStart (7.47s)", () => {
    const { result } = renderHook(() => useSandboxTimelineState());

    // Jump to settled reveal keyframe (8.1s)
    act(() => {
      result.current.handlePhaseChange("reveal");
    });
    expect(result.current.phase).toBe("reveal");
    expect(result.current.timelineSeconds).toBe(8.1);

    // Hitting play should snap back to revealStart (7.47s) so user sees the reveal animation & hears triumph
    act(() => {
      result.current.handleTogglePlay();
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.timelineSeconds).toBe(7.47);
  });
});

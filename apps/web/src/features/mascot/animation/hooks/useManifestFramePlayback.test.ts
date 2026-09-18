import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useManifestFramePlayback } from "./useManifestFramePlayback";
import type { MascotPublishedAnimationAsset } from "@studio/shared";

function createMockAnimation(overrides: Partial<MascotPublishedAnimationAsset> = {}): MascotPublishedAnimationAsset {
  return {
    version: 1,
    state: "thinking",
    atlas_url: "https://example.com/atlas.png",
    manifest_url: "https://example.com/manifest.json",
    frame_count: 12,
    fps: 8,
    loop: true,
    loop_policy: "loop",
    frames: Array.from({ length: 12 }, (_, i) => ({
      index: i,
      x: (i % 4) * 200,
      y: Math.floor(i / 4) * 150,
      width: 200,
      height: 150,
      duration_ms: 125,
    })),
    registration: {
      source_width: 800,
      source_height: 450,
      content_bounds: { x: 50, y: 50, width: 700, height: 350 },
      pivot: { x: 400, y: 450 },
      offset_x: 0,
      offset_y: 0,
    },
    content_fingerprint: "test-content-fp",
    source_fingerprint: "test-source-fp",
    slot_index: 1,
    recipe_id: "recipe-1",
    ...overrides,
  };
}

describe("useManifestFramePlayback", () => {
  it("initializes with frame 0 and correct cycle metadata", () => {
    const animation = createMockAnimation();
    const { result } = renderHook(() => useManifestFramePlayback({ animation }));

    expect(result.current.currentFrameIndex).toBe(0);
    expect(result.current.timeSeconds).toBe(0);
    expect(result.current.fps).toBe(8);
    expect(result.current.frameCount).toBe(12);
    expect(result.current.cycleSeconds).toBe(1.5);
    expect(result.current.isLooping).toBe(true);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.resolvedFrame?.frameIndex).toBe(0);
    expect(result.current.resolvedFrame?.atlasOffsets.cssBackgroundPosition).toBe("0px 0px");
  });

  it("advances step forward by exactly 1 frame (0.125s)", () => {
    const animation = createMockAnimation();
    const { result } = renderHook(() => useManifestFramePlayback({ animation }));

    act(() => {
      result.current.stepForward();
    });

    expect(result.current.timeSeconds).toBe(0.125);
    expect(result.current.currentFrameIndex).toBe(1);
    expect(result.current.resolvedFrame?.frameIndex).toBe(1);
    expect(result.current.resolvedFrame?.atlasOffsets.pixelOffsetX).toBe(-200);

    // Step to frame 2
    act(() => {
      result.current.stepForward();
    });
    expect(result.current.timeSeconds).toBe(0.25);
    expect(result.current.currentFrameIndex).toBe(2);
  });

  it("steps backward correctly and wraps to end in loop mode", () => {
    const animation = createMockAnimation();
    const { result } = renderHook(() => useManifestFramePlayback({ animation }));

    // From 0s, step backward wraps to frame 11 in loop mode
    act(() => {
      result.current.stepBackward();
    });

    expect(result.current.currentFrameIndex).toBe(11);
    expect(result.current.resolvedFrame?.frameIndex).toBe(11);

    act(() => {
      result.current.stepBackward();
    });
    expect(result.current.currentFrameIndex).toBe(10);
  });

  it("seeks to exact frame index via seekFrame", () => {
    const animation = createMockAnimation();
    const { result } = renderHook(() => useManifestFramePlayback({ animation }));

    act(() => {
      result.current.seekFrame(5);
    });

    expect(result.current.currentFrameIndex).toBe(5);
    expect(result.current.timeSeconds).toBe(0.625);
    expect(result.current.resolvedFrame?.atlasOffsets.pixelOffsetY).toBe(-150);

    // Clamps out of range
    act(() => {
      result.current.seekFrame(99);
    });
    expect(result.current.currentFrameIndex).toBe(11);
  });

  it("handles one-shot celebrate clamping at cycle end", () => {
    const celebrateAnimation = createMockAnimation({
      state: "celebrate",
      loop: false,
      loop_policy: "one_shot_rest",
    });

    const { result } = renderHook(() =>
      useManifestFramePlayback({
        animation: celebrateAnimation,
        initialTimeSeconds: 1.375, // Frame 11
      }),
    );

    expect(result.current.currentFrameIndex).toBe(11);
    expect(result.current.isLooping).toBe(false);

    act(() => {
      result.current.stepForward();
    });

    // In one-shot mode, step forward at end stays clamped to frame 11
    expect(result.current.currentFrameIndex).toBe(11);
    expect(result.current.resolvedFrame?.isClamped).toBe(true);
  });

  it("advances frames over time when isPlaying is true", () => {
    vi.useFakeTimers();
    const animation = createMockAnimation();
    const { result } = renderHook(() => useManifestFramePlayback({ animation }));

    act(() => {
      result.current.togglePlay();
    });

    expect(result.current.isPlaying).toBe(true);

    // Advance 125ms -> should advance to frame 1
    act(() => {
      vi.advanceTimersByTime(125);
    });
    expect(result.current.currentFrameIndex).toBe(1);

    // Advance another 125ms -> frame 2
    act(() => {
      vi.advanceTimersByTime(125);
    });
    expect(result.current.currentFrameIndex).toBe(2);

    vi.useRealTimers();
  });

  it("handles dynamic 4s video at 24 FPS (96 frames) with accurate timing", () => {
    const dynamicAnimation = createMockAnimation({
      frame_count: 96,
      fps: 24,
      duration_ms: 4000,
      transparent_video_url: "/api/mascots/owl/styles/core/animations/thinking/1/artifacts/video_transparent.webm",
      alpha_codec: "vp9_alpha",
    });

    const { result } = renderHook(() => useManifestFramePlayback({ animation: dynamicAnimation }));

    expect(result.current.frameCount).toBe(96);
    expect(result.current.fps).toBe(24);
    expect(result.current.cycleSeconds).toBe(4);
    expect(result.current.frameDurationMs).toBe(42);

    act(() => {
      result.current.stepForward();
    });
    expect(result.current.timeSeconds).toBeCloseTo(1 / 24, 2);
    expect(result.current.currentFrameIndex).toBe(1);

    act(() => {
      result.current.seekFrame(48);
    });
    expect(result.current.currentFrameIndex).toBe(48);
    expect(result.current.timeSeconds).toBeCloseTo(2.0, 1);
  });

  it("handles dynamic 10s video at 30 FPS (300 frames) with accurate cycleSeconds", () => {
    const dynamicAnimation = createMockAnimation({
      frame_count: 300,
      fps: 30,
      duration_ms: 10000,
      transparent_video_url: "/api/mascots/owl/styles/core/animations/thinking/1/artifacts/video_transparent.webm",
      alpha_codec: "vp9_alpha",
    });

    const { result } = renderHook(() => useManifestFramePlayback({ animation: dynamicAnimation }));

    expect(result.current.frameCount).toBe(300);
    expect(result.current.fps).toBe(30);
    expect(result.current.cycleSeconds).toBe(10);
    expect(result.current.frameDurationMs).toBe(33);

    act(() => {
      result.current.seekFrame(150);
    });
    expect(result.current.currentFrameIndex).toBe(150);
    expect(result.current.timeSeconds).toBe(5);
  });
});

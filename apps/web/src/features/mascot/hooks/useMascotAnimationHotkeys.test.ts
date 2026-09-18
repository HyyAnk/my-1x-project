import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMascotAnimationHotkeys } from "./useMascotAnimationHotkeys";

describe("useMascotAnimationHotkeys", () => {
  it("handles Space key to toggle play", () => {
    const togglePlay = vi.fn();
    const stepBackward = vi.fn();
    const stepForward = vi.fn();

    const { result } = renderHook(() =>
      useMascotAnimationHotkeys({
        togglePlay,
        stepBackward,
        stepForward,
      }),
    );

    const preventDefault = vi.fn();
    result.current.handleKeyDown({
      key: " ",
      code: "Space",
      preventDefault,
    } as any);

    expect(preventDefault).toHaveBeenCalled();
    expect(togglePlay).toHaveBeenCalledTimes(1);
    expect(stepBackward).not.toHaveBeenCalled();
    expect(stepForward).not.toHaveBeenCalled();
  });

  it("handles ArrowLeft to step backward and ArrowRight to step forward", () => {
    const togglePlay = vi.fn();
    const stepBackward = vi.fn();
    const stepForward = vi.fn();

    const { result } = renderHook(() =>
      useMascotAnimationHotkeys({
        playback: { togglePlay, stepBackward, stepForward },
      }),
    );

    const preventDefaultLeft = vi.fn();
    result.current.handleKeyDown({
      key: "ArrowLeft",
      preventDefault: preventDefaultLeft,
    } as any);

    expect(preventDefaultLeft).toHaveBeenCalled();
    expect(stepBackward).toHaveBeenCalledTimes(1);

    const preventDefaultRight = vi.fn();
    result.current.handleKeyDown({
      key: "ArrowRight",
      preventDefault: preventDefaultRight,
    } as any);

    expect(preventDefaultRight).toHaveBeenCalled();
    expect(stepForward).toHaveBeenCalledTimes(1);
  });

  it("ignores key events when enabled is false", () => {
    const togglePlay = vi.fn();
    const stepBackward = vi.fn();
    const stepForward = vi.fn();

    const { result } = renderHook(() =>
      useMascotAnimationHotkeys({
        playback: { togglePlay, stepBackward, stepForward },
        enabled: false,
      }),
    );

    const preventDefault = vi.fn();
    result.current.handleKeyDown({
      key: " ",
      code: "Space",
      preventDefault,
    } as any);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(togglePlay).not.toHaveBeenCalled();
  });
});

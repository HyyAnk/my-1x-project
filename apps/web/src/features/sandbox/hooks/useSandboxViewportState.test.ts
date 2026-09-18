import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SANDBOX_CANVAS_DIMENSIONS, SANDBOX_SAFE_ZONES, useSandboxViewportState } from "./useSandboxViewportState";

describe("useSandboxViewportState (Stage 8 Viewport & Dimensions)", () => {
  it("exports calibrated canvas dimensions for 16:9", () => {
    expect(SANDBOX_CANVAS_DIMENSIONS["16:9"]).toEqual({ width: 1920, height: 1080 });
  });

  it("exports calibrated safe zones matching server candyArcadeStyles", () => {
    expect(SANDBOX_SAFE_ZONES["16:9"].actionSafe).toEqual({
      top: 54,
      bottom: 54,
      left: 96,
      right: 96,
    });
    expect(SANDBOX_SAFE_ZONES["16:9"].titleSafe).toEqual({
      top: 108,
      bottom: 108,
      left: 192,
      right: 192,
    });
  });

  it("initializes with fixed 16:9 aspect ratio", () => {
    const { result } = renderHook(() => useSandboxViewportState());

    expect(result.current.aspectRatio).toBe("16:9");
    expect(result.current.showSafeArea).toBe(false);
    expect(result.current.showShortsGuide).toBe(false);
    expect(result.current.zoom).toBe("fit");
  });

  it("updates zoom scale presets correctly", () => {
    const { result } = renderHook(() => useSandboxViewportState());

    act(() => {
      result.current.setZoom("50");
    });
    expect(result.current.zoom).toBe("50");
    expect(result.current.scaleFactor).toBe(0.5);

    act(() => {
      result.current.setZoom("75");
    });
    expect(result.current.zoom).toBe("75");
    expect(result.current.scaleFactor).toBe(0.75);

    act(() => {
      result.current.setZoom("100");
    });
    expect(result.current.zoom).toBe("100");
    expect(result.current.scaleFactor).toBe(1);
  });
});

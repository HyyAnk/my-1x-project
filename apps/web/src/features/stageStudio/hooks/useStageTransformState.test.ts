import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RECOMMENDED_MASCOT_PLACEMENT_PRESET } from "@studio/shared";
import { useStageTransformState } from "./useStageTransformState";

describe("useStageTransformState landscape state", () => {
  it("owns only the 16:9 placement", () => {
    const { result } = renderHook(() => useStageTransformState());
    expect(Object.keys(result.current.placements)).toEqual(["16:9"]);
    expect(result.current.position).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position);
  });

  it("updates and resets the landscape placement", () => {
    const { result } = renderHook(() => useStageTransformState());
    act(() => {
      result.current.setPosition("bottom_right");
      result.current.setScale(1.4);
      result.current.setOffsetX(35);
    });
    expect(result.current.placements["16:9"]).toMatchObject({ position: "bottom_right", scale: 1.4, offset_x: 35 });
    act(() => result.current.resetAllPlacements());
    expect(result.current.placements["16:9"]).toEqual(RECOMMENDED_MASCOT_PLACEMENT_PRESET);
  });

  it("manages mascotMediaMode independently", () => {
    const { result } = renderHook(() => useStageTransformState());
    expect(result.current.mascotMediaMode).toBe("inherit");

    act(() => {
      result.current.setMascotMediaMode("static");
    });
    expect(result.current.mascotMediaMode).toBe("static");

    act(() => {
      result.current.setMascotMediaMode("animation");
    });
    expect(result.current.mascotMediaMode).toBe("animation");
  });
});

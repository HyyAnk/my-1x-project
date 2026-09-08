import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type MascotPlacementPreset, RECOMMENDED_MASCOT_PLACEMENT_PRESET } from "@studio/shared";
import { useStageTransformState } from "./useStageTransformState";

describe("useStageTransformState landscape lifecycle", () => {
  it("initializes, applies, and resets the sole Stage placement", () => {
    const custom: MascotPlacementPreset = {
      position: "bottom_right",
      scale: 1.45,
      offset_x: 25,
      offset_y: 35,
      flip_x: true,
    };
    const { result } = renderHook(() => useStageTransformState());
    act(() => result.current.initPlacements({ "16:9": custom }));
    expect(result.current.placements).toEqual({ "16:9": custom });
    act(() => result.current.resetPlacement());
    expect(result.current.placements).toEqual({ "16:9": RECOMMENDED_MASCOT_PLACEMENT_PRESET });
  });
});

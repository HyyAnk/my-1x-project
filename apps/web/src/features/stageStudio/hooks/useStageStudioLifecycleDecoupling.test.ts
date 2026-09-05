import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RECOMMENDED_MASCOT_PLACEMENT_PRESETS, type MascotPlacementPreset } from "@studio/shared";
import { useStageTransformState } from "./useStageTransformState";
import type { StageAspectRatio } from "../types";

describe("useStageTransformState Lifecycle & Reset Decoupling", () => {
  const custom16_9: MascotPlacementPreset = {
    position: "bottom_left",
    scale: 1.45,
    offset_x: 25,
    offset_y: 35,
    flip_x: false,
  };

  const custom9_16: MascotPlacementPreset = {
    position: "bottom_right",
    scale: 2.15,
    offset_x: -75,
    offset_y: 110,
    flip_x: true,
  };

  it("resetPlacement on 9:16 resets only 9:16 and strictly preserves 16:9", () => {
    const { result, rerender } = renderHook(
      ({ aspect }: { aspect: StageAspectRatio }) => useStageTransformState(aspect),
      { initialProps: { aspect: "16:9" as StageAspectRatio } },
    );

    // Set custom placement on 16:9
    act(() => {
      result.current.applyPlacement(custom16_9);
    });
    expect(result.current.placements["16:9"]).toEqual(custom16_9);

    // Switch to 9:16 and set custom placement on 9:16
    rerender({ aspect: "9:16" });
    act(() => {
      result.current.applyPlacement(custom9_16);
    });
    expect(result.current.placements["9:16"]).toEqual(custom9_16);
    // 16:9 still preserved
    expect(result.current.placements["16:9"]).toEqual(custom16_9);

    // Reset placement on 9:16
    act(() => {
      result.current.resetPlacement("9:16");
    });

    // 9:16 is reset to recommended 9:16 preset
    expect(result.current.placements["9:16"]).toEqual(RECOMMENDED_MASCOT_PLACEMENT_PRESETS["9:16"]);
    // 16:9 is completely untouched!
    expect(result.current.placements["16:9"]).toEqual(custom16_9);
  });

  it("resetPlacement on 16:9 resets only 16:9 and strictly preserves 9:16", () => {
    const { result, rerender } = renderHook(
      ({ aspect }: { aspect: StageAspectRatio }) => useStageTransformState(aspect),
      { initialProps: { aspect: "16:9" as StageAspectRatio } },
    );

    // Set custom placements on both
    act(() => {
      result.current.applyPlacement(custom16_9);
    });
    rerender({ aspect: "9:16" });
    act(() => {
      result.current.applyPlacement(custom9_16);
    });

    // Reset placement on 16:9
    act(() => {
      result.current.resetPlacement("16:9");
    });

    // 16:9 is reset to recommended 16:9 preset
    expect(result.current.placements["16:9"]).toEqual(RECOMMENDED_MASCOT_PLACEMENT_PRESETS["16:9"]);
    // 9:16 is completely untouched!
    expect(result.current.placements["9:16"]).toEqual(custom9_16);
  });

  it("bidirectional copyPlacementFrom copies without mutating source aspect ratio", () => {
    const { result, rerender } = renderHook(
      ({ aspect }: { aspect: StageAspectRatio }) => useStageTransformState(aspect),
      { initialProps: { aspect: "16:9" as StageAspectRatio } },
    );

    act(() => {
      result.current.applyPlacement(custom16_9);
      result.current.copyPlacementFrom("16:9", "9:16");
    });

    // 9:16 now has a copy of 16:9
    expect(result.current.placements["9:16"]).toEqual(custom16_9);

    // Switch to 9:16, apply custom9_16, and copy from 9:16 to 16:9
    rerender({ aspect: "9:16" });
    act(() => {
      result.current.applyPlacement(custom9_16);
      result.current.copyPlacementFrom("9:16", "16:9");
    });

    // 16:9 now has a copy of 9:16
    expect(result.current.placements["16:9"]).toEqual(custom9_16);
    expect(result.current.placements["9:16"]).toEqual(custom9_16);
  });
});

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RECOMMENDED_MASCOT_PLACEMENT_PRESET } from "@studio/shared";
import type { StageAspectRatio } from "../types";
import { useStageTransformState } from "./useStageTransformState";

describe("useStageTransformState Decoupled State", () => {
  it("initializes with default placements for both 16:9 and 9:16", () => {
    const { result } = renderHook(() => useStageTransformState("16:9"));

    expect(result.current.placements["16:9"]).toBeDefined();
    expect(result.current.placements["9:16"]).toBeDefined();
    expect(result.current.position).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position);
    expect(result.current.scale).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale);
  });

  it("modifies 9:16 without mutating 16:9 placement", () => {
    const { result, rerender } = renderHook(
      ({ aspect }: { aspect: StageAspectRatio }) => useStageTransformState(aspect),
      { initialProps: { aspect: "9:16" as StageAspectRatio } },
    );

    // Initial check on 9:16
    expect(result.current.position).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position);

    // Modify 9:16 values
    act(() => {
      result.current.setPosition("bottom_right");
      result.current.setScale(1.4);
      result.current.setOffsetX(35);
      result.current.setOffsetY(-15);
      result.current.setFlipHorizontal(true);
    });

    expect(result.current.position).toBe("bottom_right");
    expect(result.current.scale).toBe(1.4);
    expect(result.current.offsetX).toBe(35);
    expect(result.current.offsetY).toBe(-15);
    expect(result.current.flipHorizontal).toBe(true);

    // Verify 16:9 remains at baseline
    expect(result.current.placements["16:9"].position).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position);
    expect(result.current.placements["16:9"].scale).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale);
    expect(result.current.placements["16:9"].offset_x).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x);
    expect(result.current.placements["16:9"].offset_y).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y);
    expect(result.current.placements["16:9"].flip_x).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.flip_x);

    // Switch view to 16:9
    rerender({ aspect: "16:9" });
    expect(result.current.position).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position);
    expect(result.current.scale).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale);
    expect(result.current.offsetX).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x);
    expect(result.current.offsetY).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y);
    expect(result.current.flipHorizontal).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.flip_x);
  });

  it("copies placement from 16:9 to 9:16 without affecting source", () => {
    const { result, rerender } = renderHook(
      ({ aspect }: { aspect: StageAspectRatio }) => useStageTransformState(aspect),
      { initialProps: { aspect: "16:9" as StageAspectRatio } },
    );

    act(() => {
      result.current.setPosition("bottom_right");
      result.current.setScale(1.25);
      result.current.setOffsetX(50);
    });

    expect(result.current.placements["16:9"].scale).toBe(1.25);
    expect(result.current.placements["9:16"].scale).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale);

    // Copy 16:9 -> 9:16
    act(() => {
      result.current.copyPlacementFrom("16:9", "9:16");
    });

    expect(result.current.placements["9:16"].position).toBe("bottom_right");
    expect(result.current.placements["9:16"].scale).toBe(1.25);
    expect(result.current.placements["9:16"].offset_x).toBe(50);

    // Switch to 9:16 and edit 9:16 -> does not touch 16:9
    rerender({ aspect: "9:16" });
    act(() => {
      result.current.setScale(0.85);
    });

    expect(result.current.placements["9:16"].scale).toBe(0.85);
    expect(result.current.placements["16:9"].scale).toBe(1.25);
  });

  it("initializes bulk placements from existing channel config", () => {
    const { result } = renderHook(() => useStageTransformState("16:9"));

    act(() => {
      result.current.initPlacements({
        "16:9": { position: "bottom_left", scale: 1.1, offset_x: -10, offset_y: 10, flip_x: false },
        "9:16": { position: "bottom_right", scale: 0.9, offset_x: 20, offset_y: -20, flip_x: true },
      });
    });

    expect(result.current.placements["16:9"].scale).toBe(1.1);
    expect(result.current.placements["9:16"].scale).toBe(0.9);
    expect(result.current.placements["9:16"].position).toBe("bottom_right");
  });
});

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  type AppConfig,
  RECOMMENDED_MASCOT_PLACEMENT_PRESET,
} from "@studio/shared";
import { useMascotPlacementPreset } from "./useMascotPlacementPreset";
import { api } from "../../../api";
import type { StageAspectRatio } from "../types";

vi.mock("../../../api", () => ({
  api: {
    config: vi.fn(),
    saveMascotStageSettings: vi.fn(),
  },
}));

describe("useMascotPlacementPreset Decoupled Dual Presets", () => {
  const custom16_9 = {
    position: "bottom_left" as const,
    scale: 1.4,
    offset_x: 20,
    offset_y: 30,
    flip_x: false,
  };

  const custom9_16 = {
    position: "bottom_right" as const,
    scale: 2.1,
    offset_x: -60,
    offset_y: 90,
    flip_x: true,
  };

  it("loads independent default placements for 16:9 and 9:16 from server config", async () => {
    vi.mocked(api.config).mockResolvedValue({
      mascot_stage: {
        default_placement: custom16_9,
        default_placements: {
          "16:9": custom16_9,
          "9:16": custom9_16,
        },
      },
    } as unknown as AppConfig);

    const setPosition = vi.fn();
    const setScale = vi.fn();
    const setOffsetX = vi.fn();
    const setOffsetY = vi.fn();
    const setFlipHorizontal = vi.fn();
    const onNotice = vi.fn();
    const t = vi.fn((k: string) => k);

    const { result, rerender } = renderHook(
      ({ aspect }: { aspect: StageAspectRatio }) =>
        useMascotPlacementPreset({
          isOpen: true,
          aspectRatio: aspect,
          position: "bottom_left",
          scale: 1.0,
          offsetX: 0,
          offsetY: 0,
          flipHorizontal: false,
          setPosition,
          setScale,
          setOffsetX,
          setOffsetY,
          setFlipHorizontal,
          onNotice,
          t,
        }),
      { initialProps: { aspect: "16:9" as StageAspectRatio } },
    );

    // Allow config promise to resolve
    await act(async () => {
      await Promise.resolve();
    });

    // On 16:9, defaultPlacement should be custom16_9
    expect(result.current.defaultPlacement).toEqual(custom16_9);

    // Apply default placement on 16:9
    act(() => {
      result.current.applyDefaultPlacement();
    });
    expect(setPosition).toHaveBeenCalledWith(custom16_9.position);
    expect(setScale).toHaveBeenCalledWith(custom16_9.scale);

    // Switch to 9:16
    rerender({ aspect: "9:16" });

    // On 9:16, defaultPlacement should be custom9_16
    expect(result.current.defaultPlacement).toEqual(custom9_16);

    // Apply default placement on 9:16
    act(() => {
      result.current.applyDefaultPlacement();
    });
    expect(setPosition).toHaveBeenCalledWith(custom9_16.position);
    expect(setScale).toHaveBeenCalledWith(custom9_16.scale);
  });

  it("saving current as default on 9:16 preserves 16:9 default placement", async () => {
    vi.mocked(api.config).mockResolvedValue({
      mascot_stage: {
        default_placement: custom16_9,
        default_placements: {
          "16:9": custom16_9,
          "9:16": { ...RECOMMENDED_MASCOT_PLACEMENT_PRESET },
        },
      },
    } as unknown as AppConfig);

    vi.mocked(api.saveMascotStageSettings).mockImplementation(async (body) => ({
      mascot_stage: {
        default_placement: body.default_placement ?? custom16_9,
        default_placements: {
          "16:9": body.default_placements?.["16:9"] ?? custom16_9,
          "9:16": body.default_placements?.["9:16"] ?? custom9_16,
        },
      },
    } as unknown as { mascot_stage: AppConfig["mascot_stage"] }));

    const onNotice = vi.fn();
    const t = vi.fn((k: string) => k);

    const { result } = renderHook(() =>
      useMascotPlacementPreset({
        isOpen: true,
        aspectRatio: "9:16",
        position: custom9_16.position,
        scale: custom9_16.scale,
        offsetX: custom9_16.offset_x,
        offsetY: custom9_16.offset_y,
        flipHorizontal: custom9_16.flip_x,
        setPosition: vi.fn(),
        setScale: vi.fn(),
        setOffsetX: vi.fn(),
        setOffsetY: vi.fn(),
        setFlipHorizontal: vi.fn(),
        onNotice,
        t,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.saveCurrentAsDefault();
    });

    expect(api.saveMascotStageSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        default_placements: {
          "16:9": custom16_9,
          "9:16": custom9_16,
        },
      }),
    );

    // Both defaults are updated in hook state
    expect(result.current.defaultPlacements["16:9"]).toEqual(custom16_9);
    expect(result.current.defaultPlacements["9:16"]).toEqual(custom9_16);
    expect(result.current.defaultPlacement).toEqual(custom9_16);
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "good" }));
  });
});

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { type AppConfig, RECOMMENDED_MASCOT_PLACEMENT_PRESETS } from "@studio/shared";
import { api } from "../../../api";
import { useStageStudioPresets } from "./useStageStudioPresets";

vi.mock("../../../api", () => ({
  api: {
    config: vi.fn(),
    saveMascotStageSettings: vi.fn(),
  },
}));

describe("useStageStudioPresets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates isPresetDirty when placement differs from default", () => {
    const defaultPreset = RECOMMENDED_MASCOT_PLACEMENT_PRESETS["16:9"];
    vi.mocked(api.config).mockResolvedValue({
      mascot_stage: { default_placement: defaultPreset, default_placements: { "16:9": defaultPreset } },
    } as unknown as AppConfig);

    const resetPlacementMock = vi.fn();
    const setPositionMock = vi.fn();
    const setScaleMock = vi.fn();
    const setOffsetXMock = vi.fn();
    const setOffsetYMock = vi.fn();
    const setFlipHorizontalMock = vi.fn();
    const setShowInIntroMock = vi.fn();
    const setShowInOutroMock = vi.fn();
    const setShowInQuestionMock = vi.fn();
    const onNoticeMock = vi.fn();

    const { result, rerender } = renderHook(
      (props) =>
        useStageStudioPresets({
          isOpen: true,
          aspectRatio: "16:9",
          position: props.position,
          scale: props.scale,
          offsetX: props.offsetX,
          offsetY: props.offsetY,
          flipHorizontal: props.flipHorizontal,
          resetPlacement: resetPlacementMock,
          setPosition: setPositionMock,
          setScale: setScaleMock,
          setOffsetX: setOffsetXMock,
          setOffsetY: setOffsetYMock,
          setFlipHorizontal: setFlipHorizontalMock,
          setShowInIntro: setShowInIntroMock,
          setShowInOutro: setShowInOutroMock,
          setShowInQuestion: setShowInQuestionMock,
          onNotice: onNoticeMock,
          t: (k) => k,
        }),
      {
        initialProps: {
          position: defaultPreset.position,
          scale: defaultPreset.scale,
          offsetX: defaultPreset.offset_x,
          offsetY: defaultPreset.offset_y,
          flipHorizontal: defaultPreset.flip_x,
        },
      },
    );

    // Initial identical placement
    expect(result.current.isPresetDirty).toBe(false);

    // Dirty with modified scale
    rerender({
      position: defaultPreset.position,
      scale: defaultPreset.scale + 0.5,
      offsetX: defaultPreset.offset_x,
      offsetY: defaultPreset.offset_y,
      flipHorizontal: defaultPreset.flip_x,
    });
    expect(result.current.isPresetDirty).toBe(true);

    // Reset layout
    act(() => {
      result.current.handleResetLayout();
    });
    expect(resetPlacementMock).toHaveBeenCalledWith("16:9", defaultPreset);
    expect(setShowInIntroMock).toHaveBeenCalledWith(false);
    expect(setShowInOutroMock).toHaveBeenCalledWith(false);
    expect(setShowInQuestionMock).toHaveBeenCalledWith(true);
  });
});

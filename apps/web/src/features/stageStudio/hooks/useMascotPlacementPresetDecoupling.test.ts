import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type AppConfig } from "@studio/shared";
import { api } from "../../../api";
import { useMascotPlacementPreset } from "./useMascotPlacementPreset";

vi.mock("../../../api", () => ({ api: { config: vi.fn(), saveMascotStageSettings: vi.fn() } }));

describe("useMascotPlacementPreset landscape retirement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads and saves only the 16:9 Stage default", async () => {
    const preset = { position: "bottom_right" as const, scale: 1.2, offset_x: 12, offset_y: -4, flip_x: true };
    vi.mocked(api.config).mockResolvedValue({
      mascot_stage: { default_placement: preset, default_placements: { "16:9": preset } },
    } as AppConfig);
    vi.mocked(api.saveMascotStageSettings).mockImplementation((body) =>
      Promise.resolve({
        mascot_stage: { default_placement: body.default_placement, default_placements: body.default_placements },
      }),
    );

    const { result } = renderHook(() =>
      useMascotPlacementPreset({
        isOpen: true,
        aspectRatio: "16:9",
        position: preset.position,
        scale: preset.scale,
        offsetX: preset.offset_x,
        offsetY: preset.offset_y,
        flipHorizontal: preset.flip_x,
        setPosition: vi.fn(),
        setScale: vi.fn(),
        setOffsetX: vi.fn(),
        setOffsetY: vi.fn(),
        setFlipHorizontal: vi.fn(),
        onNotice: vi.fn(),
        t: (key) => key,
      }),
    );

    await waitFor(() => expect(result.current.presetReady).toBe(true));
    expect(result.current.defaultPlacement).toEqual(preset);
    await act(async () => result.current.saveCurrentAsDefault());
    expect(api.saveMascotStageSettings).toHaveBeenCalledWith({
      default_placement: preset,
      default_placements: { "16:9": preset },
    });
    expect(Object.keys(result.current.defaultPlacements)).toEqual(["16:9"]);
  });
});

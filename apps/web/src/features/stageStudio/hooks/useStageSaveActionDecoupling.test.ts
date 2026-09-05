import { describe, expect, it, vi } from "vitest";
import {
  type Channel,
  RECOMMENDED_MASCOT_PLACEMENT_PRESET,
  RECOMMENDED_MASCOT_PLACEMENT_PRESETS,
} from "@studio/shared";
import {
  buildDecoupledChannelMascotConfig,
  useStageSaveAction,
} from "./useStageSaveAction";
import { renderHook, act } from "@testing-library/react";
import { api } from "../../../api";

vi.mock("../../../api", () => ({
  api: {
    assignMascotToChannel: vi.fn().mockResolvedValue({ channel: {} }),
  },
}));

describe("buildDecoupledChannelMascotConfig", () => {
  const customPlacement16_9 = {
    position: "bottom_left" as const,
    scale: 1.5,
    offset_x: 20,
    offset_y: 30,
    flip_x: false,
  };

  const customPlacement9_16 = {
    position: "bottom_right" as const,
    scale: 2.0,
    offset_x: 100,
    offset_y: 150,
    flip_x: true,
  };

  it("preserves 9:16 placement when saving from 16:9", () => {
    const channel: Channel = {
      channel_id: "ch-1",
      slug: "channel-1",
      display_name: "Channel One",
      mascot_id: "mascot-1",
      mascot_config: {
        enabled: true,
        position: "bottom_left",
        scale: 1.0,
        offset_x: 0,
        offset_y: 0,
        flip_x: false,
        placements: {
          "16:9": { ...RECOMMENDED_MASCOT_PLACEMENT_PRESETS["16:9"] },
          "9:16": customPlacement9_16,
        },
      },
    } as unknown as Channel;

    const config = buildDecoupledChannelMascotConfig({
      aspectRatio: "16:9",
      activePlacement: customPlacement16_9,
      placements: {
        "16:9": customPlacement16_9,
        "9:16": customPlacement9_16,
      },
      channel,
    });

    // 16:9 is updated to active placement
    expect(config.placements?.["16:9"]).toEqual(customPlacement16_9);
    expect(config.position).toBe(customPlacement16_9.position);
    expect(config.scale).toBe(customPlacement16_9.scale);
    expect(config.offset_x).toBe(customPlacement16_9.offset_x);
    expect(config.offset_y).toBe(customPlacement16_9.offset_y);

    // 9:16 is preserved from placements / channel and NEVER overwritten by 16:9
    expect(config.placements?.["9:16"]).toEqual(customPlacement9_16);
    expect(config.placements?.["9:16"]?.position).toBe("bottom_right");
    expect(config.placements?.["9:16"]?.scale).toBe(2.0);
  });

  it("preserves 16:9 placement and root fields when saving from 9:16", () => {
    const channel: Channel = {
      channel_id: "ch-2",
      slug: "channel-2",
      display_name: "Channel Two",
      mascot_id: "mascot-2",
      mascot_config: {
        enabled: true,
        position: customPlacement16_9.position,
        scale: customPlacement16_9.scale,
        offset_x: customPlacement16_9.offset_x,
        offset_y: customPlacement16_9.offset_y,
        flip_x: customPlacement16_9.flip_x,
        placements: {
          "16:9": customPlacement16_9,
          "9:16": { ...RECOMMENDED_MASCOT_PLACEMENT_PRESETS["9:16"] },
        },
      },
    } as unknown as Channel;

    const newPlacement9_16 = {
      position: "bottom_left" as const,
      scale: 1.2,
      offset_x: -40,
      offset_y: 80,
      flip_x: false,
    };

    const config = buildDecoupledChannelMascotConfig({
      aspectRatio: "9:16",
      activePlacement: newPlacement9_16,
      placements: {
        "16:9": customPlacement16_9,
        "9:16": newPlacement9_16,
      },
      channel,
    });

    // 9:16 is updated to new active placement
    expect(config.placements?.["9:16"]).toEqual(newPlacement9_16);

    // 16:9 remains untouched
    expect(config.placements?.["16:9"]).toEqual(customPlacement16_9);
    // Root fields still point to 16:9 for legacy player compatibility
    expect(config.position).toBe(customPlacement16_9.position);
    expect(config.scale).toBe(customPlacement16_9.scale);
    expect(config.offset_x).toBe(customPlacement16_9.offset_x);
    expect(config.offset_y).toBe(customPlacement16_9.offset_y);
  });

  it("uses ratio-specific recommended presets when channel has no prior placements", () => {
    const config = buildDecoupledChannelMascotConfig({
      aspectRatio: "9:16",
      activePlacement: customPlacement9_16,
      placements: undefined,
      channel: null,
    });

    // 9:16 has active placement
    expect(config.placements?.["9:16"]).toEqual(customPlacement9_16);
    // 16:9 safely defaults to recommended 16:9 preset, NOT active 9:16
    expect(config.placements?.["16:9"]).toEqual(RECOMMENDED_MASCOT_PLACEMENT_PRESETS["16:9"]);
    expect(config.scale).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale);
  });
});

describe("useStageSaveAction hook integration", () => {
  it("passes decoupled config to api.assignMascotToChannel in single channel mode", async () => {
    const targetChannel: Channel = {
      channel_id: "ch-3",
      slug: "channel-3",
      display_name: "Channel Three",
      mascot_id: "mascot-3",
      mascot_config: {
        enabled: true,
        position: "bottom_left",
        scale: 1.0,
        offset_x: 0,
        offset_y: 0,
        flip_x: false,
        placements: {
          "16:9": {
            position: "bottom_left",
            scale: 1.1,
            offset_x: 10,
            offset_y: 20,
            flip_x: false,
          },
          "9:16": {
            position: "bottom_right",
            scale: 2.2,
            offset_x: 50,
            offset_y: 60,
            flip_x: true,
          },
        },
      },
    } as unknown as Channel;

    const onNotice = vi.fn();
    const onSaved = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const t = vi.fn((key: string) => key);

    const { result } = renderHook(() =>
      useStageSaveAction({
        aspectRatio: "9:16",
        isSingleChannelMode: true,
        targetChannel,
        selectedMascotId: "mascot-3",
        activeMascot: null,
        channels: [targetChannel],
        selectedChannelIds: ["ch-3"],
        position: "bottom_right",
        scale: 2.5,
        offsetX: 70,
        offsetY: 80,
        flipHorizontal: true,
        placements: {
          "16:9": {
            position: "bottom_left",
            scale: 1.1,
            offset_x: 10,
            offset_y: 20,
            flip_x: false,
          },
          "9:16": {
            position: "bottom_right",
            scale: 2.5,
            offset_x: 70,
            offset_y: 80,
            flip_x: true,
          },
        },
        showInIntro: false,
        showInOutro: false,
        showInQuestion: true,
        onNotice,
        onSaved,
        onClose,
        t,
      }),
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(api.assignMascotToChannel).toHaveBeenCalledWith(
      "ch-3",
      expect.objectContaining({
        mascot_id: "mascot-3",
        config: expect.objectContaining({
          placements: {
            "16:9": {
              position: "bottom_left",
              scale: 1.1,
              offset_x: 10,
              offset_y: 20,
              flip_x: false,
            },
            "9:16": {
              position: "bottom_right",
              scale: 2.5,
              offset_x: 70,
              offset_y: 80,
              flip_x: true,
            },
          },
        }),
      }),
    );
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "good" }));
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

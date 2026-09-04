import { describe, expect, it } from "vitest";
import type { Channel } from "@studio/shared";
import { buildEpisodePreviewRequest } from "./buildEpisodePreviewRequest";
import type { EpisodeStyleOverride, ResolvedEpisodePreviewStyle } from "../types/episodeStylePreview.types";

const mockResolved: ResolvedEpisodePreviewStyle = {
  theme: "candy_arcade",
  paletteId: "candy_cherry",
  thinkingBarStyle: "bubble_fill",
  questionBoxStyle: "candy_pop",
  answerCardStyle: "glossy_arcade",
  counterStyle: "hanging_woodsign",
  backgroundStyle: "arcade_grid",
  totalQuestions: 5,
  channelBrandName: "Test Channel",
};

const emptyOverride: EpisodeStyleOverride = {};

describe("buildEpisodePreviewRequest Mascot Decoupling", () => {
  it("resolves decoupled 9:16 mascot placement when aspectRatio is 9:16", () => {
    const channelWithDualPlacements = {
      channel_id: "ch-1",
      display_name: "Quiz Channel",
      created_at: new Date().toISOString(),
      mascot_id: "mascot-fox",
      mascot_config: {
        enabled: true,
        position: "bottom_left",
        scale: 1.2,
        offset_x: -10,
        offset_y: 20,
        flip_x: false,
        show_in_intro: false,
        show_in_outro: false,
        show_in_question: true,
        placements: {
          "16:9": {
            position: "bottom_left",
            scale: 1.2,
            offset_x: -10,
            offset_y: 20,
            flip_x: false,
          },
          "9:16": {
            position: "bottom_right",
            scale: 0.85,
            offset_x: 45,
            offset_y: -30,
            flip_x: true,
          },
        },
      },
    } as unknown as Channel;

    const request916 = buildEpisodePreviewRequest({
      channel: channelWithDualPlacements,
      override: emptyOverride,
      resolved: mockResolved,
      aspectRatio: "9:16",
    });

    expect(request916.aspect_ratio).toBe("9:16");
    expect(request916.mascot_id).toBe("mascot-fox");
    expect(request916.mascot_enabled).toBe(true);
    expect(request916.mascot_position).toBe("bottom_right");
    expect(request916.mascot_scale).toBe(0.85);
    expect(request916.mascot_offset_x).toBe(45);
    expect(request916.mascot_offset_y).toBe(-30);
    expect(request916.mascot_flip_x).toBe(true);
  });

  it("resolves 16:9 mascot placement when aspectRatio is 16:9 or omitted", () => {
    const channelWithDualPlacements = {
      channel_id: "ch-1",
      display_name: "Quiz Channel",
      created_at: new Date().toISOString(),
      mascot_id: "mascot-fox",
      mascot_config: {
        enabled: true,
        position: "bottom_left",
        scale: 1.2,
        offset_x: -10,
        offset_y: 20,
        flip_x: false,
        show_in_intro: false,
        show_in_outro: false,
        show_in_question: true,
        placements: {
          "16:9": {
            position: "bottom_left",
            scale: 1.2,
            offset_x: -10,
            offset_y: 20,
            flip_x: false,
          },
          "9:16": {
            position: "bottom_right",
            scale: 0.85,
            offset_x: 45,
            offset_y: -30,
            flip_x: true,
          },
        },
      },
    } as unknown as Channel;

    const request169 = buildEpisodePreviewRequest({
      channel: channelWithDualPlacements,
      override: emptyOverride,
      resolved: mockResolved,
      aspectRatio: "16:9",
    });

    expect(request169.aspect_ratio).toBe("16:9");
    expect(request169.mascot_position).toBe("bottom_left");
    expect(request169.mascot_scale).toBe(1.2);
    expect(request169.mascot_offset_x).toBe(-10);
    expect(request169.mascot_offset_y).toBe(20);
    expect(request169.mascot_flip_x).toBe(false);

    // Default when omitted
    const requestDefault = buildEpisodePreviewRequest({
      channel: channelWithDualPlacements,
      override: emptyOverride,
      resolved: mockResolved,
    });
    expect(requestDefault.aspect_ratio).toBe("16:9");
    expect(requestDefault.mascot_position).toBe("bottom_left");
    expect(requestDefault.mascot_scale).toBe(1.2);
  });

  it("falls back cleanly to top-level fields for legacy configs without placements", () => {
    const legacyChannel = {
      channel_id: "ch-legacy",
      display_name: "Legacy Channel",
      created_at: new Date().toISOString(),
      mascot_id: "mascot-old",
      mascot_config: {
        enabled: true,
        position: "bottom_left",
        scale: 1.1,
        offset_x: 15,
        offset_y: 25,
        flip_x: false,
        show_in_intro: false,
        show_in_outro: false,
        show_in_question: true,
      },
    } as unknown as Channel;

    const request916 = buildEpisodePreviewRequest({
      channel: legacyChannel,
      override: emptyOverride,
      resolved: mockResolved,
      aspectRatio: "9:16",
    });

    // Mirrors 16:9 legacy config seamlessly
    expect(request916.mascot_position).toBe("bottom_left");
    expect(request916.mascot_scale).toBe(1.1);
    expect(request916.mascot_offset_x).toBe(15);
    expect(request916.mascot_offset_y).toBe(25);
  });
});

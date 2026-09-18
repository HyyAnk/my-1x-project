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
  it("always builds a landscape Episode preview request", () => {
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
      aspectRatio: "16:9",
    });

    expect(request916.aspect_ratio).toBe("16:9");
    expect(request916.mascot_id).toBe("mascot-fox");
    expect(request916.mascot_enabled).toBe(true);
    expect(request916.mascot_position).toBe("bottom_left");
    expect(request916.mascot_scale).toBe(1.2);
    expect(request916.mascot_offset_x).toBe(-10);
    expect(request916.mascot_offset_y).toBe(20);
    expect(request916.mascot_flip_x).toBe(false);
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

    const request169 = buildEpisodePreviewRequest({
      channel: legacyChannel,
      override: emptyOverride,
      resolved: mockResolved,
      aspectRatio: "16:9",
    });

    // Mirrors 16:9 legacy config seamlessly
    expect(request169.mascot_position).toBe("bottom_left");
    expect(request169.mascot_scale).toBe(1.1);
    expect(request169.mascot_offset_x).toBe(15);
    expect(request169.mascot_offset_y).toBe(25);
  });
});

describe("buildEpisodePreviewRequest Style Overrides & Visual Elements", () => {
  const mockChannel = {
    channel_id: "ch-test",
    display_name: "Trivia Studio",
    mascot_id: "none",
  } as unknown as Channel;

  it("applies background style overrides accurately for all variants", () => {
    const backgrounds = [
      "candy_rays",
      "aurora_glow",
      "comic_burst",
      "construction_blueprint",
      "cosmic_starfield",
      "floating_clouds",
    ] as const;

    for (const bg of backgrounds) {
      const request = buildEpisodePreviewRequest({
        channel: mockChannel,
        override: { backgroundStyle: bg },
        resolved: mockResolved,
      });
      expect(request.background_style).toBe(bg);
    }
  });

  it("applies question box style overrides accurately for new styles", () => {
    const boxStyles = ["hazard_stripes", "cockpit_hud", "pastel_cloud"] as const;

    for (const boxStyle of boxStyles) {
      const request = buildEpisodePreviewRequest({
        channel: mockChannel,
        override: { questionBoxStyle: boxStyle },
        resolved: mockResolved,
      });
      expect(request.question_box_style).toBe(boxStyle);
    }
  });

  it("applies answer card style overrides accurately for new styles", () => {
    const cardStyles = ["steel_beam_plate", "pastel_marshmallow"] as const;

    for (const cardStyle of cardStyles) {
      const request = buildEpisodePreviewRequest({
        channel: mockChannel,
        override: { answerCardStyle: cardStyle },
        resolved: mockResolved,
      });
      expect(request.answer_card_style).toBe(cardStyle);
    }
  });

  it("applies question counter style overrides accurately for new styles", () => {
    const counterStyles = ["space_radar", "bubble_badge"] as const;

    for (const counterStyle of counterStyles) {
      const request = buildEpisodePreviewRequest({
        channel: mockChannel,
        override: { counterStyle },
        resolved: mockResolved,
      });
      expect(request.counter_style).toBe(counterStyle);
    }
  });

  it("falls back cleanly to resolved styles when overrides are not specified", () => {
    const request = buildEpisodePreviewRequest({
      channel: mockChannel,
      override: emptyOverride,
      resolved: mockResolved,
    });
    expect(request.background_style).toBe(mockResolved.backgroundStyle);
    expect(request.question_box_style).toBe(mockResolved.questionBoxStyle);
    expect(request.answer_card_style).toBe(mockResolved.answerCardStyle);
    expect(request.counter_style).toBe(mockResolved.counterStyle);
    expect(request.thinking_bar_style).toBe(mockResolved.thinkingBarStyle);
  });

  it("passes episode_id and question_id to ensure exact variant synchronization with server render pipeline", () => {
    const mockEpisode = {
      id: "ep-999",
      channel_id: "ch-test",
      title: "Science Quiz",
    } as any;

    const mockQuestion = {
      id: "q-42",
      number: 3,
      text: "Which planet has rings?",
      choices: ["Mars", "Saturn", "Venus"],
      correctChoiceIndex: 1,
      factText: "Saturn has huge icy rings.",
      totalQuestions: 5,
      layoutId: "media_left_choices_right",
    } as any;

    const request = buildEpisodePreviewRequest({
      channel: mockChannel,
      episode: mockEpisode,
      question: mockQuestion,
      override: emptyOverride,
      resolved: mockResolved,
    });

    expect(request.episode_id).toBe("ep-999");
    expect(request.question_id).toBe("q-42");
    expect(request.question_number).toBe(3);
  });
});


import type React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChannelSchema } from "@studio/shared";
import { api } from "../../../api";
import { LanguageProvider } from "../../../i18n";
import { useSandboxChannelSync } from "./useSandboxChannelSync";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

describe("useSandboxChannelSync", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("sends Answer Card and Background defaults in the Channel update contract", async () => {
    const channel = ChannelSchema.parse({
      channel_id: "channel-1",
      slug: "quiz-channel",
      display_name: "Quiz Channel",
      channel_dna_path: "channels/quiz-channel/channel_dna.md",
      status: "ACTIVE",
      created_at: "2026-08-31T00:00:00.000Z",
      updated_at: "2026-08-31T00:00:00.000Z",
    });
    const updateChannel = vi.spyOn(api, "updateChannel").mockResolvedValue(channel);
    const design = {
      thinkingBarStyle: "energy_laser",
      questionBoxStyle: "glass_morphism",
      answerCardStyle: "glass_neon",
      counterStyle: "neon_badge",
      backgroundStyle: "aurora_glow",
      paletteId: "purple",
    } as const;
    const mascot = {
      mascotId: "",
      mascotEnabled: false,
      mascotPosition: "bottom_left",
      mascotScale: 1,
      mascotOffsetX: 0,
      mascotOffsetY: 0,
      mascotFlipX: false,
    } as const;
    const { result } = renderHook(() => useSandboxChannelSync({ channels: [channel], design, mascot }), { wrapper });

    await act(async () => result.current.handleApplyToChannel());

    expect(updateChannel).toHaveBeenCalledWith("channel-1", {
      default_thinking_bar_style: "energy_laser",
      default_question_box_style: "glass_morphism",
      default_answer_card_style: "glass_neon",
      default_counter_style: "neon_badge",
      default_background_style: "aurora_glow",
      default_palette_id: "purple",
    });
  });

  it("preserves 16:9 coordinates when syncing mascot from 9:16 sandbox viewport", async () => {
    const channel = ChannelSchema.parse({
      channel_id: "channel-1",
      slug: "quiz-channel",
      display_name: "Quiz Channel",
      channel_dna_path: "channels/quiz-channel/channel_dna.md",
      status: "ACTIVE",
      mascot_id: "mascot-fox",
      mascot_config: {
        enabled: true,
        position: "bottom_left",
        scale: 1.2,
        offset_x: 20,
        offset_y: 30,
        flip_x: true,
        placements: {
          "16:9": {
            position: "bottom_left",
            scale: 1.2,
            offset_x: 20,
            offset_y: 30,
            flip_x: true,
          },
        },
      },
      created_at: "2026-08-31T00:00:00.000Z",
      updated_at: "2026-08-31T00:00:00.000Z",
    });

    vi.spyOn(api, "updateChannel").mockResolvedValue(channel);
    const assignMascot = vi.spyOn(api, "assignMascotToChannel").mockResolvedValue({ channel });

    const design = {
      thinkingBarStyle: "energy_laser",
      questionBoxStyle: "glass_morphism",
      answerCardStyle: "glass_neon",
      counterStyle: "neon_badge",
      backgroundStyle: "aurora_glow",
      paletteId: "purple",
    } as const;

    const mascot = {
      mascotId: "mascot-fox",
      mascotEnabled: true,
      mascotPosition: "bottom_right",
      mascotScale: 0.85,
      mascotOffsetX: 0,
      mascotOffsetY: -40,
      mascotFlipX: false,
    } as const;

    const { result } = renderHook(
      () =>
        useSandboxChannelSync({
          channels: [channel],
          design,
          mascot,
          aspectRatio: "9:16",
        }),
      { wrapper },
    );

    await act(async () => result.current.handleApplyToChannel());

    expect(assignMascot).toHaveBeenCalledWith("channel-1", {
      mascot_id: "mascot-fox",
      config: {
        enabled: true,
        position: "bottom_left",
        scale: 1.2,
        offset_x: 20,
        offset_y: 30,
        flip_x: true,
        show_in_intro: false,
        show_in_outro: false,
        show_in_question: true,
        placements: {
          "16:9": {
            position: "bottom_left",
            scale: 1.2,
            offset_x: 20,
            offset_y: 30,
            flip_x: true,
          },
          "9:16": {
            position: "bottom_right",
            scale: 0.85,
            offset_x: 0,
            offset_y: -40,
            flip_x: false,
          },
        },
      },
    });
  });

  it("preserves 9:16 coordinates when syncing mascot from 16:9 sandbox viewport", async () => {
    const channel = ChannelSchema.parse({
      channel_id: "channel-1",
      slug: "quiz-channel",
      display_name: "Quiz Channel",
      channel_dna_path: "channels/quiz-channel/channel_dna.md",
      status: "ACTIVE",
      mascot_id: "mascot-fox",
      mascot_config: {
        enabled: true,
        position: "bottom_left",
        scale: 1.0,
        offset_x: 0,
        offset_y: 0,
        flip_x: false,
        placements: {
          "9:16": {
            position: "bottom_left",
            scale: 0.75,
            offset_x: 15,
            offset_y: -10,
            flip_x: true,
          },
        },
      },
      created_at: "2026-08-31T00:00:00.000Z",
      updated_at: "2026-08-31T00:00:00.000Z",
    });

    vi.spyOn(api, "updateChannel").mockResolvedValue(channel);
    const assignMascot = vi.spyOn(api, "assignMascotToChannel").mockResolvedValue({ channel });

    const design = {
      thinkingBarStyle: "energy_laser",
      questionBoxStyle: "glass_morphism",
      answerCardStyle: "glass_neon",
      counterStyle: "neon_badge",
      backgroundStyle: "aurora_glow",
      paletteId: "purple",
    } as const;

    const mascot = {
      mascotId: "mascot-fox",
      mascotEnabled: true,
      mascotPosition: "bottom_right",
      mascotScale: 1.3,
      mascotOffsetX: -30,
      mascotOffsetY: 25,
      mascotFlipX: false,
    } as const;

    const { result } = renderHook(
      () =>
        useSandboxChannelSync({
          channels: [channel],
          design,
          mascot,
          aspectRatio: "16:9",
        }),
      { wrapper },
    );

    await act(async () => result.current.handleApplyToChannel());

    expect(assignMascot).toHaveBeenCalledWith("channel-1", {
      mascot_id: "mascot-fox",
      config: {
        enabled: true,
        position: "bottom_right",
        scale: 1.3,
        offset_x: -30,
        offset_y: 25,
        flip_x: false,
        show_in_intro: false,
        show_in_outro: false,
        show_in_question: true,
        placements: {
          "16:9": {
            position: "bottom_right",
            scale: 1.3,
            offset_x: -30,
            offset_y: 25,
            flip_x: false,
          },
          "9:16": {
            position: "bottom_left",
            scale: 0.75,
            offset_x: 15,
            offset_y: -10,
            flip_x: true,
          },
        },
      },
    });
  });
});

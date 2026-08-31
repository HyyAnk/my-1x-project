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
});

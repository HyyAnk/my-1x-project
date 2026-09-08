import type React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChannelSchema } from "@studio/shared";
import { api } from "../../../api";
import { LanguageProvider } from "../../../i18n";
import { useSandboxChannelSync } from "./useSandboxChannelSync";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;
const channel = ChannelSchema.parse({
  channel_id: "channel-1",
  slug: "quiz-channel",
  display_name: "Quiz Channel",
  channel_dna_path: "channels/quiz-channel/channel_dna.md",
  status: "ACTIVE",
  mascot_id: "mascot-fox",
  created_at: "2026-08-31T00:00:00.000Z",
  updated_at: "2026-08-31T00:00:00.000Z",
});
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

describe("useSandboxChannelSync", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("updates styles and stores only the landscape mascot placement", async () => {
    const updateChannel = vi.spyOn(api, "updateChannel").mockResolvedValue(channel);
    const assignMascot = vi.spyOn(api, "assignMascotToChannel").mockResolvedValue({ channel });
    const { result } = renderHook(() => useSandboxChannelSync({ channels: [channel], design, mascot }), { wrapper });
    await act(async () => result.current.handleApplyToChannel());
    expect(updateChannel).toHaveBeenCalledWith("channel-1", expect.objectContaining({ default_palette_id: "purple" }));
    expect(assignMascot).toHaveBeenCalled();
    const callArgs = assignMascot.mock.lastCall;
    expect(callArgs?.[0]).toBe("channel-1");
    expect(callArgs?.[1]?.config?.placements).toEqual({
      "16:9": { position: "bottom_right", scale: 1.3, offset_x: -30, offset_y: 25, flip_x: false },
    });
  });
});

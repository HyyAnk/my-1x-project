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

describe("useSandboxChannelSync", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("updates styles without overwriting Stage Studio assignments", async () => {
    const updateChannel = vi.spyOn(api, "updateChannel").mockResolvedValue(channel);
    const assignMascot = vi.spyOn(api, "assignMascotToChannel").mockResolvedValue({ channel });
    const { result } = renderHook(() => useSandboxChannelSync({ channels: [channel], design }), { wrapper });
    await act(async () => result.current.handleApplyToChannel());
    expect(updateChannel).toHaveBeenCalledWith("channel-1", expect.objectContaining({ default_palette_id: "purple" }));
    expect(assignMascot).not.toHaveBeenCalled();
  });
});

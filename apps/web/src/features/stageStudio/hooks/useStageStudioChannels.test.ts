import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChannelSchema, MascotProfileSchema, RECOMMENDED_MASCOT_PLACEMENT_PRESETS, type Channel, type MascotProfile } from "@studio/shared";
import { useStageStudioChannels } from "./useStageStudioChannels";

describe("useStageStudioChannels", () => {
  const dummyChannel: Channel = ChannelSchema.parse({
    channel_id: "ch-1",
    slug: "science-channel",
    display_name: "Science Channel",
    channel_dna_path: "/dna/science",
    status: "ACTIVE",
    mascot_id: "mascot-1",
    mascot_config: {
      enabled: true,
      position: "bottom_left",
      scale: 1,
      offset_x: 0,
      offset_y: 0,
      flip_x: false,
      show_in_intro: true,
      show_in_outro: false,
      show_in_question: true,
    },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  });

  const dummyMascot: MascotProfile = MascotProfileSchema.parse({
    id: "mascot-1",
    name: "Professor Owl",
    assigned_channel_ids: ["ch-1"],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  });

  it("resolves single channel mode and target channel", () => {
    const initPlacementsMock = vi.fn();
    const setShowInIntroMock = vi.fn();
    const setShowInOutroMock = vi.fn();
    const setShowInQuestionMock = vi.fn();
    const setQuestionLayoutIdMock = vi.fn();

    const { result } = renderHook(() =>
      useStageStudioChannels({
        isOpen: true,
        singleChannelId: "ch-1",
        channels: [dummyChannel],
        allMascots: [dummyMascot],
        aspectRatio: "16:9",
        presetReady: true,
        defaultPlacements: { "16:9": RECOMMENDED_MASCOT_PLACEMENT_PRESETS["16:9"] },
        initPlacements: initPlacementsMock,
        setShowInIntro: setShowInIntroMock,
        setShowInOutro: setShowInOutroMock,
        setShowInQuestion: setShowInQuestionMock,
        setQuestionLayoutId: setQuestionLayoutIdMock,
      }),
    );

    expect(result.current.isSingleChannelMode).toBe(true);
    expect(result.current.targetChannel?.channel_id).toBe("ch-1");
    expect(result.current.activeMascot?.id).toBe("mascot-1");
  });

  it("updates selected mascot and syncs layout in single channel mode", () => {
    const initPlacementsMock = vi.fn();
    const setShowInIntroMock = vi.fn();
    const setShowInOutroMock = vi.fn();
    const setShowInQuestionMock = vi.fn();
    const setQuestionLayoutIdMock = vi.fn();

    const { result } = renderHook(() =>
      useStageStudioChannels({
        isOpen: true,
        singleChannelId: "ch-1",
        channels: [dummyChannel],
        allMascots: [dummyMascot],
        aspectRatio: "16:9",
        presetReady: true,
        defaultPlacements: { "16:9": RECOMMENDED_MASCOT_PLACEMENT_PRESETS["16:9"] },
        initPlacements: initPlacementsMock,
        setShowInIntro: setShowInIntroMock,
        setShowInOutro: setShowInOutroMock,
        setShowInQuestion: setShowInQuestionMock,
        setQuestionLayoutId: setQuestionLayoutIdMock,
      }),
    );

    act(() => {
      result.current.setSelectedMascotId("mascot-2");
    });
    expect(result.current.selectedMascotId).toBe("mascot-2");
  });
});

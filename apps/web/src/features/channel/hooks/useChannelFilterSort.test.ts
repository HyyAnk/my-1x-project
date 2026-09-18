import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Channel } from "@studio/shared";
import { useChannelFilterSort } from "./useChannelFilterSort";

afterEach(cleanup);

function createMockChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    channel_id: "ch_1",
    slug: "ch_1",
    display_name: "Channel One",
    description: "Description",
    target_audience: "Kids",
    language: "English",
    country: "GLOBAL",
    market: "",
    channel_dna_path: "channels/ch_1/channel_dna.md",
    style_guide_path: null,
    status: "ACTIVE",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    episode_count: 5,
    voice_reference_path: null,
    selected_styles: ["pixar_3d"],
    default_thinking_bar_style: "auto",
    default_question_box_style: "auto",
    default_answer_card_style: "auto",
    default_counter_style: "auto",
    default_background_style: "auto",
    default_palette_id: "auto",
    mascot_id: null,
    mascot_config: {
      enabled: true,
      position: "bottom_left",
      scale: 1.0,
      offset_x: 0,
      offset_y: 0,
      flip_x: false,
      show_in_intro: true,
      show_in_outro: true,
      show_in_question: true,
    },
    ...overrides,
  };
}

describe("useChannelFilterSort", () => {
  const channelEn = createMockChannel({
    channel_id: "ch_en",
    display_name: "English Channel",
    language: "English",
    country: "US",
    episode_count: 10,
    updated_at: "2026-01-02T00:00:00.000Z",
  });

  const channelJa = createMockChannel({
    channel_id: "ch_ja",
    display_name: "Japanese Channel",
    language: "Japanese",
    country: "JP",
    episode_count: 25,
    updated_at: "2026-01-05T00:00:00.000Z",
  });

  const channelDe = createMockChannel({
    channel_id: "ch_de",
    display_name: "German Channel",
    language: "German",
    country: "DE",
    episode_count: 2,
    updated_at: "2026-01-01T00:00:00.000Z",
  });

  const channels = [channelEn, channelJa, channelDe];

  it("computes language counts correctly across channels", () => {
    const { result } = renderHook(() =>
      useChannelFilterSort({
        channels,
        orderedChannels: channels,
        isReordering: false,
      }),
    );

    expect(result.current.languageCounts.English).toBe(1);
    expect(result.current.languageCounts.Japanese).toBe(1);
    expect(result.current.languageCounts.German).toBe(1);
  });

  it("defaults to latest sort when hasCustomOrder is false", () => {
    const { result } = renderHook(() =>
      useChannelFilterSort({
        channels,
        orderedChannels: channels,
        isReordering: false,
        hasCustomOrder: false,
      }),
    );

    expect(result.current.sortBy).toBe("latest");
    // Sorted by updated_at descending: JA (Jan 5), EN (Jan 2), DE (Jan 1)
    expect(result.current.filteredChannels.map((c) => c.channel_id)).toEqual(["ch_ja", "ch_en", "ch_de"]);
  });

  it("filters channels by language", () => {
    const { result } = renderHook(() =>
      useChannelFilterSort({
        channels,
        orderedChannels: channels,
        isReordering: false,
      }),
    );

    act(() => {
      result.current.setLanguageFilter("Japanese");
    });

    expect(result.current.filteredChannels).toHaveLength(1);
    expect(result.current.filteredChannels[0].channel_id).toBe("ch_ja");
  });

  it("sorts by episodes descending when sortBy is 'episodes'", () => {
    const { result } = renderHook(() =>
      useChannelFilterSort({
        channels,
        orderedChannels: channels,
        isReordering: false,
      }),
    );

    act(() => {
      result.current.setSortBy("episodes");
    });

    // 25 (JA), 10 (EN), 2 (DE)
    expect(result.current.filteredChannels.map((c) => c.channel_id)).toEqual(["ch_ja", "ch_en", "ch_de"]);
  });

  it("sorts by name alphabetically when sortBy is 'name'", () => {
    const { result } = renderHook(() =>
      useChannelFilterSort({
        channels,
        orderedChannels: channels,
        isReordering: false,
      }),
    );

    act(() => {
      result.current.setSortBy("name");
    });

    // English Channel, German Channel, Japanese Channel
    expect(result.current.filteredChannels.map((c) => c.channel_id)).toEqual(["ch_en", "ch_de", "ch_ja"]);
  });

  it("handles custom sort order based on orderedChannels", () => {
    const customOrdered = [channelDe, channelJa, channelEn];
    const { result } = renderHook(() =>
      useChannelFilterSort({
        channels,
        orderedChannels: customOrdered,
        isReordering: false,
        hasCustomOrder: true,
      }),
    );

    expect(result.current.sortBy).toBe("custom");
    expect(result.current.filteredChannels.map((c) => c.channel_id)).toEqual(["ch_de", "ch_ja", "ch_en"]);
  });

  it("resets filter and sets custom sort on handleStartReordering", () => {
    const onStartReordering = vi.fn();
    const { result } = renderHook(() =>
      useChannelFilterSort({
        channels,
        orderedChannels: channels,
        isReordering: false,
        onStartReordering,
      }),
    );

    act(() => {
      result.current.setLanguageFilter("German");
      result.current.setSortBy("name");
    });

    act(() => {
      result.current.handleStartReordering();
    });

    expect(result.current.languageFilter).toBe("all");
    expect(result.current.sortBy).toBe("custom");
    expect(onStartReordering).toHaveBeenCalledTimes(1);
  });

  it("shows all channels in custom order while isReordering is true, bypassing language filter", () => {
    const customOrdered = [channelDe, channelJa, channelEn];
    const { result } = renderHook(() =>
      useChannelFilterSort({
        channels,
        orderedChannels: customOrdered,
        isReordering: true,
      }),
    );

    expect(result.current.filteredChannels.map((c) => c.channel_id)).toEqual(["ch_de", "ch_ja", "ch_en"]);
  });

  it("supports positional arguments signature", () => {
    const { result } = renderHook(() => useChannelFilterSort(channels, [channelDe, channelEn, channelJa], false));

    expect(result.current.languageCounts.English).toBe(1);
    expect(result.current.filteredChannels).toHaveLength(3);
  });
});

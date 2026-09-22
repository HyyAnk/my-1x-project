import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useBrandAssetsOverview } from "./useBrandAssetsOverview";
import type { Channel, ChannelAssetsOverviewResponse } from "@studio/shared";
import { api } from "../../../api";

vi.mock("../../../api", () => ({
  api: {
    channelAssets: {
      getChannelAssets: vi.fn(),
    },
  },
}));

const mockChannel1: Channel = {
  channel_id: "ch_1",
  slug: "channel-one",
  display_name: "Channel One",
  description: "Test channel",
  target_audience: "General",
  language: "en",
  country: "US",
  market: "General",
  channel_dna_path: "channels/ch_1/dna.md",
  style_guide_path: null,
  status: "ACTIVE",
  episode_count: 0,
  voice_reference_path: null,
  selected_styles: ["flat_vector"],
  default_thinking_bar_style: "auto",
  default_question_box_style: "auto",
  default_answer_card_style: "auto",
  default_counter_style: "auto",
  default_palette_id: "auto",
  mascot_id: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
} as unknown as Channel;

const mockChannel2: Channel = {
  ...mockChannel1,
  channel_id: "ch_2",
  slug: "channel-two",
  display_name: "Channel Two",
};

const mockOverview1: ChannelAssetsOverviewResponse = {
  channel_id: "ch_1",
  channel_slug: "channel-one",
  manifest: {
    version: 1,
    updated_at: "2026-09-22T00:00:00Z",
    brand: {},
    social: {},
    art: [],
  },
  mascot: null,
};

describe("useBrandAssetsOverview", () => {
  beforeEach(() => {
    vi.mocked(api.channelAssets.getChannelAssets).mockResolvedValue(mockOverview1);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches overviews for channels and updates channelOverviews state", async () => {
    const { result } = renderHook(() =>
      useBrandAssetsOverview({ channels: [mockChannel1, mockChannel2] }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.channelOverviews["ch_1"]).toBeDefined();
    });

    expect(result.current.channelOverviews["ch_1"]?.channel_id).toBe("ch_1");
    expect(result.current.filteredChannels.length).toBe(2);
  });

  it("filters channels by search term matching display name or slug", async () => {
    const { result } = renderHook(() =>
      useBrandAssetsOverview({ channels: [mockChannel1, mockChannel2] }),
    );

    act(() => {
      result.current.setSearchTerm("Two");
    });

    expect(result.current.filteredChannels.length).toBe(1);
    expect(result.current.filteredChannels[0]?.channel_id).toBe("ch_2");

    act(() => {
      result.current.setSearchTerm("one");
    });

    expect(result.current.filteredChannels.length).toBe(1);
    expect(result.current.filteredChannels[0]?.channel_id).toBe("ch_1");
  });

  it("provides resilient fallback when api.channelAssets.getChannelAssets rejects", async () => {
    vi.mocked(api.channelAssets.getChannelAssets).mockRejectedValueOnce(new Error("Network Error"));

    const { result } = renderHook(() =>
      useBrandAssetsOverview({ channels: [mockChannel1] }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.channelOverviews["ch_1"]).toBeDefined();
    });

    const fallback = result.current.channelOverviews["ch_1"];
    expect(fallback?.channel_id).toBe("ch_1");
    expect(fallback?.manifest.version).toBe(1);
  });

  it("caches fetched overviews and clears on refresh", async () => {
    const { result } = renderHook(() =>
      useBrandAssetsOverview({ channels: [mockChannel1] }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(api.channelAssets.getChannelAssets).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(api.channelAssets.getChannelAssets).toHaveBeenCalledTimes(2);
  });

  it("orders channels by latest updated_at by default when no custom order is present", async () => {
    const olderChannel: Channel = {
      ...mockChannel1,
      channel_id: "ch_old",
      display_name: "Older Channel",
      updated_at: "2026-08-01T00:00:00Z",
    };
    const newerChannel: Channel = {
      ...mockChannel2,
      channel_id: "ch_new",
      display_name: "Newer Channel",
      updated_at: "2026-09-15T00:00:00Z",
    };

    // Passed in reverse chronological order
    const { result } = renderHook(() =>
      useBrandAssetsOverview({ channels: [olderChannel, newerChannel] }),
    );

    // Should be sorted latest first
    expect(result.current.filteredChannels[0]?.channel_id).toBe("ch_new");
    expect(result.current.filteredChannels[1]?.channel_id).toBe("ch_old");
  });

  it("orders channels by saved custom order when studio_channels_custom_order is in localStorage", async () => {
    const chA: Channel = {
      ...mockChannel1,
      channel_id: "ch_a",
      display_name: "Channel A",
      updated_at: "2026-09-10T00:00:00Z",
    };
    const chB: Channel = {
      ...mockChannel1,
      channel_id: "ch_b",
      display_name: "Channel B",
      updated_at: "2026-09-20T00:00:00Z",
    };
    const chC: Channel = {
      ...mockChannel1,
      channel_id: "ch_c",
      display_name: "Channel C",
      updated_at: "2026-09-15T00:00:00Z",
    };

    // Simulate custom order set in Channels tab
    localStorage.setItem("studio_channels_custom_order", JSON.stringify(["ch_c", "ch_a", "ch_b"]));

    try {
      const { result } = renderHook(() =>
        useBrandAssetsOverview({ channels: [chA, chB, chC] }),
      );

      expect(result.current.hasCustomOrder).toBe(true);
      expect(result.current.sortBy).toBe("custom");
      expect(result.current.filteredChannels.map((c) => c.channel_id)).toEqual(["ch_c", "ch_a", "ch_b"]);
    } finally {
      localStorage.removeItem("studio_channels_custom_order");
    }
  });

  it("supports sorting by name and episode count", async () => {
    const chA: Channel = {
      ...mockChannel1,
      channel_id: "ch_a",
      display_name: "Zeta Channel",
      episode_count: 5,
    };
    const chB: Channel = {
      ...mockChannel1,
      channel_id: "ch_b",
      display_name: "Alpha Channel",
      episode_count: 42,
    };

    const { result } = renderHook(() =>
      useBrandAssetsOverview({ channels: [chA, chB] }),
    );

    // Sort by name
    act(() => {
      result.current.setSortBy("name");
    });
    expect(result.current.filteredChannels[0]?.channel_id).toBe("ch_b");
    expect(result.current.filteredChannels[1]?.channel_id).toBe("ch_a");

    // Sort by episodes
    act(() => {
      result.current.setSortBy("episodes");
    });
    expect(result.current.filteredChannels[0]?.channel_id).toBe("ch_b");
    expect(result.current.filteredChannels[1]?.channel_id).toBe("ch_a");
  });
});

import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Channel } from "@studio/shared";
import {
  CHANNEL_ORDER_STORAGE_KEY,
  computeOrderedChannels,
  useChannelOrder,
} from "./useChannelOrder";

function createMockChannel(id: string, name: string): Channel {
  return {
    channel_id: id,
    slug: id,
    display_name: name,
    description: "",
    target_audience: "",
    language: "English",
    country: "GLOBAL",
    market: "",
    channel_dna_path: `channels/${id}/channel_dna.md`,
    style_guide_path: null,
    status: "ACTIVE",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    episode_count: 0,
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
  };
}

describe("useChannelOrder - Step 1: State & Persistence", () => {
  const ch1 = createMockChannel("ch_1", "Channel 1");
  const ch2 = createMockChannel("ch_2", "Channel 2");
  const ch3 = createMockChannel("ch_3", "Channel 3");
  const ch4 = createMockChannel("ch_4", "Channel 4 (New)");

  beforeEach(() => {
    localStorage.clear();
  });

  describe("computeOrderedChannels helper", () => {
    it("returns empty array when channels is empty", () => {
      expect(computeOrderedChannels([], ["ch_1", "ch_2"])).toEqual([]);
    });

    it("returns channels as-is when savedOrder is null or empty", () => {
      const channels = [ch1, ch2, ch3];
      expect(computeOrderedChannels(channels, null)).toEqual(channels);
      expect(computeOrderedChannels(channels, [])).toEqual(channels);
    });

    it("orders channels according to saved order", () => {
      const channels = [ch1, ch2, ch3];
      const ordered = computeOrderedChannels(channels, ["ch_3", "ch_1", "ch_2"]);
      expect(ordered.map((c) => c.channel_id)).toEqual(["ch_3", "ch_1", "ch_2"]);
    });

    it("automatically places newly created channels at the end of the list", () => {
      const channels = [ch1, ch2, ch3, ch4];
      // ch4 is newly created, not yet in savedOrder
      const savedOrder = ["ch_3", "ch_1", "ch_2"];
      const ordered = computeOrderedChannels(channels, savedOrder);

      expect(ordered.map((c) => c.channel_id)).toEqual(["ch_3", "ch_1", "ch_2", "ch_4"]);
    });

    it("safely handles deleted channels that remain in savedOrder", () => {
      const channels = [ch1, ch2]; // ch3 was deleted
      const savedOrder = ["ch_3", "ch_1", "ch_2"];
      const ordered = computeOrderedChannels(channels, savedOrder);

      expect(ordered.map((c) => c.channel_id)).toEqual(["ch_1", "ch_2"]);
    });
  });

  describe("useChannelOrder hook", () => {
    it("loads initial order from localStorage if present", () => {
      localStorage.setItem(CHANNEL_ORDER_STORAGE_KEY, JSON.stringify(["ch_2", "ch_1", "ch_3"]));

      const { result } = renderHook(() => useChannelOrder([ch1, ch2, ch3]));

      expect(result.current.orderedChannels.map((c) => c.channel_id)).toEqual(["ch_2", "ch_1", "ch_3"]);
      expect(result.current.hasCustomOrder).toBe(true);
    });

    it("returns original order when no custom order exists", () => {
      const { result } = renderHook(() => useChannelOrder([ch1, ch2, ch3]));

      expect(result.current.orderedChannels.map((c) => c.channel_id)).toEqual(["ch_1", "ch_2", "ch_3"]);
      expect(result.current.hasCustomOrder).toBe(false);
      expect(result.current.customOrderIds).toBeNull();
    });

    it("reorders a channel correctly and persists to localStorage", () => {
      const { result } = renderHook(() => useChannelOrder([ch1, ch2, ch3]));

      // Move ch1 (index 0) to index 2
      act(() => {
        result.current.reorderChannel(0, 2);
      });

      expect(result.current.orderedChannels.map((c) => c.channel_id)).toEqual(["ch_2", "ch_3", "ch_1"]);
      expect(result.current.hasCustomOrder).toBe(true);
      expect(JSON.parse(localStorage.getItem(CHANNEL_ORDER_STORAGE_KEY) || "[]")).toEqual([
        "ch_2",
        "ch_3",
        "ch_1",
      ]);
    });

    it("pins a channel to the top (index 0)", () => {
      const { result } = renderHook(() => useChannelOrder([ch1, ch2, ch3]));

      act(() => {
        result.current.pinToTop("ch_3");
      });

      expect(result.current.orderedChannels.map((c) => c.channel_id)).toEqual(["ch_3", "ch_1", "ch_2"]);
    });

    it("resets custom order and clears localStorage", () => {
      localStorage.setItem(CHANNEL_ORDER_STORAGE_KEY, JSON.stringify(["ch_3", "ch_2", "ch_1"]));
      const { result } = renderHook(() => useChannelOrder([ch1, ch2, ch3]));

      expect(result.current.hasCustomOrder).toBe(true);

      act(() => {
        result.current.resetOrder();
      });

      expect(result.current.customOrderIds).toBeNull();
      expect(result.current.hasCustomOrder).toBe(false);
      expect(localStorage.getItem(CHANNEL_ORDER_STORAGE_KEY)).toBeNull();
    });

    it("automatically appends newly added channels to the end when channels list updates", () => {
      localStorage.setItem(CHANNEL_ORDER_STORAGE_KEY, JSON.stringify(["ch_3", "ch_1"]));
      const { result, rerender } = renderHook(
        ({ channelList }) => useChannelOrder(channelList),
        {
          initialProps: { channelList: [ch1, ch3] },
        }
      );

      expect(result.current.orderedChannels.map((c) => c.channel_id)).toEqual(["ch_3", "ch_1"]);

      // Simulate new channel created (ch4)
      rerender({ channelList: [ch1, ch3, ch4] });

      expect(result.current.orderedChannels.map((c) => c.channel_id)).toEqual(["ch_3", "ch_1", "ch_4"]);
      expect(JSON.parse(localStorage.getItem(CHANNEL_ORDER_STORAGE_KEY) || "[]")).toEqual([
        "ch_3",
        "ch_1",
        "ch_4",
      ]);
    });
  });
});

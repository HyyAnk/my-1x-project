import type React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChannelsListView } from "./ChannelsListView";
import { LanguageProvider } from "../../i18n";
import type { Channel } from "@studio/shared";
import { CHANNEL_ORDER_STORAGE_KEY } from "../../features/channel/hooks/useChannelOrder";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

function createMockChannel(id: string, name: string, episodeCount = 0): Channel {
  return {
    channel_id: id,
    slug: id,
    display_name: name,
    description: "Test channel description",
    target_audience: "Kids",
    language: "English",
    country: "GLOBAL",
    market: "",
    channel_dna_path: `channels/${id}/channel_dna.md`,
    style_guide_path: null,
    status: "ACTIVE",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    episode_count: episodeCount,
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

describe("ChannelsListView - Reordering & Customization Integration", () => {
  const chA = createMockChannel("ch_a", "Alpha Channel", 5);
  const chB = createMockChannel("ch_b", "Beta Channel", 10);
  const chC = createMockChannel("ch_c", "Gamma Channel", 2);

  beforeEach(() => {
    localStorage.clear();
  });

  it("renders channel cards and allows entering reorder mode", () => {
    const openChannel = vi.fn();
    const onCreate = vi.fn();
    const onDelete = vi.fn();

    const { container } = render(
      <ChannelsListView
        channels={[chA, chB, chC]}
        onCreate={onCreate}
        openChannel={openChannel}
        onDelete={onDelete}
      />,
      { wrapper }
    );

    expect(screen.getByText("Alpha Channel")).toBeDefined();
    expect(screen.getByText("Beta Channel")).toBeDefined();
    expect(screen.getByText("Gamma Channel")).toBeDefined();

    // Click Reorder button (supports en/vi regex)
    const reorderBtn = screen.getByRole("button", { name: /reorder|sắp xếp/i });
    fireEvent.click(reorderBtn);

    // Active reorder banner should now appear
    expect(screen.getByText(/reordering mode|chế độ sắp xếp/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /done|hoàn tất/i })).toBeDefined();

    // In reorder mode, cards have role="listitem" and clicking does NOT trigger openChannel navigation
    const alphaCard = container.querySelector(".channel-card");
    if (alphaCard) fireEvent.click(alphaCard);
    expect(openChannel).not.toHaveBeenCalled();

    // Click Done button
    const doneBtn = screen.getByRole("button", { name: /done|hoàn tất/i });
    fireEvent.click(doneBtn);

    // Banner should disappear and normal navigation restored
    expect(screen.queryByText(/reordering mode|chế độ sắp xếp/i)).toBeNull();
    if (alphaCard) fireEvent.click(alphaCard);
    expect(openChannel).toHaveBeenCalledWith("ch_a");
  });

  it("places newly created channels at the end of the custom order", () => {
    // Preload custom order with Beta first, then Alpha
    localStorage.setItem(CHANNEL_ORDER_STORAGE_KEY, JSON.stringify(["ch_b", "ch_a"]));

    const chNew = createMockChannel("ch_new", "Omega New Channel", 0);

    const { container, rerender } = render(
      <ChannelsListView
        channels={[chA, chB]}
        onCreate={vi.fn()}
        openChannel={vi.fn()}
        onDelete={vi.fn()}
      />,
      { wrapper }
    );

    // Now re-render with the new channel added
    rerender(
      <ChannelsListView
        channels={[chA, chB, chNew]}
        onCreate={vi.fn()}
        openChannel={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const cards = Array.from(container.querySelectorAll(".channel-card"));
    expect(cards).toHaveLength(3);

    // First should be Beta, second Alpha, third Omega New Channel
    expect(cards[0].textContent).toContain("Beta Channel");
    expect(cards[1].textContent).toContain("Alpha Channel");
    expect(cards[2].textContent).toContain("Omega New Channel");
  });
});

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { BrandAssetsOverview } from "./BrandAssetsOverview";
import type { Channel, ChannelAssetsOverviewResponse } from "@studio/shared";
import { api } from "../../api";

vi.mock("../../api", () => ({
  api: {
    channelAssets: {
      getChannelAssets: vi.fn(),
    },
  },
}));

const mockChannelAlpha: Channel = {
  channel_id: "ch_alpha",
  slug: "alpha-channel",
  display_name: "Alpha Channel",
  description: "Alpha test channel",
  target_audience: "General",
  language: "en",
  country: "US",
  market: "General",
  channel_dna_path: "channels/ch_alpha/dna.md",
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

const mockChannelBeta: Channel = {
  ...mockChannelAlpha,
  channel_id: "ch_beta",
  slug: "beta-channel",
  display_name: "Beta Explorers",
};

const mockOverview: ChannelAssetsOverviewResponse = {
  channel_id: "ch_alpha",
  channel_slug: "alpha-channel",
  manifest: {
    version: 1,
    updated_at: "2026-09-22T00:00:00Z",
    brand: {},
    social: {},
    art: [],
  },
  mascot: null,
};

describe("BrandAssetsOverview", () => {
  beforeEach(() => {
    vi.mocked(api.channelAssets.getChannelAssets).mockResolvedValue(mockOverview);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders header eyebrow, title, subtitle, and channel count", async () => {
    render(
      <BrandAssetsOverview
        channels={[mockChannelAlpha, mockChannelBeta]}
        onSelectChannel={vi.fn()}
      />,
    );

    expect(screen.getByText("Studio Workspace")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Brand & Social Asset Hub/i })).toBeTruthy();
    expect(
      screen.getByText(/Select a channel to manage its brand identity, social design assets, and art media./i),
    ).toBeTruthy();
    expect(screen.getByTestId("channel-count-badge").textContent).toContain("2 of 2 channels");
  });

  it("renders channel cards for all available channels", async () => {
    render(
      <BrandAssetsOverview
        channels={[mockChannelAlpha, mockChannelBeta]}
        onSelectChannel={vi.fn()}
      />,
    );

    expect(screen.getByText("Alpha Channel")).toBeTruthy();
    expect(screen.getByText("Beta Explorers")).toBeTruthy();
    expect(screen.getByText("@alpha-channel")).toBeTruthy();
    expect(screen.getByText("@beta-channel")).toBeTruthy();
  });

  it("filters channels by search term matching display name", async () => {
    render(
      <BrandAssetsOverview
        channels={[mockChannelAlpha, mockChannelBeta]}
        onSelectChannel={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Search channels by name or slug/i);
    fireEvent.change(searchInput, { target: { value: "Beta" } });

    expect(screen.queryByText("Alpha Channel")).toBeNull();
    expect(screen.getByText("Beta Explorers")).toBeTruthy();
    expect(screen.getByTestId("channel-count-badge").textContent).toContain("1 of 2 channels");
  });

  it("filters channels by search term matching slug", async () => {
    render(
      <BrandAssetsOverview
        channels={[mockChannelAlpha, mockChannelBeta]}
        onSelectChannel={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Search channels by name or slug/i);
    fireEvent.change(searchInput, { target: { value: "alpha-" } });

    expect(screen.getByText("Alpha Channel")).toBeTruthy();
    expect(screen.queryByText("Beta Explorers")).toBeNull();
  });

  it("invokes onSelectChannel when clicking Manage Assets on a card", async () => {
    const handleSelect = vi.fn();
    render(
      <BrandAssetsOverview
        channels={[mockChannelAlpha, mockChannelBeta]}
        onSelectChannel={handleSelect}
      />,
    );

    const manageBtn = screen.getByRole("button", { name: /Manage assets for Alpha Channel/i });
    fireEvent.click(manageBtn);

    expect(handleSelect).toHaveBeenCalledWith("ch_alpha");
  });

  it("displays empty state when no channels exist in workspace", () => {
    render(<BrandAssetsOverview channels={[]} onSelectChannel={vi.fn()} />);

    expect(screen.getByTestId("empty-channels")).toBeTruthy();
    expect(screen.getByText(/No Channels in Workspace/i)).toBeTruthy();
  });

  it("displays search empty state and restores list when clearing search", async () => {
    render(
      <BrandAssetsOverview
        channels={[mockChannelAlpha, mockChannelBeta]}
        onSelectChannel={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Search channels by name or slug/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent-channel" } });

    expect(screen.getByTestId("empty-search")).toBeTruthy();
    expect(screen.getByText(/No channels match the search query "nonexistent-channel"/i)).toBeTruthy();

    const clearButton = screen.getByRole("button", { name: "Clear Search" });
    fireEvent.click(clearButton);

    expect(screen.getByText("Alpha Channel")).toBeTruthy();
    expect(screen.getByText("Beta Explorers")).toBeTruthy();
  });

  it("renders sort selector and reorders channel cards when changing sort option", async () => {
    const channel1: Channel = {
      ...mockChannelAlpha,
      channel_id: "ch_1",
      display_name: "Alpha Channel",
      updated_at: "2026-09-01T00:00:00Z",
    };
    const channel2: Channel = {
      ...mockChannelBeta,
      channel_id: "ch_2",
      display_name: "Zeta Channel",
      updated_at: "2026-09-10T00:00:00Z",
    };

    render(
      <BrandAssetsOverview
        channels={[channel1, channel2]}
        onSelectChannel={vi.fn()}
      />,
    );

    const sortSelect = screen.getByTestId("brand-assets-sort-select") as HTMLSelectElement;
    expect(sortSelect).toBeTruthy();

    // Default is "latest": channel2 (Sept 10, Zeta) comes before channel1 (Sept 1, Alpha)
    const cardsBefore = screen.getAllByRole("article");
    expect(cardsBefore[0].textContent).toContain("Zeta Channel");
    expect(cardsBefore[1].textContent).toContain("Alpha Channel");

    // Change sort to "Name A-Z": Alpha Channel must now come before Zeta Channel
    fireEvent.change(sortSelect, { target: { value: "name" } });

    const cardsAfter = screen.getAllByRole("article");
    expect(cardsAfter[0].textContent).toContain("Alpha Channel");
    expect(cardsAfter[1].textContent).toContain("Zeta Channel");
  });

  it("reflects custom channel order from localStorage matching Channels tab", () => {
    const channel1: Channel = {
      ...mockChannelAlpha,
      channel_id: "ch_1",
      display_name: "First Channel",
      updated_at: "2026-09-10T00:00:00Z",
    };
    const channel2: Channel = {
      ...mockChannelBeta,
      channel_id: "ch_2",
      display_name: "Second Channel",
      updated_at: "2026-09-01T00:00:00Z",
    };

    localStorage.setItem("studio_channels_custom_order", JSON.stringify(["ch_2", "ch_1"]));

    try {
      render(
        <BrandAssetsOverview
          channels={[channel1, channel2]}
          onSelectChannel={vi.fn()}
        />,
      );

      const sortSelect = screen.getByTestId("brand-assets-sort-select") as HTMLSelectElement;
      expect(sortSelect.value).toBe("custom");

      const cards = screen.getAllByRole("article");
      expect(cards[0].textContent).toContain("Second Channel");
      expect(cards[1].textContent).toContain("First Channel");
    } finally {
      localStorage.removeItem("studio_channels_custom_order");
    }
  });
});

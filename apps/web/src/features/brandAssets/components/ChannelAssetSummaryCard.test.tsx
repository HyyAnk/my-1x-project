import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ChannelAssetSummaryCard } from "./ChannelAssetSummaryCard";
import type { Channel, ChannelAssetsOverviewResponse } from "@studio/shared";

const mockChannel: Channel = {
  channel_id: "ch_test_1",
  slug: "test-channel",
  display_name: "Test Channel",
  description: "Test channel description",
  target_audience: "General",
  language: "en",
  country: "US",
  market: "General",
  channel_dna_path: "channels/ch_test_1/dna.md",
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

const mockConfiguredOverview: ChannelAssetsOverviewResponse = {
  channel_id: "ch_test_1",
  channel_slug: "test-channel",
  manifest: {
    version: 1,
    updated_at: "2026-09-22T00:00:00Z",
    brand: {
      logo: {
        id: "logo_1",
        filename: "logo.png",
        relative_path: "brand/logo.png",
        url: "/assets/brand/logo.png",
        mime_type: "image/png",
        size_bytes: 12345,
        width: 512,
        height: 512,
        created_at: "2026-09-22T00:00:00Z",
        updated_at: "2026-09-22T00:00:00Z",
      },
    },
    social: {
      youtube: {
        avatar: {
          id: "yt_av",
          filename: "yt_av.png",
          relative_path: "social/youtube/avatar.png",
          mime_type: "image/png",
          size_bytes: 5000,
          width: 800,
          height: 800,
          created_at: "2026-09-22T00:00:00Z",
          updated_at: "2026-09-22T00:00:00Z",
        },
        banner: {
          id: "yt_bn",
          filename: "yt_bn.png",
          relative_path: "social/youtube/banner.png",
          mime_type: "image/png",
          size_bytes: 20000,
          width: 2560,
          height: 1440,
          created_at: "2026-09-22T00:00:00Z",
          updated_at: "2026-09-22T00:00:00Z",
        },
      },
      x: {
        avatar: {
          id: "x_av",
          filename: "x_av.png",
          relative_path: "social/x/avatar.png",
          mime_type: "image/png",
          size_bytes: 4000,
          width: 400,
          height: 400,
          created_at: "2026-09-22T00:00:00Z",
          updated_at: "2026-09-22T00:00:00Z",
        },
      },
      facebook: {},
      tiktok: {},
    },
    art: [
      {
        id: "art_1",
        filename: "art1.png",
        relative_path: "art/art1.png",
        mime_type: "image/png",
        size_bytes: 15000,
        width: 1080,
        height: 1080,
        tags: ["promo"],
        created_at: "2026-09-22T00:00:00Z",
        updated_at: "2026-09-22T00:00:00Z",
      },
      {
        id: "art_2",
        filename: "art2.png",
        relative_path: "art/art2.png",
        mime_type: "image/png",
        size_bytes: 18000,
        width: 1080,
        height: 1080,
        tags: ["banner"],
        created_at: "2026-09-22T00:00:00Z",
        updated_at: "2026-09-22T00:00:00Z",
      },
    ],
  },
  mascot: {
    mascot_id: "m_owl",
    name: "Professor Owl",
    master_image_url: "/mascots/owl/master.png",
  },
};

describe("ChannelAssetSummaryCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders channel display name, slug, and brand logo image when present", () => {
    const onSelect = vi.fn();
    render(
      <ChannelAssetSummaryCard
        channel={mockChannel}
        overview={mockConfiguredOverview}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("Test Channel")).toBeTruthy();
    expect(screen.getByText("@test-channel")).toBeTruthy();
    const logoImg = screen.getByAltText("Test Channel logo");
    expect(logoImg.getAttribute("src")).toBe("/assets/brand/logo.png");
  });

  it("renders fallback initial avatar when logo is missing", () => {
    const onSelect = vi.fn();
    render(
      <ChannelAssetSummaryCard
        channel={mockChannel}
        overview={null}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("T")).toBeTruthy();
    expect(screen.queryByAltText("Test Channel logo")).toBeNull();
  });

  it("renders linked mascot indicator with master concept thumbnail and name", () => {
    const onSelect = vi.fn();
    render(
      <ChannelAssetSummaryCard
        channel={mockChannel}
        overview={mockConfiguredOverview}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByTestId("mascot-indicator-assigned")).toBeTruthy();
    expect(screen.getByText(/Mascot: Professor Owl/i)).toBeTruthy();
    const thumb = screen.getByAltText("Professor Owl Master Concept");
    expect(thumb.getAttribute("src")).toBe("/mascots/owl/master.png");
  });

  it("renders unassigned mascot badge when no mascot is linked", () => {
    const onSelect = vi.fn();
    render(
      <ChannelAssetSummaryCard
        channel={mockChannel}
        overview={{ ...mockConfiguredOverview, mascot: null }}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByTestId("mascot-indicator-unassigned")).toBeTruthy();
    expect(screen.getByText(/No Mascot Assigned/i)).toBeTruthy();
  });

  it("renders category status pills correctly for configured, incomplete, and missing states", () => {
    const onSelect = vi.fn();
    render(
      <ChannelAssetSummaryCard
        channel={mockChannel}
        overview={mockConfiguredOverview}
        onSelect={onSelect}
      />,
    );

    // Brand Logo is configured
    expect(screen.getByTestId("pill-brand-logo").textContent).toContain("Logo: Configured");
    // YouTube has both avatar + banner -> Configured
    expect(screen.getByTestId("pill-youtube-kit").textContent).toContain("YouTube: Configured");
    // X has only avatar -> Incomplete
    expect(screen.getByTestId("pill-x-kit").textContent).toContain("X: Incomplete");
    // Art has 2 items
    expect(screen.getByTestId("pill-social-art").textContent).toContain("Art: 2");
  });

  it("triggers onSelect on card click and Manage Assets button click", () => {
    const onSelect = vi.fn();
    render(
      <ChannelAssetSummaryCard
        channel={mockChannel}
        overview={mockConfiguredOverview}
        onSelect={onSelect}
      />,
    );

    const button = screen.getByRole("button", { name: /Manage assets for Test Channel/i });
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith("ch_test_1");

    const card = screen.getByTestId("channel-asset-card-ch_test_1");
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("triggers onSelect on Enter or Space key press for accessibility", () => {
    const onSelect = vi.fn();
    render(
      <ChannelAssetSummaryCard
        channel={mockChannel}
        overview={mockConfiguredOverview}
        onSelect={onSelect}
      />,
    );

    const card = screen.getByTestId("channel-asset-card-ch_test_1");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("ch_test_1");

    fireEvent.keyDown(card, { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});

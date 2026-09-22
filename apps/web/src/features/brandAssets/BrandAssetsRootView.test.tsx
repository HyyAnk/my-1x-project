import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BrandAssetsRootView } from "./BrandAssetsRootView";
import type { Channel, ChannelAssetsOverviewResponse } from "@studio/shared";
import { api } from "../../api";

vi.mock("../../api", () => ({
  api: {
    channelAssets: {
      getChannelAssets: vi.fn(),
      uploadBrandLogo: vi.fn(),
      deleteBrandLogo: vi.fn(),
      uploadSocialAsset: vi.fn(),
      deleteSocialAsset: vi.fn(),
      uploadSocialArt: vi.fn(),
      deleteSocialArt: vi.fn(),
      getExportZipUrl: vi.fn().mockReturnValue("/api/channels/ch_alpha/assets/export-zip"),
    },
  },
}));

const mockChannel1: Channel = {
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

const mockChannel2: Channel = {
  ...mockChannel1,
  channel_id: "ch_beta",
  slug: "beta-channel",
  display_name: "Beta Channel",
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

describe("BrandAssetsRootView", () => {
  beforeEach(() => {
    vi.mocked(api.channelAssets.getChannelAssets).mockResolvedValue(mockOverview);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders Level 1 overview when no channel is selected", () => {
    render(
      <BrandAssetsRootView
        channels={[mockChannel1, mockChannel2]}
        selectedChannel={null}
      />,
    );

    expect(screen.getByTestId("brand-assets-overview")).toBeTruthy();
    expect(screen.getByText("Alpha Channel")).toBeTruthy();
    expect(screen.getByText("Beta Channel")).toBeTruthy();
    expect(screen.queryByTestId("active-channel-indicator")).toBeNull();
  });

  it("calls onSelectChannel when user selects a channel from Level 1 overview", () => {
    const handleSelectChannel = vi.fn();
    render(
      <BrandAssetsRootView
        channels={[mockChannel1, mockChannel2]}
        selectedChannel={null}
        onSelectChannel={handleSelectChannel}
      />,
    );

    const manageBtn = screen.getByRole("button", { name: /Manage assets for Alpha Channel/i });
    fireEvent.click(manageBtn);
    expect(handleSelectChannel).toHaveBeenCalledWith("ch_alpha");
  });

  it("renders Level 2 channel workspace with breadcrumbs and active channel indicator when channel is selected", () => {
    render(
      <BrandAssetsRootView
        channels={[mockChannel1, mockChannel2]}
        selectedChannel={mockChannel1}
      />,
    );

    expect(screen.getByText("Brand & Social Asset Hub")).toBeTruthy();
    expect(screen.getByTestId("active-channel-indicator")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Back to Channels/i })).toBeTruthy();
    expect(screen.getByTestId("active-channel-indicator").textContent).toContain("Alpha Channel");
    expect(screen.getByLabelText("Breadcrumb navigation").textContent).toContain("Alpha Channel");
  });

  it("calls onBackToOverview when user clicks Back to Channels button", () => {
    const handleBack = vi.fn();
    render(
      <BrandAssetsRootView
        channels={[mockChannel1]}
        selectedChannel={mockChannel1}
        onBackToOverview={handleBack}
      />,
    );

    const backBtn = screen.getByRole("button", { name: /Back to Channels/i });
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalled();
  });

  it("triggers onTabChange when clicking navigation tabs in Level 2 workspace", () => {
    const handleTabChange = vi.fn();
    render(
      <BrandAssetsRootView
        channels={[mockChannel1]}
        selectedChannel={mockChannel1}
        activeTab="brand"
        onTabChange={handleTabChange}
      />,
    );

    const socialTab = screen.getByRole("button", { name: /Social Media Kits/i });
    fireEvent.click(socialTab);
    expect(handleTabChange).toHaveBeenCalledWith("social");

    const artTab = screen.getByRole("button", { name: /Art Gallery/i });
    fireEvent.click(artTab);
    expect(handleTabChange).toHaveBeenCalledWith("art");
  });

  it("renders BrandIdentitySection when activeTab is brand", () => {
    render(
      <BrandAssetsRootView
        channels={[mockChannel1]}
        selectedChannel={mockChannel1}
        activeTab="brand"
      />,
    );

    expect(screen.getByTestId("brand-identity-section")).toBeTruthy();
  });

  it("renders SocialDesignSection when activeTab is social", () => {
    render(
      <BrandAssetsRootView
        channels={[mockChannel1]}
        selectedChannel={mockChannel1}
        activeTab="social"
      />,
    );

    expect(screen.getByTestId("social-design-section")).toBeTruthy();
  });

  it("renders SocialArtSection when activeTab is art", () => {
    render(
      <BrandAssetsRootView
        channels={[mockChannel1]}
        selectedChannel={mockChannel1}
        activeTab="art"
      />,
    );

    expect(screen.getByTestId("social-art-section")).toBeTruthy();
    expect(screen.getByText("Social Art & Auxiliary Media")).toBeTruthy();
  });

  it("triggers exportBrandKit when clicking Export Brand Kit button in topbar", () => {
    const onNotice = vi.fn();
    render(
      <BrandAssetsRootView
        channels={[mockChannel1]}
        selectedChannel={mockChannel1}
        onNotice={onNotice}
      />,
    );

    const exportBtn = screen.getByTestId("export-brand-kit-btn");
    expect(exportBtn).toBeTruthy();
    fireEvent.click(exportBtn);

    expect(api.channelAssets.getExportZipUrl).toHaveBeenCalledWith("ch_alpha");
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: "Brand kit export initiated.",
    });
  });

  it("allows switching channels via quick switch buttons in Level 2 workspace", () => {
    const handleSelectChannel = vi.fn();
    render(
      <BrandAssetsRootView
        channels={[mockChannel1, mockChannel2]}
        selectedChannel={mockChannel1}
        onSelectChannel={handleSelectChannel}
      />,
    );

    const betaButton = screen.getByRole("button", { name: "Beta Channel" });
    fireEvent.click(betaButton);
    expect(handleSelectChannel).toHaveBeenCalledWith("ch_beta");
  });

  it("handles empty channels gracefully in Level 1 overview", () => {
    render(<BrandAssetsRootView channels={[]} selectedChannel={null} />);

    expect(screen.getByTestId("empty-channels")).toBeTruthy();
    expect(screen.getByText(/No Channels in Workspace/i)).toBeTruthy();
    expect(screen.queryByTestId("active-channel-indicator")).toBeNull();
  });
});

import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, renderHook, act, fireEvent } from "@testing-library/react";
import { createMockChannel, createMockShortReel } from "../../../test/helpers/shortReelFixture";
import { ChannelDetail } from "./ChannelDetail";
import { useChannelDetail } from "./hooks/useChannelDetail";
import { api } from "../../api";
import { LanguageProvider } from "../../i18n";

const renderWithProviders = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

vi.mock("../../api", () => ({
  api: {
    dna: vi.fn(),
    topics: vi.fn(),
    episodes: vi.fn(),
    listShortReels: vi.fn(),
    mascots: vi.fn(),
    listIntroOutroStyles: vi.fn(),
    deleteShortReel: vi.fn(),
  },
}));

const mockRefresh = vi.fn();
vi.mock("./hooks/useTopicAvailability", () => ({
  useTopicAvailability: () => ({
    availability: null,
    availabilityMap: new Map(),
    loading: false,
    error: null,
    refresh: mockRefresh,
  }),
}));

describe("ChannelDetail Short-Reels Integration", () => {
  beforeEach(() => {
    vi.mocked(api.dna).mockResolvedValue({ content: "Sample DNA", path: "dna.md", modified_at: new Date().toISOString() });
    vi.mocked(api.topics).mockResolvedValue({ topics: [], latest_run: null });
    vi.mocked(api.episodes).mockResolvedValue({ episodes: [] });
    vi.mocked(api.listShortReels).mockResolvedValue({ short_reels: [] });
    vi.mocked(api.mascots).mockResolvedValue({ mascots: [] });
    vi.mocked(api.listIntroOutroStyles).mockResolvedValue({ styles: [] });
    vi.mocked(api.deleteShortReel).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders Short-Reels tab button with badge count and empty state placeholder", async () => {
    const channel = createMockChannel();
    vi.mocked(api.listShortReels).mockResolvedValueOnce({ short_reels: [] });

    renderWithProviders(
      <ChannelDetail
        channel={channel}
        channels={[channel]}
        tasks={[]}
        activeTab="short-reels"
        onTabChange={vi.fn()}
        onTaskSubmitted={vi.fn()}
        onRefresh={vi.fn()}
        onNotice={vi.fn()}
        onDelete={vi.fn()}
        openEpisode={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Short-Reels/i })).toBeTruthy();
    });

    const shortReelTab = screen.getByRole("tab", { name: /Short-Reels/i });
    expect(shortReelTab.getAttribute("aria-selected")).toBe("true");
    expect(shortReelTab.textContent).toContain("0");

    expect(screen.getByTestId("channel-short-reels-tab")).toBeTruthy();
    expect(screen.getByText(/No short-reels confirmed yet/i)).toBeTruthy();
  });

  it("loads and displays the correct count when Short-Reels exist", async () => {
    const channel = createMockChannel();
    const mockReel = createMockShortReel();
    vi.mocked(api.listShortReels).mockResolvedValue({ short_reels: [mockReel] });

    renderWithProviders(
      <ChannelDetail
        channel={channel}
        channels={[channel]}
        tasks={[]}
        activeTab="short-reels"
        onTabChange={vi.fn()}
        onTaskSubmitted={vi.fn()}
        onRefresh={vi.fn()}
        onNotice={vi.fn()}
        onDelete={vi.fn()}
        openEpisode={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      const shortReelTab = screen.getByRole("tab", { name: /Short-Reels/i });
      expect(shortReelTab.textContent).toContain("1");
    });

    expect(screen.getByRole("heading", { name: /Confirmed Short-Reels \(9:16\)/i })).toBeTruthy();
    expect(screen.getByTestId("short-reel-card-sreel_test_999")).toBeTruthy();
    expect(screen.getByText("Cheetah vs Greyhound Speed")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open Studio for Cheetah vs Greyhound Speed/i })).toBeTruthy();
  });

  it("useChannelDetail hook tracks shortReels and handleShortReelDeleted removes deleted reel", async () => {
    const channel = createMockChannel();
    const mockReel = createMockShortReel({ reel_id: "sreel_del_123" });
    vi.mocked(api.listShortReels).mockResolvedValue({ short_reels: [mockReel] });
    const onNotice = vi.fn();
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(
      () =>
        useChannelDetail({
          channel,
          tasks: [],
          onNotice,
          onRefresh,
          onTaskSubmitted: vi.fn(),
        }),
      {
        wrapper: ({ children }) => <LanguageProvider>{children}</LanguageProvider>,
      },
    );

    await waitFor(() => {
      expect(result.current.shortReels.length).toBe(1);
    });

    expect(result.current.shortReels[0].reel_id).toBe("sreel_del_123");

    await act(async () => {
      await result.current.handleShortReelDeleted(mockReel);
    });

    expect(result.current.shortReels.length).toBe(0);
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: expect.stringContaining("Short-Reel deleted"),
    });
    expect(onRefresh).toHaveBeenCalled();
  });

  it("opens DeleteShortReelModal when delete is clicked and completes deletion", async () => {
    const channel = createMockChannel();
    const mockReel = createMockShortReel();
    vi.mocked(api.listShortReels).mockResolvedValue({ short_reels: [mockReel] });
    vi.mocked(api.deleteShortReel).mockResolvedValue({ success: true });
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    renderWithProviders(
      <ChannelDetail
        channel={channel}
        channels={[channel]}
        tasks={[]}
        activeTab="short-reels"
        onTabChange={vi.fn()}
        onTaskSubmitted={vi.fn()}
        onRefresh={onRefresh}
        onNotice={vi.fn()}
        onDelete={vi.fn()}
        openEpisode={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("short-reel-card-sreel_test_999")).toBeTruthy();
    });

    // Click delete icon button on card
    const deleteBtn = screen.getByRole("button", { name: /Delete Short-Reel Cheetah vs Greyhound Speed/i });
    fireEvent.click(deleteBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Delete Short-Reel" })).toBeTruthy();
    });

    // Click confirm delete in modal
    const confirmDeleteBtn = screen.getByRole("button", { name: "Delete Short-Reel" });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(api.deleteShortReel).toHaveBeenCalledWith(channel.channel_id, mockReel.reel_id);
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});

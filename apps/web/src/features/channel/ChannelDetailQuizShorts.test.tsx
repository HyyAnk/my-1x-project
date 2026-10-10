import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { TopicCandidate } from "@studio/shared";
import { createMockChannel } from "../../../test/helpers/shortReelFixture";
import { createMockQuizShort } from "../../../test/helpers/quizShortFixture";
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
    listQuizShorts: vi.fn(),
    mascots: vi.fn(),
    listIntroOutroStyles: vi.fn(),
    deleteQuizShort: vi.fn(),
    confirmTopic: vi.fn(),
  },
}));

const mockAvailabilityRefresh = vi.fn();
vi.mock("./hooks/useTopicAvailability", () => ({
  useTopicAvailability: () => ({
    availability: null,
    availabilityMap: new Map(),
    loading: false,
    error: null,
    refresh: mockAvailabilityRefresh,
  }),
}));

function renderChannelDetail(activeTab: string, overrides: Partial<React.ComponentProps<typeof ChannelDetail>> = {}) {
  const channel = createMockChannel();
  return renderWithProviders(
    <ChannelDetail
      channel={channel}
      channels={[channel]}
      tasks={[]}
      activeTab={activeTab}
      onTabChange={vi.fn()}
      onTaskSubmitted={vi.fn()}
      onRefresh={vi.fn()}
      onNotice={vi.fn()}
      onDelete={vi.fn()}
      openEpisode={vi.fn()}
      onBack={vi.fn()}
      {...overrides}
    />,
  );
}

describe("ChannelDetail Quiz Shorts integration", () => {
  beforeEach(() => {
    vi.mocked(api.dna).mockResolvedValue({ content: "Sample DNA", path: "dna.md", modified_at: new Date().toISOString() });
    vi.mocked(api.topics).mockResolvedValue({ topics: [], latest_run: null });
    vi.mocked(api.episodes).mockResolvedValue({ episodes: [] });
    vi.mocked(api.listShortReels).mockResolvedValue({ short_reels: [] });
    vi.mocked(api.listQuizShorts).mockResolvedValue({ quiz_shorts: [] });
    vi.mocked(api.mascots).mockResolvedValue({ mascots: [] });
    vi.mocked(api.listIntroOutroStyles).mockResolvedValue({ styles: [] });
    vi.mocked(api.deleteQuizShort).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("orders the tabs Episodes, Quiz Shorts, Short-Reels, Topics, DNA, Intro & Outro", async () => {
    renderChannelDetail("quiz-shorts", { simplifyMode: false });
    await waitFor(() => expect(screen.getByRole("tab", { name: /Quiz Shorts/i })).toBeTruthy());
    const labels = screen.getAllByRole("tab").map((tab) => tab.textContent?.replace(/\d+$/, "").trim());
    expect(labels).toEqual(["Episodes", "Quiz Shorts", "Short-Reels", "Idea Lab & Topics", "Channel DNA & Identity", "Intro & Outro"]);
    expect(screen.getByRole("tab", { name: /Quiz Shorts/i }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("channel-quiz-shorts-tab")).toBeTruthy();
    expect(screen.getByText(/No quiz shorts confirmed yet/i)).toBeTruthy();
  });

  it("lists quiz shorts with count, stage and an open link", async () => {
    const quizShort = createMockQuizShort();
    vi.mocked(api.listQuizShorts).mockResolvedValue({ quiz_shorts: [quizShort] });
    const openQuizShort = vi.fn();
    renderChannelDetail("quiz-shorts", { openQuizShort });

    await waitFor(() => expect(screen.getByRole("tab", { name: /Quiz Shorts/i }).textContent).toContain("1"));
    expect(screen.getByRole("heading", { name: /Confirmed Quiz Shorts \(9:16\)/i })).toBeTruthy();
    expect(screen.getByTestId("quiz-short-card-qshort_test_001")).toBeTruthy();
    expect(screen.getByText("Ocean Giants")).toBeTruthy();
    expect(screen.getByTestId("quiz-short-stage").textContent).toBe("Scene ready");
    expect(screen.getByText("5 questions")).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: /Open Quiz Short Ocean Giants/i }));
    expect(openQuizShort).toHaveBeenCalledWith("channel-test-123", "qshort_test_001");
  });

  it("deletes a quiz short through the confirm modal", async () => {
    const quizShort = createMockQuizShort();
    vi.mocked(api.listQuizShorts).mockResolvedValue({ quiz_shorts: [quizShort] });
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderChannelDetail("quiz-shorts", { onRefresh });

    await waitFor(() => expect(screen.getByTestId("quiz-short-card-qshort_test_001")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Delete Quiz Short Ocean Giants/i }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Delete Quiz Short" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Delete Quiz Short" }));

    await waitFor(() => {
      expect(api.deleteQuizShort).toHaveBeenCalledWith("channel-test-123", "qshort_test_001");
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(screen.queryByTestId("quiz-short-card-qshort_test_001")).toBeNull();
  });

  it("navigates to the new workspace after confirming a quiz_short topic", async () => {
    const channel = createMockChannel();
    const quizShort = createMockQuizShort();
    vi.mocked(api.confirmTopic).mockResolvedValue({ content_kind: "quiz_short", quiz_short: quizShort, task: null });
    const onSelectQuizShort = vi.fn();
    const onTaskSubmitted = vi.fn();
    const onNotice = vi.fn();

    const { result } = renderHook(
      () =>
        useChannelDetail({
          channel,
          tasks: [],
          onNotice,
          onRefresh: vi.fn().mockResolvedValue(undefined),
          onTaskSubmitted,
          onSelectQuizShort,
        }),
      { wrapper: ({ children }) => <LanguageProvider>{children}</LanguageProvider> },
    );
    await waitFor(() => expect(result.current.loadingChannel).toBe(false));

    const topic = { topic_id: "topic_qs_001", content_kind: "quiz_short", title: "Ocean Giants" } as TopicCandidate;
    await act(async () => {
      await result.current.confirmTopic(topic, 5, "mixed");
    });

    expect(api.confirmTopic).toHaveBeenCalledWith(channel.channel_id, topic, {
      questionCount: 5,
      visualStyle: "mixed",
      autoStartPipeline: false,
    });
    expect(onSelectQuizShort).toHaveBeenCalledWith("qshort_test_001");
    expect(onTaskSubmitted).not.toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith({ tone: "good", message: "Quiz Short created: Ocean Giants. with 5 questions" });
  });
});

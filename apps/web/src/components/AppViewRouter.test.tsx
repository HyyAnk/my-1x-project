import type React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AppViewRouter, type AppViewRouterProps } from "./AppViewRouter";
import { LanguageProvider } from "../i18n";
import { ErrorBoundary } from "./ErrorBoundary";
import type { Channel, Task } from "@studio/shared";
import type { Page } from "./types";

const mockChannel: Channel = {
  channel_id: "ch_quiz_1",
  slug: "trivia-channel",
  display_name: "Trivia Channel",
  description: "Trivia test description",
  engine: "quiz",
  group_id: "quiz",
  target_audience: "General",
  language: "en",
  country: "US",
  market: "General",
  channel_dna_path: "channels/ch_quiz_1/dna.md",
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
  mascot_config: {
    enabled: false,
    position: "bottom_left",
    scale: 1.0,
    offset_x: 0,
    offset_y: 0,
    flip_x: false,
    show_in_intro: false,
    show_in_outro: false,
    show_in_question: true,
  },
  created_at: "2026-08-31T00:00:00Z",
  updated_at: "2026-08-31T00:00:00Z",
} as unknown as Channel;

const mockTask: Task = {
  task_id: "task_1",
  channel_id: "ch_quiz_1",
  episode_id: "ep_1",
  task_type: "GENERATE_SCRIPT",
  status: "QUEUED",
  created_at: "2026-08-31T00:00:00Z",
} as unknown as Task;

function createDefaultProps(overrides: Partial<AppViewRouterProps> = {}): AppViewRouterProps {
  return {
    loading: false,
    page: "dashboard",
    channels: [mockChannel],
    selectedChannel: mockChannel,
    selectedEpisodeId: null,
    tasks: [mockTask],
    activeTasks: [mockTask],
    taskClock: 123456789,
    appConfig: null,
    activeEngine: "codex",
    currentModel: "gpt-4o",
    currentImageModel: "gpt-image-2",
    imageBalance: null,
    voiceMetrics: null,
    storage: null,
    git: { branch: "main", dirty: false, changed_files: 0 },
    currentEngineStatus: "connected",
    tab: null,
    group: null,
    simplifyMode: true,
    codex: null,
    codexStatus: "connected",
    antigravity: null,
    antigravityStatus: "ready",
    openPage: vi.fn(),
    openChannel: vi.fn(),
    openEpisode: vi.fn(),
    setQueryParam: vi.fn(),
    upsertTask: vi.fn(),
    requestCreateChannel: vi.fn(),
    requestDeleteChannel: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    refreshChannels: vi.fn().mockResolvedValue([]),
    setNotice: vi.fn(),
    applyStorage: vi.fn().mockResolvedValue(undefined),
    setCodex: vi.fn(),
    setAntigravity: vi.fn(),
    setAppConfig: vi.fn(),
    setChannels: vi.fn(),
    fetchBalance: vi.fn().mockResolvedValue(undefined),
    handleSimplifyToggle: vi.fn(),
    ...overrides,
  };
}

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ErrorBoundary>
      <LanguageProvider>{ui}</LanguageProvider>
    </ErrorBoundary>,
  );
};

describe("AppViewRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders workspace LoadingState when loading is true", () => {
    const props = createDefaultProps({ loading: true });
    renderWithProviders(<AppViewRouter {...props} />);

    expect(screen.getByText(/Loading workspace/i)).toBeTruthy();
  });

  it("lazy-loads and renders DashboardView when page is dashboard", async () => {
    const props = createDefaultProps({ page: "dashboard" });
    renderWithProviders(<AppViewRouter {...props} />);

    const el = await screen.findByText(/Studio Workspace/i, {}, { timeout: 4000 });
    expect(el).toBeTruthy();
  });

  it("lazy-loads and renders ChannelsView when page is channels", async () => {
    const props = createDefaultProps({ page: "channels", selectedChannel: null, selectedEpisodeId: null });
    renderWithProviders(<AppViewRouter {...props} />);

    const el = await screen.findByText(/Trivia Channel/i, {}, { timeout: 4000 });
    expect(el).toBeTruthy();
  });

  it("lazy-loads and renders MascotStudioView when page is mascots", async () => {
    const props = createDefaultProps({ page: "mascots" });
    renderWithProviders(<AppViewRouter {...props} />);

    const el = await screen.findByText(/Mascot Studio/i, {}, { timeout: 4000 });
    expect(el).toBeTruthy();
  });

  it("lazy-loads and renders VisualSandboxTab when page is sandbox", async () => {
    const props = createDefaultProps({ page: "sandbox" });
    renderWithProviders(<AppViewRouter {...props} />);

    const el = await screen.findByText(/Visual Sandbox/i, {}, { timeout: 4000 });
    expect(el).toBeTruthy();
    expect(screen.queryByText("Render Error")).toBeNull();
  });

  it("lazy-loads and renders TasksView when page is tasks", async () => {
    const props = createDefaultProps({ page: "tasks" });
    renderWithProviders(<AppViewRouter {...props} />);

    const el = await screen.findByText(/Waiting in queue/i, {}, { timeout: 4000 });
    expect(el).toBeTruthy();
  });

  it("lazy-loads and renders SettingsView when page is settings", async () => {
    const props = createDefaultProps({ page: "settings" });
    renderWithProviders(<AppViewRouter {...props} />);

    const el = await screen.findByText(/Studio Settings/i, {}, { timeout: 4000 });
    expect(el).toBeTruthy();
  });

  it("preserves selected channel, tab, and query parameters when switching views", async () => {
    const setQueryParam = vi.fn();
    const openPage = vi.fn();
    const props = createDefaultProps({
      page: "settings",
      tab: "media",
      group: "quiz",
      selectedChannel: mockChannel,
      setQueryParam,
      openPage,
    });

    const { rerender } = renderWithProviders(<AppViewRouter {...props} />);

    expect(await screen.findByText(/Studio Settings/i, {}, { timeout: 4000 })).toBeTruthy();

    // Switch route to dashboard
    rerender(
      <ErrorBoundary>
        <LanguageProvider>
          <AppViewRouter {...props} page="dashboard" />
        </LanguageProvider>
      </ErrorBoundary>,
    );

    expect(await screen.findByText(/Studio Workspace/i, {}, { timeout: 4000 })).toBeTruthy();
  });

  it("returns null gracefully for unknown page route", () => {
    const props = createDefaultProps({ page: "unknown_page" as unknown as Page });
    const { container } = renderWithProviders(<AppViewRouter {...props} />);

    expect(container.textContent).toBe("");
  });

  it("catches render errors in ErrorBoundary with recovery UI", () => {
    const ProblematicView = () => {
      throw new Error("Failed to load chunk dynamically");
    };

    render(
      <ErrorBoundary>
        <ProblematicView />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Render Error/i)).toBeTruthy();
    expect(screen.getByText(/Failed to load chunk dynamically/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Reload page/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Back to Channels/i })).toBeTruthy();
  });
});

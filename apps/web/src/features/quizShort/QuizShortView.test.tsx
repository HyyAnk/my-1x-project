import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Task, QuizShortCoverManifest, VideoTitle } from "@studio/shared";
import { createMockChannel } from "../../../test/helpers/shortReelFixture";
import { createMockQuizShort } from "../../../test/helpers/quizShortFixture";
import { quizShortApi, type QuizShortWorkspaceResponse } from "../../api/quizShortApi";
import { QuizShortView } from "./QuizShortView";

vi.mock("../../api/quizShortApi", () => ({
  quizShortApi: {
    quizShortWorkspace: vi.fn(),
    updateQuizShortSettings: vi.fn(),
    startQuizShortPipeline: vi.fn(),
    quizShortVideoUrl: vi.fn(() => "/api/video-url"),
    getQuizShortTitle: vi.fn(),
    generateQuizShortTitle: vi.fn(),
    saveQuizShortTitle: vi.fn(),
    getQuizShortDescription: vi.fn(),
    generateQuizShortDescription: vi.fn(),
    saveQuizShortDescription: vi.fn(),
    getQuizShortThumbnail: vi.fn(),
    generateQuizShortThumbnail: vi.fn(),
    quizShortThumbnailFileUrl: vi.fn(() => "/api/thumbnail-url"),
  },
}));

vi.mock("../../api", () => ({ api: { mascot: vi.fn().mockResolvedValue({ mascot: { styles: [] } }) } }));
vi.mock("../../api/taskApi", () => ({ taskApi: { cancelTask: vi.fn() } }));

const channel = createMockChannel();
const quizShort = createMockQuizShort();

function workspace(overrides: Partial<QuizShortWorkspaceResponse> = {}): QuizShortWorkspaceResponse {
  return {
    quiz_short: quizShort,
    quiz: null,
    director_plan: null,
    timeline: null,
    assessment: null,
    timings: null,
    render_stale: false,
    stages: { questions: "ready", director: "ready", timeline: "not_started", qa: "not_started", render: "not_started" },
    ...overrides,
  };
}

const sampleTitle: VideoTitle = {
  title: "Ocean Giants Quiz: 5 Questions Only Experts Pass",
  primary_keyword: "Ocean Giants",
  char_count: 46,
  language: "English",
  source: "llm",
  generated_at: "2026-09-07T12:00:00.000Z",
  updated_at: "2026-09-07T12:00:00.000Z",
};

const sampleManifest: QuizShortCoverManifest = {
  version: 1,
  prompt_version: "v1",
  fingerprint: "f".repeat(64),
  asset_path: "channels/x/quiz_shorts/ocean-giants/assets/cover.png",
  hook_text: "WHICH OCEAN GIANT IS LONGEST",
  badge_text: "5 QUESTIONS",
  archetype_name: "The Curious Explorer",
  width: 1080,
  height: 1920,
  generated_at: "2026-09-07T12:00:00.000Z",
};

function renderView(tasks: Task[] = [], onTaskSubmitted = vi.fn(), onNotice = vi.fn()) {
  return render(
    <QuizShortView
      channel={channel}
      quizShortId={quizShort.quiz_short_id}
      tasks={tasks}
      onBack={vi.fn()}
      onTaskSubmitted={onTaskSubmitted}
      onNotice={onNotice}
    />,
  );
}

describe("QuizShortView", () => {
  beforeEach(() => {
    vi.mocked(quizShortApi.quizShortWorkspace).mockResolvedValue(workspace());
    vi.mocked(quizShortApi.getQuizShortTitle).mockResolvedValue({ title: null });
    vi.mocked(quizShortApi.getQuizShortDescription).mockResolvedValue({ description: null });
    vi.mocked(quizShortApi.getQuizShortThumbnail).mockResolvedValue({ manifest: null });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the header, stages and portrait placeholder", async () => {
    renderView();
    await waitFor(() => expect(screen.getByTestId("quiz-short-view")).toBeTruthy());
    expect(screen.getByRole("heading", { level: 1, name: "Ocean Giants." })).toBeTruthy();
    expect(screen.getByTestId("quiz-short-stage-questions").textContent).toContain("Ready");
    expect(screen.getByTestId("quiz-short-stage-timeline").textContent).toContain("Waiting");
    expect(screen.getByTestId("quiz-short-portrait-placeholder")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Episode production progress" })).toBeTruthy();
    expect(screen.getByTestId("quiz-short-thumbnail-placeholder")).toBeTruthy();
    expect(screen.getByText("YouTube Title")).toBeTruthy();
  });

  it("saves a palette change through PATCH and reflects the record", async () => {
    const updated = createMockQuizShort({ quiz_config: { ...quizShort.quiz_config, palette_id: "sunny" } });
    vi.mocked(quizShortApi.updateQuizShortSettings).mockResolvedValue(updated);
    const onNotice = vi.fn();
    renderView([], vi.fn(), onNotice);
    await waitFor(() => expect(screen.getByTestId("quiz-short-customization-bar")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Palette"), { target: { value: "sunny" } });
    await waitFor(() =>
      expect(quizShortApi.updateQuizShortSettings).toHaveBeenCalledWith(channel.channel_id, quizShort.quiz_short_id, {
        palette_id: "sunny",
      }),
    );
    await waitFor(() => expect((screen.getByLabelText("Palette") as HTMLSelectElement).value).toBe("sunny"));
    expect(onNotice).toHaveBeenCalledWith({ tone: "good", message: "Palette set to sunny" });

    fireEvent.change(screen.getByLabelText("Questions"), { target: { value: "3" } });
    await waitFor(() =>
      expect(quizShortApi.updateQuizShortSettings).toHaveBeenLastCalledWith(channel.channel_id, quizShort.quiz_short_id, {
        question_count: 3,
      }),
    );

    fireEvent.click(screen.getByLabelText("Score CTA outro"));
    await waitFor(() =>
      expect(quizShortApi.updateQuizShortSettings).toHaveBeenLastCalledWith(channel.channel_id, quizShort.quiz_short_id, {
        outro_cta_enabled: false,
      }),
    );
  });

  it("starts the pipeline and hands the task to the caller", async () => {
    const task = { task_id: "task_qs", task_type: "GENERATE_PIPELINE", status: "QUEUED", episode_id: quizShort.quiz_short_id } as Task;
    vi.mocked(quizShortApi.startQuizShortPipeline).mockResolvedValue(task);
    const onTaskSubmitted = vi.fn();
    renderView([], onTaskSubmitted);
    await waitFor(() => expect(screen.getByTestId("quiz-short-start-pipeline")).toBeTruthy());
    expect(screen.getByTestId("quiz-short-start-pipeline").textContent).toContain("Start production");

    fireEvent.click(screen.getByTestId("quiz-short-start-pipeline"));
    await waitFor(() => expect(quizShortApi.startQuizShortPipeline).toHaveBeenCalledWith(channel.channel_id, quizShort.quiz_short_id));
    expect(onTaskSubmitted).toHaveBeenCalledWith(task);
  });

  it("disables customization and shows Stop while a task runs", async () => {
    const running = {
      task_id: "task_run",
      task_type: "GENERATE_PIPELINE",
      status: "RUNNING",
      episode_id: quizShort.quiz_short_id,
      progress_message: "Rendering",
      created_at: "2026-09-07T12:00:00.000Z",
    } as Task;
    renderView([running]);
    await waitFor(() => expect(screen.getByRole("button", { name: "Stop current task" })).toBeTruthy());
    expect((screen.getByLabelText("Palette") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByTestId("quiz-short-start-pipeline") as HTMLButtonElement).disabled).toBe(true);
  });

  it("loads title, description and thumbnail through the quiz short routes", async () => {
    vi.mocked(quizShortApi.getQuizShortTitle).mockResolvedValue({ title: sampleTitle });
    vi.mocked(quizShortApi.getQuizShortThumbnail).mockResolvedValue({ manifest: sampleManifest });
    vi.mocked(quizShortApi.generateQuizShortThumbnail).mockResolvedValue({ ok: true, manifest: sampleManifest });
    vi.mocked(quizShortApi.generateQuizShortTitle).mockResolvedValue({
      title: { ...sampleTitle, title: "Regenerated title" },
      description: null,
      artifact_path: "x",
    });
    vi.mocked(quizShortApi.quizShortWorkspace).mockResolvedValue(
      workspace({ quiz: { questions: [] } as unknown as QuizShortWorkspaceResponse["quiz"] }),
    );
    renderView();

    await waitFor(() => expect((screen.getByLabelText("YouTube video title") as HTMLInputElement).value).toBe(sampleTitle.title));
    expect(quizShortApi.getQuizShortDescription).toHaveBeenCalledWith(channel.channel_id, quizShort.quiz_short_id);
    expect(screen.getByAltText("Cover thumbnail for Ocean Giants.")).toBeTruthy();
    expect(screen.getByAltText("Cover for Ocean Giants.")).toBeTruthy();

    expect(screen.getByTestId("quiz-short-cover-summary").textContent).toContain("5 QUESTIONS");
    fireEvent.change(screen.getByTestId("quiz-short-cover-hook"), { target: { value: "Beat all five" } });
    fireEvent.click(screen.getByTestId("quiz-short-cover-generate"));
    await waitFor(() =>
      expect(quizShortApi.generateQuizShortThumbnail).toHaveBeenCalledWith(channel.channel_id, quizShort.quiz_short_id, {
        question_index: 0,
        hook_text: "Beat all five",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /Regenerate/i }));
    await waitFor(() =>
      expect(quizShortApi.generateQuizShortTitle).toHaveBeenCalledWith(channel.channel_id, quizShort.quiz_short_id, undefined),
    );
    await waitFor(() => expect((screen.getByLabelText("YouTube video title") as HTMLInputElement).value).toBe("Regenerated title"));
  });
});

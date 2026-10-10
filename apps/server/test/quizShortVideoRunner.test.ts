import { describe, expect, it, vi } from "vitest";
import { QuizShortSchema, QuizV2Schema, TaskSchema, type Task } from "@studio/shared";
import type { TaskManagerRuntime } from "../src/tasks/runtime.js";

const prepareProductVideoComposition = vi.fn();
const executeHyperframesRender = vi.fn();
const persistVideoRenderArtifacts = vi.fn();

vi.mock("../src/tasks/video/productCompositionDispatcher.js", () => ({
  prepareProductVideoComposition: (options: unknown) => prepareProductVideoComposition(options),
}));
vi.mock("../src/tasks/video/videoLayoutChecker.js", () => ({ verifyAndCheckLayout: vi.fn().mockResolvedValue({ bypassed: true }) }));
vi.mock("../src/tasks/video/videoRenderExecution.js", () => ({
  executeHyperframesRender: (options: unknown) => executeHyperframesRender(options),
}));
vi.mock("../src/tasks/video/renderManifestWriter.js", () => ({
  persistVideoRenderArtifacts: (options: unknown) => persistVideoRenderArtifacts(options),
}));
vi.mock("../src/tasks/storage/artifactRetentionPruner.js", () => ({
  pruneRenderRootIntermediateFiles: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../src/infrastructure/executables/browserProcessCleaner.js", () => ({
  cleanOrphanedHeadlessBrowsers: vi.fn().mockResolvedValue(undefined),
}));

const { runVideoTask } = await import("../src/tasks/videoRunner.js");

const quizShort = QuizShortSchema.parse({
  quiz_short_id: "qshort_portrait01",
  channel_id: "channel-1",
  slug: "ocean-giants",
  topic: { title: "Ocean giants", premise: "Big sea animals", hook: "Who is the biggest?" },
  stage: "NARRATION_READY",
  narration_asset_path: "channels/shorts/quiz_shorts/ocean-giants/assets/quiz-narration-1.wav",
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
});

const quiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: quizShort.quiz_short_id,
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "q1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which animal is the largest?",
      choices: [
        { id: "c1", text: "Blue whale" },
        { id: "c2", text: "Shark" },
        { id: "c3", text: "Dolphin" },
      ],
      correct_choice_id: "c1",
      explanation: "Blue whales are the largest animals.",
      fun_fact: "Their hearts are as big as a car.",
      source_ids: ["S01"],
      visual_opportunity: "Whale",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

function createRuntime(task: Task) {
  let current = task;
  const appendQuestionHistory = vi.fn(() => Promise.resolve());
  const finish = vi.fn((taskId: string, status: Task["status"]) => {
    current = TaskSchema.parse({ ...current, status });
    return Promise.resolve();
  });
  const runtime = {
    activeVideoControllers: new Map<string, AbortController>(),
    videoConfig: { aspect_ratio: "16:9", fps: 30, fast_render_mode: true, render_quality: "fast" },
    repository: {
      rootDirectory: "/studio",
      getQuizShort: vi.fn().mockResolvedValue(quizShort),
      getEpisode: vi.fn().mockRejectedValue(new Error("not an episode")),
      getChannel: vi.fn().mockResolvedValue({ channel_id: "channel-1", slug: "shorts" }),
      readQuiz: vi.fn().mockResolvedValue(quiz),
      readScenes: vi.fn().mockResolvedValue([]),
      appendQuestionHistory,
      appendBgmHistory: vi.fn(() => Promise.resolve()),
      removeQuestionHistoryEntries: vi.fn(() => Promise.resolve()),
    },
    hasValidNarrationAsset: vi.fn().mockResolvedValue(true),
    update: (_taskId: string, patch: Partial<Task>) => {
      current = TaskSchema.parse({ ...current, ...patch });
      return Promise.resolve();
    },
    get: () => current,
    finish,
    logger: { ok: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as TaskManagerRuntime;
  return { runtime, finish, appendQuestionHistory };
}

describe("runVideoTask with a Quiz Short product", () => {
  it("selects the portrait canvas, renders through the product ref and records quiz_short history", async () => {
    const task = TaskSchema.parse({
      task_id: "task-short-render",
      task_type: "GENERATE_VIDEO",
      channel_id: "channel-1",
      episode_id: quizShort.quiz_short_id,
      product_kind: "quiz_short",
      status: "QUEUED",
      created_at: "2026-09-01T00:00:00.000Z",
      lock_key: quizShort.quiz_short_id,
    });
    prepareProductVideoComposition.mockResolvedValue({
      renderRoot: "/tmp/render",
      outputPath: "/tmp/render/quiz-video.mp4",
      checkpointPath: "/tmp/render/checkpoint.json",
      sourceFingerprint: "fp",
      html: "<html></html>",
      selectedBgmTrackId: null,
      selectedBgmFilename: null,
      assetResolution: null,
      preflightAssessment: { score: 100, issues: [] },
      introOutro: undefined,
    });
    executeHyperframesRender.mockResolvedValue({ probe: { issues: [], probe: { streams: [] } }, duration: 48 });
    persistVideoRenderArtifacts.mockResolvedValue({ videoPath: "video.mp4", manifestPath: "manifest.json" });
    const { runtime, finish, appendQuestionHistory } = createRuntime(task);

    await runVideoTask.call(runtime, task);

    expect(finish).toHaveBeenCalledWith(task.task_id, "COMPLETED", null, ["video.mp4", "manifest.json"]);
    const compositionOptions = prepareProductVideoComposition.mock.calls[0][0] as {
      product: { renderAspectRatio: string; renderCanvas: unknown };
    };
    expect(compositionOptions.product.renderAspectRatio).toBe("9:16");
    expect(compositionOptions.product.renderCanvas).toEqual({ width: 1080, height: 1920 });
    expect((executeHyperframesRender.mock.calls[0][0] as { renderCanvas: unknown }).renderCanvas).toEqual({ width: 1080, height: 1920 });
    const persistOptions = persistVideoRenderArtifacts.mock.calls[0][0] as { product: unknown; renderAspectRatio: string };
    expect(persistOptions.renderAspectRatio).toBe("9:16");
    expect(persistOptions.product).toEqual({ kind: "quiz_short", channel_id: "channel-1", product_id: quizShort.quiz_short_id });
    expect(appendQuestionHistory).toHaveBeenCalledWith(
      "channel-1",
      { kind: "quiz_short", channel_id: "channel-1", product_id: quizShort.quiz_short_id },
      quiz.questions,
      undefined,
      task.task_id,
      "quiz_short",
    );
  });

  it("fails cleanly when the portrait composition seam is not implemented", async () => {
    const task = TaskSchema.parse({
      task_id: "task-short-seam",
      task_type: "GENERATE_VIDEO",
      channel_id: "channel-1",
      episode_id: quizShort.quiz_short_id,
      product_kind: "quiz_short",
      status: "QUEUED",
      created_at: "2026-09-01T00:00:00.000Z",
      lock_key: quizShort.quiz_short_id,
    });
    prepareProductVideoComposition.mockRejectedValue(new Error("Quiz Short portrait composition is not implemented in this phase"));
    const { runtime, finish } = createRuntime(task);

    await runVideoTask.call(runtime, task);

    expect(finish).toHaveBeenCalledWith(task.task_id, "FAILED", "Quiz Short portrait composition is not implemented in this phase");
  });
});

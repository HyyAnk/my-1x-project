import { describe, expect, it, vi } from "vitest";
import { RepositoryError } from "../src/repository/errors.js";
import { loadRequiredQuizRenderArtifacts } from "../src/tasks/video/quizRenderArtifacts.js";
import type { QuizRenderArtifactRepository } from "../src/tasks/video/quizRenderArtifacts.types.js";

type RepoArtifacts = {
  quiz: Awaited<ReturnType<QuizRenderArtifactRepository["readQuiz"]>>;
  director: Awaited<ReturnType<QuizRenderArtifactRepository["readDirectorPlan"]>>;
  assetPlan: Awaited<ReturnType<QuizRenderArtifactRepository["readAssetPlan"]>>;
  voicePlan: Awaited<ReturnType<QuizRenderArtifactRepository["readVoicePlan"]>>;
  timeline: Awaited<ReturnType<QuizRenderArtifactRepository["readQuizTimeline"]>>;
};

describe("loadRequiredQuizRenderArtifacts", () => {
  const fakeQuiz = { schema_version: 2, title: "Test Quiz" } as unknown as NonNullable<RepoArtifacts["quiz"]>;
  const fakeDirector = { scenes: [] } as unknown as NonNullable<RepoArtifacts["director"]>;
  const fakeAssetPlan = { assets: [] } as unknown as NonNullable<RepoArtifacts["assetPlan"]>;
  const fakeVoicePlan = { segments: [] } as unknown as NonNullable<RepoArtifacts["voicePlan"]>;
  const fakeTimeline = { total_duration_seconds: 30 } as unknown as NonNullable<RepoArtifacts["timeline"]>;

  function createMockRepo(overrides: Partial<RepoArtifacts> = {}) {
    return {
      readQuiz: vi.fn().mockResolvedValue("quiz" in overrides ? overrides.quiz : fakeQuiz),
      readDirectorPlan: vi.fn().mockResolvedValue("director" in overrides ? overrides.director : fakeDirector),
      readAssetPlan: vi.fn().mockResolvedValue("assetPlan" in overrides ? overrides.assetPlan : fakeAssetPlan),
      readVoicePlan: vi.fn().mockResolvedValue("voicePlan" in overrides ? overrides.voicePlan : fakeVoicePlan),
      readQuizTimeline: vi.fn().mockResolvedValue("timeline" in overrides ? overrides.timeline : fakeTimeline),
    };
  }

  it("has exactly 3 parameters and does not accept hasExistingVideo", () => {
    expect(loadRequiredQuizRenderArtifacts.length).toBe(3);
  });

  it("returns non-null object with all five artifacts when all are present", async () => {
    const repo = createMockRepo();
    const artifacts = await loadRequiredQuizRenderArtifacts(repo, "ch_1", "ep_1");

    expect(artifacts).toEqual({
      quiz: fakeQuiz,
      director: fakeDirector,
      assetPlan: fakeAssetPlan,
      voicePlan: fakeVoicePlan,
      timeline: fakeTimeline,
    });
  });

  it.each([
    {
      missingKey: "quiz",
      override: { quiz: null },
      expectedFilename: "quiz-v2.json",
    },
    {
      missingKey: "director",
      override: { director: null },
      expectedFilename: "director-plan.json",
    },
    {
      missingKey: "assetPlan",
      override: { assetPlan: null },
      expectedFilename: "asset-plan.json",
    },
    {
      missingKey: "voicePlan",
      override: { voicePlan: null },
      expectedFilename: "voice-plan.json",
    },
    {
      missingKey: "timeline",
      override: { timeline: null },
      expectedFilename: "timeline.json",
    },
  ])("rejects with QUIZ_V2_REQUIRED naming $expectedFilename when $missingKey is missing", async ({ override, expectedFilename }) => {
    const repo = createMockRepo(override);

    await expect(loadRequiredQuizRenderArtifacts(repo, "ch_1", "ep_1")).rejects.toThrow(
      new RepositoryError(
        `Quiz V2 artifacts are required before rendering. Missing: ${expectedFilename}. Run the quiz-native generation stages and retry.`,
        "QUIZ_V2_REQUIRED",
      ),
    );
  });

  it("lists multiple missing artifacts in canonical filename order", async () => {
    const repo = createMockRepo({
      quiz: null,
      voicePlan: null,
    });

    await expect(loadRequiredQuizRenderArtifacts(repo, "ch_1", "ep_1")).rejects.toThrow(
      new RepositoryError(
        "Quiz V2 artifacts are required before rendering. Missing: quiz-v2.json, voice-plan.json. Run the quiz-native generation stages and retry.",
        "QUIZ_V2_REQUIRED",
      ),
    );
  });

  it("lists all five missing artifacts when all are absent", async () => {
    const repo = createMockRepo({
      quiz: null,
      director: null,
      assetPlan: null,
      voicePlan: null,
      timeline: null,
    });

    await expect(loadRequiredQuizRenderArtifacts(repo, "ch_1", "ep_1")).rejects.toThrow(
      new RepositoryError(
        "Quiz V2 artifacts are required before rendering. Missing: quiz-v2.json, director-plan.json, asset-plan.json, voice-plan.json, timeline.json. Run the quiz-native generation stages and retry.",
        "QUIZ_V2_REQUIRED",
      ),
    );
  });

  it("propagates original RepositoryError (e.g. QUIZ_ARTIFACT_INVALID) without relabeling", async () => {
    const repo = createMockRepo();
    const originalError = new RepositoryError("Malformed quiz schema", "QUIZ_ARTIFACT_INVALID");
    vi.mocked(repo.readQuiz).mockRejectedValue(originalError);

    await expect(loadRequiredQuizRenderArtifacts(repo, "ch_1", "ep_1")).rejects.toThrow(originalError);
  });

  it("propagates arbitrary reader errors without catching and relabeling", async () => {
    const repo = createMockRepo();
    const diskError = new Error("EACCES: permission denied");
    vi.mocked(repo.readAssetPlan).mockRejectedValue(diskError);

    await expect(loadRequiredQuizRenderArtifacts(repo, "ch_1", "ep_1")).rejects.toThrow(diskError);
  });

  it("waits for all readers to settle and does not resolve early on delayed readers", async () => {
    let resolvedDelayed = false;
    const repo: QuizRenderArtifactRepository = {
      readQuiz: vi.fn().mockResolvedValue(fakeQuiz),
      readDirectorPlan: vi.fn().mockResolvedValue(fakeDirector),
      readAssetPlan: vi.fn().mockResolvedValue(fakeAssetPlan),
      readVoicePlan: vi.fn().mockResolvedValue(fakeVoicePlan),
      readQuizTimeline: vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        resolvedDelayed = true;
        return fakeTimeline;
      }),
    };

    const artifactsPromise = loadRequiredQuizRenderArtifacts(repo, "ch_1", "ep_1");
    expect(resolvedDelayed).toBe(false);
    const artifacts = await artifactsPromise;
    expect(resolvedDelayed).toBe(true);
    expect(artifacts.timeline).toBe(fakeTimeline);
  });
});

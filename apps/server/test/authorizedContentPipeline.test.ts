import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildApp, type StudioApp } from "../src/app.js";
import { makeAuthorizedBankQuestion, makeAuthorizedQuiz } from "./helpers/authorizedContentFixtures.js";
import { assessSemanticQa } from "../src/quiz/qa/stages/assessSemanticQa.js";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizAssetPrompt } from "../src/quiz/assets/promptCompiler.js";
import { compileThumbnailPrompt, resolveThumbnailLayout } from "../src/quiz/thumbnail/index.js";
import { generateAssetWithProvider } from "../src/quiz/assets/resolvers/providerAssetResolver.js";
import { Gpti2QuizImageProvider } from "../src/providers/gpti2Image.js";
import { StudioLogger } from "../src/logger.js";

describe("Authorized Content End-to-End Pipeline Integration (P6)", () => {
  let app: StudioApp;
  let tempRoot: string;
  let channelId: string;
  let episodeId: string;

  beforeAll(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "p6-pipeline-root-"));
    // Ensure minimal templates for repository operations
    await mkdir(path.join(tempRoot, "templates"), { recursive: true });
    await writeFile(path.join(tempRoot, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
    await writeFile(path.join(tempRoot, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8");
    await writeFile(path.join(tempRoot, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");

    app = await buildApp(tempRoot);

    const channel = await app.repository.createChannel({
      name: "Authorized Integration Channel",
      description: "P6 pipeline test channel",
      target_audience: "General",
      language: "English",
      market: "US",
      dna_mode: "example",
    });
    channelId = channel.channel_id;

    const topic = {
      topic_id: "topic_pipeline_p6",
      channel_id: channelId,
      content_kind: "episode" as const,
      title: "Spider-Man Quiz",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High" as const,
      generated_at: new Date().toISOString(),
      selected: false,
    };
    await app.repository.saveTopicRun(channelId, [topic]);
    const episode = await app.repository.confirmTopic(channelId, topic.topic_id);
    episodeId = episode.episode_id;
  });

  afterAll(async () => {
    await app.close();
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("Question Bank: generates, passes Auto-QA, persists, and reloads authorized named subjects", async () => {
    const candidate = makeAuthorizedBankQuestion("Pikachu");
    const response = await app.server.inject({
      method: "POST",
      url: "/api/question-bank/generate-batch",
      payload: {
        archetype_id: candidate.archetype_id,
        domain_id: candidate.domain_id,
        subtopic_id: candidate.subtopic_id,
        candidates: [candidate],
        persist: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      success: boolean;
      approvedCount: number;
      rejectedCount: number;
      qaSummary: Record<string, unknown>;
    };
    expect(body.success).toBe(true);
    expect(body.approvedCount).toBe(1);
    expect(body.rejectedCount).toBe(0);
    expect(body.qaSummary).toEqual({
      duplicateRejections: 0,
      schemaRejections: 0,
      qualityRejections: 0,
    });
    expect(Object.hasOwn(body.qaSummary, "copyrightRejections")).toBe(false);

    // Verify persisted record in repository
    const saved = await app.repository.getQuestionBankQuestion(candidate.id);
    expect(saved).toBeDefined();
    expect(saved?.question).toContain("Pikachu");
    expect(saved?.choices.find((choice) => choice.id === saved.correct_choice_id)?.text).toBe("Pikachu");

    // Clean up question from bank
    await app.repository.deleteQuestionBankQuestion(candidate.id);
  });

  it("QuizV2: saves, reloads, and assesses authorized named subject without copyright blockers", async () => {
    const subject = "Spider-Man";
    const quiz = makeAuthorizedQuiz(subject);
    quiz.episode_id = episodeId;

    // Semantic QA stage verifies zero copyright issues
    const issues = assessSemanticQa(quiz);
    expect(issues).toEqual([]);
    expect(issues.some((i) => i.code.includes("copyright"))).toBe(false);

    // Write QuizV2 to repository and reload
    await app.repository.writeQuiz(channelId, episodeId, quiz);
    const reloaded = await app.repository.readQuiz(channelId, episodeId);

    expect(reloaded).toBeDefined();
    expect(reloaded?.questions[0].question).toContain(subject);
    expect(reloaded?.questions[0].choices[0].text).toBe(subject);
  });

  it("Visual pipeline: preserves subject identity in prompts, cache keys, and thumbnails", () => {
    const subject = "Spider-Man";
    const quiz = makeAuthorizedQuiz(subject);
    const directorPlan = createDefaultDirectorPlan(quiz);
    const assetPlan = planQuizAssets(quiz, directorPlan);

    const heroAsset = assetPlan.assets.find((item) => item.purpose === "hero_question_image");
    expect(heroAsset).toBeDefined();

    if (heroAsset) {
      const compiled = compileQuizAssetPrompt(heroAsset);
      // Explicit subject identity preserved without generic proxy rewrite
      expect(compiled.prompt).toContain(subject);
      expect(compiled.cacheVersion).toBe("pixar_3d-v4-subject-identity");
      expect(compiled.prompt).not.toContain("generic arachnid hero");
    }

    // Thumbnail prompt compilation in both aspect ratios
    const thumbnailLayout = resolveThumbnailLayout({ topicTitle: subject, layoutOverride: "split_vs" });
    thumbnailLayout.subjectAnchors = [
      { label: subject, visualPrompt: `${subject} centered in a dynamic action pose` },
      { label: "Rival", visualPrompt: "A shadowy challenger" },
    ];

    const prompt169 = compileThumbnailPrompt(thumbnailLayout, "16:9");
    const prompt916 = compileThumbnailPrompt(thumbnailLayout, "9:16");

    expect(prompt169).toContain(subject);
    expect(prompt916).toContain(subject);
  });

  it("Observable Rejection Contract: handles provider rejection directly without rewriting prompts to generic proxies", async () => {
    const subject = "Simba";
    const originalPrompt = "Simba standing proudly on a high rock at sunrise";
    const logger = new StudioLogger(tempRoot);
    const contentFilterRejection = Object.assign(new Error("rejected by content filter: prompt contains restricted term"), {
      code: "IMAGE_CONTENT_FILTER_REJECTED",
    });

    const generateSpy = vi.spyOn(Gpti2QuizImageProvider.prototype, "generateAsset").mockRejectedValueOnce(contentFilterRejection);

    const recordUsageSpy = vi.spyOn(app.repository, "recordImageUsage");

    await expect(
      generateAssetWithProvider({
        repository: app.repository,
        channelId,
        episodeId,
        request: {
          asset_id: "hero_simba_test",
          purpose: "hero_question_image",
          aspect_ratio: "16:9",
          subject,
          consistency_group_id: null,
          question_id: "question-1",
        },
        fingerprint: "fp-simba-pipeline-01",
        compiledPrompt: originalPrompt,
        configuredProvider: "gpti2",
        activeEngine: "codex",
        imageConfig: { provider: "gpti2", api_key: "sk-test", model: "gpt-image-2" },
        logger,
      }),
    ).rejects.toBe(contentFilterRejection);

    // Assert: provider was invoked exactly once with original prompt, never rewritten with a generic proxy
    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(generateSpy.mock.calls[0][0].prompt).toContain(subject);
    expect(generateSpy.mock.calls[0][0].prompt).not.toContain("generic lion cub");
    expect(recordUsageSpy).not.toHaveBeenCalled();
  });
});

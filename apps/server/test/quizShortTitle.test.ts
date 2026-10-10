import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../src/config.js";
import { generateProductTitle } from "../src/quiz/pipeline/stages/videoMetadataStages.js";
import {
  QUIZ_SHORT_TITLE_MAX_CHARS,
  buildFallbackTitle,
  buildQuizShortFallbackTitle,
  compileVideoTitlePrompt,
  ensureQuizShortTitleSuffix,
  generateVideoTitle,
  reviewTitleDraft,
} from "../src/quiz/title/index.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";
import { createQuizShortMetadataFixture, type QuizShortMetadataFixture } from "./fixtures/quizShortMetadataFixture.js";

const fixtures: QuizShortMetadataFixture[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(fixtures.splice(0).map((fixture) => fixture.cleanup()));
});

async function fixture(): Promise<QuizShortMetadataFixture> {
  const created = await createQuizShortMetadataFixture();
  fixtures.push(created);
  return created;
}

function llmReturning(text: string | (() => Promise<string>)): LLMClient {
  return {
    connect: vi.fn(async () => undefined),
    generateContent: vi.fn(async () => ({ text: typeof text === "string" ? text : await text() })),
  };
}

describe("Quiz Short title rules", () => {
  it("appends exactly one #Shorts suffix and keeps the whole title within 70 characters", () => {
    expect(ensureQuizShortTitleSuffix("Planet Quiz: Can You Beat All 5?")).toBe("Planet Quiz: Can You Beat All 5? #Shorts");
    expect(ensureQuizShortTitleSuffix("Planet Quiz: Can You Beat All 5? #shorts")).toBe("Planet Quiz: Can You Beat All 5? #Shorts");
    const long = ensureQuizShortTitleSuffix("Solar System Planet Quiz: Only True Space Fans Will Get Every Single One Of These Right");
    expect(long.length).toBeLessThanOrEqual(QUIZ_SHORT_TITLE_MAX_CHARS);
    expect(long.endsWith(" #Shorts")).toBe(true);
    expect(long).not.toMatch(/\s{2}|[-:,]\s#Shorts$/);
  });

  it("does not require the question count for Quiz Shorts but blocks a missing suffix or an over-long title", () => {
    const review = { questionCount: 5, recentTitles: [], answerKeys: [], productKind: "quiz_short" as const };
    expect(reviewTitleDraft({ title: "Planet Quiz: Can You Beat Them All? #Shorts", primaryKeyword: "planet quiz" }, review)).toEqual([]);
    const missingSuffix = reviewTitleDraft({ title: "Planet Quiz: Can You Beat Them All?", primaryKeyword: "planet quiz" }, review);
    expect(missingSuffix.map((issue) => issue.code)).toEqual(["SHORTS_SUFFIX_MISSING"]);
    const tooLong = reviewTitleDraft({ title: `Planet Quiz: ${"x".repeat(60)} #Shorts`, primaryKeyword: "planet quiz" }, review);
    expect(tooLong.some((issue) => issue.code === "TOO_LONG" && issue.severity === "blocker")).toBe(true);
    const episodeReview = { ...review, productKind: "episode" as const };
    expect(
      reviewTitleDraft({ title: "Planet Quiz: Can You Beat Them All?", primaryKeyword: "planet quiz" }, episodeReview).map((i) => i.code),
    ).toEqual(["QUESTION_COUNT_MISSING"]);
  });

  it("compiles the short prompt variant with the 70-character and suffix rules", async () => {
    const f = await fixture();
    const prompt = compileVideoTitlePrompt({
      quiz: f.quiz,
      channel: f.channel,
      episode: f.quizShort,
      productKind: "quiz_short",
      language: "English",
      recentTitles: [],
    });
    expect(prompt).toContain("Quiz Short (9:16 vertical video)");
    expect(prompt).toContain(`within ${QUIZ_SHORT_TITLE_MAX_CHARS} characters`);
    expect(prompt).toContain('End the title with exactly " #Shorts"');
    expect(prompt).not.toContain("Include the exact question count");
    const episodePrompt = compileVideoTitlePrompt({
      quiz: f.quiz,
      channel: f.channel,
      episode: f.quizShort,
      language: "English",
      recentTitles: [],
    });
    expect(episodePrompt).toContain("Include the exact question count");
  });

  it("builds locale fallbacks that end with #Shorts and fit the budget", async () => {
    const f = await fixture();
    for (const language of ["en", "de", "fr", "es", "it", "pt", "ja", "ko", "zh"] as const) {
      const draft = buildQuizShortFallbackTitle(language, f.quizShort, 5);
      expect(draft.title.endsWith(" #Shorts")).toBe(true);
      expect(draft.title.length).toBeLessThanOrEqual(QUIZ_SHORT_TITLE_MAX_CHARS);
      expect(draft.primaryKeyword.length).toBeGreaterThan(0);
    }
    expect(buildQuizShortFallbackTitle("en", f.quizShort, 5).title).toBe("Planet Sprint Quiz: Can You Beat All 5? #Shorts");
    expect(buildFallbackTitle("en", f.quizShort, 5).title).toContain("5 Questions");
  });

  it("normalizes an LLM title to the short rules and falls back when the model fails", async () => {
    const f = await fixture();
    const llm = llmReturning(
      JSON.stringify({
        title: "Planet Sprint Quiz: Can You Beat All 5 Before Time Runs Out Tonight? #shorts",
        primary_keyword: "planet sprint quiz",
      }),
    );
    const title = await generateVideoTitle({
      client: llm,
      channel: f.channel,
      episode: f.quizShort,
      quiz: f.quiz,
      productKind: "quiz_short",
      productId: f.quizShortId,
    });
    expect(title.source).toBe("llm");
    expect(title.title.endsWith(" #Shorts")).toBe(true);
    expect(title.title.length).toBeLessThanOrEqual(QUIZ_SHORT_TITLE_MAX_CHARS);
    expect(title.char_count).toBe(title.title.length);

    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const failing = llmReturning(() => Promise.reject(new Error("offline")));
    const fallback = await generateVideoTitle({
      client: failing,
      channel: f.channel,
      episode: f.quizShort,
      quiz: f.quiz,
      productKind: "quiz_short",
    });
    expect(fallback.source).toBe("fallback");
    expect(fallback.title).toBe("Planet Sprint Quiz: Can You Beat All 5? #Shorts");
  });

  it("writes the Quiz Short title artifact into the product directory through the stage", async () => {
    const f = await fixture();
    const llm = llmReturning(JSON.stringify({ title: "Planet Sprint Quiz: Can You Beat All 5?", primary_keyword: "planet sprint quiz" }));
    const { title, artifact_path } = await generateProductTitle({
      repository: f.repository,
      config: { audio_generation: DEFAULT_CONFIG.audio_generation },
      channelId: f.channelId,
      episodeId: f.quizShortId,
      product: f.ref,
      codexClient: llm as never,
    });
    expect(title.title).toBe("Planet Sprint Quiz: Can You Beat All 5? #Shorts");
    expect(artifact_path).toBe(`channels/${f.channel.slug}/quiz_shorts/${f.quizShort.slug}/quiz/video-title.json`);
    expect(await f.repository.readVideoTitle(f.channelId, f.ref)).toMatchObject({ title: title.title, source: "llm" });
  });
});

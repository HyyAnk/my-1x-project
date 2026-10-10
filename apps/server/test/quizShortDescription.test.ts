import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../src/config.js";
import {
  QUIZ_SHORT_DESCRIPTION_MAX_CHARS,
  QUIZ_SHORT_SCORE_CTA_EN,
  assembleQuizShortDescription,
  compileQuizShortDescriptionPrompt,
  generateQuizShortDescription,
  normalizeQuizShortHashtags,
  resolveQuizShortDescriptionLocale,
} from "../src/quiz/description/index.js";
import { generateProductDescription } from "../src/quiz/pipeline/stages/videoMetadataStages.js";
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

const LLM_JSON = JSON.stringify({
  topic_category: "Space",
  primary_keyword: "planet quiz",
  keyword_variations: ["solar system quiz"],
  hook_lines: "Planet quiz time!\nFive fast questions before the timer runs out.",
  teaser: "Do you know which planet is the largest?",
  score_cta: "Comment how many you got right!",
  hashtags: ["#planets", "#space"],
});

describe("Quiz Short description", () => {
  it("keeps #Shorts and #quiz first and caps the list at five unique tags", () => {
    expect(normalizeQuizShortHashtags(["#planets", "#Space", "#quiz", "#shorts", "#trivia", "#more"])).toEqual([
      "#Shorts",
      "#quiz",
      "#planets",
      "#Space",
      "#trivia",
    ]);
    expect(normalizeQuizShortHashtags([])).toEqual(["#Shorts", "#quiz", "#trivia", "#challenge"]);
  });

  it("assembles hook, teaser, CTA and hashtags within 600 characters without dropping the CTA", () => {
    const assembled = assembleQuizShortDescription({
      hookLines: "Planet quiz time!\nFive fast questions.",
      teaser: `${"Which planet is the largest? ".repeat(40)}`,
      scoreCta: QUIZ_SHORT_SCORE_CTA_EN,
      hashtags: ["#planets"],
    });
    expect(assembled.charCount).toBeLessThanOrEqual(QUIZ_SHORT_DESCRIPTION_MAX_CHARS);
    expect(assembled.fullText.startsWith("Planet quiz time!\nFive fast questions.")).toBe(true);
    expect(assembled.fullText).toContain(QUIZ_SHORT_SCORE_CTA_EN);
    expect(assembled.fullText.endsWith("#Shorts #quiz #planets")).toBe(true);
    expect(assembled.fullText).not.toContain("CHAPTERS");
  });

  it("compiles a prompt without chapters or scoring tiers that demands the CTA and mandatory hashtags", async () => {
    const f = await fixture();
    const prompt = compileQuizShortDescriptionPrompt({ quiz: f.quiz, channel: f.channel, quizShort: f.quizShort, targetLanguage: "en" });
    expect(prompt).toContain("5-question vertical Quiz Short");
    expect(prompt).toContain(QUIZ_SHORT_SCORE_CTA_EN);
    expect(prompt).toContain("#Shorts and #quiz are mandatory");
    expect(prompt).toContain("NO CHAPTERS");
    expect(prompt).toContain(`under ${QUIZ_SHORT_DESCRIPTION_MAX_CHARS} characters`);
    expect(prompt).not.toContain("SCORING TIERS");
    expect(prompt).toContain(f.quiz.questions[0].question);
  });

  it("generates a short description from the model output", async () => {
    const f = await fixture();
    const description = await generateQuizShortDescription({
      client: llmReturning(LLM_JSON),
      channel: f.channel,
      quizShort: f.quizShort,
      quiz: f.quiz,
    });
    expect(description.question_count).toBe(5);
    expect(description.chapters).toEqual([]);
    expect(description.hashtags).toEqual(["#Shorts", "#quiz", "#planets", "#space"]);
    expect(description.full_description_text).toContain("Comment how many you got right!");
    expect(description.full_description_text).toContain("Do you know which planet is the largest?");
    expect(description.char_count).toBeLessThanOrEqual(QUIZ_SHORT_DESCRIPTION_MAX_CHARS);
    expect(description.made_for_kids).toBe(true);
    expect(description.primary_keyword).toBe("planet quiz");
  });

  it("falls back to the locale template when the model fails and keeps every locale within budget", async () => {
    const f = await fixture();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const description = await generateQuizShortDescription({
      client: llmReturning(() => Promise.reject(new Error("offline"))),
      channel: f.channel,
      quizShort: f.quizShort,
      quiz: f.quiz,
    });
    expect(description.full_description_text).toContain("Planet Sprint quiz: 5 quick questions!");
    expect(description.full_description_text).toContain(QUIZ_SHORT_SCORE_CTA_EN);
    expect(description.full_description_text).toContain(f.quiz.questions[0].question);
    expect(description.hashtags).toEqual(["#Shorts", "#quiz", "#trivia"]);

    for (const language of ["en", "de", "fr", "es", "it", "pt", "ja", "ko", "zh"] as const) {
      const locale = resolveQuizShortDescriptionLocale(language);
      const assembled = assembleQuizShortDescription({
        hookLines: locale.buildHookLines("Planet Sprint", 5),
        teaser: locale.buildTeaser(f.quiz.questions[0].question),
        scoreCta: locale.scoreCta,
        hashtags: locale.hashtags,
      });
      expect(assembled.charCount).toBeLessThanOrEqual(QUIZ_SHORT_DESCRIPTION_MAX_CHARS);
      expect(assembled.hashtags.slice(0, 2)).toEqual(["#Shorts", "#quiz"]);
    }
  });

  it("writes the Quiz Short description and title artifacts through the stage", async () => {
    const f = await fixture();
    const llm: LLMClient = {
      connect: vi.fn(async () => undefined),
      generateContent: vi.fn(async (prompt: string) => ({
        text: prompt.includes("Write exactly ONE YouTube video title")
          ? JSON.stringify({ title: "Planet Sprint Quiz: Can You Beat All 5?", primary_keyword: "planet sprint quiz" })
          : LLM_JSON,
      })),
    };
    const result = await generateProductDescription({
      repository: f.repository,
      config: { audio_generation: DEFAULT_CONFIG.audio_generation },
      channelId: f.channelId,
      episodeId: f.quizShortId,
      product: f.ref,
      codexClient: llm as never,
    });
    expect(result.title?.title).toBe("Planet Sprint Quiz: Can You Beat All 5? #Shorts");
    expect(result.description.primary_keyword).toBe("planet sprint quiz");
    expect(result.artifact_path).toBe(`channels/${f.channel.slug}/quiz_shorts/${f.quizShort.slug}/quiz/video-description.json`);
    expect(await f.repository.readVideoDescription(f.channelId, f.ref)).toMatchObject({ char_count: result.description.char_count });
  });
});

import { describe, expect, it } from "vitest";
import type { Episode, VideoTitle } from "@studio/shared";
import { buildQuizAnswerKeys, compileVideoDescriptionPrompt, generateVideoDescription } from "../src/quiz/description/index.js";
import {
  buildFallbackTitle,
  generateVideoTitle,
  isNearDuplicateTitle,
  resolveTitleSubject,
  reviewTitleDraft,
  sanitizeVideoTitle,
  type TitleReviewContext,
} from "../src/quiz/title/index.js";
import { createScriptedLlmClient, metadataChannel, metadataEpisode, metadataQuiz } from "./fixtures/videoMetadataFixtures.js";

const GOOD_TITLE = "Ancient Wonders Quiz: 2 Questions Only Experts Get Right";
const goodTitleResponse = JSON.stringify({ title: GOOD_TITLE, primary_keyword: "ancient wonders quiz" });

const reviewContext: TitleReviewContext = {
  questionCount: 2,
  recentTitles: [],
  answerKeys: buildQuizAnswerKeys(metadataQuiz),
};

function issueCodes(title: string, primaryKeyword: string, context: Partial<TitleReviewContext> = {}) {
  return reviewTitleDraft({ title, primaryKeyword }, { ...reviewContext, ...context }).map((issue) => issue.code);
}

describe("Video title validator", () => {
  it("strips characters YouTube rejects and wasted title space", () => {
    expect(sanitizeVideoTitle(`"Ancient <Wonders> Quiz: 2 Questions #quiz #trivia."`)).toBe("Ancient Wonders Quiz: 2 Questions");
  });

  it("accepts a keyword-first title with the exact question count", () => {
    expect(issueCodes(GOOD_TITLE, "ancient wonders quiz")).toEqual([]);
  });

  it("blocks titles over the YouTube limit", () => {
    expect(issueCodes(`Ancient Wonders Quiz: 2 Questions ${"very ".repeat(20)}hard`, "ancient wonders quiz")).toContain("TOO_LONG");
  });

  it("flags a keyword that is missing or buried at the end", () => {
    expect(issueCodes("Can You Beat These 2 Questions?", "ancient wonders quiz")).toContain("KEYWORD_MISSING");
    expect(issueCodes("Can You Answer All 2 Of These Tricky Questions About The Ancient Wonders Quiz", "ancient wonders quiz")).toContain(
      "KEYWORD_NOT_FRONT_LOADED",
    );
  });

  it("flags a missing question count and shouting", () => {
    expect(issueCodes("Ancient Wonders Quiz: Only Experts Get Right", "ancient wonders quiz")).toContain("QUESTION_COUNT_MISSING");
    expect(issueCodes("Ancient Wonders Quiz: 2 INSANELY HARD Questions", "ancient wonders quiz")).toContain("SHOUTING");
  });

  it("blocks titles that reveal a correct answer", () => {
    expect(issueCodes("Ancient Wonders Quiz: 2 Questions About Egypt", "ancient wonders quiz")).toContain("SPOILER");
  });

  it("blocks near-duplicates of recent channel titles", () => {
    expect(isNearDuplicateTitle("Ancient Wonders Quiz - 2 Questions Only Experts Get Right!", GOOD_TITLE)).toBe(true);
    expect(isNearDuplicateTitle("Space Exploration Quiz: 10 Questions", GOOD_TITLE)).toBe(false);
    expect(issueCodes(GOOD_TITLE, "ancient wonders quiz", { recentTitles: [GOOD_TITLE] })).toContain("DUPLICATE_OF_RECENT");
  });
});

describe("Video title fallback", () => {
  it("builds a keyword-first English template from the topic subject", () => {
    expect(buildFallbackTitle("en", metadataEpisode, 2)).toEqual({
      title: "Ancient Wonders of the World Quiz: 2 Questions - How Many Can You Get Right?",
      primaryKeyword: "ancient wonders of the world quiz",
    });
  });

  it("skips format noise segments when resolving the subject", () => {
    const episode: Episode = { ...metadataEpisode, topic: { ...metadataEpisode.topic, title: "Trivia: Space Exploration - Part 2" } };
    expect(resolveTitleSubject(episode)).toBe("Space Exploration");
  });

  it("localizes the template for CJK languages", () => {
    expect(buildFallbackTitle("ja", metadataEpisode, 10).title).toContain("全10問");
  });
});

describe("generateVideoTitle", () => {
  const baseDeps = { channel: metadataChannel, episode: metadataEpisode, quiz: metadataQuiz };

  it("returns the LLM title when it passes every check", async () => {
    const { client, prompts } = createScriptedLlmClient([goodTitleResponse]);
    const title = await generateVideoTitle({
      ...baseDeps,
      client,
      thumbnailHookText: "ONLY 1% PASS",
      recentTitles: ["Space Exploration Quiz: 10 Questions"],
    });

    expect(title).toMatchObject({ title: GOOD_TITLE, primary_keyword: "ancient wonders quiz", source: "llm", char_count: GOOD_TITLE.length });
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain(`Thumbnail Text (already printed on the thumbnail): "ONLY 1% PASS"`);
    expect(prompts[0]).toContain("- Space Exploration Quiz: 10 Questions");
    expect(prompts[0]).not.toContain("Egypt (correct)");
  });

  it("asks for one corrective rewrite when the draft spoils an answer", async () => {
    const spoiler = JSON.stringify({ title: "Ancient Wonders Quiz: 2 Questions About Egypt", primary_keyword: "ancient wonders quiz" });
    const { client, prompts } = createScriptedLlmClient([spoiler, goodTitleResponse]);
    const title = await generateVideoTitle({ ...baseDeps, client });

    expect(title.title).toBe(GOOD_TITLE);
    expect(prompts[1]).toContain("[CORRECTION REQUIRED]");
    expect(prompts[1]).toContain("SPOILER");
  });

  it("keeps a draft whose remaining issues are advisory after the rewrite", async () => {
    const noCount = JSON.stringify({ title: "Ancient Wonders Quiz: Only Experts Get These Right", primary_keyword: "ancient wonders quiz" });
    const { client, prompts } = createScriptedLlmClient([noCount]);
    const title = await generateVideoTitle({ ...baseDeps, client });

    expect(prompts).toHaveLength(2);
    expect(title).toMatchObject({ title: "Ancient Wonders Quiz: Only Experts Get These Right", source: "llm" });
  });

  it("falls back to the template when the LLM never returns a usable title", async () => {
    const { client } = createScriptedLlmClient(["Sorry, I cannot help with that."]);
    const title = await generateVideoTitle({ ...baseDeps, client });

    expect(title.source).toBe("fallback");
    expect(title.title).toBe("Ancient Wonders of the World Quiz: 2 Questions - How Many Can You Get Right?");
  });
});

describe("Description alignment with the video title", () => {
  const llmTitle: VideoTitle = {
    title: GOOD_TITLE,
    primary_keyword: "ancient wonders quiz",
    char_count: GOOD_TITLE.length,
    language: "English",
    source: "llm",
    generated_at: "2026-10-01T00:00:00.000Z",
  };

  it("locks the description keyword to an LLM or manual title", () => {
    const prompt = compileVideoDescriptionPrompt({ quiz: metadataQuiz, channel: metadataChannel, episode: metadataEpisode, videoTitle: llmTitle });
    expect(prompt).toContain(`YouTube Video Title (shown directly above the description): "${GOOD_TITLE}"`);
    expect(prompt).toContain(`The primary keyword is locked to "ancient wonders quiz"`);
    expect(prompt).toContain("Line 1 must not simply repeat the video title");
  });

  it("does not lock the keyword of a template fallback title", () => {
    const prompt = compileVideoDescriptionPrompt({
      quiz: metadataQuiz,
      channel: metadataChannel,
      episode: metadataEpisode,
      videoTitle: { ...llmTitle, source: "fallback" },
    });
    expect(prompt).not.toContain("is locked to");
    expect(prompt).toContain("Identify the main niche topic");
  });

  it("stores the title keyword as the description primary keyword", async () => {
    const { client } = createScriptedLlmClient([
      JSON.stringify({
        topic_category: "Ancient Wonders",
        primary_keyword: "world wonders trivia",
        hook_lines: "Ancient wonders quiz time!\nHow well do you know the old world?\nTwo questions await.",
        semantic_paragraph: "Travel from the desert to the gardens of Babylon.",
        scoring_cta: { beginner: "Novice", intermediate: "Scholar", expert: "Master", cta_text: "Comment your score!" },
        suggested_playlist_category: "History Quizzes",
        hashtags: ["#quiz", "#history"],
      }),
    ]);
    const description = await generateVideoDescription({
      client,
      channel: metadataChannel,
      episode: metadataEpisode,
      quiz: metadataQuiz,
      videoTitle: llmTitle,
    });
    expect(description.primary_keyword).toBe("ancient wonders quiz");
  });
});

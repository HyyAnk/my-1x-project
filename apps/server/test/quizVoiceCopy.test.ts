import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import { resolveQuizVoiceCopy } from "../src/quiz/audio/voiceCopy.js";
import { performancePhrases } from "../src/quiz/audio/voicePlan.js";

describe("Quiz Voice Copy & Tone Engine (Stage 2)", () => {
  describe("Question 1 prefix rules", () => {
    it("prepends 'First question: ' only to question 1 in English", () => {
      const copy = resolveQuizVoiceCopy("en");
      const q1 = copy.question(1, "Which sports brand uses this famous swoosh mark?");
      assert.equal(q1, "First question: Which sports brand uses this famous swoosh mark?");

      const q2 = copy.question(2, "Which brand features three parallel stripes?");
      assert.equal(q2, "Which brand features three parallel stripes?");

      const q8 = copy.question(8, "What is the final iconic logo?");
      assert.equal(q8, "What is the final iconic logo?");
    });

    it("does not double-prefix if question 1 already has a prefix", () => {
      const copy = resolveQuizVoiceCopy("en");
      assert.equal(
        copy.question(1, "First question: Which sports brand uses this swoosh?"),
        "First question: Which sports brand uses this swoosh?",
      );
      assert.equal(
        copy.question(1, "Question 1: Which sports brand uses this swoosh?"),
        "Question 1: Which sports brand uses this swoosh?",
      );
    });

    it("prepends Chinese prefix only to question 1 in Chinese", () => {
      const copy = resolveQuizVoiceCopy("zh");
      const q1 = copy.question(1, "哪个运动品牌使用了著名的旋风标志？");
      assert.equal(q1, "第一题：哪个运动品牌使用了著名的旋风标志？");

      const q2 = copy.question(2, "哪个品牌以三条平行条纹闻名？");
      assert.equal(q2, "哪个品牌以三条平行条纹闻名？");
    });
  });

  describe("Topic teaser generation", () => {
    it("generates natural English topic teasers with count and topic", () => {
      const copy = resolveQuizVoiceCopy("en", "ep_seed_123");
      const teaser = copy.topicTeaser(8, "Global Fashion Mystery");
      assert.match(teaser, /8/);
      assert.match(teaser, /Global Fashion Mystery/);
      assert.ok(teaser.length > 20);
    });

    it("generates natural Chinese topic teasers with count and topic", () => {
      const copy = resolveQuizVoiceCopy("zh", "ep_seed_123");
      const teaser = copy.topicTeaser(10, "全球时尚之谜");
      assert.match(teaser, /10/);
      assert.match(teaser, /全球时尚之谜/);
    });
  });

  describe("Subscribe Call-To-Action generation", () => {
    it("generates dynamic subscribe CTA with channel name", () => {
      const copy = resolveQuizVoiceCopy("en");
      const cta = copy.subscribeCta("Felix Quiz");
      assert.match(cta, /Felix Quiz/);
      assert.match(cta, /subscribe/i);
    });

    it("allows custom CTA text override when provided", () => {
      const copy = resolveQuizVoiceCopy("en");
      const custom = "Make sure to subscribe to Felix right now for awesome daily trivia!";
      assert.equal(copy.subscribeCta("Felix", custom), custom);
    });

    it("generates Chinese subscribe CTA with channel name", () => {
      const copy = resolveQuizVoiceCopy("zh");
      const cta = copy.subscribeCta("菲利克斯频道");
      assert.match(cta, /菲利克斯频道/);
      assert.match(cta, /订阅/);
    });
  });

  describe("Phonetic performance phrasing for bridge scenes", () => {
    it("creates performance phrases with natural delivery and pauses for intro_topic", () => {
      const text = "Today we have 8 exciting questions about Global Fashion! Can you guess them all?";
      const phrases = performancePhrases(text, "intro_topic");
      assert.ok(phrases.length >= 2);
      assert.equal(phrases[0].delivery, "warm");
      assert.equal(phrases[0].pause_after, "phrase");
      assert.equal(phrases.at(-1)?.pause_after, "none");
    });

    it("creates performance phrases with pause after introductory clause for intro_cta", () => {
      const text = "Before we begin, don't forget to subscribe to Felix for more exciting quizzes!";
      const phrases = performancePhrases(text, "intro_cta");
      assert.ok(phrases.length >= 2);
      assert.equal(phrases[0].delivery, "playful");
      assert.equal(phrases[0].pause_after, "phrase");
      assert.equal(phrases.at(-1)?.pause_after, "none");
    });

    it("assigns emphasis delivery and none pause to the final kickoff phrase in intro_cta", () => {
      const text = "Smash that subscribe button right now for Felix! Let's go!";
      const phrases = performancePhrases(text, "intro_cta");
      assert.ok(phrases.length >= 2);
      const kickoffPhrase = phrases.at(-1);
      assert.equal(kickoffPhrase?.text, "Let's go!");
      assert.equal(kickoffPhrase?.delivery, "emphasis");
      assert.equal(kickoffPhrase?.pause_after, "none");
    });

    it("includes kickoff callout in template subscribe CTA copy", () => {
      const copy = resolveQuizVoiceCopy("en", "ep_seed_cta");
      const cta = copy.subscribeCta("Felix Quiz");
      assert.match(cta, /(?:Let's go!|Here we go!|Let's do this!|Ready\? Let's go!)$/);
    });
  });
});


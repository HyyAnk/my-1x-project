import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { type QuizV2 } from "@studio/shared";
import { buildQuizVoicePlan, cleanTopicForSpeech } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";

function createMockQuiz(): QuizV2 {
  return {
    schema_version: 2,
    episode_id: "ep_test_bridge_01",
    age_band: "7-9",
    language: "en",
    questions: [
      {
        id: "q1",
        number: 1,
        question: "Which sports brand uses this famous swoosh mark?",
        format: "multiple_choice",
        difficulty: "easy",
        answer_mode: "single_reveal",
        correct_choice_id: "c1",
        choices: [{ id: "c1", text: "Nike" }],
        explanation: "Nike was named after the Greek goddess of victory.",
      },
      {
        id: "q2",
        number: 2,
        question: "Which brand is known for three parallel stripes?",
        format: "multiple_choice",
        difficulty: "easy",
        answer_mode: "single_reveal",
        correct_choice_id: "c2",
        choices: [{ id: "c2", text: "Adidas" }],
        explanation: "Adidas was founded by Adolf Dassler.",
      },
    ],
  };
}

describe("Quiz Voice Plan Bridge Segments Pipeline (Stage 3)", () => {
  it("cleans topics with subtitles for natural speech delivery", () => {
    assert.equal(
      cleanTopicForSpeech("Global Fashion Mystery Reveal: Can You Unmask the Iconic Brand?"),
      "Global Fashion Mystery Reveal",
    );
    assert.equal(
      cleanTopicForSpeech("Super Mario Bros - The Ultimate Mushroom Kingdom Quiz!"),
      "Super Mario Bros",
    );
    assert.equal(cleanTopicForSpeech("Animals of Africa"), "Animals of Africa");
    assert.equal(cleanTopicForSpeech(""), "today's quiz");
  });

  it("builds voice plan with bridge segments in expected sequence", () => {
    const quiz = createMockQuiz();
    const director = createDefaultDirectorPlan(quiz);
    const plan = buildQuizVoicePlan(quiz, {
      director,
      channelName: "Felix Quiz",
      topic: "Global Fashion Mystery",
      includeBridgeSegments: true,
    });

    const segmentIds = plan.segments.map((s) => s.segment_id);
    assert.equal(segmentIds[0], "intro");
    assert.equal(segmentIds[1], "intro_topic");
    assert.equal(segmentIds[2], "intro_cta");
    assert.equal(segmentIds[3], "q1:question");

    const topicSegment = plan.segments.find((s) => s.segment_id === "intro_topic");
    assert.ok(topicSegment);
    assert.equal(topicSegment.role, "intro_topic");
    assert.match(topicSegment.text, /Global Fashion Mystery/);
    assert.match(topicSegment.text, /2/);

    const ctaSegment = plan.segments.find((s) => s.segment_id === "intro_cta");
    assert.ok(ctaSegment);
    assert.equal(ctaSegment.role, "intro_cta");
    assert.match(ctaSegment.text, /Felix Quiz/);
  });

  it("preserves backward compatibility when bridge segments are not requested", () => {
    const quiz = createMockQuiz();
    const plan = buildQuizVoicePlan(quiz);

    const roles = plan.segments.map((s) => s.role);
    assert.ok(!roles.includes("intro_topic"));
    assert.ok(!roles.includes("intro_cta"));
    assert.equal(roles[0], "intro");
    assert.equal(roles[1], "question");
  });

  it("compiles quiz timeline cleanly when bridge voice segments are present", () => {
    const quiz = createMockQuiz();
    const director = createDefaultDirectorPlan(quiz);
    const plan = buildQuizVoicePlan(quiz, {
      director,
      channelName: "Felix Quiz",
      topic: "Global Fashion Mystery",
      includeBridgeSegments: true,
      skipIntro: true,
    });

    const timeline = compileQuizTimeline({
      quiz,
      director,
      voicePlan: plan,
      introDuration: 8.0,
      audioDurations: {
        intro_topic: 3.5,
        intro_cta: 3.2,
        "q1:question": 2.5,
        "q1:reveal": 1.5,
        "q1:explanation": 2.0,
        "q2:question": 2.5,
        "q2:reveal": 1.5,
        "q2:explanation": 2.0,
        outro: 3.0,
      },
    });

    assert.ok(timeline.duration_seconds > 0);
    const scheduledSegments = timeline.events
      .filter((e) => e.type === "narration.segment")
      .map((e) => e.segment_id);

    assert.ok(scheduledSegments.includes("intro_topic"));
    assert.ok(scheduledSegments.includes("intro_cta"));
  });
});

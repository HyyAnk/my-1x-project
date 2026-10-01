import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { QuizTimelineSchema, type QuizV2 } from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";

function createTestQuiz(): QuizV2 {
  return {
    schema_version: 2,
    episode_id: "ep_test_timeline_bridge",
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

describe("Quiz Timeline Bridge Scenes & Rhythm Engineering (Stage 4)", () => {
  it("compiles bridge scene events with exact breathing pauses and sequential ordering", () => {
    const quiz = createTestQuiz();
    const director = createDefaultDirectorPlan(quiz);
    const voicePlan = buildQuizVoicePlan(quiz, {
      director,
      channelName: "Felix Quiz",
      topic: "Global Fashion Mystery",
      includeBridgeSegments: true,
      skipIntro: true,
      skipOutro: true,
    });

    const audioDurations = {
      intro_topic: 3.5,
      intro_cta: 2.8,
      "q1:question": 2.5,
      "q1:reveal": 1.5,
      "q1:explanation": 2.0,
      "q2:question": 2.5,
      "q2:reveal": 1.5,
      "q2:explanation": 2.0,
    };

    const introVideoDuration = 8.0;
    const timeline = compileQuizTimeline({
      quiz,
      director,
      voicePlan,
      introDuration: introVideoDuration,
      audioDurations,
      channelName: "Felix Quiz",
      topic: "Global Fashion Mystery",
      bridgeConfig: {
        enabled: true,
        enableTopicScene: true,
        enableCtaScene: true,
        timing: {
          topicPauseSeconds: 2.0,
          ctaPauseSeconds: 0.5,
          transitionType: "stinger_swipe",
        },
      },
    });

    // 1. Must validate against QuizTimelineSchema
    QuizTimelineSchema.parse(timeline);

    // 2. Locate bridge events
    const topicEnter = timeline.events.find((e) => e.type === "bridge.topic.enter");
    assert.ok(topicEnter, "bridge.topic.enter event must exist");
    assert.equal(topicEnter.at_seconds, introVideoDuration);
    // duration = voice duration (3.5) + topic pause (2.0) + transition overlap (0.65) = 6.15s
    assert.equal(topicEnter.duration_seconds, 6.15);
    assert.equal(topicEnter.payload.topic, "Global Fashion Mystery");
    assert.equal(topicEnter.payload.questionCount, 2);

    const ctaEnter = timeline.events.find((e) => e.type === "bridge.cta.enter");
    assert.ok(ctaEnter, "bridge.cta.enter event must exist");
    // starts right after topic scene: 8.0 + 6.15 = 14.15s
    assert.equal(ctaEnter.at_seconds, 14.15);
    // duration = voice lead-in (0.4) + voice duration (2.8) + cta pause (0.5) + transition cut (0.55) = 4.25s
    assert.equal(ctaEnter.duration_seconds, 4.25);
    assert.equal(ctaEnter.payload.channelName, "Felix Quiz");

    // 3. Question 1 must start AFTER the bridge scenes end: 14.15 + 4.25 = 18.40s
    const q1Enter = timeline.events.find((e) => e.type === "question.enter" && e.question_id === "q1");
    assert.ok(q1Enter, "question.enter for q1 must exist");
    assert.ok(
      q1Enter.at_seconds >= 18.4,
      `Question 1 entrance (${q1Enter.at_seconds}s) must be at or after bridge completion (18.40s)`,
    );

    // 4. Check mascot state events during bridge scenes
    const mascotEvents = timeline.events.filter((e) => e.type === "mascot.state");
    const topicMascot = mascotEvents.find((e) => e.at_seconds === topicEnter.at_seconds);
    assert.ok(topicMascot, "Mascot state event should occur at topic scene start");
    assert.equal(topicMascot.payload.state, "wave");

    const ctaMascot = mascotEvents.find((e) => e.at_seconds === ctaEnter.at_seconds);
    assert.ok(ctaMascot, "Mascot state event should occur at CTA scene start");
    assert.equal(ctaMascot.payload.state, "cheer");

    // 5. Check synchronized SFX events during topic scene
    const topicSfxEvents = timeline.events.filter(
      (e) => e.type === "sfx.play" && e.segment_id === "intro_topic",
    );
    assert.equal(topicSfxEvents.length, 3, "Topic scene should schedule entrance, counter pop, and sparkle SFX");
    assert.equal(topicSfxEvents[0].at_seconds, topicEnter.at_seconds);
    assert.equal(topicSfxEvents[0].payload.sound, "transition_fast");
    assert.equal(topicSfxEvents[1].payload.sound, "ui_pop");
    assert.equal(topicSfxEvents[2].payload.sound, "correct_small");

    // 6. Check synchronized SFX events during CTA scene
    const ctaSfxEvents = timeline.events.filter(
      (e) => e.type === "sfx.play" && e.segment_id === "intro_cta",
    );
    assert.equal(ctaSfxEvents.length, 3, "CTA scene should schedule click, bell, and burst SFX (whoosh handled by stinger transition)");
    assert.equal(ctaSfxEvents[0].payload.sound, "ui_pop");
    assert.equal(ctaSfxEvents[0].payload.volume, 0.7);
    assert.equal(ctaSfxEvents[1].payload.sound, "correct_small");
    assert.equal(ctaSfxEvents[1].payload.volume, 0.65);
    assert.equal(ctaSfxEvents[2].payload.sound, "streak");
    assert.equal(ctaSfxEvents[2].payload.volume, 0.6);
  });

  it("preserves direct transition to question 1 when no bridge segments exist", () => {
    const quiz = createTestQuiz();
    const director = createDefaultDirectorPlan(quiz);
    const voicePlan = buildQuizVoicePlan(quiz, {
      director,
      skipIntro: true,
      skipOutro: true,
    });

    const introVideoDuration = 8.0;
    const timeline = compileQuizTimeline({
      quiz,
      director,
      voicePlan,
      introDuration: introVideoDuration,
      audioDurations: {
        "q1:question": 2.5,
        "q1:reveal": 1.5,
        "q1:explanation": 2.0,
        "q2:question": 2.5,
        "q2:reveal": 1.5,
        "q2:explanation": 2.0,
      },
    });

    QuizTimelineSchema.parse(timeline);

    const bridgeEvents = timeline.events.filter(
      (e) => e.type === "bridge.topic.enter" || e.type === "bridge.cta.enter",
    );
    assert.equal(bridgeEvents.length, 0);

    const q1Enter = timeline.events.find((e) => e.type === "question.enter" && e.question_id === "q1");
    assert.ok(q1Enter);
    assert.equal(q1Enter.at_seconds, introVideoDuration);
  });
});

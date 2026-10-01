import { describe, expect, it } from "vitest";
import { QuizV2Schema } from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";

const testQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "bridge-composition-test",
  age_band: "7-9",
  language: "English",
  topic: {
    title: "World Landmarks & Wonders",
  },
  questions: [
    {
      id: "q-1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which monument is located in Paris?",
      choices: [
        { id: "c-1", text: "Eiffel Tower" },
        { id: "c-2", text: "Big Ben" },
        { id: "c-3", text: "Colosseum" },
      ],
      correct_choice_id: "c-1",
      explanation: "The Eiffel Tower is in Paris.",
      fun_fact: "It was built for the 1889 World's Fair.",
      source_ids: ["S01"],
      visual_opportunity: "Eiffel Tower",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

describe("Stage 7: HyperFrame DOM Composition for Bridge Scenes", () => {
  const styleContext = {
    imageStyle: "mixed" as const,
    thinkingBarStyle: "auto" as const,
    questionBoxStyle: "auto" as const,
    answerCardStyle: "auto" as const,
    counterStyle: "auto" as const,
    backgroundStyle: "auto" as const,
    paletteId: "auto" as const,
    topicWheelEnabled: false,
    musicStyle: "upbeat" as const,
    thumbnailRatio: "16:9" as const,
  };

  it("integrates Bridge Scene 1 and Bridge Scene 2 into the composition bundle when enabled", () => {
    const director = createDefaultDirectorPlan(testQuiz);
    const voicePlan = buildQuizVoicePlan(testQuiz, {
      skipIntro: true,
      includeTopicBridge: true,
      includeCtaBridge: true,
      channelName: "Felix Channel",
      topic: "World Landmarks & Wonders",
    });

    const timeline = compileQuizTimeline({
      quiz: testQuiz,
      director,
      voicePlan,
      introDuration: 4.5,
      bridgeConfig: {
        enabled: true,
        showTopicBriefing: true,
        showSubscribeCta: true,
      },
      channelName: "Felix Channel",
      topic: "World Landmarks & Wonders",
    });

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: testQuiz,
      director,
      timeline,
      styleContext,
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      introVideoPath: "./intro.mp4",
    });

    // 1. Verify Bridge Scene 1 & 2 Mount Points exist in index.html
    expect(bundle.html).toContain("candy-bridge-topic");
    expect(bundle.html).toContain("candy-bridge-cta");
    expect(bundle.html).toContain("quiz-q1-");

    // 2. Verify Bridge Scene 1 SubComposition content
    const topicFile = Object.entries(bundle.files).find(([name]) => name.includes("candy-bridge-topic"))?.[1];
    expect(topicFile).toBeDefined();
    expect(topicFile).toContain("World Landmarks &amp; Wonders");
    expect(topicFile).toContain("1 QUESTION");

    // 3. Verify Bridge Scene 2 SubComposition content
    const ctaFile = Object.entries(bundle.files).find(([name]) => name.includes("candy-bridge-cta"))?.[1];
    expect(ctaFile).toBeDefined();
    expect(ctaFile).toContain("Felix Channel");
    expect(ctaFile).toContain("SUBSCRIBE");
    expect(ctaFile).toContain("SUBSCRIBED");

    // 4. Verify Question 1 SubComposition content
    const q1File = Object.entries(bundle.files).find(([name]) => name.includes("quiz-q1-"))?.[1];
    expect(q1File).toBeDefined();
    expect(q1File).toContain("Which monument is located in Paris?");
  });

  it("preserves backward compatibility when bridge scenes are disabled or absent", () => {
    const director = createDefaultDirectorPlan(testQuiz);
    const voicePlan = buildQuizVoicePlan(testQuiz, { skipIntro: true });

    const timeline = compileQuizTimeline({
      quiz: testQuiz,
      director,
      voicePlan,
      introDuration: 4.0,
    });

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: testQuiz,
      director,
      timeline,
      styleContext,
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      introVideoPath: "./intro.mp4",
    });

    // Ensure bridge scenes are NOT present in mounts or files
    expect(bundle.html).not.toContain("candy-bridge-topic");
    expect(bundle.html).not.toContain("candy-bridge-cta");

    const bridgeFile = Object.keys(bundle.files).find((name) => name.includes("candy-bridge"));
    expect(bridgeFile).toBeUndefined();

    // Question 1 should still render normally
    expect(bundle.html).toContain("quiz-q1-");
    const q1File = Object.entries(bundle.files).find(([name]) => name.includes("quiz-q1-"))?.[1];
    expect(q1File).toBeDefined();
    expect(q1File).toContain("Which monument is located in Paris?");
  });

  it("overrides placeholder topic with input.topic when provided", () => {
    const director = createDefaultDirectorPlan(testQuiz);
    const voicePlan = buildQuizVoicePlan(testQuiz, {
      includeBridgeSegments: true,
      channelName: "Test Channel",
    });

    const timeline = compileQuizTimeline({
      quiz: testQuiz,
      director,
      voicePlan,
      bridgeConfig: { enabled: true },
    });

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: testQuiz,
      director,
      timeline,
      styleContext,
      topic: "Deep Sea Discoveries",
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: timeline.duration_seconds,
    });

    const topicFile = Object.entries(bundle.files).find(([name]) => name.includes("candy-bridge-topic"))?.[1];
    expect(topicFile).toBeDefined();
    expect(topicFile).toContain("Deep Sea Discoveries");
    expect(topicFile).not.toContain("Today&#39;s Quiz");
    expect(topicFile).not.toContain("Today's Quiz");
  });
});

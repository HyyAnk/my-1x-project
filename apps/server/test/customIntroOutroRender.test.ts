import { describe, expect, it } from "vitest";
import { QuizV2Schema } from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";

const testQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "custom-intro-outro-test",
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "q-1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "What is the capital of France?",
      choices: [
        { id: "c-1", text: "Paris" },
        { id: "c-2", text: "London" },
        { id: "c-3", text: "Berlin" },
      ],
      correct_choice_id: "c-1",
      explanation: "Paris is the capital of France.",
      fun_fact: "Paris is known as the City of Light.",
      source_ids: ["S01"],
      visual_opportunity: "Eiffel Tower",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

describe("Custom Intro/Outro Dynamic Timeline & Rendering", () => {
  it("buildQuizVoicePlan can omit intro or outro when custom video has audio", () => {
    const fullPlan = buildQuizVoicePlan(testQuiz);
    expect(fullPlan.segments.some((s) => s.role === "intro")).toBe(true);
    expect(fullPlan.segments.some((s) => s.role === "outro")).toBe(true);

    const skipIntroPlan = buildQuizVoicePlan(testQuiz, { skipIntro: true });
    expect(skipIntroPlan.segments.some((s) => s.role === "intro")).toBe(false);
    expect(skipIntroPlan.segments.some((s) => s.role === "outro")).toBe(true);

    const skipBothPlan = buildQuizVoicePlan(testQuiz, { skipIntro: true, skipOutro: true });
    expect(skipBothPlan.segments.some((s) => s.role === "intro")).toBe(false);
    expect(skipBothPlan.segments.some((s) => s.role === "outro")).toBe(false);
  });

  it("compileQuizTimeline dynamically respects custom intro and outro durations", () => {
    const director = createDefaultDirectorPlan(testQuiz);
    const voicePlan = buildQuizVoicePlan(testQuiz, { skipIntro: true, skipOutro: true });

    // Custom intro of 8.2s and outro of 10.5s
    const customTimeline = compileQuizTimeline({
      quiz: testQuiz,
      director,
      voicePlan,
      introDuration: 8.2,
      outroDuration: 10.5,
    });

    const q1Enter = customTimeline.events.find((e) => e.question_id === "q-1" && e.type === "question.enter");
    expect(q1Enter).toBeDefined();
    expect(q1Enter?.at_seconds).toBeCloseTo(8.2, 1);

    // Direct to quiz (introDuration = 0)
    const directTimeline = compileQuizTimeline({
      quiz: testQuiz,
      director,
      voicePlan,
      introDuration: 0,
      outroDuration: 0,
    });

    const directQ1Enter = directTimeline.events.find((e) => e.question_id === "q-1" && e.type === "question.enter");
    expect(directQ1Enter).toBeDefined();
    expect(directQ1Enter?.at_seconds).toBe(0);
  });

  it("buildCandyArcadeCompositionBundle renders custom intro/outro video clips and transitions", () => {
    const director = createDefaultDirectorPlan(testQuiz);
    const voicePlan = buildQuizVoicePlan(testQuiz, { skipIntro: true, skipOutro: true });
    const timeline = compileQuizTimeline({
      quiz: testQuiz,
      director,
      voicePlan,
      introDuration: 8.0,
      outroDuration: 10.0,
    });

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

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: testQuiz,
      director,
      timeline,
      styleContext,
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      introVideoPath: "./intro.mp4",
      outroVideoPath: "./outro.mp4",
      transitionType: "stinger_swipe",
    });

    // Sub-composition files
    expect(bundle.files["compositions/custom-intro.html"]).toBeDefined();
    expect(bundle.files["compositions/custom-intro.html"]).toContain('id="custom-intro-video-track"');
    expect(bundle.files["compositions/custom-intro.html"]).toContain('<video id="custom-intro-video-track" class="custom-intro-video" src="intro.mp4"');
    expect(bundle.files["compositions/custom-intro.html"]).toContain("transition-stinger");
    expect(bundle.files["compositions/custom-intro.html"]).toContain("stinger-slash");

    expect(bundle.files["compositions/custom-outro.html"]).toBeDefined();
    expect(bundle.files["compositions/custom-outro.html"]).toContain('id="custom-outro-video-track"');
    expect(bundle.files["compositions/custom-outro.html"]).toContain('<video id="custom-outro-video-track" class="custom-outro-video" src="outro.mp4"');

    // Mount points in index.html
    expect(bundle.html).toContain('data-composition-src="compositions/custom-intro.html"');
    expect(bundle.html).toContain('data-composition-src="compositions/custom-outro.html"');
  });

  it("falls back to standard intro/outro when no custom video paths are provided", () => {
    const director = createDefaultDirectorPlan(testQuiz);
    const voicePlan = buildQuizVoicePlan(testQuiz);
    const timeline = compileQuizTimeline({
      quiz: testQuiz,
      director,
      voicePlan,
    });

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

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: testQuiz,
      director,
      timeline,
      styleContext,
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: timeline.duration_seconds,
    });

    expect(bundle.files["compositions/candy-intro.html"]).toBeDefined();
    expect(bundle.html).toContain('data-composition-src="compositions/candy-intro.html"');
  });
});

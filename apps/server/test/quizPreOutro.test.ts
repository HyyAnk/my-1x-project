import { describe, expect, it } from "vitest";
import {
  BridgeSceneConfigSchema,
  QuizV2Schema,
} from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { preOutroClip } from "../src/quiz/render/candyArcade/preOutroClip.js";
import { celebrationStingerClip } from "../src/quiz/render/candyArcade/transitions/celebrationStingerClip.js";

const testQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "pre-outro-test-ep",
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "q1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "What is the capital of France?",
      choices: [
        { id: "c1", text: "Paris" },
        { id: "c2", text: "Rome" },
        { id: "c3", text: "Berlin" },
      ],
      correct_choice_id: "c1",
      explanation: "Paris is the capital of France.",
      fun_fact: "",
      source_ids: ["S1"],
      visual_opportunity: "Eiffel tower",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "q2",
      number: 2,
      format: "true_false",
      difficulty: 1,
      question: "Water boils at 100 degrees Celsius.",
      choices: [
        { id: "c1", text: "True" },
        { id: "c2", text: "False" },
      ],
      correct_choice_id: "c1",
      explanation: "Water boils at 100C at standard pressure.",
      fun_fact: "",
      source_ids: ["S2"],
      visual_opportunity: "Boiling water kettle",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

describe("Pre-Outro Celebration Pipeline", () => {
  it("generates pre_outro voice segment with exact phrasing and tone delivery", () => {
    const director = createDefaultDirectorPlan(testQuiz);
    const voicePlan = buildQuizVoicePlan(testQuiz, {
      director,
      channelName: "Quizzy Star",
      topic: "World Trivia",
      includeBridgeSegments: true,
      skipIntro: true,
      skipOutro: true,
    });

    const preOutroSegment = voicePlan.segments.find((s) => s.role === "pre_outro");
    expect(preOutroSegment).toBeDefined();
    expect(preOutroSegment?.text).toBe("And that's the end of this quiz series! I bet you did amazing today!");
    expect(preOutroSegment?.phrases.length).toBeGreaterThanOrEqual(1);

    // Verify custom pre-outro text override
    const customVoicePlan = buildQuizVoicePlan(testQuiz, {
      director,
      channelName: "Quizzy Star",
      topic: "World Trivia",
      includeBridgeSegments: true,
      customPreOutroText: "You are an absolute quiz champion today!",
    });
    const customSegment = customVoicePlan.segments.find((s) => s.role === "pre_outro");
    expect(customSegment?.text).toBe("You are an absolute quiz champion today!");
  });

  it("compiles timeline with pre_outro.enter, 0.5s pause after narration, and dual transitions", () => {
    const director = createDefaultDirectorPlan(testQuiz);
    const voicePlan = buildQuizVoicePlan(testQuiz, {
      director,
      channelName: "Quizzy Star",
      topic: "World Trivia",
      includeBridgeSegments: true,
      skipIntro: true,
      skipOutro: true,
    });

    const audioDurations = {
      intro_topic: 3.0,
      intro_cta: 2.5,
      "q1:question": 2.0,
      "q1:reveal": 1.2,
      "q1:explanation": 1.8,
      "q2:question": 2.0,
      "q2:reveal": 1.2,
      "q2:explanation": 1.8,
      pre_outro: 3.2,
    };

    const bridgeConfig = BridgeSceneConfigSchema.parse({
      enabled: true,
      enablePreOutroScene: true,
      timing: {
        preOutroPauseSeconds: 0.5,
      },
    });

    const timeline = compileQuizTimeline({
      quiz: testQuiz,
      director,
      voicePlan,
      audioDurations,
      bridgeConfig,
      channelName: "Quizzy Star",
      topic: "World Trivia",
      outroDuration: 10.0,
    });

    // 1. Verify pre_outro.enter event exists
    const preOutroEvent = timeline.events.find((e) => e.type === "pre_outro.enter");
    expect(preOutroEvent).toBeDefined();
    expect(preOutroEvent?.payload?.headline).toBe("FANTASTIC JOB!");
    expect(preOutroEvent?.payload?.speechText).toBe("And that's the end of this quiz series! I bet you did amazing today!");

    // 2. Verify total pre_outro duration is narration (3.2s) + pause (0.5s) = 3.7s
    expect(preOutroEvent?.duration_seconds).toBe(3.7);

    // 3. Verify transition 1: entering pre_outro
    const enterTransition = timeline.events.find(
      (e) => e.type === "transition.start" && e.payload?.instance_id === "question_to_pre_outro",
    );
    expect(enterTransition).toBeDefined();
    expect(enterTransition?.at_seconds).toBe(preOutroEvent?.at_seconds);

    // 4. Verify SFX events for celebration (party_popper and bubble_pop)
    const partyPopper = timeline.events.find((e) => e.type === "sfx.play" && e.payload?.name === "party_popper");
    expect(partyPopper).toBeDefined();
    const bubblePop = timeline.events.find((e) => e.type === "sfx.play" && e.payload?.name === "bubble_pop");
    expect(bubblePop).toBeDefined();

    // 5. Verify transition 2: exiting pre_outro into outro video
    const exitTransition = timeline.events.find(
      (e) => e.type === "transition.start" && e.payload?.instance_id === "pre_outro_to_outro",
    );
    expect(exitTransition).toBeDefined();
    const expectedOutroStart = Number((preOutroEvent!.at_seconds + preOutroEvent!.duration_seconds).toFixed(2));
    expect(exitTransition?.at_seconds).toBeCloseTo(expectedOutroStart, 1);

    // 6. Verify outro video event starts right after pre_outro
    const outroEvent = timeline.events.find((e) => e.segment_id === "outro");
    expect(outroEvent).toBeDefined();
    expect(outroEvent?.at_seconds).toBeCloseTo(expectedOutroStart, 1);
  });

  it("renders preOutroClip HTML with FANTASTIC JOB!, confetti, bubbles, and strictly zero mascot", () => {
    const markup = preOutroClip({
      start: 25.5,
      duration: 3.7,
      headline: "FANTASTIC JOB!",
    });

    expect(markup).toContain('id="candy-pre-outro"');
    expect(markup).toContain('class="clip candy-scene candy-pre-outro-scene"');
    expect(markup).toContain('data-start="25.500"');
    expect(markup).toContain('data-duration="3.700"');
    expect(markup).toContain("FANTASTIC JOB!");
    expect(markup).toContain("pre-outro-confetti");
    expect(markup).toContain("pre-outro-bubble");
    expect(markup).toContain("pre-outro-rays");
    expect(markup).toContain("pre-outro-sparkles");

    // Strictly verify no mascot is rendered inside pre-outro scene
    expect(markup).not.toContain("candy-mascot-container");
    expect(markup).not.toContain("mascot-stage");
    expect(markup).not.toContain("candy-mascot-sprite");
  });

  it("assembles complete video bundle containing pre-outro scene before outro clip", () => {
    const director = createDefaultDirectorPlan(testQuiz);
    const voicePlan = buildQuizVoicePlan(testQuiz, {
      director,
      channelName: "Quizzy Star",
      topic: "World Trivia",
      includeBridgeSegments: true,
      skipIntro: true,
      skipOutro: true,
    });

    const audioDurations = {
      intro_topic: 3.0,
      intro_cta: 2.5,
      "q1:question": 2.0,
      "q1:reveal": 1.2,
      "q1:explanation": 1.8,
      "q2:question": 2.0,
      "q2:reveal": 1.2,
      "q2:explanation": 1.8,
      pre_outro: 3.2,
    };

    const bridgeConfig = BridgeSceneConfigSchema.parse({
      enabled: true,
      enablePreOutroScene: true,
      timing: { preOutroPauseSeconds: 0.5 },
    });

    const timeline = compileQuizTimeline({
      quiz: testQuiz,
      director,
      voicePlan,
      audioDurations,
      bridgeConfig,
      channelName: "Quizzy Star",
      topic: "World Trivia",
      outroDuration: 10.0,
    });

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: testQuiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      outroVideoPath: "/tmp/outro_mascot_10s.mp4",
      outroHasAudio: true,
    });

    // Check bundle HTML mounts candy-pre-outro
    expect(bundle.html).toContain('data-composition-src="compositions/candy-pre-outro.html"');

    // Check composition file contents
    const preOutroFile = bundle.files["compositions/candy-pre-outro.html"];
    expect(preOutroFile).toBeDefined();
    expect(preOutroFile).toContain("FANTASTIC JOB!");
    expect(preOutroFile).toContain("pre-outro-confetti");
    expect(preOutroFile).toContain("pre-outro-bubble");

    // Check that custom outro video is mounted after pre-outro
    expect(bundle.html).toContain('data-composition-src="compositions/custom-outro.html"');
    const outroFile = bundle.files["compositions/custom-outro.html"];
    expect(outroFile).toBeDefined();
    expect(outroFile).toContain('id="custom-outro-video-track"');

    // Check that Celebration Stinger transition is mounted over the Pre-Outro -> Outro boundary
    expect(bundle.html).toContain('data-composition-src="compositions/pre_outro_to_outro.html"');
    const stingerFile = bundle.files["compositions/pre_outro_to_outro.html"];
    expect(stingerFile).toBeDefined();
    expect(stingerFile).toContain("transition-celebration-stinger");
    expect(stingerFile).toContain("ribbon-gold-primary");
    expect(stingerFile).toContain("ribbon-violet-secondary");
    expect(stingerFile).toContain("celebration-flash-burst");
    expect(stingerFile).toContain("celebration-star-badge");
    expect(stingerFile).toContain("celebration-sparkle-cluster");

    // Check that bundle CSS contains celebration stinger keyframes
    expect(bundle.html).toContain(".transition-celebration-stinger");
    expect(bundle.html).toContain("@keyframes celebration-ribbon-primary");
  });

  it("renders celebrationStingerClip markup with golden ribbons, apex flash, and sparkles on track 1", () => {
    const markup = celebrationStingerClip({
      start: 28.2,
      duration: 2.0,
      aspectRatio: "16:9",
      fromColor: "#F59E0B",
      toColor: "#7C3AED",
      accentColor: "#FEF08A",
    });

    expect(markup).toContain('class="clip candy-transition transition-celebration-stinger"');
    expect(markup).toContain('data-start="28.200"');
    expect(markup).toContain('data-duration="2.000"');
    expect(markup).toContain('data-track-index="1"');
    expect(markup).toContain('data-aspect-ratio="16:9"');
    expect(markup).toContain("--celebration-dur:2.000s;");
    expect(markup).toContain("--celebration-gold:#F59E0B;");
    expect(markup).toContain("--celebration-violet:#7C3AED;");
    expect(markup).toContain("--celebration-accent:#FEF08A;");
    expect(markup).toContain("ribbon-gold-primary");
    expect(markup).toContain("ribbon-violet-secondary");
    expect(markup).toContain("ribbon-gold-accent");
    expect(markup).toContain("celebration-flash-burst");
    expect(markup).toContain("celebration-star-badge");
    expect(markup).toContain("celebration-sparkle-cluster");
  });
});


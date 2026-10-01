import { describe, expect, it } from "vitest";
import { QuizV2Schema, type QuizTimeline } from "@studio/shared";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { resolveSfxSchedule } from "../src/quiz/audio/soundtrackSfxPlanner.js";
import { candyArcadeEnergyWhipStylesCss } from "../src/quiz/render/candyArcade/styles/candyArcadeEnergyWhipStyles.js";
import { candyArcadeBrandLogoStingerStylesCss } from "../src/quiz/render/candyArcade/styles/candyArcadeBrandLogoStingerStyles.js";

const sampleQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "reconciliation-test",
  age_band: "7-9",
  language: "English",
  topic: {
    title: "Space Exploration Wonders",
  },
  questions: [
    {
      id: "q-1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which planet is known as the Red Planet?",
      choices: [
        { id: "c-1", text: "Mars" },
        { id: "c-2", text: "Venus" },
        { id: "c-3", text: "Jupiter" },
      ],
      correct_choice_id: "c-1",
      explanation: "Mars appears red due to iron oxide.",
      fun_fact: "Mars has the largest volcano in the solar system.",
      source_ids: ["S01"],
      visual_opportunity: "Mars surface",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
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

describe("Phase 3: Timeline & Pipeline Auto-Reconciliation Verification", () => {
  it("auto-reconciles missing bridge transition events and synchronized SFX on legacy timelines", () => {
    const director = createDefaultDirectorPlan(sampleQuiz);

    // Legacy timeline with bridge scenes but completely missing transition.start and stinger SFX
    const legacyTimeline: QuizTimeline = {
      duration_seconds: 30,
      events: [
        {
          event_id: "topic_enter",
          question_id: null,
          choice_id: null,
          segment_id: "topic",
          type: "bridge.topic.enter",
          at_seconds: 5.0,
          duration_seconds: 6.0,
          payload: { topic: "Space Exploration Wonders" },
        },
        {
          event_id: "cta_enter",
          question_id: null,
          choice_id: null,
          segment_id: "cta",
          type: "bridge.cta.enter",
          at_seconds: 11.0,
          duration_seconds: 5.0,
          payload: { channelName: "Space Kids" },
        },
        {
          event_id: "q1_enter",
          question_id: "q-1",
          choice_id: null,
          segment_id: "q1",
          type: "question.enter",
          at_seconds: 16.0,
          duration_seconds: 12.0,
        },
      ],
    };

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: sampleQuiz,
      director,
      timeline: legacyTimeline,
      styleContext,
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: 30,
    });

    // 1. Verify HTML clips are mounted with proper data-track-index and z-index context
    expect(bundle.html).toContain('id="bridge_topic_to_cta-mount"');
    expect(bundle.html).toContain("transition-brand-logo-stinger");
    expect(bundle.html).toContain('id="bridge_cta_to_question-mount"');
    expect(bundle.html).toContain("transition-energy-whip");
    expect(bundle.html).toContain('data-track-index="1"');

    // 2. Verify sub-composition files contain both transitions
    const stingerFile = Object.entries(bundle.files).find(([name]) => name.includes("bridge_topic_to_cta"))?.[1];
    expect(stingerFile).toBeDefined();
    expect(stingerFile).toContain("brand-stinger-slash slash-primary");

    const whipFile = Object.entries(bundle.files).find(([name]) => name.includes("bridge_cta_to_question"))?.[1];
    expect(whipFile).toBeDefined();
    expect(whipFile).toContain("energy-whip-slash slash-primary");
  });

  it("suppresses duplicate generic transition SFX in soundtrack planner for both bridge transitions", () => {
    const timelineWithTransitions: QuizTimeline = {
      duration_seconds: 30,
      events: [
        {
          event_id: "transition_bridge_topic_to_cta",
          question_id: null,
          choice_id: null,
          segment_id: null,
          type: "transition.start",
          at_seconds: 10.35,
          duration_seconds: 1.3,
          payload: {
            intent: "stinger",
            transition_id: "brand_logo_stinger",
            instance_id: "bridge_topic_to_cta",
          },
        },
        {
          event_id: "transition_bridge_cta_to_question",
          question_id: null,
          choice_id: null,
          segment_id: null,
          type: "transition.start",
          at_seconds: 15.4,
          duration_seconds: 1.2,
          payload: {
            intent: "stinger",
            transition_id: "energy_whip",
            instance_id: "bridge_cta_to_question",
          },
        },
      ],
    };

    const sfxItems = resolveSfxSchedule(timelineWithTransitions.events);
    // Neither bridge_topic_to_cta nor bridge_cta_to_question should generate a generic soft transition splash
    const genericSplashes = sfxItems.filter(
      (item) => item.filename === "bubble_splash.wav" || item.filename === "lightning_brush.wav",
    );
    expect(genericSplashes).toHaveLength(0);
  });

  it("provides responsive styles for 9:16 vertical shorts across both transitions", () => {
    const whipCss = candyArcadeEnergyWhipStylesCss();
    expect(whipCss).toContain('.transition-energy-whip[data-aspect-ratio="9:16"] .energy-whip-slash.slash-secondary');
    expect(whipCss).toContain('.transition-energy-whip[data-aspect-ratio="9:16"] .energy-whip-slash.slash-accent');
    expect(whipCss).toContain('.transition-energy-whip[data-aspect-ratio="9:16"] .whip-spark');

    const stingerCss = candyArcadeBrandLogoStingerStylesCss();
    expect(stingerCss).toContain('.transition-brand-logo-stinger[data-aspect-ratio="9:16"] .brand-stinger-hero-badge');
    expect(stingerCss).toContain('.transition-brand-logo-stinger[data-aspect-ratio="9:16"] .brand-stinger-logo-frame');
  });
});

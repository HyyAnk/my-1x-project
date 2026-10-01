import { describe, expect, it } from "vitest";
import { QuizV2Schema } from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { resolveSfxSchedule } from "../src/quiz/audio/soundtrackSfxPlanner.js";

const sampleQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "phase4-stinger-test",
  age_band: "7-9",
  language: "English",
  topic: {
    title: "Space & Solar System",
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
        { id: "c-2", text: "Jupiter" },
        { id: "c-3", text: "Venus" },
      ],
      correct_choice_id: "c-1",
      explanation: "Mars appears red due to iron oxide.",
      fun_fact: "Mars has the tallest volcano in the solar system.",
      source_ids: ["S01"],
      visual_opportunity: "Mars surface",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

describe("Phase 4: Brand Logo Stinger Composition Integration & Audio Harmonization", () => {
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

  it("mounts brand logo stinger clip on track index 1 across the bridge boundary", () => {
    const director = createDefaultDirectorPlan(sampleQuiz);
    const voicePlan = buildQuizVoicePlan(sampleQuiz, {
      skipIntro: true,
      includeTopicBridge: true,
      includeCtaBridge: true,
      channelName: "Cosmo Quiz",
      topic: "Space & Solar System",
    });

    const timeline = compileQuizTimeline({
      quiz: sampleQuiz,
      director,
      voicePlan,
      introDuration: 3.0,
      bridgeConfig: {
        enabled: true,
        showTopicBriefing: true,
        showSubscribeCta: true,
        topicPauseSeconds: 0.5,
        stingerDurationSeconds: 1.0,
      },
      channelName: "Cosmo Quiz",
      topic: "Space & Solar System",
    });

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: sampleQuiz,
      director,
      timeline,
      styleContext,
      audioPath: "./narration.wav",
      premixedAudio: false,
      narrationDurationSeconds: timeline.duration_seconds,
      brandIdentity: {
        channelName: "Cosmo Quiz",
        fallbackInitial: "C",
        hasCustomLogo: false,
      },
    });

    // 1. Stinger is mounted in main HTML with track 1
    expect(bundle.html).toContain("transition-brand-logo-stinger");
    expect(bundle.html).toContain('data-track-index="1"');

    // 2. Subcomposition file exists with dynamic stinger elements
    const stingerFile = Object.entries(bundle.files).find(
      ([path, content]) => content.includes("transition-brand-logo-stinger"),
    )?.[1];
    expect(stingerFile).toBeDefined();
    expect(stingerFile).toContain("brand-stinger-backdrop");
    expect(stingerFile).toContain("slash-primary");
    expect(stingerFile).toContain("slash-secondary");
    expect(stingerFile).toContain("slash-accent");
    expect(stingerFile).toContain("brand-stinger-flash");
    expect(stingerFile).toContain("Cosmo Quiz");
    expect(stingerFile).toContain("brand-stinger-fallback-badge");
    expect(stingerFile).toContain("brand-lettermark-text");

    // 3. Audio tags in HTML contain synchronized stinger SFX without duplicate whooshes
    expect(bundle.html).toContain("lightning_brush.wav");
    expect(bundle.html).toContain("correct_ding.wav");

    const stingerTransition = timeline.events.find(
      (e) => e.type === "transition.start" && e.payload?.instance_id === "bridge_topic_to_cta",
    );
    expect(stingerTransition).toBeDefined();
    const stingerTimeMs = Math.round(stingerTransition!.at_seconds * 1000);

    // Stinger whoosh from sfx.play is present
    expect(bundle.html).toContain(`id="sfx-sfx-play-${stingerTimeMs}"`);
    // Duplicate whoosh from transition.start is cleanly omitted
    expect(bundle.html).not.toContain(`id="sfx-transition-start-${stingerTimeMs}"`);
  });

  it("renders custom logo image in stinger subcomposition when available", () => {
    const director = createDefaultDirectorPlan(sampleQuiz);
    const voicePlan = buildQuizVoicePlan(sampleQuiz, {
      skipIntro: true,
      includeTopicBridge: true,
      includeCtaBridge: true,
      channelName: "Astro Studio",
      topic: "Space & Solar System",
    });

    const timeline = compileQuizTimeline({
      quiz: sampleQuiz,
      director,
      voicePlan,
      introDuration: 3.0,
      bridgeConfig: {
        enabled: true,
        showTopicBriefing: true,
        showSubscribeCta: true,
      },
      channelName: "Astro Studio",
      topic: "Space & Solar System",
    });

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: sampleQuiz,
      director,
      timeline,
      styleContext,
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      brandIdentity: {
        channelName: "Astro Studio",
        fallbackInitial: "A",
        hasCustomLogo: true,
        logoRelativeUrl: "./brand/logo.png",
      },
    });

    const stingerFile = Object.entries(bundle.files).find(
      ([path, content]) => content.includes("transition-brand-logo-stinger"),
    )?.[1];
    expect(stingerFile).toBeDefined();
    expect(stingerFile).toContain("brand-stinger-logo-img");
    expect(stingerFile).toContain('src="brand/logo.png"');
    expect(stingerFile).toContain("Astro Studio");
  });

  it("schedules stinger audio beats cleanly in soundtrackSfxPlanner", () => {
    const director = createDefaultDirectorPlan(sampleQuiz);
    const voicePlan = buildQuizVoicePlan(sampleQuiz, {
      skipIntro: true,
      includeTopicBridge: true,
      includeCtaBridge: true,
      channelName: "Nova Channel",
      topic: "Space & Solar System",
    });

    const timeline = compileQuizTimeline({
      quiz: sampleQuiz,
      director,
      voicePlan,
      introDuration: 3.0,
      bridgeConfig: {
        enabled: true,
        showTopicBriefing: true,
        showSubscribeCta: true,
        topicPauseSeconds: 0.5,
        stingerDurationSeconds: 1.0,
      },
      channelName: "Nova Channel",
      topic: "Space & Solar System",
    });

    const stingerTransitionEvent = timeline.events.find(
      (e) => e.type === "transition.start" && e.payload?.instance_id === "bridge_topic_to_cta",
    );
    expect(stingerTransitionEvent).toBeDefined();
    const stingerStartTime = stingerTransitionEvent!.at_seconds;

    // Mock candidate directories so planner resolves paths
    const sfxSchedule = resolveSfxSchedule(timeline.events, [process.cwd()], {
      "sfx:lightning_brush": "./sfx/lightning_brush.wav",
      "sfx:correct_ding": "./sfx/correct_ding.wav",
      "sfx:ui_pop": "./sfx/ui_pop.wav",
    });

    const stingerWhoosh = sfxSchedule.find(
      (item) => item.intent === "transition_fast" && Math.abs(item.startSeconds - stingerStartTime) < 0.1,
    );
    const expectedOffset = Number((1.3 * 0.45).toFixed(2));
    const stingerDing = sfxSchedule.find(
      (item) => item.intent === "correct_small" && Math.abs(item.startSeconds - (stingerStartTime + expectedOffset)) < 0.1,
    );

    expect(stingerWhoosh).toBeDefined();
    expect(stingerDing).toBeDefined();
    // Midpoint impact is ~0.59s after entrance whoosh
    expect(stingerDing!.startSeconds - stingerWhoosh!.startSeconds).toBeCloseTo(expectedOffset, 1);
  });
});

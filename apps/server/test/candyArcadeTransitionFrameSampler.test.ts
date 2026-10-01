import { describe, expect, it } from "vitest";
import { QuizV2Schema } from "@studio/shared";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import {
  buildCandyArcadeCompositionBundle,
  brandLogoStingerClip,
  energyWhipStingerClip,
  toSubComposition,
  subCompositionMount,
} from "../src/quiz/render/candyArcadeComposition.js";
import { candyArcadeBrandLogoStingerStylesCss } from "../src/quiz/render/candyArcade/styles/candyArcadeBrandLogoStingerStyles.js";
import { candyArcadeEnergyWhipStylesCss } from "../src/quiz/render/candyArcade/styles/candyArcadeEnergyWhipStyles.js";

const specimenQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "qa-frame-sampler-specimen",
  age_band: "7-9",
  language: "English",
  topic: {
    title: "Galactic Space Wonders",
  },
  questions: [
    {
      id: "q-1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which galaxy is closest to our Milky Way?",
      choices: [
        { id: "c-1", text: "Andromeda" },
        { id: "c-2", text: "Triangulum" },
        { id: "c-3", text: "Sombrero" },
      ],
      correct_choice_id: "c-1",
      explanation: "Andromeda is approximately 2.5 million light-years away.",
      fun_fact: "Andromeda contains roughly one trillion stars!",
      source_ids: ["S01"],
      visual_opportunity: "Spiral galaxy in deep space",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

const specimenStyleContext = {
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

describe("Phase 4: Headless Frame Verification & QA Sign-off", () => {
  describe("Specimen 1: 16:9 Landscape Composition Verification", () => {
    const director = createDefaultDirectorPlan(specimenQuiz);
    const voicePlan = buildQuizVoicePlan(specimenQuiz, {
      skipIntro: true,
      includeTopicBridge: true,
      includeCtaBridge: true,
      channelName: "Galaxy Club",
      topic: "Galactic Space Wonders",
    });

    const timeline = compileQuizTimeline({
      quiz: specimenQuiz,
      director,
      voicePlan,
      introDuration: 3.0,
      bridgeConfig: {
        enabled: true,
        showTopicBriefing: true,
        showSubscribeCta: true,
      },
      channelName: "Galaxy Club",
      topic: "Galactic Space Wonders",
    });

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: specimenQuiz,
      director,
      timeline,
      styleContext: specimenStyleContext,
      aspectRatio: "16:9",
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      brandIdentity: {
        channelName: "Galaxy Club",
        fallbackInitial: "G",
        hasCustomLogo: false,
      },
    });

    it("mounts both bridge transitions on overlay track 1 with precise CSS variable bindings", () => {
      // Transition 1: Brand Logo Stinger Mount
      expect(bundle.html).toContain('id="bridge_topic_to_cta-mount"');
      expect(bundle.html).toContain('data-track-index="1"');
      expect(bundle.html).toContain("transition-brand-logo-stinger");

      // Transition 2: Energy Whip Mount
      expect(bundle.html).toContain('id="bridge_cta_to_question-mount"');
      expect(bundle.html).toContain("transition-energy-whip");

      // Verify sub-composition templates exist in files bundle
      const stingerTemplate = Object.entries(bundle.files).find(([k]) => k.includes("bridge_topic_to_cta"))?.[1];
      expect(stingerTemplate).toBeDefined();
      expect(stingerTemplate).toContain("--clip-start:");
      expect(stingerTemplate).toContain("--trans-dur:1.300s");
      expect(stingerTemplate).toContain('class="brand-stinger-content"');
      expect(stingerTemplate).toContain('class="brand-lettermark-text">G</span>');

      const whipTemplate = Object.entries(bundle.files).find(([k]) => k.includes("bridge_cta_to_question"))?.[1];
      expect(whipTemplate).toBeDefined();
      expect(whipTemplate).toContain("--clip-start:");
      expect(whipTemplate).toContain("--whip-dur:1.200s");
      expect(whipTemplate).toContain('class="energy-whip-backdrop"');
    });

    it("verifies Brand Logo Stinger CSS keyframe stages (Entry -> Peak -> Exit)", () => {
      const css = candyArcadeBrandLogoStingerStylesCss();

      // Top-level animation uses linear to honor per-keyframe easing
      expect(css).toMatch(/stinger-slash-primary\s+var\(--trans-dur,\s*1\.3s\)\s+linear\s+var\(--clip-start,\s*0s\)\s+both/);

      // Entry phase: skew and translation into center with steep ease-out
      expect(css).toMatch(/0%\s*\{[\s\S]*?transform:\s*skewX\(-22deg\)\s+translate3d\(-160%,\s*0,\s*0\);/);
      expect(css).toMatch(/0%\s*\{[\s\S]*?animation-timing-function:\s*cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\);/);

      // Midpoint hold: primary curtain fully occludes the screen at 38%-62%
      expect(css).toMatch(/38%\s*\{[\s\S]*?transform:\s*skewX\(-22deg\)\s+translate3d\(0,\s*0,\s*0\);/);
      expect(css).toMatch(/62%\s*\{[\s\S]*?transform:\s*skewX\(-22deg\)\s+translate3d\(0,\s*0,\s*0\);/);

      // Exit phase: accelerates offscreen with cubic-bezier(0.35, 0, 0.15, 1)
      expect(css).toMatch(/62%\s*\{[\s\S]*?animation-timing-function:\s*cubic-bezier\(0\.35,\s*0,\s*0\.15,\s*1\);/);
      expect(css).toMatch(/100%\s*\{[\s\S]*?transform:\s*skewX\(-22deg\)\s+translate3d\(160%,\s*0,\s*0\);/);
    });

    it("verifies Energy Whip CSS keyframe stages (Entry -> Apex Ribbon Hold -> Exit)", () => {
      const css = candyArcadeEnergyWhipStylesCss();

      // Top-level animation uses linear
      expect(css).toMatch(/whip-slash-primary\s+var\(--whip-dur,\s*1\.2s\)\s+linear\s+var\(--clip-start,\s*0s\)\s+both/);

      // Dis-occluded ribbons: primary is full curtain, secondary is 380px, accent is 220px
      expect(css).toMatch(/\.energy-whip-slash\.slash-primary[\s\S]*?inset:\s*-60%;/);
      expect(css).toMatch(/\.energy-whip-slash\.slash-secondary[\s\S]*?width:\s*380px;/);
      expect(css).toMatch(/\.energy-whip-slash\.slash-accent[\s\S]*?width:\s*220px;/);

      // Apex phase: 42%-56% hold
      expect(css).toMatch(/42%\s*\{[\s\S]*?transform:\s*skewX\(-24deg\)\s+translate3d\(-8%,\s*0,\s*0\);/);
      expect(css).toMatch(/56%\s*\{[\s\S]*?transform:\s*skewX\(-24deg\)\s+translate3d\(8%,\s*0,\s*0\);/);

      // Balanced apex flash: peak opacity 0.72 (softened from blinding 0.95)
      expect(css).toMatch(/47%\s*\{[\s\S]*?opacity:\s*0\.72;/);
      expect(css).toMatch(/55%\s*\{[\s\S]*?opacity:\s*0\.72;/);
    });
  });

  describe("Specimen 2: 9:16 Vertical Shorts Composition Verification", () => {
    const stingerHtml = brandLogoStingerClip({
      start: 10.35,
      duration: 1.3,
      channelName: "Galaxy Club",
      hasCustomLogo: false,
      fallbackInitial: "G",
      aspectRatio: "9:16",
      instanceId: "bridge_topic_to_cta_916",
    });

    const whipHtml = energyWhipStingerClip({
      start: 15.4,
      duration: 1.2,
      aspectRatio: "9:16",
      instanceId: "bridge_cta_to_question_916",
    });

    it("configures 1080x1920 viewport and responsive data attributes on 9:16 transition clips", () => {
      // 1. Stinger clip and mount
      expect(stingerHtml).toContain('data-aspect-ratio="9:16"');
      expect(stingerHtml).toContain('data-track-index="1"');
      const stingerSubComp = toSubComposition(stingerHtml, "9:16");
      expect(stingerSubComp.html).toContain('data-width="1080"');
      expect(stingerSubComp.html).toContain('data-height="1920"');
      expect(stingerSubComp.html).toContain('data-aspect-ratio="9:16"');

      const stingerMount = subCompositionMount(stingerSubComp);
      expect(stingerMount).toContain('data-track-index="1"');
      expect(stingerMount).toContain('data-composition-id="bridge_topic_to_cta_916"');

      // 2. Energy whip clip and mount
      expect(whipHtml).toContain('data-aspect-ratio="9:16"');
      expect(whipHtml).toContain('data-track-index="1"');
      const whipSubComp = toSubComposition(whipHtml, "9:16");
      expect(whipSubComp.html).toContain('data-width="1080"');
      expect(whipSubComp.html).toContain('data-height="1920"');
      expect(whipSubComp.html).toContain('data-aspect-ratio="9:16"');

      const whipMount = subCompositionMount(whipSubComp);
      expect(whipMount).toContain('data-track-index="1"');
      expect(whipMount).toContain('data-composition-id="bridge_cta_to_question_916"');
    });

    it("verifies 9:16 responsive CSS scaling rules for vertical portrait layout", () => {
      const whipCss = candyArcadeEnergyWhipStylesCss();
      expect(whipCss).toMatch(/\.transition-energy-whip\[data-aspect-ratio="9:16"\][\s\S]*?width:\s*260px;/);
      expect(whipCss).toMatch(/\.transition-energy-whip\[data-aspect-ratio="9:16"\][\s\S]*?width:\s*150px;/);
      expect(whipCss).toMatch(/\.transition-energy-whip\[data-aspect-ratio="9:16"\][\s\S]*?font-size:\s*32px;/);

      const stingerCss = candyArcadeBrandLogoStingerStylesCss();
      expect(stingerCss).toMatch(/\.transition-brand-logo-stinger\[data-aspect-ratio="9:16"\][\s\S]*?width:\s*204px;/);
      expect(stingerCss).toMatch(/\.transition-brand-logo-stinger\[data-aspect-ratio="9:16"\][\s\S]*?font-size:\s*104px;/);
    });
  });
});

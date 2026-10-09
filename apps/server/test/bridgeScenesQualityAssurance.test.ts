import { describe, expect, it } from "vitest";
import { QuizV2Schema } from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { isExemptContrastFinding } from "../src/quiz/qa/hyperframesQuality.js";

/**
 * Calculates WCAG 2.1 relative luminance for a given hex color.
 */
function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calculates WCAG 2.1 contrast ratio between two hex colors.
 */
function contrastRatio(hex1: string, hex2: string): number {
  const lum1 = relativeLuminance(hex1);
  const lum2 = relativeLuminance(hex2);
  const bright = Math.max(lum1, lum2);
  const dark = Math.min(lum1, lum2);
  return (bright + 0.05) / (dark + 0.05);
}

const qaQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "qa-verification-quiz",
  age_band: "7-9",
  language: "English",
  topic: {
    title: "Global Wonders & Wildlife",
  },
  questions: [
    {
      id: "q-1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which mammal is known for sleeping while floating in water?",
      choices: [
        { id: "c-1", text: "Sea Otter" },
        { id: "c-2", text: "Dolphin" },
        { id: "c-3", text: "Polar Bear" },
      ],
      correct_choice_id: "c-1",
      explanation: "Sea otters often hold hands or wrap in kelp while sleeping.",
      fun_fact: "They have the densest fur of any animal!",
      source_ids: ["S01"],
      visual_opportunity: "Sea Otter",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "q-2",
      number: 2,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which bird can fly backwards?",
      choices: [
        { id: "c-4", text: "Hummingbird" },
        { id: "c-5", text: "Swallow" },
        { id: "c-6", text: "Eagle" },
      ],
      correct_choice_id: "c-4",
      explanation: "Hummingbirds are the only birds that can fly backwards.",
      fun_fact: "Their wings can beat up to 80 times per second.",
      source_ids: ["S02"],
      visual_opportunity: "Hummingbird",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

describe("Stage 9: Quality Assurance & Contrast Linting", () => {
  describe("WCAG 2.1 Accessibility & Color Contrast Ratios", () => {
    it("Bridge Scene 1 color pairings satisfy WCAG AA and AAA requirements", () => {
      // Title: #1E1B4B on white #FFFFFF (large text >= 18pt or bold >= 14pt)
      const titleContrast = contrastRatio("#1E1B4B", "#FFFFFF");
      expect(titleContrast).toBeGreaterThanOrEqual(7.0); // Exceeds AAA standard

      // Badge: #FFFFFF on #DB2777
      const badgeContrast = contrastRatio("#FFFFFF", "#DB2777");
      expect(badgeContrast).toBeGreaterThanOrEqual(4.5); // Satisfies AA standard

      // Pill: #FFFFFF on #D97706 (large bold text >= 24px)
      const pillContrast = contrastRatio("#FFFFFF", "#D97706");
      expect(pillContrast).toBeGreaterThanOrEqual(3.0); // Satisfies AA large text standard

      // Prompt: #4B5563 on cream #FFF8EA
      const promptContrast = contrastRatio("#4B5563", "#FFF8EA");
      expect(promptContrast).toBeGreaterThanOrEqual(4.5); // Satisfies AA standard
    });

    it("Bridge Scene 2 color pairings satisfy WCAG AA and AAA requirements", () => {
      // Channel Name: #1E1B4B on white #FFFFFF
      const channelContrast = contrastRatio("#1E1B4B", "#FFFFFF");
      expect(channelContrast).toBeGreaterThanOrEqual(7.0); // Exceeds AAA

      // Headline: #374151 on white #FFFFFF
      const headlineContrast = contrastRatio("#374151", "#FFFFFF");
      expect(headlineContrast).toBeGreaterThanOrEqual(7.0); // Exceeds AAA

      // Subscribe button (normal): #FFFFFF on #DC2626
      const btnNormalContrast = contrastRatio("#FFFFFF", "#DC2626");
      expect(btnNormalContrast).toBeGreaterThanOrEqual(4.5); // Satisfies AA

      // Subscribe button (active subscribed): #E5E7EB on #1F2937
      const btnActiveContrast = contrastRatio("#E5E7EB", "#1F2937");
      expect(btnActiveContrast).toBeGreaterThanOrEqual(7.0); // Exceeds AAA

      // Prompt text: #6B7280 on white #FFFFFF
      const promptContrast = contrastRatio("#6B7280", "#FFFFFF");
      expect(promptContrast).toBeGreaterThanOrEqual(4.5); // Satisfies AA
    });

    it("decorative glyphs used in bridge scenes are recognized as exempt by hyperframesQuality", () => {
      expect(isExemptContrastFinding({ text: "★" })).toBe(true);
      expect(isExemptContrastFinding({ text: "✦" })).toBe(true);
      expect(isExemptContrastFinding({ text: "✨" })).toBe(true);
      expect(isExemptContrastFinding({ text: "⚡" })).toBe(true);
      expect(isExemptContrastFinding({ text: "✓" })).toBe(true);
      expect(isExemptContrastFinding({ text: "🔔" })).toBe(true);
      expect(isExemptContrastFinding({ text: "🎯" })).toBe(true);
    });
  });

  describe("End-to-End Pipeline Cohesion & Voice Flow Verification", () => {
    it("generates an end-to-end production bundle with properly anchored Question 1", () => {
      const director = createDefaultDirectorPlan(qaQuiz);
      const voicePlan = buildQuizVoicePlan(qaQuiz, {
        skipIntro: true,
        includeTopicBridge: true,
        includeCtaBridge: true,
        channelName: "Felix",
        topic: "Global Wonders & Wildlife",
      });

      // Verify Question 1 voice text has the auditory anchor "First question: "
      const q1Segment = voicePlan.segments.find((s) => s.segment_id === "q-1:question");
      expect(q1Segment).toBeDefined();
      expect(q1Segment?.text).toContain("First question: Which mammal is known for sleeping while floating in water?");

      // Verify Question 2 does NOT have the anchor
      const q2Segment = voicePlan.segments.find((s) => s.segment_id === "q-2:question");
      expect(q2Segment).toBeDefined();
      expect(q2Segment?.text).not.toContain("First question:");
      expect(q2Segment?.text).toContain("Which bird can fly backwards?");

      // Verify CTA segment mentions Felix
      const ctaSegment = voicePlan.segments.find((s) => s.role === "intro_cta");
      expect(ctaSegment?.text).toContain("Felix");

      const timeline = compileQuizTimeline({
        quiz: qaQuiz,
        director,
        voicePlan,
        introDuration: 5.0,
        bridgeConfig: {
          enabled: true,
          enableTopicScene: true,
          enableCtaScene: true,
          channelDisplayName: "Felix",
          timing: {
            topicPauseSeconds: 2.0,
            ctaPauseSeconds: 2.0,
          },
        },
        channelName: "Felix",
        topic: "Global Wonders & Wildlife",
      });

      // Verify breathing room gaps in timeline:
      // Topic scene duration should be >= voice narration duration + 2.0s
      const topicEvent = timeline.events.find((e) => e.type === "bridge.topic.enter");
      expect(topicEvent).toBeDefined();
      expect(topicEvent?.duration_seconds).toBeGreaterThanOrEqual(2.0);

      const ctaEvent = timeline.events.find((e) => e.type === "bridge.cta.enter");
      expect(ctaEvent).toBeDefined();
      expect(ctaEvent?.duration_seconds).toBeGreaterThanOrEqual(2.0);

      // Question 1 follows the topic scene directly; the CTA is a mid-roll interstitial after it
      const q1EnterEvent = timeline.events.find((e) => e.question_id === "q-1" && e.type === "question.enter");
      expect(q1EnterEvent).toBeDefined();
      expect(q1EnterEvent!.at_seconds).toBeGreaterThanOrEqual(topicEvent!.at_seconds + topicEvent!.duration_seconds);
      expect(ctaEvent!.at_seconds).toBeGreaterThan(q1EnterEvent!.at_seconds);

      // Build candy arcade composition bundle
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
        quiz: qaQuiz,
        director,
        timeline,
        styleContext,
        audioPath: "./soundtrack.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        introVideoPath: "./intro.mp4",
      });

      // Check for zero invalid values (NaN, undefined, null in attributes)
      expect(bundle.html).not.toContain("NaN");
      expect(bundle.html).not.toContain('data-start="undefined"');
      expect(bundle.html).not.toContain('data-duration="undefined"');

      // Verify both bridge scenes are present in mounts
      expect(bundle.html).toContain("candy-bridge-topic");
      expect(bundle.html).toContain("candy-bridge-cta");
      expect(bundle.html).toContain("quiz-q1-");
      expect(bundle.html).toContain("quiz-q2-");
    });
  });
});

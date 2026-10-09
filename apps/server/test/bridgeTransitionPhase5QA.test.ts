import { describe, expect, it } from "vitest";
import { QuizV2Schema } from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import {
  buildCandyArcadeCompositionBundle,
  brandLogoStingerClip,
  toSubComposition,
  subCompositionMount,
} from "../src/quiz/render/candyArcadeComposition.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";

const testQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "phase5-parity-quiz",
  age_band: "7-9",
  language: "English",
  topic: {
    title: "Deep Sea Mysteries & Ocean Giants",
  },
  questions: [
    {
      id: "q-1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which sea creature has three hearts?",
      choices: [
        { id: "c-1", text: "Octopus" },
        { id: "c-2", text: "Blue Whale" },
        { id: "c-3", text: "Giant Squid" },
      ],
      correct_choice_id: "c-1",
      explanation: "An octopus has three hearts: two pump blood to the gills, and one to the body.",
      fun_fact: "Octopuses also have blue blood!",
      source_ids: ["S01"],
      visual_opportunity: "Octopus swimming underwater",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

const defaultStyleContext = {
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

describe("Phase 5: Automated Testing, Rendering Parity & QA", () => {
  describe("Suite 5.1: Multi-Resolution Rendering Parity (16:9 vs 9:16)", () => {
    it("renders landscape 16:9 composition with 1920x1080 dimensions and stinger overlay", () => {
      const director = createDefaultDirectorPlan(testQuiz);
      const voicePlan = buildQuizVoicePlan(testQuiz, {
        skipIntro: true,
        includeTopicBridge: true,
        includeCtaBridge: true,
        channelName: "Ocean Wonders",
        topic: "Deep Sea Mysteries & Ocean Giants",
      });

      const timeline = compileQuizTimeline({
        quiz: testQuiz,
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
        channelName: "Ocean Wonders",
        topic: "Deep Sea Mysteries & Ocean Giants",
      });

      const bundle = buildCandyArcadeCompositionBundle({
        quiz: testQuiz,
        director,
        timeline,
        styleContext: { ...defaultStyleContext, thumbnailRatio: "16:9" },
        aspectRatio: "16:9",
        audioPath: "./soundtrack.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        brandIdentity: {
          channelName: "Ocean Wonders",
          fallbackInitial: "O",
          hasCustomLogo: false,
        },
      });

      // 1. Stage container dimensions
      expect(bundle.html).toContain('data-width="1920"');
      expect(bundle.html).toContain('data-height="1080"');
      expect(bundle.html).toContain('data-aspect-ratio="16:9"');

      // 2. Stinger mount point on track 1
      expect(bundle.html).toContain('class="sub-composition clip candy-transition transition-brand-logo-stinger"');
      expect(bundle.html).toContain('data-track-index="1"');

      // 3. Stinger subcomposition file geometry
      const stingerFile = Object.entries(bundle.files).find(
        ([name, content]) => content.includes("transition-brand-logo-stinger"),
      )?.[1];
      expect(stingerFile).toBeDefined();
      expect(stingerFile).toContain('data-width="1920"');
      expect(stingerFile).toContain('data-height="1080"');
      expect(stingerFile).toContain('data-aspect-ratio="16:9"');

      // 4. CSS includes landscape styling
      const css = candyArcadeCss({ aspectRatio: "16:9", backgroundStyles: new Set() });
      expect(css).toContain(".transition-brand-logo-stinger");
      expect(css).toContain(".brand-stinger-slash");
      expect(css).toContain(".brand-stinger-content");
    });

    it("renders portrait 9:16 Shorts/Reels composition with 1080x1920 dimensions and stinger overlay", () => {
      const stingerHtml = brandLogoStingerClip({
        start: 14.5,
        duration: 1.0,
        channelName: "Ocean Shorts",
        hasCustomLogo: false,
        fallbackInitial: "O",
        aspectRatio: "9:16",
        instanceId: "bridge_topic_to_cta_916",
      });

      // 1. Stinger clip output attributes for 9:16
      expect(stingerHtml).toContain('data-aspect-ratio="9:16"');
      expect(stingerHtml).toContain('data-track-index="1"');
      expect(stingerHtml).toContain("Ocean Shorts");
      expect(stingerHtml).toContain("brand-stinger-fallback-badge");

      // 2. Subcomposition packaging at 9:16 (1080x1920)
      const subComp = toSubComposition(stingerHtml, "9:16");
      expect(subComp.trackIndex).toBe("1");
      expect(subComp.html).toContain('data-width="1080"');
      expect(subComp.html).toContain('data-height="1920"');
      expect(subComp.html).toContain('data-aspect-ratio="9:16"');

      // 3. Mount element packaging
      const mount = subCompositionMount(subComp);
      expect(mount).toContain('data-track-index="1"');
      expect(mount).toContain('data-composition-id="bridge_topic_to_cta_916"');

      // 4. CSS includes portrait aspect ratio adjustments
      const css = candyArcadeCss({ aspectRatio: "9:16", backgroundStyles: new Set() });
      expect(css).toContain(".transition-brand-logo-stinger");
      expect(css).toContain('.transition-brand-logo-stinger[data-aspect-ratio="9:16"]');
    });
  });

  describe("Suite 5.2: Backward Compatibility & Boundary Edge Cases", () => {
    it("handles legacy/disabled bridge configuration without errors or stinger mounts", () => {
      const director = createDefaultDirectorPlan(testQuiz);
      const voicePlan = buildQuizVoicePlan(testQuiz, { skipIntro: true });

      const timeline = compileQuizTimeline({
        quiz: testQuiz,
        director,
        voicePlan,
        introDuration: 3.0,
      });

      const bundle = buildCandyArcadeCompositionBundle({
        quiz: testQuiz,
        director,
        timeline,
        styleContext: defaultStyleContext,
        audioPath: "./soundtrack.wav",
        narrationDurationSeconds: timeline.duration_seconds,
      });

      // No stinger or bridge mounts when disabled
      expect(bundle.html).not.toContain('id="bridge_topic_to_cta-mount"');
      expect(bundle.html).not.toContain("candy-bridge-topic");
      expect(bundle.html).not.toContain("candy-bridge-cta");
      expect(Object.keys(bundle.files).some((k) => k.includes("bridge"))).toBe(false);

      // Normal question 1 is present
      expect(bundle.html).toContain("quiz-q1-");
    });

    it("resiliently handles long channel names and special HTML characters without layout disruption", () => {
      const director = createDefaultDirectorPlan(testQuiz);
      const specialName = "Quiz & Brain Lab <Junior> 'Edition'";
      const voicePlan = buildQuizVoicePlan(testQuiz, {
        skipIntro: true,
        includeTopicBridge: true,
        includeCtaBridge: true,
        channelName: specialName,
        topic: "Deep Sea Mysteries & Ocean Giants",
      });

      const timeline = compileQuizTimeline({
        quiz: testQuiz,
        director,
        voicePlan,
        introDuration: 3.0,
        bridgeConfig: {
          enabled: true,
          showTopicBriefing: true,
          showSubscribeCta: true,
        },
        channelName: specialName,
        topic: "Deep Sea Mysteries & Ocean Giants",
      });

      const bundle = buildCandyArcadeCompositionBundle({
        quiz: testQuiz,
        director,
        timeline,
        styleContext: defaultStyleContext,
        audioPath: "./soundtrack.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        brandIdentity: {
          channelName: specialName,
          fallbackInitial: "Q",
          hasCustomLogo: false,
        },
      });

      // Subcomposition properly escapes special characters
      const stingerFile = Object.entries(bundle.files).find(
        ([name, content]) => content.includes("transition-brand-logo-stinger"),
      )?.[1];
      expect(stingerFile).toBeDefined();
      expect(stingerFile).toContain("Quiz &amp; Brain Lab &lt;Junior&gt; &#39;Edition&#39;");
      expect(stingerFile).not.toContain("<Junior>");
      expect(stingerFile).toContain("Q");
    });
  });

  describe("Suite 5.3: Precise Timing Calibration & Rhythm Verification", () => {
    it("guarantees calibrated 0.5s pause after Segment 1 voice before 1.0s stinger engages", () => {
      const director = createDefaultDirectorPlan(testQuiz);
      const voicePlan = buildQuizVoicePlan(testQuiz, {
        skipIntro: true,
        includeTopicBridge: true,
        includeCtaBridge: true,
        channelName: "Science Explorer",
        topic: "Deep Sea Mysteries & Ocean Giants",
      });

      const timeline = compileQuizTimeline({
        quiz: testQuiz,
        director,
        voicePlan,
        introDuration: 4.0,
        bridgeConfig: {
          enabled: true,
          showTopicBriefing: true,
          showSubscribeCta: true,
          topicPauseSeconds: 0.5,
          stingerDurationSeconds: 1.0,
        },
        channelName: "Science Explorer",
        topic: "Deep Sea Mysteries & Ocean Giants",
      });

      const topicNarrationEvent = timeline.events.find(
        (e) => e.type === "narration.segment" && e.segment_id === "intro_topic",
      );
      expect(topicNarrationEvent).toBeDefined();
      const topicVoiceDuration = topicNarrationEvent!.duration_seconds;

      const topicEvent = timeline.events.find((e) => e.type === "bridge.topic.enter");
      const stingerEvent = timeline.events.find(
        (e) => e.type === "transition.start" && e.payload?.instance_id === "bridge_topic_to_question",
      );
      const ctaEvent = timeline.events.find((e) => e.type === "bridge.cta.enter");
      const ctaVoiceNarrationEvent = timeline.events.find(
        (e) => e.type === "narration.segment" && e.segment_id === "intro_cta",
      );

      expect(topicEvent).toBeDefined();
      expect(stingerEvent).toBeDefined();
      expect(ctaEvent).toBeDefined();
      expect(ctaVoiceNarrationEvent).toBeDefined();

      const topicStart = topicEvent!.at_seconds;
      const stingerStart = stingerEvent!.at_seconds;
      const ctaStart = ctaEvent!.at_seconds;

      // 1. Stinger starts exactly 0.5s after topic voice ends
      const pauseDuration = stingerStart - (topicStart + topicVoiceDuration);
      expect(pauseDuration).toBeCloseTo(0.5, 2);

      // 2. Stinger duration is calibrated to 1.3s
      expect(stingerEvent!.duration_seconds).toBe(1.3);

      // 3. Question 1 enters at the stinger midpoint (0.65s after stinger start); the CTA plays later, mid-roll
      const firstQuestionStart = timeline.events.find((e) => e.type === "question.enter")!.at_seconds;
      expect(firstQuestionStart - stingerStart).toBeCloseTo(0.65, 2);
      expect(ctaStart).toBeGreaterThan(firstQuestionStart);

      // 4. CTA voice narration begins slightly after CTA scene enters (giving visual reveal room)
      expect(ctaVoiceNarrationEvent!.at_seconds).toBeGreaterThanOrEqual(ctaStart);

      // 5. Total topic scene duration overlaps cleanly into the midpoint of the stinger
      expect(topicEvent!.duration_seconds).toBeCloseTo(topicVoiceDuration + 0.5 + 0.65, 2);
    });
  });
});

import { describe, expect, it } from "vitest";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { HyperframesRenderer } from "../src/quiz/render/hyperframesRenderer.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { styleBoundaryQuiz } from "./quizStyleBoundaryFixtures.js";
import { resolveAndCopyIntroOutro } from "../src/tasks/video/introOutroMediaResolver.js";
import type { Channel, Episode } from "@studio/shared";

function createTestCompositionSetup(introDurationSeconds = 2.5) {
  const testQuiz = { ...styleBoundaryQuiz, episode_id: "motion-integration-test" };
  const director = createDefaultDirectorPlan(testQuiz);
  const voicePlan = buildQuizVoicePlan(testQuiz);
  const timeline = compileQuizTimeline({
    quiz: testQuiz,
    director,
    voicePlan,
    targetDurationSeconds: 25,
  });

  // Ensure first question enters after introDurationSeconds so intro clip is resolved
  const firstQuestionEvent = timeline.events.find(
    (e) => e.type === "question.enter" && e.question_id === testQuiz.questions[0]?.id,
  );
  if (firstQuestionEvent) {
    firstQuestionEvent.at_seconds = introDurationSeconds;
  }

  // Ensure outro segment exists on timeline
  const outroEvent = timeline.events.find((e) => e.segment_id === "outro");
  if (outroEvent) {
    outroEvent.at_seconds = 20.0;
  }

  return { testQuiz, director, timeline };
}

describe("Dynamic Motion Intro/Outro Pipeline Integration", () => {
  it("renders Kinetic Punch intro motion clip when introMotionTemplateId is kinetic_punch", () => {
    const { testQuiz, director, timeline } = createTestCompositionSetup(2.5);

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: testQuiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: 25,
      introMotionTemplateId: "kinetic_punch",
      introMotionTemplateOptions: {
        headlineText: "READY STEADY GO",
        accentColor: "#FF007F",
      },
    });

    const fullHtml = bundle.html + "\n" + Object.values(bundle.files).join("\n");
    expect(fullHtml).toContain("motion-intro-kinetic-punch");
    expect(fullHtml).toContain("READY STEADY GO");
    expect(fullHtml).toContain("#FF007F");
    expect(bundle.html).toContain('data-composition-id="motion-intro-kinetic-punch"');
    expect(bundle.html).toContain('data-start="0"');
  });

  it("renders Cyber Neon intro motion clip when introMotionTemplateId is cyber_neon", () => {
    const { testQuiz, director, timeline } = createTestCompositionSetup(3.0);

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: testQuiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: 25,
      introMotionTemplateId: "cyber_neon",
      introMotionTemplateOptions: {
        headlineText: "INSERT COIN TO PLAY",
        subheadlineText: "CYBER MATRIX QUIZ",
      },
    });

    const fullHtml = bundle.html + "\n" + Object.values(bundle.files).join("\n");
    expect(fullHtml).toContain("motion-intro-cyber-neon");
    expect(fullHtml).toContain("INSERT COIN TO PLAY");
    expect(fullHtml).toContain("CYBER MATRIX QUIZ");
    expect(bundle.html).toContain('data-composition-id="motion-intro-cyber-neon"');
  });

  it("renders Interactive CTA outro motion clip when outroMotionTemplateId is interactive_cta", () => {
    const { testQuiz, director, timeline } = createTestCompositionSetup(2.0);

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: testQuiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: 25,
      outroMotionTemplateId: "interactive_cta",
      outroMotionTemplateOptions: {
        headlineText: "THANKS FOR WATCHING!",
        subheadlineText: "SMASH THAT LIKE BUTTON",
        accentColor: "#FF0033",
      },
    });

    const fullHtml = bundle.html + "\n" + Object.values(bundle.files).join("\n");
    expect(fullHtml).toContain("motion-outro-interactive-cta");
    expect(fullHtml).toContain("THANKS FOR WATCHING!");
    expect(fullHtml).toContain("SMASH THAT LIKE BUTTON");
    expect(bundle.html).toContain('data-composition-id="motion-outro-interactive-cta"');
  });

  it("renders Scorecard Recap outro motion clip with custom options", () => {
    const { testQuiz, director, timeline } = createTestCompositionSetup(2.0);

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: testQuiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: 25,
      outroMotionTemplateId: "scorecard_recap",
      outroMotionTemplateOptions: {
        headlineText: "FINAL SCOREBOARD",
        subheadlineText: "DROP YOUR SCORE IN COMMENTS",
        accentColor: "#FFD700",
      },
    });

    const fullHtml = bundle.html + "\n" + Object.values(bundle.files).join("\n");
    expect(fullHtml).toContain("motion-outro-scorecard-recap");
    expect(fullHtml).toContain("FINAL SCOREBOARD");
    expect(fullHtml).toContain("DROP YOUR SCORE IN COMMENTS");
  });

  it("HyperframesRenderer forwards motion template parameters cleanly", async () => {
    const { testQuiz, director, timeline } = createTestCompositionSetup(2.5);
    const renderer = new HyperframesRenderer();

    const prepared = await renderer.prepare({
      quiz: testQuiz,
      director,
      timeline,
      scenes: [],
      audioPath: "./narration.wav",
      styleContext: { theme: "candy_arcade" },
      narrationDurationSeconds: 25,
      introMotionTemplateId: "minimal_sleek",
      outroMotionTemplateId: "scorecard_recap",
      introMotionTemplateOptions: { headlineText: "SLEEK OPENING" },
    });

    const fullHtml = prepared.html + "\n" + Object.values(prepared.compositionFiles).join("\n");
    expect(fullHtml).toContain("motion-intro-minimal-sleek");
    expect(fullHtml).toContain("SLEEK OPENING");
    expect(fullHtml).toContain("motion-outro-scorecard-recap");
  });

  it("resolveAndCopyIntroOutro handles mode: 'motion_template' without requiring video files", async () => {
    const mockChannel = {
      channel_id: "channel-1",
      slug: "quiz-masters",
      display_name: "Quiz Masters",
    } as Channel;

    const mockEpisode = {
      episode_id: "ep-motion-1",
      quiz_config: {
        intro_outro_selection: {
          mode: "motion_template",
          intro_template_id: "kinetic_punch",
          outro_template_id: "interactive_cta",
          intro_options: { headlineText: "PUNCH INTRO" },
          outro_options: { headlineText: "CTA OUTRO" },
        },
      },
    } as unknown as Episode;

    const mockRepository = {
      queueEpisodeArtifactMutation: async (_c: string, _e: string, fn: () => Promise<unknown>) => fn(),
      readIntroOutroSnapshot: async () => null,
      writeIntroOutroSnapshot: async () => {},
    };

    const resolution = await resolveAndCopyIntroOutro(
      mockRepository as any,
      mockChannel,
      mockEpisode,
      "/tmp/render-root",
    );

    expect(resolution.selectionSource).toBe("motion_template");
    expect(resolution.introMotionTemplateId).toBe("kinetic_punch");
    expect(resolution.outroMotionTemplateId).toBe("interactive_cta");
    expect(resolution.introMotionTemplateOptions?.headlineText).toBe("PUNCH INTRO");
    expect(resolution.outroMotionTemplateOptions?.headlineText).toBe("CTA OUTRO");
    expect(resolution.introVideoPath).toBeUndefined();
    expect(resolution.outroVideoPath).toBeUndefined();
  });
});

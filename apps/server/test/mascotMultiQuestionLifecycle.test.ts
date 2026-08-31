import { describe, expect, it } from "vitest";
import { QuizV2Schema, adaptMascotV1ToV2, resolveMascotRenderSpec, type ChannelMascotConfig, type MascotProfile } from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";

const twoSpriteMascot: MascotProfile = {
  id: "two-sprite-mascot",
  name: "Two Sprite Mascot",
  description: "Mascot with only thinking and celebrate sprites",
  visual_style: "pixar_3d",
  master_prompt: "Two Sprite Mascot concept",
  master_image_url: "/api/mascots/two-sprite-mascot/assets/master_concept.png",
  color_theme: "#06b6d4",
  actions: {
    thinking: {
      action: "thinking",
      sprite_url: "/api/mascots/two-sprite-mascot/assets/thinking_sprite.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 10,
      offset_y: -5,
      motion_preset: "sway",
      motion_speed: 1.2,
      motion_intensity: "normal",
    },
    celebrate: {
      action: "celebrate",
      sprite_url: "/api/mascots/two-sprite-mascot/assets/celebrate_sprite.png",
      frames_count: 1,
      fps: 10,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "jump",
      motion_speed: 1.0,
      motion_intensity: "dynamic",
    },
  },
  assigned_channel_ids: [],
  created_at: "2026-08-30T00:00:00.000Z",
  updated_at: "2026-08-30T00:00:00.000Z",
};

const mascotConfig: ChannelMascotConfig = {
  enabled: true,
  position: "bottom_left",
  scale: 1.84,
  offset_x: 21,
  offset_y: 90,
  flip_x: false,
  show_in_intro: false,
  show_in_outro: false,
  show_in_question: true,
};

const threeQuestionQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "multi-q-mascot-test",
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "q1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "What is the largest mammal?",
      choices: [
        { id: "choice-1a", text: "Blue Whale" },
        { id: "choice-1b", text: "Elephant" },
        { id: "choice-1c", text: "Giraffe" },
      ],
      correct_choice_id: "choice-1a",
      explanation: "Blue whales are the largest animals ever known to have lived.",
      fun_fact: "Their heart is as big as a small car!",
      source_ids: ["src-1"],
      visual_opportunity: "A majestic blue whale swimming in deep ocean",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "q2",
      number: 2,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which planet is known as the Red Planet?",
      choices: [
        { id: "choice-2a", text: "Venus" },
        { id: "choice-2b", text: "Mars" },
        { id: "choice-2c", text: "Jupiter" },
      ],
      correct_choice_id: "choice-2b",
      explanation: "Mars appears red because of iron oxide on its surface.",
      fun_fact: "Mars has the largest volcano in the solar system!",
      source_ids: ["src-2"],
      visual_opportunity: "The red glowing planet Mars in space",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "q3",
      number: 3,
      format: "multiple_choice",
      difficulty: 2,
      question: "How many legs does a spider have?",
      choices: [
        { id: "choice-3a", text: "6" },
        { id: "choice-3b", text: "8" },
        { id: "choice-3c", text: "10" },
      ],
      correct_choice_id: "choice-3b",
      explanation: "All spiders are arachnids and have eight legs.",
      fun_fact: "Spider silk is stronger than steel of the same thickness!",
      source_ids: ["src-3"],
      visual_opportunity: "A cute friendly spider weaving a glistening web",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

describe("Mascot Multi-Question Lifecycle & Global Timeline", () => {
  it("never falls back to master concept image for a 2-sprite (thinking + celebrate) mascot", () => {
    const bundle = adaptMascotV1ToV2(twoSpriteMascot, mascotConfig);
    expect(bundle).not.toBeNull();
    if (!bundle) return;

    const phases = ["question", "choices", "thinking", "reveal", "explain"] as const;
    for (const phase of phases) {
      const spec = resolveMascotRenderSpec(bundle, {
        aspect_ratio: "16:9",
        phase,
        reveal_outcome: "correct",
        timeline_time_seconds: 5,
        playing: true,
      });

      expect(spec).not.toBeNull();
      expect(spec?.asset.image_url).not.toBe(twoSpriteMascot.master_image_url);
      expect(spec?.asset.image_url).not.toContain("master_concept.png");

      if (phase === "question" || phase === "choices" || phase === "thinking") {
        expect(spec?.asset.action).toBe("thinking");
        expect(spec?.asset.image_url).toContain("thinking_sprite.png");
      } else {
        expect(spec?.asset.action).toBe("celebrate");
        expect(spec?.asset.image_url).toContain("celebrate_sprite.png");
      }
    }
  });

  it("renders mascot with correct global delay on all questions in a multi-question quiz", () => {
    const director = createDefaultDirectorPlan(threeQuestionQuiz);
    const voicePlan = buildQuizVoicePlan(threeQuestionQuiz);
    const timeline = compileQuizTimeline({ quiz: threeQuestionQuiz, director, voicePlan });

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: threeQuestionQuiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      aspectRatio: "16:9",
      mascot: twoSpriteMascot,
      mascotConfig,
    });

    const questionClips = Object.entries(bundle.files).filter(([key]) => key.startsWith("compositions/quiz-q"));
    expect(questionClips.length).toBe(3);

    for (let index = 0; index < 3; index++) {
      const [, html] = questionClips[index];
      const q = threeQuestionQuiz.questions[index];
      const qEnter = timeline.events.find((e) => e.type === "question.enter" && e.question_id === q.id)!;
      const reveal = timeline.events.find((e) => e.type === "answer.reveal" && e.question_id === q.id)!;

      expect(html).toContain('class="candy-mascot-container');
      expect(html).toContain("state-thinking");
      expect(html).toContain("state-celebrate");
      expect(html).not.toContain("master_concept.png");

      // Verify that the thinking state starts at the global question entrance time
      expect(html).toContain(`--mascot-state-delay:${qEnter.at_seconds}s`);
      // Verify that the celebrate state starts at the global reveal time
      expect(html).toContain(`--mascot-state-delay:${reveal.at_seconds}s`);
    }
  });
});

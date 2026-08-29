import { describe, expect, it } from "vitest";
import { QuizV2Schema, type Scene } from "@studio/shared";
import { buildQuizComposition, buildQuizV2Composition, buildQuizV2CompositionBundle } from "../src/quiz/render/buildComposition.js";
import { HyperframesRenderer } from "../src/quiz/render/hyperframesRenderer.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";

const sampleQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "video-runner-test",
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "q1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "What color is the sky on a clear day?",
      choices: [
        { id: "c1", text: "Blue" },
        { id: "c2", text: "Green" },
        { id: "c3", text: "Red" },
      ],
      correct_choice_id: "c1",
      explanation: "Rayleigh scattering makes the sky appear blue.",
      fun_fact: "On Mars, sunsets look blue while the daytime sky is pink-red!",
      source_ids: ["S01"],
      visual_opportunity: "Sunny sky with soft clouds",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

describe("Quiz HTML Composition Output & Video Pipeline", () => {
  describe("buildQuizComposition (Legacy / V1)", () => {
    it("generates well-formed HTML with data attributes, styling, and narration audio", () => {
      const scenes: Scene[] = [
        {
          scene_id: "sc-1",
          sequence_title: "Question 1",
          dialogue: "What color is the sky?",
          visual_prompt: "Sky",
          duration_seconds: 5,
          media_path: "media/sc1.png",
          quiz: {
            question_number: 1,
            question: "What color is the sky?",
            choices: ["Blue", "Green", "Red"],
            correct_index: 0,
            phase: "question",
            explanation: "The sky is blue.",
            fun_fact: "",
          },
        },
      ];

      const html = buildQuizComposition(
        { question_count: 1, quiz_format: "multiple_choice", age_band: "7-9", visual_theme: "candy_arcade" },
        scenes,
        "audio/narration.wav",
        10,
      );

      expect(html).toContain("<!doctype html>");
      expect(html).toContain('id="stage"');
      expect(html).toContain('data-duration="10.000"');
      expect(html).toContain('<audio id="quiz-narration"');
      expect(html).toContain("READY TO PLAY");
      expect(html).toContain("Blue");
      expect(html).toContain("Green");
      expect(html).toContain("Red");
      expect(html).toContain("window.__renderReady=true;");
    });

    it("throws an error when scene choice count does not match the format requirement", () => {
      const invalidScenes: Scene[] = [
        {
          scene_id: "sc-bad",
          sequence_title: "Question 1",
          dialogue: "Invalid choices count",
          visual_prompt: "Sky",
          duration_seconds: 5,
          media_path: "media/sc1.png",
          quiz: {
            question_number: 1,
            question: "Invalid choices count",
            choices: ["Only One Choice"],
            correct_index: 0,
            phase: "question",
            explanation: "",
            fun_fact: "",
          },
        },
      ];

      expect(() =>
        buildQuizComposition(
          { question_count: 1, quiz_format: "multiple_choice", age_band: "7-9", visual_theme: "candy_arcade" },
          invalidScenes,
          "audio/narration.wav",
        ),
      ).toThrow("QUIZ_CHOICE_COUNT_INVALID");
    });
  });

  describe("HyperframesRenderer & V2 Composition Bundle", () => {
    it("prepares and renders a deterministic V2 composition bundle", async () => {
      const director = createDefaultDirectorPlan(sampleQuiz);
      const voicePlan = buildQuizVoicePlan(sampleQuiz);
      const timeline = compileQuizTimeline({
        quiz: sampleQuiz,
        director,
        voicePlan,
        audioDurations: Object.fromEntries(voicePlan.segments.map((s) => [s.segment_id, 1.2])),
      });

      const renderer = new HyperframesRenderer();
      const prepared = await renderer.prepare({
        quiz: sampleQuiz,
        director,
        timeline,
        theme: "candy_arcade",
        audioPath: "audio/narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        assets: {},
      });

      expect(prepared.html).toContain("<!doctype html>");
      expect(prepared.html).toContain('data-composition-id="quiz-v2-candy-arcade"');
      expect(prepared.durationSeconds).toBe(timeline.duration_seconds);
      expect(prepared.questionCount).toBe(1);
      expect(prepared.compositionFiles).toBeDefined();

      const allSubcompositions = Object.values(prepared.compositionFiles ?? {}).join("\n");
      expect(allSubcompositions).toContain("What color is the sky on a clear day?");

      const rendered = await renderer.render({
        quiz: sampleQuiz,
        director,
        timeline,
        theme: "candy_arcade",
        audioPath: "audio/narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
      });

      expect(rendered.composition).toBe(prepared.html);
      expect(rendered.durationSeconds).toBe(timeline.duration_seconds);

      const directHtml = buildQuizV2Composition({
        quiz: sampleQuiz,
        director,
        timeline,
        theme: "candy_arcade",
        audioPath: "audio/narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
      });
      expect(directHtml).toContain("<!doctype html>");
      expect(directHtml).toBe(prepared.html);
    });

    it("includes custom mascot clips and sprite layout when mascot config is passed", () => {
      const director = createDefaultDirectorPlan(sampleQuiz);
      const voicePlan = buildQuizVoicePlan(sampleQuiz);
      const timeline = compileQuizTimeline({
        quiz: sampleQuiz,
        director,
        voicePlan,
        audioDurations: Object.fromEntries(voicePlan.segments.map((s) => [s.segment_id, 1.2])),
      });

      const bundle = buildQuizV2CompositionBundle({
        quiz: sampleQuiz,
        director,
        timeline,
        theme: "candy_arcade",
        audioPath: "audio/narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: {
          id: "mascot_tiger",
          name: "Tiggy",
          description: "Friendly baby tiger",
          visual_style: "pixar_3d",
          master_prompt: "A friendly baby tiger",
          master_image_url: "assets/sprites/idle.png",
          color_theme: "#FF8800",
          actions: {
            idle: { sprite_url: "assets/sprites/idle.png", frame_count: 8, fps: 12, offset_x: 0, offset_y: 0 },
            wave: { sprite_url: "assets/sprites/wave.png", frame_count: 8, fps: 12, offset_x: 0, offset_y: 0 },
            think: { sprite_url: "assets/sprites/think.png", frame_count: 8, fps: 12, offset_x: 0, offset_y: 0 },
            cheer: { sprite_url: "assets/sprites/cheer.png", frame_count: 8, fps: 12, offset_x: 0, offset_y: 0 },
            explain: { sprite_url: "assets/sprites/explain.png", frame_count: 8, fps: 12, offset_x: 0, offset_y: 0 },
          },
          assigned_channel_ids: [],
          created_at: "2026-08-29T00:00:00.000Z",
          updated_at: "2026-08-29T00:00:00.000Z",
        },
        mascotConfig: {
          enabled: true,
          position: "bottom_left",
          scale: 1.1,
          offset_x: 20,
          offset_y: -10,
        },
      });

      const allBundleHtml = [bundle.html, ...Object.values(bundle.files)].join("\n");
      expect(allBundleHtml).toContain("candy-mascot-container");
      expect(allBundleHtml).toContain("candy-mascot-sprite");
      expect(allBundleHtml).toContain("assets/sprites/idle.png");
    });
  });
});

import {
  QuizV2Schema,
  type ChannelMascotConfig,
  type MascotProfile,
  type MascotRenderAspectRatio,
  type QuizPreviewLayoutId,
  type QuizQuestionFormat,
  type QuizV2,
} from "@studio/shared";
import { buildQuizVoicePlan } from "../../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../../src/quiz/render/candyArcadeComposition.js";
import { compileQuizTimeline } from "../../src/quiz/timeline/compileTimeline.js";
import { candyArcadeCss } from "../../src/quiz/render/candyArcade/candyArcadeStyles.js";

export const testMascotFixture: MascotProfile = {
  id: "mascot-stage-9-parity",
  name: "Stage 9 Parity Mascot",
  description: "Reference mascot for Stage 9 parity testing",
  visual_style: "pixar_3d",
  master_prompt: "friendly robotic quiz companion",
  master_image_url: "/assets/mascots/parity/master.png",
  color_theme: "#3b82f6",
  actions: {
    idle: {
      action: "idle",
      sprite_url: "/assets/mascots/parity/idle.png",
      frames_count: 1,
      fps: 6,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "breathe",
      motion_speed: 1.0,
      motion_intensity: "normal",
    },
    thinking: {
      action: "thinking",
      sprite_url: "/assets/mascots/parity/thinking.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "sway",
      motion_speed: 1.25,
      motion_intensity: "normal",
    },
    celebrate: {
      action: "celebrate",
      sprite_url: "/assets/mascots/parity/celebrate.png",
      frames_count: 1,
      fps: 10,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: -10,
      motion_preset: "jump",
      motion_speed: 1.1,
      motion_intensity: "dynamic",
    },
    point: {
      action: "point",
      sprite_url: "/assets/mascots/parity/point.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: -4,
      offset_y: 0,
      motion_preset: "point",
      motion_speed: 0.9,
      motion_intensity: "normal",
    },
    oops: {
      action: "oops",
      sprite_url: "/assets/mascots/parity/oops.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "shake",
      motion_speed: 1.0,
      motion_intensity: "normal",
    },
  },
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

export const testChannelMascotConfig: ChannelMascotConfig = {
  enabled: true,
  position: "bottom_right",
  scale: 1.84,
  offset_x: 24,
  offset_y: 88,
  flip_x: false,
  show_in_intro: true,
  show_in_outro: true,
  show_in_question: true,
};

export function createParityQuiz(layoutId: string, format: QuizQuestionFormat, choiceTexts: string[]): QuizV2 {
  const isMystery = layoutId === "mystery_reveal";
  const effectiveChoices = isMystery
    ? choiceTexts.slice(0, 1)
    : format === "true_false" || choiceTexts.length === 2
      ? choiceTexts.slice(0, 2)
      : choiceTexts.length >= 3
        ? choiceTexts.slice(0, 3)
        : [...choiceTexts, "Extra Choice"].slice(0, 3);
  const effectiveFormat = isMystery ? "image_guess" : effectiveChoices.length === 2 ? "true_false" : format;
  const answerMode = isMystery ? "single_reveal" : undefined;

  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: `ep-parity-${layoutId}`,
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: `q-parity-${layoutId}`,
        number: 1,
        format: effectiveFormat,
        answer_mode: answerMode,
        difficulty: 1,
        question: `Parity test question for ${layoutId}?`,
        choices: effectiveChoices.map((text, idx) => ({ id: `c-${idx + 1}`, text })),
        correct_choice_id: "c-1",
        explanation: "Correct answer explanation verifying Stage 9 parity.",
        fun_fact: "Parity verification settled fun fact.",
        source_ids: ["parity-stage-9"],
        visual_opportunity: `Visual illustration for ${layoutId}`,
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });
}

export function renderProductionClip(
  layoutId: QuizPreviewLayoutId,
  format: QuizQuestionFormat,
  choices: string[],
  aspectRatio: MascotRenderAspectRatio = "16:9",
  _revealOutcome: "correct" | "wrong" = "correct",
): { html: string; css: string } {
  const quiz = createParityQuiz(layoutId, format, choices);
  const director = createDefaultDirectorPlan(quiz, "candy_arcade", "sunny");
  director.beats[0].layout_id = layoutId;

  if (layoutId.startsWith("visual_")) {
    director.beats[0].archetype = "visual_multiple_choice";
    director.beats[0].asset_intents = ["choice_illustration"];
  } else if (layoutId === "mystery_reveal") {
    director.beats[0].archetype = "mystery_reveal";
    director.beats[0].asset_intents = ["question_illustration"];
  } else if (format === "true_false" || choices.length === 2) {
    director.beats[0].archetype = "true_false";
    director.beats[0].asset_intents = ["question_illustration"];
  } else {
    director.beats[0].archetype = "text_multiple_choice";
    director.beats[0].asset_intents = ["question_illustration"];
  }

  const timeline = compileQuizTimeline({
    quiz,
    director,
    voicePlan: buildQuizVoicePlan(quiz),
  });

  const bundle = buildCandyArcadeCompositionBundle({
    quiz,
    director,
    timeline,
    styleContext: { theme: "candy_arcade" },
    audioPath: "./narration.wav",
    narrationDurationSeconds: timeline.duration_seconds,
    aspectRatio,
    mascot: testMascotFixture,
    mascotConfig: testChannelMascotConfig,
  });

  const fullHtml = [bundle.html, ...Object.values(bundle.files)].join("\n");
  const css = candyArcadeCss({ fontMode: "render", aspectRatio });
  return { html: fullHtml, css };
}

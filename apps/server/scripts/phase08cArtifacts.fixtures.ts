import { type ChannelMascotConfig, type MascotProfile, type SandboxPreviewInput, type QuizV2 } from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import { candyArcadeFontReadinessScript } from "../src/quiz/render/candyArcade/candyArcadeFonts.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import type { Phase08cArtifactCase } from "./phase08cArtifacts.types.js";

const SHORT_QUESTION = "Which animal has stripes?";
const LONG_QUESTION = "Which remarkable animal is best known for its bold black-and-orange stripes across dense tropical forests?";

export function buildArtifactHtml(item: Phase08cArtifactCase): string {
  return item.surface === "sandbox" ? sandboxHtml(item) : productionHtml(item);
}

function sandboxHtml(item: Phase08cArtifactCase): string {
  const input: SandboxPreviewInput = {
    layout_id: item.layoutId,
    aspect_ratio: item.aspectRatio,
    background_style: item.backgroundStyle,
    answer_card_style: item.answerCardStyle,
    ...(item.layoutId === "full_stack_list"
      ? {}
      : {
          question_format: "multiple_choice" as const,
          archetype: item.visualChoices ? ("visual_multiple_choice" as const) : ("text_multiple_choice" as const),
        }),
    phase: "reveal",
    question_text: item.longText ? LONG_QUESTION : SHORT_QUESTION,
    choices: artifactChoices(item.longText),
    correct_choice_index: 0,
    question_number: 1,
    total_questions: 3,
    mascot_id: item.mascotEnabled ? ARTIFACT_MASCOT.id : null,
    mascot_enabled: item.mascotEnabled,
    mascot_position: "bottom_left",
    mascot_scale: 1.35,
  };
  return buildSandboxComposition(input, item.mascotEnabled ? ARTIFACT_MASCOT : null).html.replace(
    '<base href="/">',
    '<base href="http://phase08c.local/">',
  );
}

function productionHtml(item: Phase08cArtifactCase): string {
  const quiz = artifactQuiz(item);
  const director = createDefaultDirectorPlan(quiz);
  director.beats.forEach((beat) => {
    beat.layout_id = item.layoutId;
    beat.archetype = item.visualChoices ? "visual_multiple_choice" : "text_multiple_choice";
    beat.asset_intents = item.visualChoices
      ? ["choice_illustration"]
      : item.layoutId === "full_stack_list"
        ? []
        : ["question_illustration"];
    beat.background_style = item.backgroundStyle;
    beat.answer_card_style = item.answerCardStyle;
  });
  const voicePlan = buildQuizVoicePlan(quiz);
  const timeline = compileQuizTimeline({ quiz, director, voicePlan, targetDurationSeconds: 30 });
  const bundle = buildCandyArcadeCompositionBundle({
    quiz,
    director,
    timeline,
    styleContext: { theme: "candy_arcade" },
    audioPath: "./narration.wav",
    narrationDurationSeconds: 30,
    aspectRatio: item.aspectRatio,
    mascot: item.mascotEnabled ? ARTIFACT_MASCOT : null,
    mascotConfig: item.mascotEnabled ? ARTIFACT_MASCOT_CONFIG : null,
  });
  const questionTemplate = Object.entries(bundle.files).find(([name]) => name.includes("quiz-q1-"))?.[1];
  if (!questionTemplate) throw new Error(`Missing production question composition for ${item.id}`);
  const scene = questionTemplate.replace(/^<template[^>]*>/, "").replace(/<\/template>$/, "");
  const [width, height] = item.aspectRatio === "16:9" ? [1920, 1080] : [1080, 1920];
  const css = candyArcadeCss({ fontMode: "preview", aspectRatio: item.aspectRatio, backgroundStyles: [item.backgroundStyle] });
  return `<!doctype html><html><head><meta charset="utf-8"><base href="http://phase08c.local/"><style>${css}</style></head><body><main id="stage" data-width="${width}" data-height="${height}" data-aspect-ratio="${item.aspectRatio}">${scene}</main><script>${candyArcadeFontReadinessScript()}</script></body></html>`;
}

function artifactQuiz(item: Phase08cArtifactCase): QuizV2 {
  const questionText = item.longText ? LONG_QUESTION : SHORT_QUESTION;
  const choices = artifactChoices(item.longText);
  return {
    schema_version: 2,
    episode_id: `phase-08c-${item.id}`,
    age_band: "7-9",
    language: "English",
    questions: [1, 2].map((number) => ({
      id: `q${number}`,
      number,
      format: "multiple_choice" as const,
      difficulty: 1,
      question: questionText,
      choices: choices.map((text, index) => ({ id: `q${number}-c${index + 1}`, text })),
      correct_choice_id: `q${number}-c1`,
      explanation: "The tiger is correct.",
      fun_fact: "Every tiger has a unique stripe pattern.",
      source_ids: ["S01"],
      visual_opportunity: "A friendly tiger in a tropical forest",
      validation: { semantic_status: "validated" as const, source_coverage: true, fact_locked: true },
    })),
  };
}

function artifactChoices(longText: boolean): [string, string, string] {
  return longText
    ? [
        "The Bengal tiger with a uniquely striped coat",
        "A playful bottlenose dolphin from the open sea",
        "A gentle African elephant walking across the savanna",
      ]
    : ["Tiger", "Dolphin", "Elephant"];
}

const mascotSvg = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><circle cx="256" cy="270" r="180" fill="#ffd34d"/><circle cx="195" cy="230" r="24" fill="#172554"/><circle cx="317" cy="230" r="24" fill="#172554"/><path d="M175 325 Q256 390 337 325" fill="none" stroke="#172554" stroke-width="24" stroke-linecap="round"/></svg>',
);

const ARTIFACT_MASCOT: MascotProfile = {
  id: "phase-08c-mascot",
  name: "Phase 8C Mascot",
  description: "Local deterministic visual fixture",
  visual_style: "flat_vector",
  master_prompt: "Local deterministic visual fixture",
  master_image_url: `data:image/svg+xml,${mascotSvg}`,
  color_theme: "#FFD34D",
  actions: {
    thinking: {
      action: "thinking",
      sprite_url: `data:image/svg+xml,${mascotSvg}`,
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
    },
  },
  assigned_channel_ids: [],
  created_at: "2026-08-31T00:00:00.000Z",
  updated_at: "2026-08-31T00:00:00.000Z",
};

const ARTIFACT_MASCOT_CONFIG: ChannelMascotConfig = {
  enabled: true,
  position: "bottom_left",
  scale: 1.35,
  offset_x: 0,
  offset_y: 0,
  show_in_intro: false,
  show_in_outro: false,
  show_in_question: true,
};

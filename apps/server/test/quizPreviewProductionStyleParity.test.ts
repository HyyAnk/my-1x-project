import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ChannelSchema,
  QuizConfigSchema,
  QuizV2Schema,
  resolveBeatQuizStyle,
  resolveQuizStyle,
  type SandboxPreviewResponse,
} from "@studio/shared";
import { buildApp } from "../src/app.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildQuizRenderStyleContext } from "../src/quiz/render/quizRenderStyleContext.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { prepareQuizVideoRender } from "../src/tasks/video/quizVideoRenderPreparation.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Quiz preview and production style parity", () => {
  it("P8B-BND-07 and P8B-BND-08 preserve resolved values/provenance deterministically without providers", async () => {
    const root = await createTestRoot();
    const app = await buildApp(root);
    try {
      const channel = channelDefaults();
      const episodeQuizConfig = episodeStyles();
      const director = createDefaultDirectorPlan(quiz);
      director.beats[0].palette_id = "auto";
      director.beats[0].thinking_bar_style = "auto";
      director.beats[0].question_box_style = "auto";
      director.beats[0].answer_card_style = "auto";
      director.beats[0].question_counter_style = "auto";
      director.beats[0].background_style = "auto";

      const previewResolved = resolveQuizStyle({ theme: episodeQuizConfig.visual_theme, channel, episode: episodeQuizConfig });
      const productionResolved = resolveBeatQuizStyle(buildQuizRenderStyleContext(channel, episodeQuizConfig), director.beats[0]);
      expect(productionResolved).toEqual(previewResolved);

      const request = previewRequest(previewResolved);
      const firstPreview = await app.server.inject({ method: "POST", url: "/api/quiz/preview-composition", payload: request });
      const secondPreview = await app.server.inject({ method: "POST", url: "/api/quiz/preview-composition", payload: request });
      expect(firstPreview.statusCode).toBe(200);
      expect(secondPreview.json<SandboxPreviewResponse>().html).toBe(firstPreview.json<SandboxPreviewResponse>().html);

      const productionInput = {
        ...renderInput(director),
        channel,
        episodeQuizConfig,
      };
      const firstProduction = await prepareQuizVideoRender(productionInput);
      const secondProduction = await prepareQuizVideoRender(productionInput);
      expect(secondProduction).toEqual(firstProduction);

      const previewHtml = firstPreview.json<SandboxPreviewResponse>().html;
      const productionHtml = Object.entries(firstProduction.compositionFiles).find(([file]) => file.includes("quiz-q1-"))?.[1] ?? "";
      for (const evidence of styleMarkupEvidence) {
        expect(previewHtml).toMatch(evidence);
        expect(productionHtml).toMatch(evidence);
      }
    } finally {
      await app.close();
    }
  });
});

const quiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "preview-production-parity",
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "q1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which animal has stripes?",
      choices: [
        { id: "c1", text: "Tiger" },
        { id: "c2", text: "Dolphin" },
        { id: "c3", text: "Elephant" },
      ],
      correct_choice_id: "c1",
      explanation: "A tiger has stripes.",
      fun_fact: "Tiger stripes are unique.",
      source_ids: ["S01"],
      visual_opportunity: "A friendly tiger",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

const styleMarkupEvidence = [
  /--bg-primary:\s*#FF964F/,
  /thinking-bar-construction-machine/,
  /qb-parchment-scroll/,
  /ac-comic-chunky/,
  /cb-floating-balloon/,
  /class="bg-aurora-glow"/,
];

function channelDefaults() {
  return ChannelSchema.parse({
    channel_id: "channel-preview-production",
    slug: "channel-preview-production",
    display_name: "Style Channel",
    channel_dna_path: "channels/style/channel_dna.md",
    status: "ACTIVE",
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
    default_palette_id: "purple",
    default_thinking_bar_style: "energy_laser",
    default_question_box_style: "comic_bubble",
    default_answer_card_style: "glass_neon",
    default_counter_style: "golden_shield",
    default_background_style: "aurora_glow",
  });
}

function episodeStyles() {
  return QuizConfigSchema.parse({
    question_count: 3,
    quiz_format: "multiple_choice",
    visual_theme: "space_lab",
    palette_id: "orange",
    thinking_bar_style: "construction_machine",
    question_box_style: "parchment_scroll",
    answer_card_style: "comic_chunky",
    question_counter_style: "floating_balloon",
    background_style: "auto",
  });
}

function renderInput(director: ReturnType<typeof createDefaultDirectorPlan>) {
  const voicePlan = buildQuizVoicePlan(quiz);
  const timeline = compileQuizTimeline({ quiz, director, voicePlan, targetDurationSeconds: 20 });
  return {
    quiz,
    director,
    timeline,
    scenes: [],
    audioPath: "audio/narration.wav",
    narrationDurationSeconds: timeline.duration_seconds,
  };
}

function previewRequest(style: ReturnType<typeof resolveQuizStyle>) {
  return {
    theme: style.theme,
    palette_id: style.paletteId,
    thinking_bar_style: style.thinkingBarStyle,
    question_box_style: style.questionBoxStyle,
    answer_card_style: style.answerCardStyle,
    counter_style: style.counterStyle,
    background_style: style.backgroundStyle,
    channel_brand_name: style.channelBrandName,
    layout_id: "media_left_choices_right",
    question_format: "multiple_choice",
    archetype: "text_multiple_choice",
    phase: "choices",
    question_text: quiz.questions[0].question,
    choices: quiz.questions[0].choices.map((choice) => choice.text),
    correct_choice_index: 0,
    question_number: 1,
    total_questions: 1,
    fact_card_text: quiz.questions[0].fun_fact,
  } as const;
}

async function createTestRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-preview-production-parity-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8"),
  ]);
  return root;
}

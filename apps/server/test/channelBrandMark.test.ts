import { describe, expect, it } from "vitest";
import { QuizV2Schema, type MascotProfile, type ChannelMascotConfig } from "@studio/shared";
import { renderChannelBrandMark } from "../src/quiz/render/candyArcade/channelBrandMark.js";
import { channelBrandMarkCss } from "../src/quiz/render/candyArcade/channelBrandMarkStyles.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";

const sampleQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "brand-test-ep",
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "q-1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which planet has the most prominent rings?",
      choices: [
        { id: "c-a", text: "Jupiter" },
        { id: "c-b", text: "Saturn" },
        { id: "c-c", text: "Uranus" },
      ],
      correct_choice_id: "c-b",
      explanation: "Saturn has wide, bright rings.",
      fun_fact: "Saturn rings are mostly made of ice chunks.",
      source_ids: ["S1"],
      visual_opportunity: "Saturn with visible rings",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

const sampleMascot: MascotProfile = {
  id: "mascot-tino",
  name: "Tino",
  description: "Friendly dino mascot",
  visual_style: "pixar_3d",
  master_prompt: "Cute baby dino",
  master_image_url: "/assets/tino.png",
  color_theme: "#10b981",
  actions: {
    thinking: {
      action: "thinking",
      sprite_url: "/assets/thinking.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "sway",
      motion_speed: 1,
      motion_intensity: "normal",
    },
  },
  assigned_channel_ids: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mascotConfig: ChannelMascotConfig = {
  enabled: true,
  position: "bottom_left",
  scale: 1.0,
  offset_x: 0,
  offset_y: 0,
  show_in_intro: false,
  show_in_outro: false,
  show_in_question: true,
};

describe("Channel Brand Mark Unit & HTML Renderer", () => {
  it("renders empty string when hasMascot is false", () => {
    expect(renderChannelBrandMark("Tino", false)).toBe("");
    expect(renderChannelBrandMark("Robot World", false)).toBe("");
  });

  it("renders 3-line mark with YouTube SVG icon, brand name, and QUIZ when hasMascot is true", () => {
    const html = renderChannelBrandMark("Tino", true);
    expect(html).toContain('class="channel-brand-mark"');
    expect(html).toContain("data-layout-ignore");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("<svg");
    expect(html).toContain('class="brand-mark-channel-name"');
    expect(html).toContain("Tino");
    expect(html).toContain('class="brand-mark-sub"');
    expect(html).toContain("QUIZ");
  });

  it("escapes raw HTML and special characters in brand name safely", () => {
    const dangerous = `<script>alert('xss')</script> & "Tino"`;
    const html = renderChannelBrandMark(dangerous, true);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt; &amp; &quot;Tino&quot;");
  });

  it("renders names with varying lengths: Tino, Robot World, Jurassic World", () => {
    const shortHtml = renderChannelBrandMark("Tino", true);
    expect(shortHtml).toContain("Tino");

    const mediumHtml = renderChannelBrandMark("Robot World", true);
    expect(mediumHtml).toContain("Robot World");

    const longHtml = renderChannelBrandMark("Jurassic World", true);
    expect(longHtml).toContain("Jurassic World");
  });

  it("falls back to Channel if brand name is empty string or whitespace", () => {
    const fallbackHtml = renderChannelBrandMark("   ", true);
    expect(fallbackHtml).toContain("Channel");
  });
});

describe("Channel Brand Mark Layer Contract & CSS", () => {
  it("defines layer token --candy-layer-brand: 9, positioned below transition (10) and mascot (11)", () => {
    const css = channelBrandMarkCss();
    expect(css).toContain("--candy-layer-brand: 9;");
    expect(css).toContain("z-index: var(--candy-layer-brand, 9);");
    expect(css).toContain("pointer-events: none;");
  });

  it("provides specific styling rules for 9:16 aspect ratio", () => {
    const css = channelBrandMarkCss();
    expect(css).toContain('#stage[data-aspect-ratio="9:16"] .channel-brand-mark');
  });
});

describe("Channel Brand Mark Integration - Sandbox Composition", () => {
  it("renders channel brand mark when mascot is enabled and profile is supplied", () => {
    const result = buildSandboxComposition(
      {
        channel_brand_name: "Tino",
        mascot_id: sampleMascot.id,
        mascot_enabled: true,
        phase: "thinking",
      },
      sampleMascot,
    );

    expect(result.html).toContain('class="channel-brand-mark"');
    expect(result.html).toContain("Tino");
    expect(result.html).toContain("QUIZ");
    expect(result.contrast_report.ok).toBe(true);

    // Verify DOM order: game-stage before brand mark, brand mark before mascot container
    const stageIdx = result.html.indexOf('class="game-stage"');
    const markIdx = result.html.indexOf('class="channel-brand-mark"');
    const mascotIdx = result.html.indexOf('class="candy-mascot-container');
    expect(stageIdx).toBeLessThan(markIdx);
    expect(markIdx).toBeLessThan(mascotIdx);
  });

  it("does NOT render channel brand mark in sandbox when mascot is disabled or none", () => {
    const disabledResult = buildSandboxComposition(
      {
        channel_brand_name: "Tino",
        mascot_id: sampleMascot.id,
        mascot_enabled: false,
      },
      sampleMascot,
    );
    expect(disabledResult.html).not.toContain('class="channel-brand-mark"');

    const noneResult = buildSandboxComposition(
      {
        channel_brand_name: "Tino",
        mascot_id: "none",
        mascot_enabled: true,
      },
      sampleMascot,
    );
    expect(noneResult.html).not.toContain('class="channel-brand-mark"');
  });
});

describe("Channel Brand Mark Integration - Production Composition Bundle", () => {
  it("renders channel brand mark in question clips when mascot is active", () => {
    const director = createDefaultDirectorPlan(sampleQuiz);
    const timeline = compileQuizTimeline({ quiz: sampleQuiz, director, voicePlan: buildQuizVoicePlan(sampleQuiz) });

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: sampleQuiz,
      director,
      timeline,
      theme: "candy_arcade",
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: 30,
      mascot: sampleMascot,
      mascotConfig,
      channelBrandName: "Robot World",
    });

    const questionSubComp = Object.entries(bundle.files).find(([k]) => k.startsWith("compositions/quiz-q1-"))?.[1];
    expect(questionSubComp).toBeDefined();
    expect(questionSubComp).toContain('class="channel-brand-mark"');
    expect(questionSubComp).toContain("Robot World");
    expect(questionSubComp).toContain("QUIZ");

    // Must NOT appear in intro or outro
    const introSubComp = bundle.files["compositions/candy-intro.html"];
    if (introSubComp) {
      expect(introSubComp).not.toContain('class="channel-brand-mark"');
    }
  });

  it("does NOT render channel brand mark in question clips when mascot is absent", () => {
    const director = createDefaultDirectorPlan(sampleQuiz);
    const timeline = compileQuizTimeline({ quiz: sampleQuiz, director, voicePlan: buildQuizVoicePlan(sampleQuiz) });

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: sampleQuiz,
      director,
      timeline,
      theme: "candy_arcade",
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: 30,
      mascot: null,
      channelBrandName: "Robot World",
    });

    const questionSubComp = Object.entries(bundle.files).find(([k]) => k.startsWith("compositions/quiz-q1-"))?.[1];
    expect(questionSubComp).toBeDefined();
    expect(questionSubComp).not.toContain('class="channel-brand-mark"');
  });

  it("production and sandbox compositions produce the identical brand mark element contract", () => {
    const director = createDefaultDirectorPlan(sampleQuiz);
    const timeline = compileQuizTimeline({ quiz: sampleQuiz, director, voicePlan: buildQuizVoicePlan(sampleQuiz) });

    const prodBundle = buildCandyArcadeCompositionBundle({
      quiz: sampleQuiz,
      director,
      timeline,
      theme: "candy_arcade",
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: 30,
      mascot: sampleMascot,
      mascotConfig,
      channelBrandName: "Jurassic World",
    });

    const sandbox = buildSandboxComposition(
      {
        channel_brand_name: "Jurassic World",
        mascot_id: sampleMascot.id,
        mascot_enabled: true,
      },
      sampleMascot,
    );

    const prodQuestionHtml = Object.entries(prodBundle.files).find(([k]) => k.startsWith("compositions/quiz-q1-"))?.[1];
    expect(prodQuestionHtml).toBeDefined();
    expect(prodQuestionHtml).toContain(
      'class="brand-mark-channel-name" data-layout-ignore data-brand-name="Jurassic World">Jurassic World</span>',
    );
    expect(sandbox.html).toContain(
      'class="brand-mark-channel-name" data-layout-ignore data-brand-name="Jurassic World">Jurassic World</span>',
    );
  });
});

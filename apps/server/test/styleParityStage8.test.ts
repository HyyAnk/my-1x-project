import { describe, expect, it } from "vitest";
import {
  ALL_QUIZ_PALETTES,
  QuizV2Schema,
  type QuizAnswerCardStyle,
  type QuizBackgroundStyle,
  type QuizPaletteId,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
} from "@studio/shared";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import {
  candyArcadeCss,
  getAnswerCardsCss,
  getAnswerCardSkinsCss,
  getBackgroundStylesCss,
  getCounterBadgesCss,
  getQuestionBoxesCss,
  getThinkingBarsCss,
} from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { CANDY_ARCADE_FONTS } from "../src/quiz/render/candyArcade/candyArcadeFonts.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { candyArcadePalettes } from "../src/quiz/visual/candyArcade.js";

const stage8Quiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "stage-8-parity-suite",
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "q1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which constellation looks like a hunter?",
      choices: [
        { id: "c1", text: "Orion" },
        { id: "c2", text: "Ursa Major" },
        { id: "c3", text: "Cassiopeia" },
      ],
      correct_choice_id: "c1",
      explanation: "Orion is known as the hunter.",
      fun_fact: "Betelgeuse is a red supergiant star in Orion.",
      source_ids: ["S01"],
      visual_opportunity: "The bright stars of Orion",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

describe("Stage 8 Style Presets & Visual Elements Integration", () => {
  describe("Stylesheet Bundling Fullness", () => {
    it("bundles all 6 thinking bar stylesheets", () => {
      const css = getThinkingBarsCss();
      expect(css).toContain(".thinking-bar-star-slider");
      expect(css).toContain(".thinking-bar-energy-laser");
      expect(css).toContain(".thinking-bar-capsule-liquid");
      expect(css).toContain(".thinking-bar-flame-fuse");
      expect(css).toContain(".thinking-bar-cosmic-rocket");
      expect(css).toContain(".thinking-bar-construction-machine");
    });

    it("bundles all 7 question box stylesheets including 3 new variants", () => {
      const css = getQuestionBoxesCss();
      expect(css).toContain(".qb-candy-pop");
      expect(css).toContain(".qb-comic-bubble");
      expect(css).toContain(".qb-glass-morphism");
      expect(css).toContain(".qb-parchment-scroll");
      // 3 newly added variants:
      expect(css).toContain(".qb-hazard-stripes");
      expect(css).toContain(".qb-cockpit-hud");
      expect(css).toContain(".qb-pastel-cloud");
    });

    it("bundles all 6 answer card stylesheets including 2 new variants via both function names", () => {
      const cssA = getAnswerCardSkinsCss();
      const cssB = getAnswerCardsCss();
      expect(cssA).toBe(cssB);
      expect(cssA).toContain(".ac-glossy-arcade");
      expect(cssA).toContain(".ac-comic-chunky");
      expect(cssA).toContain(".ac-glass-neon");
      expect(cssA).toContain(".ac-minimal-soft");
      // 2 newly added variants:
      expect(cssA).toContain(".ac-steel-beam-plate");
      expect(cssA).toContain(".ac-pastel-marshmallow");
    });

    it("bundles all 6 counter badge stylesheets including 2 new variants", () => {
      const css = getCounterBadgesCss();
      expect(css).toContain(".cb-hanging-woodsign");
      expect(css).toContain(".cb-neon-badge");
      expect(css).toContain(".cb-floating-balloon");
      expect(css).toContain(".cb-golden-shield");
      // 2 newly added variants:
      expect(css).toContain(".cb-space-radar");
      expect(css).toContain(".cb-bubble-badge");
    });

    it("bundles all 6 background stylesheets including 4 new variants", () => {
      const css = getBackgroundStylesCss();
      expect(css).toContain(".bg-rays");
      expect(css).toContain(".bg-aurora-glow");
      // 4 newly added variants:
      expect(css).toContain(".bg-comic-burst");
      expect(css).toContain(".bg-construction-blueprint");
      expect(css).toContain(".bg-cosmic-starfield");
      expect(css).toContain(".bg-floating-clouds");
    });

    it("bundles full styles in candyArcadeCss when no background filter is passed", () => {
      const css = candyArcadeCss();
      expect(css).toContain(".qb-hazard-stripes");
      expect(css).toContain(".qb-cockpit-hud");
      expect(css).toContain(".qb-pastel-cloud");
      expect(css).toContain(".ac-steel-beam-plate");
      expect(css).toContain(".ac-pastel-marshmallow");
      expect(css).toContain(".cb-space-radar");
      expect(css).toContain(".cb-bubble-badge");
      expect(css).toContain(".bg-comic-burst");
      expect(css).toContain(".bg-construction-blueprint");
      expect(css).toContain(".bg-cosmic-starfield");
      expect(css).toContain(".bg-floating-clouds");
    });
  });

  describe("Newly Added Elements Parity in Sandbox & Production", () => {
    const newBackgrounds: Array<Exclude<QuizBackgroundStyle, "auto">> = [
      "comic_burst",
      "construction_blueprint",
      "cosmic_starfield",
      "floating_clouds",
    ];

    it.each(newBackgrounds)("renders background '%s' in both Sandbox and Production", (bg) => {
      const sandbox = buildSandboxComposition({
        background_style: bg,
        question_text: "Test question?",
        choices: ["A", "B", "C"],
      });
      expect(sandbox.html).toContain(`data-background-style="${bg}"`);
      expect(sandbox.css).toContain(`.bg-${bg.replace(/_/g, "-")}`);

      const production = renderProductionWithStyles({ backgroundStyle: bg });
      expect(production.html).toContain(`.bg-${bg.replace(/_/g, "-")}`);
      const sceneHtml = findQuestionScene(production.files);
      expect(sceneHtml).toContain(`data-background-style="${bg}"`);
    });

    const newQuestionBoxes: Array<Exclude<QuizQuestionBoxStyle, "auto">> = ["hazard_stripes", "cockpit_hud", "pastel_cloud"];

    it.each(newQuestionBoxes)("renders question box '%s' in both Sandbox and Production", (qb) => {
      const sandbox = buildSandboxComposition({
        question_box_style: qb,
        question_text: "Question Box Test?",
        choices: ["A", "B", "C"],
      });
      const qbClass = `qb-${qb.replace(/_/g, "-")}`;
      expect(sandbox.html).toContain(qbClass);
      expect(sandbox.css).toContain(`.${qbClass}`);

      const production = renderProductionWithStyles({ questionBoxStyle: qb });
      expect(production.html).toContain(`.${qbClass}`);
      const sceneHtml = findQuestionScene(production.files);
      expect(sceneHtml).toContain(qbClass);
    });

    const newAnswerCards: Array<Exclude<QuizAnswerCardStyle, "auto">> = ["steel_beam_plate", "pastel_marshmallow"];

    it.each(newAnswerCards)("renders answer card '%s' in both Sandbox and Production", (ac) => {
      const sandbox = buildSandboxComposition({
        answer_card_style: ac,
        question_text: "Answer Card Test?",
        choices: ["Alpha", "Beta", "Gamma"],
      });
      const acClass = `ac-${ac.replace(/_/g, "-")}`;
      expect(sandbox.html).toContain(acClass);
      expect(sandbox.css).toContain(`.${acClass}`);

      const production = renderProductionWithStyles({ answerCardStyle: ac });
      expect(production.html).toContain(`.${acClass}`);
      const sceneHtml = findQuestionScene(production.files);
      expect(sceneHtml).toContain(acClass);
    });

    const newCounterBadges: Array<Exclude<QuizQuestionCounterStyle, "auto">> = ["space_radar", "bubble_badge"];

    it.each(newCounterBadges)("renders counter badge '%s' in both Sandbox and Production", (cb) => {
      const sandbox = buildSandboxComposition({
        counter_style: cb,
        question_text: "Counter Badge Test?",
        choices: ["A", "B", "C"],
        question_number: 2,
        total_questions: 5,
      });
      const cbClass = `cb-${cb.replace(/_/g, "-")}`;
      expect(sandbox.html).toContain(cbClass);
      expect(sandbox.css).toContain(`.${cbClass}`);

      const production = renderProductionWithStyles({ counterStyle: cb });
      expect(production.html).toContain(`.${cbClass}`);
      const sceneHtml = findQuestionScene(production.files);
      expect(sceneHtml).toContain(cbClass);
    });
  });

  describe("Dynamic Palette Adaptation Across All 8 Rotating Palettes", () => {
    it.each(ALL_QUIZ_PALETTES.filter((p): p is Exclude<QuizPaletteId, "auto"> => p !== "auto"))(
      "adapts --bg-primary, --bg-secondary, and --bg-accent in Sandbox & Production for palette '%s'",
      (paletteId) => {
        const matched = candyArcadePalettes.find((p) => p.id === paletteId);
        expect(matched).toBeDefined();
        if (!matched) return;

        // Sandbox composition verification
        const sandbox = buildSandboxComposition({
          palette_id: paletteId,
          question_text: "Palette check?",
          choices: ["One", "Two", "Three"],
        });
        expect(sandbox.html).toContain(`--bg-primary: ${matched.backgroundPrimary};`);
        expect(sandbox.html).toContain(`--bg-secondary: ${matched.backgroundSecondary};`);
        expect(sandbox.html).toContain(`--bg-accent: ${matched.accent};`);
        expect(sandbox.html).toContain(`--accent: ${matched.accent};`);

        // Production composition verification
        const production = renderProductionWithStyles({ paletteId });
        const sceneHtml = findQuestionScene(production.files);
        expect(sceneHtml).toContain(`--bg-primary:${matched.backgroundPrimary};`);
        expect(sceneHtml).toContain(`--bg-secondary:${matched.backgroundSecondary};`);
        expect(sceneHtml).toContain(`--bg-accent:${matched.accent};`);
        expect(sceneHtml).toContain(`--accent:${matched.accent};`);
      },
    );
  });

  describe("Clean Fonts, Keyframes, & SVG Dimensions", () => {
    it("whitelists 4 core brand fonts and emits valid @font-face declarations", () => {
      expect(CANDY_ARCADE_FONTS.map((f) => f.id)).toEqual(["svn-hello-headline", "fredoka", "baloo-2", "nunito"]);

      const previewCss = candyArcadeCss({ fontMode: "preview" });
      for (const font of CANDY_ARCADE_FONTS) {
        expect(previewCss).toContain(`font-family: "${font.family}"`);
        expect(previewCss).toContain(`/api/quiz/fonts/${font.id}`);
      }

      const renderCss = candyArcadeCss({ fontMode: "render" });
      for (const font of CANDY_ARCADE_FONTS) {
        expect(renderCss).toContain(`font-family: "${font.family}"`);
        expect(renderCss).toContain(`./fonts/${font.filename}`);
      }
    });

    it("has properly namespaced keyframes without syntax errors", () => {
      const css = candyArcadeCss();
      const keyframeMatches = Array.from(css.matchAll(/@keyframes\s+([a-zA-Z0-9_-]+)/g)).map((m) => m[1]);
      expect(keyframeMatches.length).toBeGreaterThanOrEqual(25);

      // Verify namespacing prefixes exist
      expect(keyframeMatches.some((name) => name.startsWith("comic-"))).toBe(true);
      expect(keyframeMatches.some((name) => name.startsWith("blueprint-"))).toBe(true);
      expect(keyframeMatches.some((name) => name.startsWith("cosmic-"))).toBe(true);
      expect(keyframeMatches.some((name) => name.startsWith("cloud-"))).toBe(true);
      expect(keyframeMatches.some((name) => name.startsWith("space-radar-"))).toBe(true);
      expect(keyframeMatches.some((name) => name.startsWith("bubble-"))).toBe(true);
      expect(keyframeMatches.some((name) => name.startsWith("qb-cockpit-hud-"))).toBe(true);
      expect(keyframeMatches.some((name) => name.startsWith("qb-pastel-cloud-"))).toBe(true);
    });

    it("verifies all SVGs in new elements have explicit viewBox without broken attributes", () => {
      const sandbox = buildSandboxComposition({
        background_style: "construction_blueprint",
        question_box_style: "cockpit_hud",
        answer_card_style: "steel_beam_plate",
        counter_style: "space_radar",
        question_text: "SVG Validation?",
        choices: ["A", "B", "C"],
      });

      const svgMatches = Array.from(sandbox.html.matchAll(/<svg\b([^>]*)>/g)).map((m) => m[1]);
      expect(svgMatches.length).toBeGreaterThan(0);
      for (const svgAttrs of svgMatches) {
        expect(svgAttrs).toContain('viewBox="');
        expect(svgAttrs).not.toContain("NaN");
        expect(svgAttrs).not.toContain("undefined");
      }
    });
  });
});

function renderProductionWithStyles(styles: {
  backgroundStyle?: QuizBackgroundStyle;
  questionBoxStyle?: QuizQuestionBoxStyle;
  answerCardStyle?: QuizAnswerCardStyle;
  counterStyle?: QuizQuestionCounterStyle;
  paletteId?: QuizPaletteId;
}) {
  const director = createDefaultDirectorPlan(stage8Quiz);
  if (styles.backgroundStyle) director.beats[0].background_style = styles.backgroundStyle;
  if (styles.questionBoxStyle) director.beats[0].question_box_style = styles.questionBoxStyle;
  if (styles.answerCardStyle) director.beats[0].answer_card_style = styles.answerCardStyle;
  if (styles.counterStyle) director.beats[0].question_counter_style = styles.counterStyle;
  if (styles.paletteId) director.beats[0].palette_id = styles.paletteId;

  const voicePlan = buildQuizVoicePlan(stage8Quiz);
  const timeline = compileQuizTimeline({
    quiz: stage8Quiz,
    director,
    voicePlan,
    targetDurationSeconds: 15,
  });

  return buildCandyArcadeCompositionBundle({
    quiz: stage8Quiz,
    director,
    timeline,
    styleContext: {
      theme: "candy_arcade",
      override: {
        paletteId: styles.paletteId ?? "lime",
        backgroundStyle: styles.backgroundStyle ?? "candy_rays",
        questionBoxStyle: styles.questionBoxStyle ?? "candy_pop",
        answerCardStyle: styles.answerCardStyle ?? "glossy_arcade",
        counterStyle: styles.counterStyle ?? "hanging_woodsign",
      },
    },
    audioPath: "./narration.wav",
    narrationDurationSeconds: 15,
  });
}

function findQuestionScene(files: Record<string, string>): string {
  const file = Object.entries(files).find(([path]) => path.includes("quiz-q1-"))?.[1];
  if (!file) throw new Error("Question scene file not found in composition bundle");
  return file;
}

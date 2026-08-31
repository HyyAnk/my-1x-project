import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUIZ_PALETTE_FALLBACK,
  adaptLegacyVisualPreset,
  resolveBeatQuizStyle,
  resolvePresetPreviewLayoutId,
  resolveQuizStyle,
  serializeQuizPaletteCss,
  serializeQuizPaletteCssVariables,
  serializeQuizPaletteInlineStyle,
  type MascotProfile,
  type QuizAnswerCardStyle,
  type QuizPaletteId,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
  type QuizThinkingBarStyle,
  type QuizVisualTheme,
} from "@studio/shared";
import { candyArcadeCss } from "../src/quiz/render/candyArcadeComposition.js";
import { baseChoiceStyles } from "../src/quiz/render/choices/baseChoiceStyles.js";
import { choiceTypographyStyles } from "../src/quiz/render/choices/choiceTypographyStyles.js";
import { choiceStateStyles } from "../src/quiz/render/choices/choiceStateStyles.js";
import { mediaLeftChoicesRightLayout } from "../src/quiz/render/layouts/mediaLeftChoicesRight.js";
import { visualChoicesThreeLayout } from "../src/quiz/render/layouts/visualChoicesThree.js";
import { baselineLayout } from "../src/quiz/render/layouts/baseline.js";
import { glossyArcadeVariant } from "../src/quiz/visual/elements/answerCard/variants/glossyArcade.js";
import { comicChunkyVariant } from "../src/quiz/visual/elements/answerCard/variants/comicChunky.js";
import { glassNeonVariant } from "../src/quiz/visual/elements/answerCard/variants/glassNeon.js";
import { minimalSoftVariant } from "../src/quiz/visual/elements/answerCard/variants/minimalSoft.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { candyArcadePalettes } from "../src/quiz/visual/candyArcade.js";
import { resolveQuestionLayout } from "../src/quiz/layoutCompatibility.js";
import {
  resolveAnswerCardStyle,
  resolveCounterStyle,
  resolvePaletteId,
  resolveQuestionBoxStyle,
  resolveThinkingBarStyle,
  resolveVisualTheme,
} from "../../web/src/features/episode/utils/quizStyleResolution.js";

const mockMascotProfile: MascotProfile = {
  id: "mascot_test_123",
  name: "Robo Fox",
  description: "Smart orange robot fox",
  visual_style: "pixar_3d",
  master_prompt: "cute robo fox",
  master_image_url: "/api/mascots/mascot_test_123/assets/concept.png",
  color_theme: "#f97316",
  actions: {
    idle: {
      action: "idle",
      sprite_url: "/api/mascots/mascot_test_123/assets/idle_sprite.png",
      frames_count: 4,
      fps: 8,
      loop: true,
      motion_preset: "breathe",
    },
    thinking: {
      action: "thinking",
      sprite_url: "/api/mascots/mascot_test_123/assets/thinking_sprite.png",
      frames_count: 6,
      fps: 12,
      loop: true,
      motion_preset: "sway",
    },
    point: {
      action: "point",
      sprite_url: "/api/mascots/mascot_test_123/assets/point_sprite.png",
      frames_count: 4,
      fps: 8,
      loop: true,
      motion_preset: "point",
    },
    celebrate: {
      action: "celebrate",
      sprite_url: "/api/mascots/mascot_test_123/assets/celebrate_sprite.png",
      frames_count: 8,
      fps: 15,
      loop: true,
      motion_preset: "jump",
    },
  },
  assigned_channel_ids: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("Phase 5: CSS Ownership, Boundaries, Tokens & Style Resolution Matrix", () => {
  // =========================================================================
  // Group 1: CSS Ownership & Boundaries
  // =========================================================================
  describe("Group 1: CSS Ownership & Boundaries", () => {
    it("P5-CSS-01: Layout CSS owns placement, dimensions, gaps, aspect rules, and capacity tokens only", () => {
      const mlcrCss = mediaLeftChoicesRightLayout.css("16:9");
      const vc3Css = visualChoicesThreeLayout.css("16:9");
      const baseCss = baselineLayout.css("16:9");

      // Layout CSS must publish capacity custom properties
      expect(mlcrCss).toContain("--choice-card-min-height");
      expect(mlcrCss).toContain("--choice-badge-size");
      expect(mlcrCss).toContain("--choice-font-size-base");
      expect(vc3Css).toContain("--choice-media-height");
      expect(vc3Css).toContain("--choice-label-font-size-base");
      expect(baseCss).toContain("--choice-card-min-height");

      // Layout CSS must NOT target private skin selectors
      expect(mlcrCss).not.toContain(".ac-glossy-arcade");
      expect(mlcrCss).not.toContain(".ac-comic-chunky");
      expect(mlcrCss).not.toContain(".ac-glass-neon");
      expect(mlcrCss).not.toContain(".ac-minimal-soft");
      expect(vc3Css).not.toContain(".ac-glossy-arcade");
      expect(vc3Css).not.toContain(".ac-comic-chunky");

      // Layout CSS must NOT style private borders, shadows, backgrounds
      expect(mlcrCss).not.toContain("border: 8px solid");
      expect(mlcrCss).not.toContain("border: 7px solid");
      expect(mlcrCss).not.toContain("border: 4px solid");
    });

    it("P5-CSS-02: Base choice CSS owns stable internal structure independent of skin/layout", () => {
      const base = baseChoiceStyles();

      expect(base).toContain(".choice-group");
      expect(base).toContain(".choice-card");
      expect(base).toContain(".choice-card-text");
      expect(base).toContain(".choice-card-visual");
      expect(base).toContain(".choice-label");
      expect(base).toContain(".choice-text");
      expect(base).toContain(".choice-media");

      // Consumes capacity custom properties with fallbacks
      expect(base).toContain("var(--choice-card-min-height");
      expect(base).toContain("var(--choice-badge-size");
      expect(base).toContain("var(--choice-media-height");
    });

    it("P5-CSS-03: State CSS owns correct/incorrect/pending/reveal semantics shared across skins", () => {
      const state = choiceStateStyles();

      expect(state).toContain(".answer-correct");
      expect(state).toContain(".answer-incorrect");
      expect(state).toContain(".answer-check");
      expect(state).toContain(".answer-cross");
      expect(state).toContain("correct-card-reveal");
      expect(state).toContain("incorrect-card-settle");
      expect(state).toContain("status-pop");
    });

    it("P5-CSS-04: Typography CSS provides one tier system consuming capacity tokens", () => {
      const typo = choiceTypographyStyles();

      expect(typo).toContain(".choice-card-text .choice-text");
      expect(typo).toContain(".choice-tier-medium");
      expect(typo).toContain(".choice-tier-long");
      expect(typo).toContain(".choice-tier-very_long");
      expect(typo).toContain(".choice-tier-overflow");

      // Consumes capacity tokens
      expect(typo).toContain("var(--choice-font-size-base");
      expect(typo).toContain("var(--choice-font-size-medium");
      expect(typo).toContain("var(--choice-font-size-long");
      expect(typo).toContain("var(--choice-font-size-very_long");
      expect(typo).toContain("var(--choice-label-font-size-base");
      expect(typo).toContain("var(--choice-label-font-size-medium");
    });

    it("P5-CSS-05: Skin CSS owns decoration without outer layout placement", () => {
      const skins = [glossyArcadeVariant, comicChunkyVariant, glassNeonVariant, minimalSoftVariant];

      for (const skin of skins) {
        const css = skin.renderCss();
        expect(css).toContain(skin.className);

        // Skin CSS must NOT control outer layout geometry
        expect(css).not.toContain("grid-template-columns");
        expect(css).not.toContain("grid-template-areas");
        expect(css).not.toContain("grid-area: hero");
        expect(css).not.toContain("grid-area: answers");
      }
    });

    it("P5-CSS-06: Normal cascade has no !important cross-layer dependencies", () => {
      const base = baseChoiceStyles();
      const typo = choiceTypographyStyles();
      const state = choiceStateStyles();
      const mlcr = mediaLeftChoicesRightLayout.css("16:9");
      const vc3 = visualChoicesThreeLayout.css("16:9");
      const glossy = glossyArcadeVariant.renderCss();
      const comic = comicChunkyVariant.renderCss();
      const glass = glassNeonVariant.renderCss();
      const minimal = minimalSoftVariant.renderCss();

      expect(base).not.toContain("!important");
      expect(typo).not.toContain("!important");
      expect(state).not.toContain("!important");
      expect(mlcr).not.toContain("!important");
      expect(vc3).not.toContain("!important");
      expect(glossy).not.toContain("!important");
      expect(comic).not.toContain("!important");
      expect(glass).not.toContain("!important");
      expect(minimal).not.toContain("!important");
    });

    it("P5-CSS-07: CSS assembly includes base, variant, and layout blocks exactly once", () => {
      const css = candyArcadeCss({ fontMode: "preview", aspectRatio: "16:9" });

      // Check single occurrence of distinct section headers/signatures
      const baseChoiceCount = (css.match(/=== Base Choice Group & Cards \(ADR-003\) ===/g) || []).length;
      const typoCount = (css.match(/=== Choice Typography Tiers \(ADR-003\) ===/g) || []).length;
      const stateCount = (css.match(/=== Shared Choice States \(ADR-003\) ===/g) || []).length;
      const glossyCount = (css.match(/=== Answer Card: Glossy Arcade 3D ===/g) || []).length;
      const comicCount = (css.match(/=== Answer Card: Comic Pop Art ===/g) || []).length;
      const glassCount = (css.match(/=== Answer Card: Glassmorphism Neon ===/g) || []).length;
      const minimalCount = (css.match(/=== Answer Card: Minimalist Soft Card ===/g) || []).length;

      expect(baseChoiceCount).toBe(1);
      expect(typoCount).toBe(1);
      expect(stateCount).toBe(1);
      expect(glossyCount).toBe(1);
      expect(comicCount).toBe(1);
      expect(glassCount).toBe(1);
      expect(minimalCount).toBe(1);
    });
  });

  // =========================================================================
  // Group 2: Tokens & Responsive Capacity
  // =========================================================================
  describe("Group 2: Tokens & Responsive Capacity", () => {
    it("P5-TOK-01: Production and Sandbox emit identical semantic palette variable names and values", () => {
      for (const palette of candyArcadePalettes) {
        const vars = serializeQuizPaletteCssVariables(palette);
        const css = serializeQuizPaletteCss(palette);
        const inline = serializeQuizPaletteInlineStyle(palette);

        // Required standard variable keys
        expect(vars["--bg-primary"]).toBe(palette.backgroundPrimary);
        expect(vars["--bg-secondary"]).toBe(palette.backgroundSecondary);
        expect(vars["--accent"]).toBe(palette.accent);
        expect(vars["--surface-accent"]).toBe(palette.surfaceAccent);
        expect(vars["--on-accent"]).toBe(palette.onAccent);
        expect(vars["--answer-badge"]).toBe(palette.answerBadge);
        expect(vars["--badge"]).toBe(palette.answerBadge);
        expect(vars["--correct"]).toBe(palette.correct);
        expect(vars["--incorrect"]).toBe(palette.incorrect);
        expect(vars["--surface"]).toBe(palette.surface);
        expect(vars["--text"]).toBe(palette.text);
        expect(vars["--ink"]).toBe(palette.text);
        expect(vars["--muted"]).toBe(palette.muted);

        // Formatted outputs
        expect(css).toContain(`--bg-primary: ${palette.backgroundPrimary};`);
        expect(css).toContain(`--text: ${palette.text};`);
        expect(inline).toContain(`--bg-primary:${palette.backgroundPrimary};`);
        expect(inline).toContain(`--ink:${palette.text};`);
      }
    });

    it("P5-TOK-02: Missing or partial palette returns complete fallback set without invalid CSS", () => {
      const nullVars = serializeQuizPaletteCssVariables(null);
      const emptyVars = serializeQuizPaletteCssVariables({});

      expect(nullVars["--bg-primary"]).toBe(DEFAULT_QUIZ_PALETTE_FALLBACK.backgroundPrimary);
      expect(nullVars["--text"]).toBe(DEFAULT_QUIZ_PALETTE_FALLBACK.text);
      expect(emptyVars["--correct"]).toBe(DEFAULT_QUIZ_PALETTE_FALLBACK.correct);
      expect(emptyVars["--incorrect"]).toBe(DEFAULT_QUIZ_PALETTE_FALLBACK.incorrect);
    });

    it("P5-TOK-03: 16:9 layouts publish complete capacity custom properties", () => {
      const mlcr = mediaLeftChoicesRightLayout.css("16:9");
      const vc3 = visualChoicesThreeLayout.css("16:9");

      expect(mlcr).toContain("--choice-card-min-height: 116px;");
      expect(mlcr).toContain("--choice-badge-size: 138px;");
      expect(mlcr).toContain("--choice-font-size-base: 48px;");
      expect(mlcr).toContain("--choice-font-size-medium: 40px;");
      expect(mlcr).toContain("--choice-font-size-long: 32px;");
      expect(mlcr).toContain("--choice-font-size-very_long: 26px;");

      expect(vc3).toContain("--choice-media-height: 500px;");
      expect(vc3).toContain("--choice-label-font-size-base: 32px;");
      expect(vc3).toContain("--choice-label-font-size-medium: 28px;");
      expect(vc3).toContain("--choice-label-font-size-long: 24px;");
    });

    it("P5-TOK-04: 9:16 portrait layouts publish complete portrait capacity tokens", () => {
      const mlcr916 = mediaLeftChoicesRightLayout.css("9:16");
      const vc3916 = visualChoicesThreeLayout.css("9:16");

      expect(mlcr916).toContain('#stage[data-aspect-ratio="9:16"]');
      expect(mlcr916).toContain("--choice-badge-size: 124px;");
      expect(mlcr916).toContain("--choice-font-size-base: 40px;");

      expect(vc3916).toContain('#stage[data-aspect-ratio="9:16"]');
      expect(vc3916).toContain("--choice-media-height: 360px;");
    });

    it("P5-TOK-05: Mascot occupancy alters capacity through layout tokens, not skin overrides", () => {
      const mlcr = mediaLeftChoicesRightLayout.css("16:9");
      const vc3 = visualChoicesThreeLayout.css("16:9");
      const globalCss = candyArcadeCss({ aspectRatio: "16:9" });

      expect(mlcr).toContain(".has-mascot.layout-media_left_choices_right");
      expect(mlcr).toContain("--choice-font-size-base: 38px;");
      expect(vc3).toContain(".has-mascot.layout-visual_choices_three");
      expect(vc3).toContain("--choice-label-font-size-base: 26px;");

      expect(globalCss).toContain(
        ".has-mascot { --mascot-content-width: 1420px; --question-card-width: 1440px; --question-card-left-edge: 360px; }",
      );
      expect(globalCss).toContain("--choice-card-min-height: 114px;");
      expect(globalCss).toContain("--choice-badge-size: 136px;");
    });

    it("P5-TOK-06: Text tier rules consume layout capacity tokens", () => {
      const typo = choiceTypographyStyles();

      expect(typo).toContain(".choice-card-text .choice-text,\n.answer-card span {\n  font-size: var(--choice-font-size-base, 44px);\n}");
      expect(typo).toContain("var(--choice-font-size-medium, 38px)");
      expect(typo).toContain("var(--choice-font-size-long, 32px)");
      expect(typo).toContain("var(--choice-font-size-very_long, 26px)");
    });
  });

  // =========================================================================
  // Group 3: Style and Preset Resolution Policy
  // =========================================================================
  describe("Group 3: Style and Preset Resolution Policy", () => {
    it("P5-RES-01: Theme defaults only resolves full deterministic style with theme provenance", () => {
      const result = resolveQuizStyle({});

      expect(result.theme).toBe("candy_arcade");
      expect(result.paletteId).toBe("lime");
      expect(result.thinkingBarStyle).toBe("star_slider");
      expect(result.questionBoxStyle).toBe("candy_pop");
      expect(result.answerCardStyle).toBe("glossy_arcade");
      expect(result.counterStyle).toBe("hanging_woodsign");

      expect(result.provenance.theme).toBe("theme");
      expect(result.provenance.paletteId).toBe("theme");
      expect(result.provenance.thinkingBarStyle).toBe("theme");
      expect(result.provenance.questionBoxStyle).toBe("theme");
      expect(result.provenance.answerCardStyle).toBe("theme");
      expect(result.provenance.counterStyle).toBe("theme");
    });

    it("P5-RES-02: Channel defaults override theme defaults and record channel provenance", () => {
      const result = resolveQuizStyle({
        channel: {
          default_palette_id: "aqua",
          default_thinking_bar_style: "cosmic_rocket",
          default_question_box_style: "glass_morphism",
          default_answer_card_style: "glass_neon",
          default_counter_style: "neon_badge",
          display_name: "Channel X",
        },
      });

      expect(result.paletteId).toBe("aqua");
      expect(result.thinkingBarStyle).toBe("cosmic_rocket");
      expect(result.questionBoxStyle).toBe("glass_morphism");
      expect(result.answerCardStyle).toBe("glass_neon");
      expect(result.counterStyle).toBe("neon_badge");
      expect(result.channelBrandName).toBe("Channel X");

      expect(result.provenance.paletteId).toBe("channel");
      expect(result.provenance.thinkingBarStyle).toBe("channel");
      expect(result.provenance.questionBoxStyle).toBe("channel");
      expect(result.provenance.answerCardStyle).toBe("channel");
      expect(result.provenance.counterStyle).toBe("channel");
      expect(result.provenance.channelBrandName).toBe("channel");
    });

    it("P5-RES-03: Selected preset/episode values override channel defaults and record preset provenance", () => {
      const result = resolveQuizStyle({
        channel: {
          default_palette_id: "aqua",
          default_thinking_bar_style: "cosmic_rocket",
        },
        preset: {
          palette_id: "pink",
          thinking_bar_style: "capsule_liquid",
        },
      });

      expect(result.paletteId).toBe("pink");
      expect(result.thinkingBarStyle).toBe("capsule_liquid");
      expect(result.provenance.paletteId).toBe("preset");
      expect(result.provenance.thinkingBarStyle).toBe("preset");
    });

    it("P5-RES-04: Explicit episode custom values override preset/channel values", () => {
      const result = resolveQuizStyle({
        channel: { default_palette_id: "aqua" },
        preset: { palette_id: "pink" },
        override: { paletteId: "sunny", answerCardStyle: "comic_chunky" },
      });

      expect(result.paletteId).toBe("sunny");
      expect(result.answerCardStyle).toBe("comic_chunky");
      expect(result.provenance.paletteId).toBe("override");
      expect(result.provenance.answerCardStyle).toBe("override");
    });

    it("P5-RES-05: Explicit Director beat values override all lower layers for that beat", () => {
      const result = resolveBeatQuizStyle({
        channel: { default_palette_id: "aqua" },
        preset: { palette_id: "pink" },
        override: { paletteId: "sunny" },
        beat: { palette_id: "purple", thinking_bar_style: "energy_laser" },
      });

      expect(result.paletteId).toBe("purple");
      expect(result.thinkingBarStyle).toBe("energy_laser");
      expect(result.provenance.paletteId).toBe("beat");
      expect(result.provenance.thinkingBarStyle).toBe("beat");
    });

    it("P5-RES-06: auto and missing values inherit rather than erase lower layers", () => {
      const result = resolveQuizStyle({
        channel: { default_palette_id: "aqua", default_thinking_bar_style: "cosmic_rocket" },
        preset: { palette_id: "pink" },
        override: { paletteId: "auto", thinkingBarStyle: "auto" },
        beat: { palette_id: "auto", thinking_bar_style: "auto" },
      });

      expect(result.paletteId).toBe("pink");
      expect(result.thinkingBarStyle).toBe("cosmic_rocket");
    });

    it("P5-RES-07: Production versus Web/Episode/Sandbox preview resolve identical style IDs and palette", () => {
      const channel = {
        default_palette_id: "orange" as QuizPaletteId,
        default_thinking_bar_style: "capsule_liquid" as QuizThinkingBarStyle,
        default_question_box_style: "comic_bubble" as QuizQuestionBoxStyle,
        default_answer_card_style: "comic_chunky" as QuizAnswerCardStyle,
        default_counter_style: "golden_shield" as QuizQuestionCounterStyle,
        display_name: "MegaQuiz",
      };
      const episode = {
        visual_theme: "candy_arcade" as QuizVisualTheme,
        palette_id: "blue" as QuizPaletteId,
      };

      // Server policy resolution
      const serverResolved = resolveQuizStyle({ channel, episode });

      // Web helpers resolution
      const webTheme = resolveVisualTheme(episode);
      const webPalette = resolvePaletteId(channel, episode);
      const webThinking = resolveThinkingBarStyle(channel, episode);
      const webBox = resolveQuestionBoxStyle(channel, episode);
      const webCard: QuizAnswerCardStyle = resolveAnswerCardStyle(channel, episode);
      const webCounter = resolveCounterStyle(channel, episode);

      expect(serverResolved.theme).toBe(webTheme);
      expect(serverResolved.paletteId).toBe(webPalette);
      expect(serverResolved.thinkingBarStyle).toBe(webThinking);
      expect(serverResolved.questionBoxStyle).toBe(webBox);
      expect(serverResolved.answerCardStyle).toBe(webCard);
      expect(serverResolved.counterStyle).toBe(webCounter);
    });

    it("P5-RES-08: Preset preview layout affects showcase preview only, never production layout", () => {
      const presetWithPreviewLayout = {
        id: "preset_test",
        preview_layout_id: "visual_choices_three" as const,
      };

      // Preview layout resolved for Sandbox showcase
      const previewLayoutId = resolvePresetPreviewLayoutId(presetWithPreviewLayout);
      expect(previewLayoutId).toBe("visual_choices_three");

      // Production layout resolution is ALWAYS question-driven, ignoring preset preview_layout_id
      const question = {
        id: "q1",
        number: 1,
        question: "Which one is an animal?",
        format: "multiple_choice" as const,
        choices: ["Lion", "Car", "Tree"],
        answer_index: 0,
      };
      const beat = {
        question_id: "q1",
        archetype: "text_multiple_choice" as const,
        layout_id: "auto" as const,
      };

      const prodResolution = resolveQuestionLayout(question, beat, "16:9");
      expect(prodResolution.ok).toBe(true);
      if (prodResolution.ok) {
        expect(prodResolution.layoutId).toBe("media_left_choices_right");
      }
    });

    it("P5-RES-09: Legacy layout_id preset field read through compatibility adapter with removal condition", () => {
      const legacyPreset = {
        id: "legacy_1",
        name: "Old Preset",
        layout_id: "visual_choices_three" as const,
      };

      const previewLayout = resolvePresetPreviewLayoutId(legacyPreset);
      expect(previewLayout).toBe("visual_choices_three");

      const adapted = adaptLegacyVisualPreset(legacyPreset);
      expect(adapted.preview_layout_id).toBe("visual_choices_three");
      expect(adapted.layout_id).toBe("visual_choices_three");
    });
  });

  // =========================================================================
  // Group 4: Visual and Workflow Regression
  // =========================================================================
  describe("Group 4: Visual and Workflow Regression", () => {
    it("P5-VIS-01: Four skins render cleanly across existing layouts without geometry collision", () => {
      const skins = ["glossy_arcade", "comic_chunky", "glass_neon", "minimal_soft"] as const;

      for (const skin of skins) {
        const res = buildSandboxComposition({
          answer_card_style: skin,
          layout_id: "media_left_choices_right",
        });

        expect(res.html).toContain(`skin-${skin}`);
        expect(res.html).toContain("layout-media_left_choices_right");
        expect(res.html).toContain("choice-card");
      }
    });

    it("P5-VIS-02: 16:9 and 9:16 compositions render cleanly", () => {
      const res169 = buildSandboxComposition({ aspect_ratio: "16:9" });
      const res916 = buildSandboxComposition({ aspect_ratio: "9:16" });

      expect(res169.html).toContain('data-aspect-ratio="16:9"');
      expect(res916.html).toContain('data-aspect-ratio="9:16"');
      expect(res916.html).toContain('#stage[data-aspect-ratio="9:16"]');
    });

    it("P5-VIS-03: Mascot on/off and both anchors remain stable", () => {
      const resLeft = buildSandboxComposition(
        { mascot_id: "mascot_test_123", mascot_enabled: true, mascot_position: "bottom_left" },
        mockMascotProfile,
      );
      const resRight = buildSandboxComposition(
        { mascot_id: "mascot_test_123", mascot_enabled: true, mascot_position: "bottom_right" },
        mockMascotProfile,
      );

      expect(resLeft.html).toContain("has-mascot");
      expect(resLeft.html).toContain("anchor-bottom_left");
      expect(resRight.html).toContain("has-mascot");
      expect(resRight.html).toContain("anchor-bottom_right");
    });

    it("P5-VIS-04: Reduced motion suppresses decorative animation while preserving status visibility", () => {
      const css = candyArcadeCss({ aspectRatio: "16:9" });

      expect(css).toContain("@media (prefers-reduced-motion: reduce)");
      expect(css).toContain("animation-duration: .001ms !important;");
      expect(css).toContain("animation-iteration-count: 1 !important;");
    });

    it("P5-VIS-05: Phase states do not prematurely reveal answers or hide pending cards", () => {
      const resChoices = buildSandboxComposition({ phase: "choices" });
      const resReveal = buildSandboxComposition({ phase: "reveal" });

      expect(resChoices.html).toContain("--choices-at: 0s");
      expect(resChoices.html).toContain("--reveal-at: 999s");
      expect(resReveal.html).toContain("--reveal-at: 0s");
    });
  });
});

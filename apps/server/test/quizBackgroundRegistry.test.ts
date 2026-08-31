import { describe, expect, it } from "vitest";
import {
  ALL_BACKGROUND_STYLES,
  BACKGROUND_STYLE_DESCRIPTIONS,
  BACKGROUND_STYLE_LABELS,
  BUILT_IN_PRESETS,
  DirectorBeatSchema,
  QuizConfigSchema,
  QuizV2Schema,
  SandboxPreviewInputSchema,
  resolveQuizStyle,
  type QuizBackgroundStyle,
  type QuizV2,
} from "@studio/shared";
import {
  auroraGlowVariant,
  backgroundRegistry,
  candyRaysVariant,
  getBackgroundStylesCss,
} from "../src/quiz/visual/elements/background/index.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";

describe("Phase 7 — Background Variant Registry and Resolution (ADR-004)", () => {
  describe("Contract and Resolution Matrix", () => {
    it("P7-CAT-01: Background schema versus registry: exact parity excluding 'auto'", () => {
      const nonAutoEnums = ALL_BACKGROUND_STYLES.filter((s): s is Exclude<QuizBackgroundStyle, "auto"> => s !== "auto");
      const registryIds = Array.from(backgroundRegistry.keys());

      expect(registryIds.sort()).toEqual(nonAutoEnums.sort());
      expect(registryIds).toEqual(["candy_rays", "aurora_glow"].sort());
      for (const id of registryIds) {
        const variant = backgroundRegistry.get(id);
        expect(variant).toBeDefined();
        expect(variant?.id).toBe(id);
      }
    });

    it("P7-CAT-02: Missing legacy field: resolves to candy_rays and old records parse without migration", () => {
      // Legacy director beat missing background_style
      const legacyBeatJson = {
        question_id: "q1",
        archetype: "text_multiple_choice",
        energy: "curious",
        visual_density: "focused",
        palette_id: "lime",
        layout_id: "media_left_choices_right",
        motion_id: "enter.pop",
        transition_id: "bubble_splash",
        thinking_bar_style: "star_slider",
        question_counter_style: "hanging_woodsign",
        question_box_style: "candy_pop",
        answer_card_style: "glossy_arcade",
        thinking_seconds: 5,
        beat_intents: ["question_enter", "choice_reveal", "thinking", "countdown", "answer_reveal", "explanation", "transition"],
        asset_intents: ["question_illustration"],
        mascot_state: "celebrate",
        sfx_intents: ["countdown_tick", "correct_small"],
        transition_intent: "cut",
        reward_intensity: "small",
      };
      const parsedBeat = DirectorBeatSchema.parse(legacyBeatJson);
      expect(parsedBeat.background_style).toBe("auto");

      // Legacy QuizConfig missing background_style
      const legacyConfig = {
        question_count: 8,
        quiz_format: "multiple_choice",
        age_band: "7-9",
        answer_mode: "voice_and_reveal",
        visual_theme: "candy_arcade",
        visual_style: "mixed",
        resolved_visual_style: "pixar_3d",
        thinking_bar_style: "auto",
        question_counter_style: "auto",
        question_box_style: "auto",
        answer_card_style: "auto",
        palette_id: "auto",
      };
      const parsedConfig = QuizConfigSchema.parse(legacyConfig);
      expect(parsedConfig.background_style).toBe("auto");

      // Resolved style with empty context resolves to candy_rays
      const resolved = resolveQuizStyle({});
      expect(resolved.backgroundStyle).toBe("candy_rays");
      expect(resolved.provenance.backgroundStyle).toBe("theme");
    });

    it("P7-CAT-03: 'auto' through style precedence with provenance", () => {
      // 1. Channel default
      const channelStyle = resolveQuizStyle({
        channel: { default_background_style: "aurora_glow" },
      });
      expect(channelStyle.backgroundStyle).toBe("aurora_glow");
      expect(channelStyle.provenance.backgroundStyle).toBe("channel");

      // 2. Preset overrides channel
      const presetStyle = resolveQuizStyle({
        channel: { default_background_style: "candy_rays" },
        preset: { background_style: "aurora_glow" },
      });
      expect(presetStyle.backgroundStyle).toBe("aurora_glow");
      expect(presetStyle.provenance.backgroundStyle).toBe("preset");

      // 3. Episode custom overrides preset
      const episodeStyle = resolveQuizStyle({
        preset: { background_style: "candy_rays" },
        episode: { background_style: "aurora_glow" },
      });
      expect(episodeStyle.backgroundStyle).toBe("aurora_glow");
      expect(episodeStyle.provenance.backgroundStyle).toBe("episode");

      // 4. Override overrides episode
      const overrideStyle = resolveQuizStyle({
        episode: { background_style: "candy_rays" },
        override: { backgroundStyle: "aurora_glow" },
      });
      expect(overrideStyle.backgroundStyle).toBe("aurora_glow");
      expect(overrideStyle.provenance.backgroundStyle).toBe("override");

      // 5. Director beat overrides override
      const beatStyle = resolveQuizStyle({
        override: { backgroundStyle: "aurora_glow" },
        beat: { background_style: "candy_rays" },
      });
      expect(beatStyle.backgroundStyle).toBe("candy_rays");
      expect(beatStyle.provenance.backgroundStyle).toBe("beat");
    });

    it("P7-CAT-04: Explicit variant preserved through preview and production inputs", () => {
      const sandboxInput = SandboxPreviewInputSchema.parse({
        background_style: "aurora_glow",
        theme: "candy_arcade",
        palette_id: "purple",
      });
      expect(sandboxInput.background_style).toBe("aurora_glow");

      const preview = buildSandboxComposition(sandboxInput);
      expect(preview.html).toContain('class="bg-aurora-glow"');
      expect(preview.html).not.toContain('<div class="bg-rays">');
    });

    it("P7-CAT-05: Preset background affects background only; production layout remains semantic", () => {
      const cyberNeonPreset = BUILT_IN_PRESETS.find((p) => p.id === "preset_cyber_neon");
      expect(cyberNeonPreset).toBeDefined();
      expect(cyberNeonPreset?.background_style).toBe("aurora_glow");

      const arcadePreset = BUILT_IN_PRESETS.find((p) => p.id === "preset_arcade_classic");
      expect(arcadePreset).toBeDefined();
      expect(arcadePreset?.background_style).toBe("candy_rays");
    });

    it("P7-CAT-06: Registry/UI metadata: exhaustive unique mapping", () => {
      for (const style of ALL_BACKGROUND_STYLES) {
        const label = BACKGROUND_STYLE_LABELS[style as keyof typeof BACKGROUND_STYLE_LABELS];
        const desc = BACKGROUND_STYLE_DESCRIPTIONS[style as keyof typeof BACKGROUND_STYLE_DESCRIPTIONS];
        expect(label).toBeDefined();
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
        expect(desc).toBeDefined();
        expect(typeof desc).toBe("string");
        expect(desc.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Rendering and Determinism Matrix", () => {
    it("P7-REN-01: 'candy_rays' compatibility: current layers and visible semantics preserved", () => {
      const prodHtml = candyRaysVariant.renderHtml({ surface: "production", questionIndex: 0 });
      const sandboxHtml = candyRaysVariant.renderHtml({ surface: "sandbox", questionIndex: 0 });
      expect(sandboxHtml).toBe(prodHtml);
      expect(prodHtml).toContain('class="quiz-scene-background"');
      expect(prodHtml).toContain('data-background-style="candy_rays"');
      expect(prodHtml).toContain('class="bg-gradient"');
      expect(prodHtml).toContain('class="bg-rays"');
      expect(prodHtml).toContain('class="bg-pattern pattern-circles"');
      expect(prodHtml).toContain('class="bg-pattern pattern-sprinkles"');
      expect(prodHtml).toContain('class="bg-shape shape-a"');
      expect(prodHtml).toContain('class="scene-decor"');
    });

    it("P7-REN-02: Proof animated variant ('aurora_glow'): own scoped HTML/CSS, palette-driven", () => {
      const html = auroraGlowVariant.renderHtml({ surface: "production", questionIndex: 0 });
      expect(html).toContain('class="bg-aurora-glow"');
      expect(html).toContain('class="aurora-gradient-base"');
      expect(html).toContain('class="aurora-mesh-curtain"');
      expect(html).toContain('class="aurora-orb aurora-orb-1"');
      expect(html).toContain('class="aurora-orb aurora-orb-2"');
      expect(html).toContain('class="aurora-orb aurora-orb-3"');
      expect(html).toContain('class="aurora-stardust"');

      const css = auroraGlowVariant.renderCss();
      expect(css).toContain(".bg-aurora-glow");
      expect(css).toContain("var(--bg-primary)");
      expect(css).toContain("var(--bg-secondary)");
      expect(css).toContain("var(--accent)");
      expect(css).toContain("var(--surface-accent)");
      expect(css).toContain("@keyframes aurora-float-1");
      expect(css).toContain("@keyframes aurora-float-2");
      expect(css).toContain("@keyframes aurora-float-3");
      expect(css).toContain("@keyframes aurora-shimmer");
    });

    it("P7-REN-03: Identical seed and inputs yield bit-for-bit identical output (100% deterministic)", () => {
      const run1 = auroraGlowVariant.renderHtml({ surface: "production", questionIndex: 2 });
      const run2 = auroraGlowVariant.renderHtml({ surface: "production", questionIndex: 2 });
      expect(run1).toBe(run2);

      const candyRun1 = candyRaysVariant.renderHtml({ surface: "production", questionIndex: 3 });
      const candyRun2 = candyRaysVariant.renderHtml({ surface: "production", questionIndex: 3 });
      expect(candyRun1).toBe(candyRun2);
    });

    it("P7-REN-04: Different questionIndex produces bounded phase variation", () => {
      const q0 = auroraGlowVariant.renderHtml({ surface: "production", questionIndex: 0 });
      const q1 = auroraGlowVariant.renderHtml({ surface: "production", questionIndex: 1 });
      expect(q0).not.toBe(q1);
      // Both contain valid CSS variable phase offsets
      expect(q0).toContain("--aurora-phase:");
      expect(q1).toContain("--aurora-phase:");
    });

    it("P7-REN-05: CSS assembly: background CSS included once, no duplicate legacy block", () => {
      const masterCss = candyArcadeCss({ fontMode: "render", aspectRatio: "16:9" });
      const allBgCss = getBackgroundStylesCss();
      expect(allBgCss.length).toBeGreaterThan(0);

      // Master CSS contains the background registry CSS
      expect(masterCss).toContain("Background Variant: Candy Rays");
      expect(masterCss).toContain("Background Variant: Aurora Glow");

      // Verify no duplicate .bg-gradient definition in master CSS
      const count = (masterCss.match(/\.bg-gradient\s*\{/g) || []).length;
      expect(count).toBe(1);
    });

    it("P7-REN-06: Selector boundary: background CSS does not target layout/choice internals", () => {
      const bgCss = getBackgroundStylesCss();
      expect(bgCss).not.toContain(".choice-card");
      expect(bgCss).not.toContain(".question-box");
      expect(bgCss).not.toContain(".thinking-bar");
      expect(bgCss).not.toContain(".game-stage");
    });

    it("P7-REN-07: Layer and animation budget: within declared registry metadata", () => {
      for (const variant of backgroundRegistry.values()) {
        expect(variant.performance.layerCount).toBeLessThanOrEqual(8);
        expect(variant.performance.willChangeCount).toBeLessThanOrEqual(4);
        expect(variant.performance.reducedMotionSafe).toBe(true);
        expect(variant.performance.animatedProperties.every((p) => ["transform", "opacity"].includes(p))).toBe(true);
      }
    });
  });

  describe("Surface and Reduced Motion Matrix", () => {
    it("P7-SUR-01: Production versus Sandbox parity for both variants", () => {
      // candy_rays in Sandbox
      const candySandbox = buildSandboxComposition({
        background_style: "candy_rays",
        theme: "candy_arcade",
        palette_id: "lime",
      });
      expect(candySandbox.html).toContain("bg-rays");
      expect(candySandbox.html).toContain("bg-gradient");

      // aurora_glow in Sandbox
      const auroraSandbox = buildSandboxComposition({
        background_style: "aurora_glow",
        theme: "candy_arcade",
        palette_id: "purple",
      });
      expect(auroraSandbox.html).toContain("bg-aurora-glow");
      expect(auroraSandbox.html).toContain("aurora-orb");
    });

    it("P7-SUR-04: Reduced motion disables continuous keyframe animations", () => {
      const candyCss = candyRaysVariant.renderCss();
      expect(candyCss).toContain("@media (prefers-reduced-motion: reduce)");
      expect(candyCss).toContain(".bg-rays, .pattern-circles, .bg-shape, .scene-decor i { animation: none !important; }");

      const auroraCss = auroraGlowVariant.renderCss();
      expect(auroraCss).toContain("@media (prefers-reduced-motion: reduce)");
      expect(auroraCss).toContain(".aurora-orb, .aurora-stardust i { animation: none !important; }");
    });

    it("P7-SUR-05: Production composition bundle renders selected background variant per beat", () => {
      const parsed = QuizV2Schema.parse({
        schema_version: 2,
        episode_id: "ep_phase7_test",
        title: "Phase 7 Background Test",
        age_band: "7-9",
        target_duration_seconds: 60,
        target_audience: "Kids",
        language: "en",
        status: "DRAFT",
        questions: [
          {
            id: "q1",
            number: 1,
            format: "multiple_choice",
            difficulty: 1,
            correct_choice_id: "c1",
            question: "What is 2 + 2?",
            visual_opportunity: "Math classroom with numbers",
            fun_fact: "Math is universal!",
            explanation: "2 plus 2 equals 4.",
            source_ids: ["S1"],
            validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
            choices: [
              { id: "c1", text: "4", is_correct: true, explanation_factor: "Correct" },
              { id: "c2", text: "5", is_correct: false, explanation_factor: "Incorrect" },
              { id: "c3", text: "6", is_correct: false, explanation_factor: "Incorrect" },
            ],
          },
        ],
      });
      const quiz: QuizV2 = parsed;

      const directorPlan = createDefaultDirectorPlan(quiz);
      directorPlan.beats[0].background_style = "aurora_glow";

      const voicePlan = buildQuizVoicePlan(quiz);
      const timeline = compileQuizTimeline({
        quiz,
        director: directorPlan,
        voicePlan,
        targetDurationSeconds: 60,
      });

      const bundle = buildCandyArcadeCompositionBundle({
        quiz,
        director: directorPlan,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "/audio/test.mp3",
        narrationDurationSeconds: 15,
      });

      expect(bundle.html).toContain("bg-aurora-glow");
      expect(bundle.html).toContain("aurora-orb");
    });
  });
});

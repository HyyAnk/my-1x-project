import { describe, expect, it } from "vitest";
import { ALL_QUESTION_BOX_STYLES, type QuizQuestionBoxStyle } from "@studio/shared";
import {
  getQuestionBoxesCss,
  getQuestionBoxVariant,
  resolveQuestionBoxVariant,
  QUESTION_BOX_VARIANTS,
} from "../src/quiz/visual/elements/questionBox/registry.js";
import { hazardStripesVariant } from "../src/quiz/visual/elements/questionBox/variants/hazardStripes.js";
import { cockpitHudVariant } from "../src/quiz/visual/elements/questionBox/variants/cockpitHud.js";
import { pastelCloudVariant } from "../src/quiz/visual/elements/questionBox/variants/pastelCloud.js";
import { BUILT_IN_QUESTION_BOX_MODULES } from "../src/quiz/visual/styleModules/builtins.js";
import { renderValidatedModuleCss } from "../src/quiz/visual/styleModules/namespaceCss.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";

describe("Question Box Element Suite", () => {
  it("registers all 7 question box styles in the registry", () => {
    for (const style of ALL_QUESTION_BOX_STYLES) {
      if (style === "auto") continue;
      const variant = getQuestionBoxVariant(style);
      expect(variant).toBeDefined();
      expect(variant.id).toBe(style);
      expect(variant.displayName).toBeTruthy();
      expect(variant.description).toBeTruthy();
      expect(typeof variant.renderHtml).toBe("function");
      expect(typeof variant.renderCss).toBe("function");
    }
  });

  it("resolves auto, null, or unknown style to default candy_pop", () => {
    const defaultVar = resolveQuestionBoxVariant("auto");
    expect(defaultVar.id).toBe("candy_pop");

    const nullVar = resolveQuestionBoxVariant(null);
    expect(nullVar.id).toBe("candy_pop");

    // @ts-expect-error testing invalid input fallback
    const unknownVar = resolveQuestionBoxVariant("unknown_qb_style");
    expect(unknownVar.id).toBe("candy_pop");
  });

  it("exports exact singleton instances for all new variants in registry and builtins", () => {
    expect(QUESTION_BOX_VARIANTS.hazard_stripes).toBe(hazardStripesVariant);
    expect(QUESTION_BOX_VARIANTS.cockpit_hud).toBe(cockpitHudVariant);
    expect(QUESTION_BOX_VARIANTS.pastel_cloud).toBe(pastelCloudVariant);

    const hazardModule = BUILT_IN_QUESTION_BOX_MODULES.find((m) => m.manifest.id === "hazard_stripes");
    const cockpitModule = BUILT_IN_QUESTION_BOX_MODULES.find((m) => m.manifest.id === "cockpit_hud");
    const cloudModule = BUILT_IN_QUESTION_BOX_MODULES.find((m) => m.manifest.id === "pastel_cloud");

    expect(hazardModule?.renderer).toBe(hazardStripesVariant);
    expect(cockpitModule?.renderer).toBe(cockpitHudVariant);
    expect(cloudModule?.renderer).toBe(pastelCloudVariant);
  });

  describe("hazard_stripes variant (Build Zone Crew)", () => {
    it("renders heavy-duty industrial builder plate with hazard warning stripes and rivets", () => {
      const html = hazardStripesVariant.renderHtml({
        question: "Which material is strongest for building foundations?",
        tier: "medium",
        questionNumber: 2,
        paletteAccent: "#FACC15",
      });

      expect(html).toContain("qb-hazard-stripes");
      expect(html).toContain("question-tier-medium");
      expect(html).toContain("hazard-card-inner");
      expect(html).toContain("hazard-stripe-top");
      expect(html).toContain("hazard-stripe-bottom");
      expect(html).toContain("hazard-metal-plate");
      expect(html).toContain("rivet-tl");
      expect(html).toContain("rivet-br");
      expect(html).toContain("ZONE-01");
      expect(html).toContain("HEAVY-DUTY");
      expect(html).toContain("Which material is strongest for building foundations?");
    });

    it("renders keyword highlight when highlightedHtml is provided", () => {
      const html = hazardStripesVariant.renderHtml({
        question: "What tool is used to tighten bolts?",
        highlightedHtml: 'What tool is used to tighten <span class="keyword-highlight">bolts</span>?',
        tier: "short",
      });

      expect(html).toContain('<span class="keyword-highlight">bolts</span>');
    });

    it("integrates dynamic CSS variables and satisfies CSS module validation", () => {
      const css = hazardStripesVariant.renderCss();

      expect(css).toContain(".qb-hazard-stripes");
      expect(css).toContain("var(--bg-primary");
      expect(css).toContain("var(--bg-accent, var(--accent");
      expect(css).toContain(".qb-hazard-stripes h1");
      expect(css).toContain(".qb-hazard-stripes .keyword-highlight");

      // Verify module CSS validation does not throw
      const hazardModule = BUILT_IN_QUESTION_BOX_MODULES.find((m) => m.manifest.id === "hazard_stripes")!;
      expect(() => renderValidatedModuleCss(hazardModule)).not.toThrow();
    });
  });

  describe("cockpit_hud variant (Cosmic Space Voyager)", () => {
    it("renders Sci-Fi aerospace visor with telemetry brackets and targeting ticks", () => {
      const html = cockpitHudVariant.renderHtml({
        question: "What is the largest moon in the Solar System?",
        tier: "short",
        questionNumber: 3,
        paletteAccent: "#00F0FF",
      });

      expect(html).toContain("qb-cockpit-hud");
      expect(html).toContain("question-tier-short");
      expect(html).toContain("hud-card-inner");
      expect(html).toContain("hud-grid-overlay");
      expect(html).toContain("hud-scan-line");
      expect(html).toContain("bracket-tl");
      expect(html).toContain("bracket-br");
      expect(html).toContain("hud-telemetry");
      expect(html).toContain("// HUD.NAV: RECON-07");
      expect(html).toContain("TARGET ACQUIRED");
      expect(html).toContain("reticle-left");
      expect(html).toContain("reticle-right");
      expect(html).toContain("What is the largest moon in the Solar System?");
    });

    it("integrates dynamic CSS variables and validates keyframe namespace scoping", () => {
      const css = cockpitHudVariant.renderCss();

      expect(css).toContain(".qb-cockpit-hud");
      expect(css).toContain("var(--bg-primary");
      expect(css).toContain("var(--bg-secondary");
      expect(css).toContain("var(--bg-accent, var(--accent");
      expect(css).toContain("@keyframes qb-cockpit-hud-scan");
      expect(css).toContain("@keyframes qb-cockpit-hud-blink");

      const cockpitModule = BUILT_IN_QUESTION_BOX_MODULES.find((m) => m.manifest.id === "cockpit_hud")!;
      expect(() => renderValidatedModuleCss(cockpitModule)).not.toThrow();
    });
  });

  describe("pastel_cloud variant (Sweet Pastel Pop)", () => {
    it("renders soft puffy cumulus cloud contour with pastel sparkles", () => {
      const html = pastelCloudVariant.renderHtml({
        question: "Which cotton candy flavor is the fluffiest?",
        tier: "long",
        questionNumber: 1,
        paletteAccent: "#F472B6",
      });

      expect(html).toContain("qb-pastel-cloud");
      expect(html).toContain("question-tier-long");
      expect(html).toContain("cloud-card-inner");
      expect(html).toContain("cloud-ambient-glow");
      expect(html).toContain("cloud-billows");
      expect(html).toContain("cloud-puff puff-tl");
      expect(html).toContain("sparkle-tl");
      expect(html).toContain("sparkle-tr");
      expect(html).toContain("Which cotton candy flavor is the fluffiest?");
    });

    it("integrates dynamic CSS variables, validates namespaced keyframes, and sets high-contrast typography", () => {
      const css = pastelCloudVariant.renderCss();

      expect(css).toContain(".qb-pastel-cloud");
      expect(css).toContain("var(--bg-primary");
      expect(css).toContain("var(--bg-secondary");
      expect(css).toContain("var(--bg-accent, var(--accent");
      expect(css).toContain("#2D1540"); // High-contrast ink for pastel background
      expect(css).toContain("@keyframes qb-pastel-cloud-shimmer");

      const cloudModule = BUILT_IN_QUESTION_BOX_MODULES.find((m) => m.manifest.id === "pastel_cloud")!;
      expect(() => renderValidatedModuleCss(cloudModule)).not.toThrow();
    });
  });

  it("aggregates all 7 variants in getQuestionBoxesCss() without throwing", () => {
    const allCss = getQuestionBoxesCss();

    expect(allCss).toContain(".qb-candy-pop");
    expect(allCss).toContain(".qb-comic-bubble");
    expect(allCss).toContain(".qb-glass-morphism");
    expect(allCss).toContain(".qb-parchment-scroll");
    expect(allCss).toContain(".qb-hazard-stripes");
    expect(allCss).toContain(".qb-cockpit-hud");
    expect(allCss).toContain(".qb-pastel-cloud");
  });

  it("integrates seamlessly into sandbox compositions with high contrast report", () => {
    const stylesToTest: Array<Exclude<QuizQuestionBoxStyle, "auto">> = ["hazard_stripes", "cockpit_hud", "pastel_cloud"];

    for (const style of stylesToTest) {
      const composition = buildSandboxComposition({
        theme: "candy_arcade",
        palette_id: style === "hazard_stripes" ? "orange" : style === "cockpit_hud" ? "aqua" : "pink",
        question_box_style: style,
        thinking_bar_style: "star_slider",
        counter_style: "hanging_woodsign",
        phase: "thinking",
        question_text: `Testing ${style} question box variant`,
        choices: ["Option 1", "Option 2", "Option 3"],
        correct_choice_index: 0,
        question_number: 1,
        total_questions: 5,
      });

      expect(composition.html).toContain(`qb-${style.replace(/_/g, "-")}`);
      expect(composition.html).toContain(`Testing ${style} question box variant`);
      expect(composition.contrast_report.ok).toBe(true);
    }
  });
});

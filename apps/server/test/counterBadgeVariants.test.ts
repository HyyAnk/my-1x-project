import { describe, expect, it } from "vitest";
import { ALL_QUESTION_COUNTER_STYLES } from "@studio/shared";
import {
  COUNTER_BADGE_VARIANTS,
  DEFAULT_COUNTER_BADGE_STYLE,
  getCounterBadgesCss,
  getCounterBadgeVariant,
  resolveCounterBadgeVariant,
} from "../src/quiz/visual/elements/counterBadge/registry.js";
import { hangingWoodSignVariant } from "../src/quiz/visual/elements/counterBadge/variants/hangingWoodSign.js";
import { neonBadgeVariant } from "../src/quiz/visual/elements/counterBadge/variants/neonBadge.js";
import { floatingBalloonVariant } from "../src/quiz/visual/elements/counterBadge/variants/floatingBalloon.js";
import { goldenShieldVariant } from "../src/quiz/visual/elements/counterBadge/variants/goldenShield.js";
import { spaceRadarVariant } from "../src/quiz/visual/elements/counterBadge/variants/spaceRadar.js";
import { bubbleBadgeVariant } from "../src/quiz/visual/elements/counterBadge/variants/bubbleBadge.js";
import { goldenCompassVariant } from "../src/quiz/visual/elements/counterBadge/variants/goldenCompass.js";
import { BUILT_IN_COUNTER_MODULES } from "../src/quiz/visual/styleModules/builtins.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { LANDSCAPE_FRAME } from "../src/quiz/render/frame/landscapeFrameGeometry.js";

describe("Counter Badge Element Suite", () => {
  it("registers all 7 counter badge styles in the registry", () => {
    expect(ALL_QUESTION_COUNTER_STYLES.length).toBe(7);
    for (const style of ALL_QUESTION_COUNTER_STYLES) {
      if (style === "auto") continue;
      const variant = getCounterBadgeVariant(style);
      expect(variant).toBeDefined();
      expect(variant.id).toBe(style);
      expect(variant.displayName).toBeTruthy();
      expect(variant.description).toBeTruthy();
      expect(typeof variant.renderHtml).toBe("function");
      expect(typeof variant.renderCss).toBe("function");
    }
  });

  it("resolves auto, null, or unknown style to default hanging_woodsign", () => {
    expect(DEFAULT_COUNTER_BADGE_STYLE).toBe("hanging_woodsign");

    const autoVar = resolveCounterBadgeVariant("auto");
    expect(autoVar.id).toBe("hanging_woodsign");

    const nullVar = resolveCounterBadgeVariant(null);
    expect(nullVar.id).toBe("hanging_woodsign");

    // @ts-expect-error testing invalid input fallback
    const unknownVar = resolveCounterBadgeVariant("unknown_counter_style");
    expect(unknownVar.id).toBe("hanging_woodsign");
  });

  it("exports exact singleton instances for all variants in registry and builtins", () => {
    expect(COUNTER_BADGE_VARIANTS.hanging_woodsign).toBe(hangingWoodSignVariant);
    expect(COUNTER_BADGE_VARIANTS.neon_badge).toBe(neonBadgeVariant);
    expect(COUNTER_BADGE_VARIANTS.floating_balloon).toBe(floatingBalloonVariant);
    expect(COUNTER_BADGE_VARIANTS.golden_shield).toBe(goldenShieldVariant);
    expect(COUNTER_BADGE_VARIANTS.space_radar).toBe(spaceRadarVariant);
    expect(COUNTER_BADGE_VARIANTS.bubble_badge).toBe(bubbleBadgeVariant);
    expect(COUNTER_BADGE_VARIANTS.golden_compass).toBe(goldenCompassVariant);

    expect(BUILT_IN_COUNTER_MODULES).toHaveLength(7);
    expect(BUILT_IN_COUNTER_MODULES[0].renderer).toBe(hangingWoodSignVariant);
    expect(BUILT_IN_COUNTER_MODULES[1].renderer).toBe(neonBadgeVariant);
    expect(BUILT_IN_COUNTER_MODULES[2].renderer).toBe(floatingBalloonVariant);
    expect(BUILT_IN_COUNTER_MODULES[3].renderer).toBe(goldenShieldVariant);
    expect(BUILT_IN_COUNTER_MODULES[4].renderer).toBe(spaceRadarVariant);
    expect(BUILT_IN_COUNTER_MODULES[5].renderer).toBe(bubbleBadgeVariant);
    expect(BUILT_IN_COUNTER_MODULES[6].renderer).toBe(goldenCompassVariant);
  });

  describe("space_radar variant (Cosmic Space Voyager)", () => {
    it("renders circular tactical radar sweep display with telemetry grid and numeric readout", () => {
      const html = spaceRadarVariant.renderHtml({
        questionNumber: 4,
        totalQuestions: 10,
        isFinal: false,
      });

      expect(html).toContain('class="cb-space-radar"');
      expect(html).toContain("data-layout-allow-occlusion");
      expect(html).toContain('class="radar-mount"');
      expect(html).toContain('class="radar-mast mast-left"');
      expect(html).toContain('class="radar-mast mast-right"');
      expect(html).toContain('class="radar-dish-sensor"');
      expect(html).toContain('class="radar-beacon"');
      expect(html).toContain('class="radar-scope-housing"');
      expect(html).toContain('class="radar-reticle reticle-tl"');
      expect(html).toContain('class="radar-reticle reticle-br"');
      expect(html).toContain('class="radar-telemetry-grid"');
      expect(html).toContain('class="radar-grid-ring ring-outer"');
      expect(html).toContain('class="radar-grid-ring ring-inner"');
      expect(html).toContain('class="radar-axis axis-h"');
      expect(html).toContain('class="radar-axis axis-v"');
      expect(html).toContain('class="radar-sweep-arm"');
      expect(html).toContain('class="radar-inner-screen"');
      expect(html).toContain('class="question-number-val radar-num">4</span>');
      expect(html).toContain('class="radar-blip blip-tr"');
      expect(html).toContain('class="radar-spark spark-bl"');
    });

    it("generates space radar CSS with dynamic variables, animations, and geometry footprint", () => {
      const css = spaceRadarVariant.renderCss();

      expect(css).toContain(".cb-space-radar");
      expect(css).toContain("var(--bg-accent, #00f0ff)");
      expect(css).toContain("var(--bg-primary, #0a1128)");
      expect(css).toContain("var(--bg-secondary, #0c1836)");
      expect(css).toContain("@keyframes space-radar-enter");
      expect(css).toContain("@keyframes space-radar-hover");
      expect(css).toContain("@keyframes radar-sweep-spin");
      expect(css).toContain("@keyframes radar-beacon-blink");
      expect(css).toContain("@keyframes radar-blip-pulse");
      expect(css).toContain("width: 240px");
      expect(css).toContain("contain: layout style");
    });
  });

  describe("bubble_badge variant (Sweet Pastel Pop)", () => {
    it("renders iridescent glossy translucent soap bubble sphere with specular highlights and candy number", () => {
      const html = bubbleBadgeVariant.renderHtml({
        questionNumber: 7,
        totalQuestions: 10,
        isFinal: false,
      });

      expect(html).toContain('class="cb-bubble-badge"');
      expect(html).toContain("data-layout-allow-occlusion");
      expect(html).toContain('class="bubble-suspension"');
      expect(html).toContain('class="bubble-tether tether-left"');
      expect(html).toContain('class="bubble-tether tether-right"');
      expect(html).toContain('class="bubble-wand-ring"');
      expect(html).toContain('class="wand-core"');
      expect(html).toContain('class="bubble-plaque"');
      expect(html).toContain('class="bubble-highlight-oval"');
      expect(html).toContain('class="bubble-highlight-dot"');
      expect(html).toContain('class="bubble-inner-panel"');
      expect(html).toContain('class="question-number-val bubble-num">7</span>');
      expect(html).toContain('class="bubble-mini bubble-mini-tl"');
      expect(html).toContain('class="bubble-mini bubble-mini-br"');
      expect(html).toContain('class="bubble-sparkle sparkle-tr"');
    });

    it("generates bubble badge CSS with dynamic variables, animations, and geometry footprint", () => {
      const css = bubbleBadgeVariant.renderCss();

      expect(css).toContain(".cb-bubble-badge");
      expect(css).toContain("var(--bg-primary, #ff9ebb)");
      expect(css).toContain("var(--bg-secondary, #b388ff)");
      expect(css).toContain("var(--bg-accent, #ff80bf)");
      expect(css).toContain("@keyframes bubble-bounce-enter");
      expect(css).toContain("@keyframes bubble-wobble-float");
      expect(css).toContain("@keyframes bubble-mini-bob");
      expect(css).toContain("@keyframes bubble-sparkle-twinkle");
      expect(css).toContain("width: 240px");
      expect(css).toContain("contain: layout style");
    });
  });

  describe("Footprint Geometry & LANDSCAPE_FRAME Invariant Boundary Compliance", () => {
    it("strictly preserves reference bounds (width <= 250px, height <= 194px) to avoid question collision", () => {
      const { counter, question } = LANDSCAPE_FRAME;
      expect(counter.centerX).toBe(190);
      expect(counter.top).toBe(question.y);
      expect(counter.bodyCenterY).toBe(question.y + question.height / 2);
      expect(question.x).toBe(380);

      const radarWidth = 240;
      const bubbleWidth = 240;
      expect(radarWidth).toBeLessThanOrEqual(250);
      expect(bubbleWidth).toBeLessThanOrEqual(250);

      const radarRightEdge = counter.centerX + radarWidth / 2;
      const bubbleRightEdge = counter.centerX + bubbleWidth / 2;

      expect(radarRightEdge).toBe(310);
      expect(bubbleRightEdge).toBe(310);

      const clearance = question.x - radarRightEdge;
      const leftClearance = counter.centerX - radarWidth / 2;
      expect(clearance).toBe(70);
      expect(leftClearance).toBe(clearance);
      expect(clearance).toBeGreaterThan(0);
    });
  });

  describe("Registry CSS Generation", () => {
    it("compiles scoped CSS containing all 6 registered counter badge variants", () => {
      const css = getCounterBadgesCss();

      expect(css).toContain(".cb-hanging-woodsign");
      expect(css).toContain(".cb-neon-badge");
      expect(css).toContain(".cb-floating-balloon");
      expect(css).toContain(".cb-golden-shield");
      expect(css).toContain(".cb-space-radar");
      expect(css).toContain(".cb-bubble-badge");
    });
  });

  describe("Sandbox Composition Integration", () => {
    it("renders space_radar variant inside sandbox composition without error", () => {
      const composition = buildSandboxComposition({
        theme: "candy_arcade",
        counter_style: "space_radar",
        question_box_style: "cockpit_hud",
        thinking_bar_style: "cosmic_rocket",
        phase: "thinking",
        question_text: "What is the largest moon of Saturn?",
        choices: ["Titan", "Europa", "Ganymede"],
        correct_choice_index: 0,
        explanation_text: "Titan is Saturn's largest moon.",
        question_number: 3,
        total_questions: 5,
        elapsed_seconds: 1.0,
      });

      expect(composition.html).toContain('class="cb-space-radar"');
      expect(composition.html).toContain('class="question-number-val radar-num">3</span>');
      expect(composition.css).toContain(".cb-space-radar");
    });

    it("renders bubble_badge variant inside sandbox composition without error", () => {
      const composition = buildSandboxComposition({
        theme: "candy_arcade",
        counter_style: "bubble_badge",
        question_box_style: "pastel_cloud",
        thinking_bar_style: "star_slider",
        phase: "thinking",
        question_text: "Which pastel shade is made from red and white?",
        choices: ["Pink", "Lavender", "Mint"],
        correct_choice_index: 0,
        explanation_text: "Red mixed with white produces pink.",
        question_number: 1,
        total_questions: 5,
        elapsed_seconds: 1.0,
      });

      expect(composition.html).toContain('class="cb-bubble-badge"');
      expect(composition.html).toContain('class="question-number-val bubble-num">1</span>');
      expect(composition.css).toContain(".cb-bubble-badge");
    });
  });

  describe("Lengthened Hanging Cords & Video Top Edge Continuity", () => {
    const VARIANTS = [
      { id: "hanging_woodsign", variant: hangingWoodSignVariant, cordClass: ".wood-rope", mountClass: ".hanging-ropes" },
      { id: "neon_badge", variant: neonBadgeVariant, cordClass: ".neon-pylon", mountClass: ".neon-mount" },
      { id: "floating_balloon", variant: floatingBalloonVariant, cordClass: ".balloon-streamer", mountClass: ".balloon-streamers" },
      { id: "golden_shield", variant: goldenShieldVariant, cordClass: ".shield-chain", mountClass: ".shield-chains" },
      { id: "space_radar", variant: spaceRadarVariant, cordClass: ".radar-mast", mountClass: ".radar-mount" },
      { id: "bubble_badge", variant: bubbleBadgeVariant, cordClass: ".bubble-tether", mountClass: ".bubble-suspension" },
      { id: "golden_compass", variant: goldenCompassVariant, cordClass: ".compass-chain", mountClass: ".compass-mount" },
    ];

    it("verifies all 7 variants define --counter-badge-mount-height: 64px and 64px mount container", () => {
      for (const { id, variant, mountClass } of VARIANTS) {
        const css = variant.renderCss();
        expect(css, `${id} missing mount height variable`).toContain("--counter-badge-mount-height: 64px;");
        expect(css, `${id} missing mount container height`).toContain(
          `${mountClass} { position: relative; display: flex; justify-content: space-between;`,
        );
        expect(css, `${id} missing 64px height`).toContain("height: 64px;");
      }
    });

    it("verifies all 7 variants have extended cord height and bleed margin to ensure no gap with top edge", () => {
      for (const { id, variant, cordClass } of VARIANTS) {
        const css = variant.renderCss();
        expect(css, `${id} missing extended cord height`).toContain(`${cordClass} {`);
        expect(css, `${id} missing calc height or negative margin`).toContain("height: calc(100% + 8px);");
        expect(css, `${id} missing margin-top: -8px`).toContain("margin-top: -8px;");
      }
    });

    it("ensures resting mount top position under LANDSCAPE_FRAME reaches or extends past y=0 (top edge of video)", () => {
      const { question } = LANDSCAPE_FRAME;
      // In unified 16:9 landscape: question.y = 53, question.height = 168
      // For body-height 150px: (168 - 150) / 2 = 9px. mount-height = 64px.
      // margin-top = 9px - 64px = -55px.
      // mount top = 53px + (-55px) = -2px <= 0 (touches/crosses top edge with zero gap).
      // For body-height 148px: (168 - 148) / 2 = 10px. mount-height = 64px.
      // margin-top = 10px - 64px = -54px.
      // mount top = 53px + (-54px) = -1px <= 0.
      for (const { id, variant } of VARIANTS) {
        const css = variant.renderCss();
        const bodyHeightMatch = css.match(/--counter-badge-body-height:\s*(\d+)px/);
        const mountHeightMatch = css.match(/--counter-badge-mount-height:\s*(\d+)px/);
        expect(bodyHeightMatch, `${id} body height`).not.toBeNull();
        expect(mountHeightMatch, `${id} mount height`).not.toBeNull();

        const bodyHeight = Number(bodyHeightMatch![1]);
        const mountHeight = Number(mountHeightMatch![1]);

        const marginTop = (question.height - bodyHeight) / 2 - mountHeight;
        const mountTop = question.y + marginTop;

        expect(mountTop, `${id} mount top must reach video top edge (<= 0)`).toBeLessThanOrEqual(0);

        // Body center must remain exactly aligned with question card center
        const bodyCenterY = mountTop + mountHeight + bodyHeight / 2;
        expect(bodyCenterY, `${id} body center Y must match question center`).toBe(question.y + question.height / 2);
      }
    });
  });
});

import { describe, expect, it } from "vitest";

import { capsuleLiquidVariant } from "../src/quiz/visual/elements/thinkingBar/variants/capsuleLiquid.js";
import { treasureTrailVariant } from "../src/quiz/visual/elements/thinkingBar/variants/treasureTrail.js";

const renderInput = {
  clipStart: 2,
  revealStart: 10,
  timerHideAt: 10,
  thinkingStart: 2,
  duration: 8,
  questionNumber: 1,
};

describe("Thinking bar motion variants", () => {
  it("renders a layered, accessible Neon Jelly Liquid choreography", () => {
    const html = capsuleLiquidVariant.renderHtml(renderInput);
    const css = capsuleLiquidVariant.renderCss();

    expect(html).toContain('role="img" aria-label="Quiz countdown from 5 to 1"');
    expect(html).toContain('class="liquid-current current-a"');
    expect(html).toContain('class="liquid-wave-front"');
    expect(html).toContain('class="capsule-energy-orbit"');
    expect(css).toContain("jellyLiquidFlow var(--timer-duration)");
    expect(css).toContain("jellyOrbitSpin var(--timer-duration)");
    expect(css).toContain("@keyframes jellyWaveWobble");
    expect(css).not.toContain("infinite");
  });

  it("renders a sequential Expedition Map Trail journey", () => {
    const html = treasureTrailVariant.renderHtml(renderInput);
    const css = treasureTrailVariant.renderCss();

    expect(html).toContain('role="img" aria-label="Quiz countdown from 5 to 1"');
    expect(html).toContain('class="trail-wake"');
    expect(html).toContain('class="helm-needle-overlay"');
    expect(css).toContain("expeditionRouteMarch var(--timer-duration)");
    expect(css).toContain("expeditionHelmTurn var(--timer-duration)");
    expect(css).toContain("@keyframes expeditionWaypointFourth");
    expect(css).toContain("@keyframes expeditionWaypointFirst");
    expect(css).not.toContain("infinite");
  });

  it.each([
    ["Neon Jelly Liquid", capsuleLiquidVariant.renderCss(), ".thinking-bar-capsule-liquid"],
    ["Expedition Map Trail", treasureTrailVariant.renderCss(), ".thinking-bar-treasure-trail"],
  ])("preserves countdown timing and removes decorative motion for %s", (_name, css, rootSelector) => {
    const reducedMotionCss = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));

    expect(reducedMotionCss).toContain(`${rootSelector} { animation-duration: var(--timer-duration), .001ms !important; }`);
    expect(reducedMotionCss).toContain("quiz-timer-drain var(--timer-duration)");
    expect(reducedMotionCss).toContain("quiz-timer-marker-slide var(--timer-duration)");
    expect(reducedMotionCss).toContain("animation-duration: 1s !important");
    expect(reducedMotionCss).toContain("display: none");
  });
});

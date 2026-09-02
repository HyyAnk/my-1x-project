import { THINKING_BAR_STYLE_DESCRIPTIONS, THINKING_BAR_STYLE_LABELS } from "@studio/shared";
import { describe, expect, it } from "vitest";

import { THINKING_BAR_VARIANTS } from "../src/quiz/visual/elements/thinkingBar/registry.js";

const emberTrailVariant = THINKING_BAR_VARIANTS.flame_fuse;
const renderInput = {
  clipStart: 2,
  revealStart: 10,
  thinkingStart: 2,
  duration: 8,
  questionNumber: 1,
  paletteAccent: "#FF7A45",
};

describe("Ember Trail thinking bar", () => {
  it("preserves the persisted style id while exposing the Ember Trail identity", () => {
    expect(emberTrailVariant.id).toBe("flame_fuse");
    expect(emberTrailVariant.displayName).toBe("Ember Trail");
    expect(THINKING_BAR_STYLE_LABELS.flame_fuse).toBe("Ember Trail");
    expect(THINKING_BAR_STYLE_DESCRIPTIONS.flame_fuse).toContain("charred trail");
  });

  it("renders a readable ember trail with one in-marker query prompt before countdown", () => {
    const html = emberTrailVariant.renderHtml(renderInput);

    expect(html).toContain('class="thinking-bar thinking-bar-flame-fuse"');
    expect(html).toContain('class="ember-trail-track"');
    expect(html).toContain('class="ember-trail-char"');
    expect(html).toContain('class="ember-trail-rope"');
    expect(html).toContain('class="ember-trail-marker"');
    expect(html).toContain('class="ember-core"');
    expect(html).toContain('class="ember-particles"');
    expect(html).toContain('role="img" aria-label="Quiz countdown from 5 to 1"');
    expect(html).toContain('class="marker-val val-query"');
    expect([...html.matchAll(/>\?</g)]).toHaveLength(1);
    expect(html).not.toContain("fuse-bomb-target");
    expect(html).not.toContain("<svg");
    expect(html).not.toMatch(/[✦★•]/u);
  });

  it("removes decorative motion when reduced motion is requested", () => {
    const css = emberTrailVariant.renderCss();
    const reducedMotionCss = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));

    expect(reducedMotionCss).toContain(".thinking-bar-flame-fuse .ember-particles");
    expect(reducedMotionCss).toContain("display: none");
    expect(reducedMotionCss).toContain("animation: none");
    expect(reducedMotionCss).toContain("animation-duration: var(--timer-duration) !important");
    expect(reducedMotionCss).toContain("animation-duration: 1s !important");
  });

  it("claims the available width when rendered inside the flex thinking-bar container", () => {
    const css = emberTrailVariant.renderCss();
    const trackRule = css.match(/\.thinking-bar-flame-fuse \.ember-trail-track \{(?<declarations>[^}]*)\}/)?.groups?.declarations;

    expect(trackRule).toContain("width: 100%");
  });
});

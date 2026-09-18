import { describe, expect, it } from "vitest";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import {
  ANSWER_CARD_LAYOUT_TOKENS,
  DETACHED_ANSWER_CARD_PRESENTATION_CONTRACT,
  answerCardPresentationContractCss,
} from "../src/quiz/visual/elements/answerCard/presentationContract.js";
import { BUILT_IN_ANSWER_CARD_MODULES } from "../src/quiz/visual/styleModules/builtins.js";
import { renderValidatedModuleCss } from "../src/quiz/visual/styleModules/namespaceCss.js";
import type { SlotScopedStyleModule } from "../src/quiz/visual/styleModules/types.js";

function answerCardModuleWithCss(css: string): SlotScopedStyleModule {
  const source = BUILT_IN_ANSWER_CARD_MODULES[0];
  return {
    manifest: source.manifest,
    renderer: { ...source.renderer, renderCss: () => css },
  };
}

describe("detached answer-card presentation contract", () => {
  it("emits immutable geometry after every answer-card skin", () => {
    const css = candyArcadeCss();
    const finalSkinIndex = css.lastIndexOf("/* === Answer Card:");
    const contractIndex = css.indexOf("/* === Detached Answer Card Presentation Contract === */");

    expect(finalSkinIndex).toBeGreaterThan(-1);
    expect(contractIndex).toBeGreaterThan(finalSkinIndex);
    expect(css.slice(contractIndex)).toContain('data-choice-variant="detached_badge"');
  });

  it("locks overlap, relative heights, stacking, and text clearance as shared invariants", () => {
    const css = answerCardPresentationContractCss();
    const contract = DETACHED_ANSWER_CARD_PRESENTATION_CONTRACT;

    expect(contract.minimumOverlapRatio).toBeGreaterThanOrEqual(0.27);
    expect(contract.minimumBadgeHeightDeltaPx).toBeGreaterThanOrEqual(16);
    expect(contract.minimumTextClearancePx).toBeGreaterThanOrEqual(12);
    expect(contract.badgeZIndex).toBeGreaterThan(contract.surfaceZIndex);
    expect(css).toContain("margin-left: calc(-1 * var(--choice-badge-overlap, 38px)) !important;");
    expect(css).toContain("height: var(--choice-badge-size, 132px) !important;");
    expect(css).toContain("height: var(--choice-surface-height, 108px) !important;");
    expect(css).not.toContain('data-choice-variant="media_bottom_badge"');
  });

  it.each(ANSWER_CARD_LAYOUT_TOKENS)("rejects skin ownership of %s", (token) => {
    const fixture = answerCardModuleWithCss(`.ac-glossy-arcade { ${token}: 1px; }`);

    expect(() => renderValidatedModuleCss(fixture)).toThrow(new RegExp(`layout-owned token ${token}`));
  });

  it("allows skin-specific decorative dimensions", () => {
    const fixture = answerCardModuleWithCss(`
      .ac-glossy-arcade > .ac-glossy-arcade__glare {
        width: 72px;
        height: 8px;
        border-radius: 9999px;
      }
    `);

    expect(() => renderValidatedModuleCss(fixture)).not.toThrow();
  });
});

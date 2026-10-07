import { describe, expect, it } from "vitest";
import { verdictYesNoLayout } from "../src/quiz/render/layouts/verdictYesNo.js";
import { VERDICT_YES_NO_GEOMETRY } from "@studio/shared";
import { resolveChoiceDecorationVariant } from "../src/quiz/render/choices/choiceSurfaceMarkup.js";

describe("Verdict Yes/No Layout (verdict_yes_no)", () => {
  it("exports layout with correct id and render functions", () => {
    expect(verdictYesNoLayout.id).toBe("verdict_yes_no");
    expect(typeof verdictYesNoLayout.renderBody).toBe("function");
    expect(typeof verdictYesNoLayout.css).toBe("function");
  });

  it("renders frame body containing hero and choices slots", () => {
    const slots = {
      questionBoxHtml: "<h1>Question</h1>",
      heroHtml: "<figure>HeroImage</figure>",
      choicesHtml: "<div>YesNoChoices</div>",
      phaseHtml: "<div>ThinkingBar</div>",
    };
    const body = verdictYesNoLayout.renderBody(slots);
    expect(body).toContain("HeroImage");
    expect(body).toContain("YesNoChoices");
    expect(body).toContain('class="quiz-content-anchor"');
  });

  it("matches canonical shared geometry specification", () => {
    const geom = VERDICT_YES_NO_GEOMETRY;
    expect(geom.arena.width).toBe(1420);
    expect(geom.arena.height).toBe(565);

    // Hero image: 820x565 at (380, 253), viewport 800x545
    expect(geom.hero?.width).toBe(820);
    expect(geom.hero?.height).toBe(565);
    expect(geom.hero?.x).toBe(380);
    expect(geom.hero?.y).toBe(253);
    expect(geom.imageSlot?.viewport.width).toBe(800);
    expect(geom.imageSlot?.viewport.height).toBe(545);

    // Answers: two 560x164 buttons at y=349.5 and 557.5 with 44px gap
    const answers = geom.answerVariants[2];
    expect(answers).toBeDefined();
    expect(answers.outer[0].y).toBe(349.5);
    expect(answers.outer[0].height).toBe(164);
    expect(answers.outer[0].width).toBe(560);
    expect(answers.outer[1].y).toBe(557.5);
    expect(answers.outer[1].height).toBe(164);
    expect(answers.outer[1].width).toBe(560);
    expect(answers.gap).toBe(44);

    // Shared vertical center at 535.5
    const heroCenterY = geom.hero!.y + geom.hero!.height / 2;
    const answerSpanHeight = answers.outer[1].y + answers.outer[1].height - answers.outer[0].y;
    const answerCenterY = answers.outer[0].y + answerSpanHeight / 2;
    expect(heroCenterY).toBe(535.5);
    expect(answerCenterY).toBe(535.5);
    expect(geom.extra?.heroAndAnswerCenterY).toBe(535.5);
  });

  it("generates CSS with hero 820x565 and vertically centered 560x164 choice buttons", () => {
    const css = verdictYesNoLayout.css();
    expect(css).toContain("--slot-hero-width, 820px");
    expect(css).toContain("--slot-hero-height, 565px");
    expect(css).toContain("width: 560px;");
    expect(css).toContain("height: 164px;");
    expect(css).toContain("gap: 44px;");
    expect(css).toContain("justify-content: center;");
    expect(css).toContain(".layout-verdict_yes_no");
  });

  it("styles Option 1 (YES) with Emerald green and Option 2 (NO) with Crimson red in glossy_arcade default", () => {
    const css = verdictYesNoLayout.css();
    // Option 1: Emerald/Mint Green
    expect(css).toContain(".layout-verdict_yes_no .skin-glossy_arcade:nth-child(1) .choice-card-surface");
    expect(css).toContain(".layout-verdict_yes_no .skin-glossy_arcade.choice-yes .choice-card-surface");
    expect(css).toContain("linear-gradient(135deg, #10B981 0%, #059669 100%)");
    expect(css).toContain("0 14px 0 #047857");

    // Option 2: Crimson/Coral Red
    expect(css).toContain(".layout-verdict_yes_no .skin-glossy_arcade:nth-child(2) .choice-card-surface");
    expect(css).toContain(".layout-verdict_yes_no .skin-glossy_arcade.choice-no .choice-card-surface");
    expect(css).toContain("linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)");
    expect(css).toContain("0 14px 0 #9F1239");
  });

  it("supports all 7 design skins cleanly for layout-verdict_yes_no", () => {
    const css = verdictYesNoLayout.css();
    expect(css).toContain(".layout-verdict_yes_no .skin-glossy_arcade");
    expect(css).toContain(".layout-verdict_yes_no .skin-comic_chunky");
    expect(css).toContain(".layout-verdict_yes_no .skin-glass_neon");
    expect(css).toContain(".layout-verdict_yes_no .skin-minimal_soft");
    expect(css).toContain(".layout-verdict_yes_no .skin-steel_beam_plate");
    expect(css).toContain(".layout-verdict_yes_no .skin-pastel_marshmallow");
    expect(css).toContain(".layout-verdict_yes_no .skin-rustic_wood_plank");
  });

  it("uses text_only choice decoration variant (no letter badges)", () => {
    expect(resolveChoiceDecorationVariant("verdict_yes_no")).toBe("text_only");
  });

  it("generates portrait 9:16 safe-zone rules when requested", () => {
    const portraitCss = verdictYesNoLayout.css("9:16");
    expect(portraitCss).toContain('#stage[data-aspect-ratio="9:16"] .layout-verdict_yes_no .game-stage');
  });
});

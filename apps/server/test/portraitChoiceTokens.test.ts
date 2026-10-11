import { describe, expect, it } from "vitest";
import { PORTRAIT_MIN_CHOICE_FONT_PX } from "@studio/shared";
import { portraitSurfacePaddingY } from "../src/quiz/render/layouts/portrait/styles/portraitChoiceTokens.js";

const THICKEST_SKIN_BORDER = 7;
const LEADING = 1.08;

describe("portrait answer row padding", () => {
  it.each([70, 76, 82, 96, 120])("leaves room for one minimum-size line in a %ipx surface", (surfaceHeight) => {
    const padding = portraitSurfacePaddingY(surfaceHeight);
    const inner = surfaceHeight - 2 * THICKEST_SKIN_BORDER - 2 * padding;
    expect(inner).toBeGreaterThanOrEqual(Math.ceil(PORTRAIT_MIN_CHOICE_FONT_PX * LEADING));
  });

  it("keeps the roomy default padding on tall rows", () => {
    expect(portraitSurfacePaddingY(120)).toBe(10);
  });
});

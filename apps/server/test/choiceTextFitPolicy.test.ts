import { describe, expect, it } from "vitest";
import { resolveChoiceGroupFit } from "../src/quiz/render/choices/choiceTextFitPolicy.js";

describe("choice text group-fit policy", () => {
  it("uses the maximum one-line size when every answer fits", () => {
    expect(
      resolveChoiceGroupFit({
        minFontSize: 24,
        maxFontSize: 64,
        maxLines: 2,
        multilineGain: 6,
        fits: (size, lines) => lines === 1 && size <= 64,
      }),
    ).toEqual({ fontSize: 64, lines: 1, status: "fit" });
  });

  it("returns one shared size constrained by the longest answer", () => {
    expect(
      resolveChoiceGroupFit({
        minFontSize: 24,
        maxFontSize: 64,
        maxLines: 1,
        multilineGain: 6,
        fits: (size) => size <= 43,
      }),
    ).toEqual({ fontSize: 43, lines: 1, status: "fit" });
  });

  it("keeps one line when two lines gain only five pixels", () => {
    expect(
      resolveChoiceGroupFit({
        minFontSize: 24,
        maxFontSize: 64,
        maxLines: 2,
        multilineGain: 6,
        fits: (size, lines) => size <= (lines === 1 ? 34 : 39),
      }),
    ).toEqual({ fontSize: 34, lines: 1, status: "fit" });
  });

  it("uses two lines when they gain exactly six pixels", () => {
    expect(
      resolveChoiceGroupFit({
        minFontSize: 24,
        maxFontSize: 64,
        maxLines: 2,
        multilineGain: 6,
        fits: (size, lines) => size <= (lines === 1 ? 34 : 40),
      }),
    ).toEqual({ fontSize: 40, lines: 2, status: "fit" });
  });

  it("returns the readable floor and overflow status when no mode fits", () => {
    expect(
      resolveChoiceGroupFit({
        minFontSize: 24,
        maxFontSize: 64,
        maxLines: 2,
        multilineGain: 6,
        fits: () => false,
      }),
    ).toEqual({ fontSize: 24, lines: 2, status: "overflow" });
  });
});

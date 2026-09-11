import { describe, expect, it } from "vitest";
import { resolveFactFit } from "../src/quiz/render/facts/factTextFitPolicy.js";

describe("factTextFitPolicy", () => {
  it("fits at preferred 38px when text fits", () => {
    expect(resolveFactFit(() => true)).toEqual({
      status: "fit",
      fontSize: 38,
      lineHeight: 1.2,
    });
  });

  it("fits at intermediate sizes with 1.2 lineHeight down to 33px", () => {
    expect(resolveFactFit((size) => size <= 35)).toEqual({
      status: "fit",
      fontSize: 35,
      lineHeight: 1.2,
    });
    expect(resolveFactFit((size) => size <= 33)).toEqual({
      status: "fit",
      fontSize: 33,
      lineHeight: 1.2,
    });
  });

  it("fits at smallest valid 32px with 1.15 lineHeight", () => {
    expect(resolveFactFit((size) => size <= 32)).toEqual({
      status: "fit",
      fontSize: 32,
      lineHeight: 1.15,
    });
  });

  it("reports QUIZ_FACT_TEXT_OVERFLOW when text does not fit at 32px", () => {
    expect(resolveFactFit(() => false)).toEqual({
      status: "overflow",
      code: "QUIZ_FACT_TEXT_OVERFLOW",
    });
  });
});

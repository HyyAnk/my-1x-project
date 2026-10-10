import { describe, expect, it } from "vitest";
import { slugify } from "../src/repository/pathSafety.js";

describe("slugify", () => {
  it("strips accents and joins words with hyphens", () => {
    expect(slugify("  Ni\u00F1os & M\u00E1quinas: \u00C7a Marche  ")).toBe("ninos-maquinas-ca-marche");
  });

  it("maps D-with-stroke, which has no Unicode decomposition, to a plain d", () => {
    expect(slugify("\u0110ragon \u0111en")).toBe("dragon-den");
  });
});

import { describe, expect, it } from "vitest";
import type { QuizShort, QuizShortBookendPair } from "@studio/shared";
import { buildBookendSelectionOptions, decodeBookendSelection, encodeBookendSelection } from "./quizShortBookendOptions";

const quizShort = { quiz_config: { style_preset_id: "preset_cyber_neon" } } as QuizShort;
const pair = (pairId: string, stylePresetId: string, status: "active" | "disabled" = "active") =>
  ({ pair_id: pairId, name: "001", style_preset_id: stylePresetId, status }) as QuizShortBookendPair;

describe("Quiz Short bookend options", () => {
  it("counts ready pairs of the Short's style and lists active pairs", () => {
    const options = buildBookendSelectionOptions(quizShort, [
      pair("spair_a", "preset_cyber_neon"),
      pair("spair_b", "preset_arcade_classic"),
      pair("spair_c", "preset_cyber_neon", "disabled"),
    ]);
    expect(options[0]).toEqual({ value: "style_builtin", label: "Match style · Cyber Neon Pulse (1 ready)" });
    expect(options.map((option) => option.value)).toEqual(["style_builtin", "none", "spair_a", "spair_b"]);
  });

  it("round-trips every selection mode", () => {
    for (const selection of [{ mode: "style_builtin" }, { mode: "none" }, { mode: "specific_pair", pair_id: "spair_a" }] as const) {
      expect(decodeBookendSelection(encodeBookendSelection(selection))).toEqual(selection);
    }
  });
});

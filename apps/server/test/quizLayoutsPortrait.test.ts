import { describe, expect, it } from "vitest";
import { QUIZ_LAYOUT_CATALOG } from "@studio/shared";
import { QUIZ_LAYOUT_RENDERERS, getQuizLayoutRenderer } from "../src/quiz/render/layouts/registry.js";

const retiredLayoutIds = ["portrait_hero_choices", "portrait_split_versus", "portrait_verdict_tf", "portrait_stack_list"] as const;

describe("retired portrait quiz layouts", () => {
  it.each(retiredLayoutIds)("does not expose %s in catalogs or renderers", (layoutId) => {
    expect(layoutId in QUIZ_LAYOUT_CATALOG).toBe(false);
    expect(layoutId in QUIZ_LAYOUT_RENDERERS).toBe(false);
    expect(getQuizLayoutRenderer(layoutId as never)).toBeUndefined();
  });
});

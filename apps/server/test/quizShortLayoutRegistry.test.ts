import { describe, expect, it } from "vitest";
import {
  QUIZ_LAYOUTS,
  QUIZ_PORTRAIT_LAYOUTS,
  QUIZ_PORTRAIT_LAYOUT_IDS,
  QuizPreviewLayoutIdSchema,
  PORTRAIT_FRAME_GEOMETRY,
  PORTRAIT_MIN_CHOICE_FONT_PX,
  PORTRAIT_MIN_QUESTION_FONT_PX,
  QUIZ_PORTRAIT_LAYOUT_GEOMETRY,
} from "@studio/shared";
import {
  QUIZ_ALL_LAYOUT_RENDERERS,
  QUIZ_LAYOUT_RENDERERS,
  QUIZ_PORTRAIT_LAYOUT_RENDERERS,
  getQuizLayoutRenderer,
  quizLayoutCss,
} from "../src/quiz/render/layouts/registry.js";
import { assertRenderableLayoutId, isRenderableLayoutId } from "../src/quiz/render/layouts/renderableLayoutId.js";
import { PORTRAIT_LAYOUT_CONTENT_GEOMETRY } from "../src/quiz/render/layouts/portraitLayoutContentGeometry.js";
import { isInsidePortraitSafeArea, PORTRAIT_FRAME } from "../src/quiz/render/frame/portraitFrameGeometry.js";
import { isPortraitQuizFrame, isUnifiedQuizFrame } from "../src/quiz/render/frame/renderQuizFrameBody.js";
import { quizPortraitFrameCss } from "../src/quiz/render/frame/quizPortraitFrameStyles.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";

const slots = {
  questionBoxHtml: "<h1>Question</h1>",
  heroHtml: "<figure>Hero</figure>",
  choicesHtml: "<div>Choices</div>",
  phaseHtml: "<div>Timer</div>",
};

describe("Quiz Short layout registry", () => {
  it("registers one portrait renderer per catalog entry without touching the landscape registry", () => {
    expect(Object.keys(QUIZ_PORTRAIT_LAYOUT_RENDERERS).sort()).toEqual([...QUIZ_PORTRAIT_LAYOUT_IDS].sort());
    expect(Object.keys(QUIZ_PORTRAIT_LAYOUT_RENDERERS).sort()).toEqual(QUIZ_PORTRAIT_LAYOUTS.map((layout) => layout.id).sort());
    expect(Object.keys(QUIZ_LAYOUT_RENDERERS).sort()).toEqual(["baseline", ...QUIZ_LAYOUTS.map((layout) => layout.id)].sort());
    expect(Object.keys(QUIZ_ALL_LAYOUT_RENDERERS).length).toBe(Object.keys(QUIZ_LAYOUT_RENDERERS).length + QUIZ_PORTRAIT_LAYOUT_IDS.length);
  });

  it.each(QUIZ_PORTRAIT_LAYOUT_IDS)("%s is renderable, unified on 9:16 only and renders its slots", (layoutId) => {
    expect(QuizPreviewLayoutIdSchema.safeParse(layoutId).success).toBe(true);
    expect(isRenderableLayoutId(layoutId)).toBe(true);
    expect(assertRenderableLayoutId(layoutId)).toBe(layoutId);
    expect(isUnifiedQuizFrame(layoutId, "9:16")).toBe(true);
    expect(isPortraitQuizFrame(layoutId, "9:16")).toBe(true);
    expect(isUnifiedQuizFrame(layoutId, "16:9")).toBe(false);
    const renderer = getQuizLayoutRenderer(layoutId);
    expect(renderer.id).toBe(layoutId);
    const body = renderer.renderBody(slots);
    expect(body).toContain("Question");
    expect(body).toContain("Choices");
    expect(body).toContain("Timer");
    expect(body.includes("Hero")).toBe(QUIZ_PORTRAIT_LAYOUT_GEOMETRY[layoutId].hero !== null);
    expect(renderer.css("9:16")).toContain(`layout-${layoutId}`);
    expect(renderer.css("16:9")).toBe("");
  });

  it("keeps landscape ids off the portrait frame and the retired portrait ids unrenderable", () => {
    expect(isPortraitQuizFrame("full_stack_list", "9:16")).toBe(false);
    expect(isUnifiedQuizFrame("full_stack_list", "16:9")).toBe(true);
    expect(isRenderableLayoutId("portrait_hero_choices")).toBe(false);
    expect(() => assertRenderableLayoutId("portrait_stack_list")).toThrow(/no production renderer/);
  });

  it("keeps every portrait slot inside the safe area and derives content geometry from the shared catalog", () => {
    expect(isInsidePortraitSafeArea(PORTRAIT_FRAME.progressStrip)).toBe(true);
    expect(isInsidePortraitSafeArea(PORTRAIT_FRAME.question)).toBe(true);
    expect(isInsidePortraitSafeArea(PORTRAIT_FRAME.countdown)).toBe(true);
    expect(isInsidePortraitSafeArea(PORTRAIT_FRAME.cta)).toBe(true);
    for (const layoutId of QUIZ_PORTRAIT_LAYOUT_IDS) {
      const geometry = PORTRAIT_LAYOUT_CONTENT_GEOMETRY[layoutId];
      expect(geometry.hero).toEqual(QUIZ_PORTRAIT_LAYOUT_GEOMETRY[layoutId].hero);
      if (geometry.hero) expect(isInsidePortraitSafeArea(geometry.hero)).toBe(true);
      for (const rects of Object.values(geometry.answers)) {
        expect(rects.length).toBeGreaterThan(0);
        for (const rect of rects) expect(isInsidePortraitSafeArea(rect)).toBe(true);
      }
    }
  });

  it("emits the portrait frame CSS with reserved zones and text minimums on the 9:16 stylesheet only", () => {
    const frameCss = quizPortraitFrameCss();
    expect(frameCss).toContain(`--safe-zone-top: ${PORTRAIT_FRAME_GEOMETRY.reservedTop}px`);
    expect(frameCss).toContain(`--safe-zone-bottom: ${PORTRAIT_FRAME_GEOMETRY.reservedBottom}px`);
    expect(frameCss).toContain(`--safe-zone-right: ${PORTRAIT_FRAME_GEOMETRY.reservedRight}px`);
    expect(frameCss).toContain(`${PORTRAIT_MIN_QUESTION_FONT_PX}px`);
    const portraitCss = candyArcadeCss({ aspectRatio: "9:16" });
    expect(portraitCss).toContain("quiz-frame-portrait");
    expect(portraitCss).toContain(`--choice-fit-min: ${PORTRAIT_MIN_CHOICE_FONT_PX}px`);
    expect(portraitCss).toContain(".short-ring-timer");
    expect(portraitCss).toContain(".quiz-progress-strip");
    expect(quizLayoutCss("16:9")).not.toContain("quiz-frame-portrait");
    expect(candyArcadeCss({ aspectRatio: "16:9" })).not.toContain("quiz-frame-portrait");
  });
});

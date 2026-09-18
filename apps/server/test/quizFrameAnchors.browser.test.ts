import { readFile } from "node:fs/promises";
import { chromium, type Browser, type Page } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  QUIZ_LANDSCAPE_LAYOUT_IDS,
  SandboxPreviewInputSchema,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
} from "@studio/shared";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { resolveCandyArcadeFonts } from "../src/quiz/render/candyArcade/candyArcadeFonts.js";
import { LANDSCAPE_FRAME } from "../src/quiz/render/frame/landscapeFrameGeometry.js";

async function inlineFonts(html: string): Promise<string> {
  let result = html;
  for (const font of resolveCandyArcadeFonts()) {
    const bytes = await readFile(font.absolutePath);
    result = result.replaceAll(
      `/api/quiz/fonts/${font.id}?v=${font.sha256.slice(0, 16)}`,
      `data:${font.mimeType};base64,${bytes.toString("base64")}`,
    );
  }
  return result;
}

const NEW_QUESTION_BOX_STYLES: readonly QuizQuestionBoxStyle[] = ["hazard_stripes", "cockpit_hud", "pastel_cloud"] as const;

const COUNTER_STYLES: readonly QuizQuestionCounterStyle[] = [
  "hanging_woodsign",
  "neon_badge",
  "floating_balloon",
  "golden_shield",
  "space_radar",
  "bubble_badge",
] as const;

describe("quizFrameAnchors.browser", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.route(/^https?:/, (route) => route.abort());
  }, 30000);

  afterAll(async () => {
    await browser?.close();
  });

  async function loadSnapshot(
    layout: (typeof QUIZ_LANDSCAPE_LAYOUT_IDS)[number],
    phase: "thinking" | "explain",
    options?: {
      questionBoxStyle?: QuizQuestionBoxStyle;
      counterStyle?: QuizQuestionCounterStyle;
    },
  ) {
    const isMystery = layout === "mystery_reveal";
    const binary = layout === "split_versus_two" || layout === "verdict_true_false";
    const choices = isMystery ? ["Choice A"] : binary ? ["Choice A", "Choice B"] : ["Choice A", "Choice B", "Choice C"];
    const questionFormat = layout === "verdict_true_false" ? "true_false" : isMystery ? "image_guess" : "multiple_choice";
    const input = SandboxPreviewInputSchema.parse({
      layout_id: layout,
      aspect_ratio: "16:9",
      phase,
      mode: "snapshot",
      choices,
      question_format: questionFormat,
      correct_choice_index: 0,
      question_text: "Which planet has the most visible rings?",
      fact_card_text: "Saturn has rings made mostly of ice and rock.",
      channel_brand_name: "SPACE",
      thinking_bar_style: "star_slider",
      question_box_style: options?.questionBoxStyle ?? "candy_pop",
      counter_style: options?.counterStyle ?? "hanging_woodsign",
      mascot_enabled: false,
    });
    const composition = buildSandboxComposition(input);
    const inlined = await inlineFonts(composition.html);
    await page.setContent(inlined, { waitUntil: "load" });
    await page.waitForFunction(
      () => document.documentElement.dataset.fontsReady === "true" || document.documentElement.dataset.fontsError === "true",
      undefined,
      { timeout: 15000 },
    );
    const fontStatus = await page.evaluate(() => {
      const status = (
        window as Window & {
          __fontStatus?: { state?: unknown; message?: unknown };
        }
      ).__fontStatus;
      return {
        state: typeof status?.state === "string" ? status.state : null,
        message: typeof status?.message === "string" ? status.message : "Unknown font error",
      };
    });
    if (fontStatus?.state === "error") {
      throw new Error(`Browser font/layout error: ${fontStatus.message}`);
    }
    await page.addStyleTag({ content: "[data-counter-badge] { animation: none !important; }" });
  }

  async function measureFixedAnchors() {
    return page.evaluate(() => {
      const questionAnchor = document.querySelector<HTMLElement>('[data-quiz-fixed="question"]');
      const thinkingAnchor = document.querySelector<HTMLElement>('[data-quiz-fixed="thinking"]');
      const brandAnchor = document.querySelector<HTMLElement>(".channel-brand-mark");
      const counterAnchor = document.querySelector<HTMLElement>(".game-header");
      const counterBody = document.querySelector<HTMLElement>("[data-counter-badge-body]");
      const counterBadge = document.querySelector<HTMLElement>("[data-counter-badge]");

      const qRect = questionAnchor?.getBoundingClientRect();
      const tRect = thinkingAnchor?.getBoundingClientRect();
      const bRect = brandAnchor?.getBoundingClientRect();
      const cRect = counterAnchor?.getBoundingClientRect();
      const cbRect = counterBody?.getBoundingClientRect();
      const badgeRect = counterBadge?.getBoundingClientRect();

      return {
        question: qRect ? { x: qRect.x, y: qRect.y, width: qRect.width, height: qRect.height } : null,
        thinking: tRect ? { x: tRect.x, y: tRect.y, width: tRect.width, height: tRect.height } : null,
        brandCenterX: bRect ? bRect.x + bRect.width / 2 : null,
        brandTop: bRect ? bRect.y : null,
        brandWidth: bRect ? bRect.width : null,
        counterSlot: cRect ? { x: cRect.x, y: cRect.y, width: cRect.width, height: cRect.height } : null,
        counterBodyCenterX: cbRect ? cbRect.x + cbRect.width / 2 : null,
        counterBodyCenterY: cbRect ? cbRect.y + cbRect.height / 2 : null,
        counterBadgeTop: badgeRect ? badgeRect.y : null,
      };
    });
  }

  function assertAnchorsMatch(boxes: Awaited<ReturnType<typeof measureFixedAnchors>>) {
    expect(boxes.question).not.toBeNull();
    expect(Math.abs(boxes.question!.x - LANDSCAPE_FRAME.question.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.question!.y - LANDSCAPE_FRAME.question.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.question!.width - LANDSCAPE_FRAME.question.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.question!.height - LANDSCAPE_FRAME.question.height)).toBeLessThanOrEqual(1);

    expect(boxes.thinking).not.toBeNull();
    expect(Math.abs(boxes.thinking!.x - LANDSCAPE_FRAME.thinking.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.thinking!.y - LANDSCAPE_FRAME.thinking.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.thinking!.width - LANDSCAPE_FRAME.thinking.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.thinking!.height - LANDSCAPE_FRAME.thinking.height)).toBeLessThanOrEqual(1);

    expect(boxes.brandCenterX).not.toBeNull();
    expect(Math.abs(boxes.brandCenterX! - LANDSCAPE_FRAME.brand.centerX)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.brandTop! - LANDSCAPE_FRAME.brand.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.brandWidth! - LANDSCAPE_FRAME.brand.width)).toBeLessThanOrEqual(1);

    expect(boxes.counterSlot).not.toBeNull();
    expect(boxes.counterSlot).toEqual({
      x: LANDSCAPE_FRAME.counter.x,
      y: LANDSCAPE_FRAME.counter.top,
      width: LANDSCAPE_FRAME.counter.width,
      height: LANDSCAPE_FRAME.counter.height,
    });
    expect(boxes.counterBodyCenterX).not.toBeNull();
    expect(boxes.counterBodyCenterY).not.toBeNull();
    expect(Math.abs(boxes.counterBodyCenterX! - LANDSCAPE_FRAME.counter.centerX)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.counterBodyCenterY! - LANDSCAPE_FRAME.counter.bodyCenterY)).toBeLessThanOrEqual(1);
    expect(boxes.counterBadgeTop).not.toBeNull();
    expect(boxes.counterBadgeTop!).toBeLessThanOrEqual(0);
  }

  describe("standard baseline layout anchors", () => {
    it.each(QUIZ_LANDSCAPE_LAYOUT_IDS)(
      "measures identical fixed wrapper anchors in thinking phase for layout %s",
      async (layoutId) => {
        await loadSnapshot(layoutId, "thinking");
        const boxes = await measureFixedAnchors();
        assertAnchorsMatch(boxes);
      },
      30000,
    );

    it.each(QUIZ_LANDSCAPE_LAYOUT_IDS)(
      "measures identical fixed fact wrapper anchor in explain phase for layout %s",
      async (layoutId) => {
        await loadSnapshot(layoutId, "explain");

        const boxes = await page.evaluate(() => {
          const factAnchor = document.querySelector<HTMLElement>('[data-quiz-fixed="fact"]');
          const fRect = factAnchor?.getBoundingClientRect();
          return {
            fact: fRect ? { x: fRect.x, y: fRect.y, width: fRect.width, height: fRect.height } : null,
          };
        });

        if (layoutId === "mystery_reveal") {
          expect(boxes.fact).toBeNull();
        } else {
          expect(boxes.fact).not.toBeNull();
          expect(Math.abs(boxes.fact!.x - LANDSCAPE_FRAME.fact.x)).toBeLessThanOrEqual(1);
          expect(Math.abs(boxes.fact!.y - LANDSCAPE_FRAME.fact.y)).toBeLessThanOrEqual(1);
          expect(Math.abs(boxes.fact!.width - LANDSCAPE_FRAME.fact.width)).toBeLessThanOrEqual(1);
          expect(Math.abs(boxes.fact!.height - LANDSCAPE_FRAME.fact.height)).toBeLessThanOrEqual(1);
        }
      },
      30000,
    );
  });

  describe("newly added question boxes adhere strictly to LANDSCAPE_FRAME fixed wrapper anchor", () => {
    for (const qbStyle of NEW_QUESTION_BOX_STYLES) {
      it.each(QUIZ_LANDSCAPE_LAYOUT_IDS)(
        `verifies ${qbStyle} fixed question wrapper anchor adheres to LANDSCAPE_FRAME for layout %s`,
        async (layoutId) => {
          await loadSnapshot(layoutId, "thinking", { questionBoxStyle: qbStyle });
          const boxes = await measureFixedAnchors();

          expect(boxes.question).not.toBeNull();
          expect(Math.abs(boxes.question!.x - LANDSCAPE_FRAME.question.x)).toBeLessThanOrEqual(1);
          expect(Math.abs(boxes.question!.y - LANDSCAPE_FRAME.question.y)).toBeLessThanOrEqual(1);
          expect(Math.abs(boxes.question!.width - LANDSCAPE_FRAME.question.width)).toBeLessThanOrEqual(1);
          expect(Math.abs(boxes.question!.height - LANDSCAPE_FRAME.question.height)).toBeLessThanOrEqual(1);
        },
        30000,
      );
    }
  });

  describe("all counter badges adhere to the counter-question balance primitive", () => {
    for (const cbStyle of COUNTER_STYLES) {
      it.each(QUIZ_LANDSCAPE_LAYOUT_IDS)(
        `verifies ${cbStyle} fixed counter wrapper anchor adheres to LANDSCAPE_FRAME for layout %s`,
        async (layoutId) => {
          await loadSnapshot(layoutId, "thinking", { counterStyle: cbStyle });
          const boxes = await measureFixedAnchors();

          expect(boxes.counterBodyCenterX).not.toBeNull();
          expect(boxes.counterBodyCenterY).not.toBeNull();
          expect(Math.abs(boxes.counterBodyCenterX! - LANDSCAPE_FRAME.counter.centerX)).toBeLessThanOrEqual(1);
          expect(Math.abs(boxes.counterBodyCenterY! - LANDSCAPE_FRAME.counter.bodyCenterY)).toBeLessThanOrEqual(1);
          expect(boxes.counterBadgeTop).not.toBeNull();
          expect(boxes.counterBadgeTop!).toBeLessThanOrEqual(0);
        },
        30000,
      );
    }
  });

  describe("combined new question boxes and new counter badges full anchor contract", () => {
    const COMBINED_TEST_CASES = [
      { qb: "hazard_stripes" as const, cb: "space_radar" as const, layout: "media_left_choices_right" as const },
      { qb: "hazard_stripes" as const, cb: "bubble_badge" as const, layout: "split_versus_two" as const },
      { qb: "cockpit_hud" as const, cb: "space_radar" as const, layout: "visual_choices_three" as const },
      { qb: "cockpit_hud" as const, cb: "bubble_badge" as const, layout: "verdict_true_false" as const },
      { qb: "pastel_cloud" as const, cb: "bubble_badge" as const, layout: "full_stack_list" as const },
      { qb: "pastel_cloud" as const, cb: "space_radar" as const, layout: "mystery_reveal" as const },
    ];

    it.each(COMBINED_TEST_CASES)(
      "verifies full anchor contract for $qb with $cb on layout $layout",
      async ({ qb, cb, layout }) => {
        await loadSnapshot(layout, "thinking", { questionBoxStyle: qb, counterStyle: cb });
        const boxes = await measureFixedAnchors();
        assertAnchorsMatch(boxes);
      },
      30000,
    );
  });
});

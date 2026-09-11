import { readFile } from "node:fs/promises";
import { chromium, type Browser, type Page } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { QUIZ_LANDSCAPE_LAYOUT_IDS, SandboxPreviewInputSchema } from "@studio/shared";
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

  async function loadSnapshot(layout: (typeof QUIZ_LANDSCAPE_LAYOUT_IDS)[number], phase: "thinking" | "explain") {
    const binary = layout === "split_versus_two" || layout === "verdict_true_false";
    const input = SandboxPreviewInputSchema.parse({
      layout_id: layout,
      aspect_ratio: "16:9",
      phase,
      mode: "snapshot",
      choices: binary ? ["Choice A", "Choice B"] : ["Choice A", "Choice B", "Choice C"],
      question_format: layout === "verdict_true_false" ? "true_false" : "multiple_choice",
      correct_choice_index: 0,
      question_text: "Which planet has the most visible rings?",
      fact_card_text: "Saturn has rings made mostly of ice and rock.",
      channel_brand_name: "SPACE",
      thinking_bar_style: "star_slider",
      question_box_style: "candy_pop",
      counter_style: "hanging_woodsign",
      mascot_enabled: false,
    });
    const composition = buildSandboxComposition(input);
    const inlined = await inlineFonts(composition.html);
    await page.setContent(inlined, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.dataset.fontsReady === "true", undefined, { timeout: 15000 });
  }

  it.each(QUIZ_LANDSCAPE_LAYOUT_IDS)(
    "measures identical fixed wrapper anchors in thinking phase for layout %s",
    async (layoutId) => {
      await loadSnapshot(layoutId, "thinking");

      const boxes = await page.evaluate(() => {
        const questionAnchor = document.querySelector<HTMLElement>('[data-quiz-fixed="question"]');
        const thinkingAnchor = document.querySelector<HTMLElement>('[data-quiz-fixed="thinking"]');
        const brandAnchor = document.querySelector<HTMLElement>(".channel-brand-mark");
        const counterAnchor = document.querySelector<HTMLElement>(".game-header");

        const qRect = questionAnchor?.getBoundingClientRect();
        const tRect = thinkingAnchor?.getBoundingClientRect();
        const bRect = brandAnchor?.getBoundingClientRect();
        const cRect = counterAnchor?.getBoundingClientRect();

        return {
          question: qRect ? { x: qRect.x, y: qRect.y, width: qRect.width, height: qRect.height } : null,
          thinking: tRect ? { x: tRect.x, y: tRect.y, width: tRect.width, height: tRect.height } : null,
          brandCenterX: bRect ? bRect.x + bRect.width / 2 : null,
          brandTop: bRect ? bRect.y : null,
          brandWidth: bRect ? bRect.width : null,
          counterCenterX: cRect ? cRect.x + cRect.width / 2 : null,
          counterTop: cRect ? cRect.y : null,
        };
      });

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

      expect(boxes.counterCenterX).not.toBeNull();
      expect(Math.abs(boxes.counterCenterX! - LANDSCAPE_FRAME.counter.centerX)).toBeLessThanOrEqual(1);
      expect(Math.abs(boxes.counterTop! - LANDSCAPE_FRAME.counter.top)).toBeLessThanOrEqual(1);
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

      expect(boxes.fact).not.toBeNull();
      expect(Math.abs(boxes.fact!.x - LANDSCAPE_FRAME.fact.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(boxes.fact!.y - LANDSCAPE_FRAME.fact.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(boxes.fact!.width - LANDSCAPE_FRAME.fact.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(boxes.fact!.height - LANDSCAPE_FRAME.fact.height)).toBeLessThanOrEqual(1);
    },
    30000,
  );
});

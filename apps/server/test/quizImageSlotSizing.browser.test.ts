import { readFile } from "node:fs/promises";
import { chromium, type Browser, type Page } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  QUIZ_LANDSCAPE_LAYOUT_IDS,
  resolveQuizLayoutAssetAspectRatio,
  SandboxPreviewInputSchema,
  type QuizLandscapeLayoutId,
} from "@studio/shared";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { resolveCandyArcadeFonts } from "../src/quiz/render/candyArcade/candyArcadeFonts.js";
import { measureLayoutImageSlots, type MeasuredImageSlot } from "./helpers/imageSlotMeasurement.js";

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

describe("quizImageSlotSizing.browser", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    await page.route(/^https?:/, (route) => route.abort());
  }, 30000);

  afterAll(async () => {
    await browser?.close();
  });

  async function loadLayout(
    layoutId: QuizLandscapeLayoutId,
    choiceCount: number,
    options?: { archetype?: any; questionFormat?: any },
  ): Promise<void> {
    const choices = choiceCount === 1 ? ["Saturn"] : choiceCount === 2 ? ["Saturn", "Jupiter"] : ["Saturn", "Jupiter", "Neptune"];

    const input = SandboxPreviewInputSchema.parse({
      layout_id: layoutId,
      aspect_ratio: "16:9",
      phase: "thinking",
      mode: "snapshot",
      choices,
      question_format: options?.questionFormat ?? (layoutId === "verdict_true_false" ? "true_false" : "multiple_choice"),
      archetype: options?.archetype,
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
    await page.addStyleTag({
      content: `*, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }`,
    });
    await page.waitForFunction(() => document.documentElement.dataset.fontsReady === "true", undefined, { timeout: 15000 });
  }

  it("characterizes all 7 landscape layouts and saves baseline measurements", async () => {
    const allMeasurements: Record<string, MeasuredImageSlot[]> = {};

    for (const layoutId of QUIZ_LANDSCAPE_LAYOUT_IDS) {
      const choiceCount = layoutId === "mystery_reveal" ? 1 : layoutId === "split_versus_two" || layoutId === "verdict_true_false" ? 2 : 3;

      await loadLayout(layoutId, choiceCount);

      const slots = await measureLayoutImageSlots(page, {
        layoutId,
        currentPlannedChoiceRatio: resolveQuizLayoutAssetAspectRatio(layoutId, "answer_option"),
        currentPlannedHeroRatio: resolveQuizLayoutAssetAspectRatio(layoutId, "hero_question_image"),
      });

      allMeasurements[layoutId] = slots;
    }

    // Also test split_versus_two text presentation has no choice images
    const textComposition = buildSandboxComposition({
      layout_id: "split_versus_two",
      question_format: "multiple_choice",
      archetype: "text_multiple_choice",
      choices: ["Saturn", "Jupiter"],
    });
    expect(textComposition.html).not.toContain('<figure class="choice-media');
    expect(textComposition.html).toContain("choice-card-text");

    // Assert media role inventory
    expect(allMeasurements.full_stack_list).toHaveLength(0);
    expect(allMeasurements.visual_choices_three).toHaveLength(3);
    expect(allMeasurements.visual_choices_three_pure).toHaveLength(3);
    expect(allMeasurements.split_versus_two).toHaveLength(2);
    expect(allMeasurements.media_left_choices_right).toHaveLength(1);
    expect(allMeasurements.verdict_true_false).toHaveLength(1);
    expect(allMeasurements.mystery_reveal).toHaveLength(2);
  }, 60000);

  it("verifies live DOM geometry matches expected baseline viewports", async () => {
    // 1. Visual Choices Three (432 x 441)
    await loadLayout("visual_choices_three", 3);
    const vcSlots = await measureLayoutImageSlots(page, {
      layoutId: "visual_choices_three",
      currentPlannedChoiceRatio: resolveQuizLayoutAssetAspectRatio("visual_choices_three", "answer_option"),
    });
    expect(vcSlots[0].imageViewport).toEqual({ width: 432, height: 441 });
    expect(vcSlots[0].mediaBorderBox).toEqual({ width: 452, height: 461 });
    expect(vcSlots[0].computedObjectFit).toBe("cover");

    // 2. Visual Choices Three Pure (432 x 544)
    await loadLayout("visual_choices_three_pure", 3);
    const pureSlots = await measureLayoutImageSlots(page, {
      layoutId: "visual_choices_three_pure",
      currentPlannedChoiceRatio: resolveQuizLayoutAssetAspectRatio("visual_choices_three_pure", "answer_option"),
    });
    expect(pureSlots[0].imageViewport).toEqual({ width: 432, height: 544 });
    expect(pureSlots[0].mediaBorderBox).toEqual({ width: 452, height: 564 });
    expect(pureSlots[0].computedObjectFit).toBe("cover");

    // 3. Split Versus Two Visual (674 x 422)
    await loadLayout("split_versus_two", 2);
    const svSlots = await measureLayoutImageSlots(page, {
      layoutId: "split_versus_two",
      currentPlannedChoiceRatio: resolveQuizLayoutAssetAspectRatio("split_versus_two", "answer_option"),
    });
    expect(svSlots[0].imageViewport).toEqual({ width: 674, height: 422 });
    expect(svSlots[0].mediaBorderBox).toEqual({ width: 698, height: 446 });
    expect(svSlots[0].computedObjectFit).toBe("cover");
  }, 30000);

  it("keeps the expanded visual cards clear of the fact dock", async () => {
    await loadLayout("visual_choices_three", 3);

    const bounds = await page.evaluate(() => {
      const media = document.querySelector(".layout-visual_choices_three .choice-media");
      const answer = document.querySelector(".layout-visual_choices_three .visual-answer-assembly");
      const fact = document.querySelector(".layout-visual_choices_three .quiz-fact-anchor");
      if (!media || !answer || !fact) throw new Error("Visual card geometry nodes are missing");
      const mediaRect = media.getBoundingClientRect();
      const answerRect = answer.getBoundingClientRect();
      const factRect = fact.getBoundingClientRect();
      return {
        mediaBottom: mediaRect.bottom,
        answerTop: answerRect.top,
        answerBottom: answerRect.bottom,
        factTop: factRect.top,
      };
    });

    expect(bounds).toEqual({ mediaBottom: 714, answerTop: 735, answerBottom: 839, factTop: 886 });
    expect(bounds.answerTop - bounds.mediaBottom).toBe(21);
    expect(bounds.factTop - bounds.answerBottom).toBe(47);
  }, 30000);

  it("verifies final target aspect ratio policy: visual card is 1:1, pure is 3:4, and split versus is 16:9", async () => {
    await loadLayout("visual_choices_three", 3);
    const vcSlots = await measureLayoutImageSlots(page, {
      layoutId: "visual_choices_three",
      currentPlannedChoiceRatio: resolveQuizLayoutAssetAspectRatio("visual_choices_three", "answer_option"),
    });
    const visualCard = vcSlots[0];

    await loadLayout("split_versus_two", 2);
    const svSlots = await measureLayoutImageSlots(page, {
      layoutId: "split_versus_two",
      currentPlannedChoiceRatio: resolveQuizLayoutAssetAspectRatio("split_versus_two", "answer_option"),
    });
    const splitVersus = svSlots[0];

    // True physical geometry
    expect(visualCard.imageViewport).toEqual({ width: 432, height: 441 });
    expect(splitVersus.imageViewport).toEqual({ width: 674, height: 422 });

    // Target policy verification
    expect(visualCard.currentPlannedRatio).toBe("1:1");
    expect(splitVersus.currentPlannedRatio).toBe("16:9");
  }, 30000);
});

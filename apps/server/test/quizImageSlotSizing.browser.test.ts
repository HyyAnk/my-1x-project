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
    const choices =
      choiceCount === 2 ? ["Saturn", "Jupiter"] : ["Saturn", "Jupiter", "Neptune"];

    const input = SandboxPreviewInputSchema.parse({
      layout_id: layoutId,
      aspect_ratio: "16:9",
      phase: "thinking",
      mode: "snapshot",
      choices,
      question_format:
        options?.questionFormat ??
        (layoutId === "verdict_true_false" ? "true_false" : "multiple_choice"),
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
    await page.waitForFunction(
      () => document.documentElement.dataset.fontsReady === "true",
      undefined,
      { timeout: 15000 },
    );
  }

  it("characterizes all 8 landscape layouts and saves baseline measurements", async () => {
    const allMeasurements: Record<string, MeasuredImageSlot[]> = {};

    for (const layoutId of QUIZ_LANDSCAPE_LAYOUT_IDS) {
      const choiceCount =
        layoutId === "split_versus_two" || layoutId === "verdict_true_false" ? 2 : 3;

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
    expect(allMeasurements.clue_deduction).toHaveLength(1);
  }, 60000);

  it("verifies live DOM geometry matches expected baseline viewports", async () => {
    // 1. Visual Choices Three (432 x 336)
    await loadLayout("visual_choices_three", 3);
    const vcSlots = await measureLayoutImageSlots(page, {
      layoutId: "visual_choices_three",
      currentPlannedChoiceRatio: resolveQuizLayoutAssetAspectRatio("visual_choices_three", "answer_option"),
    });
    expect(vcSlots[0].imageViewport).toEqual({ width: 432, height: 336 });
    expect(vcSlots[0].mediaBorderBox).toEqual({ width: 452, height: 356 });
    expect(vcSlots[0].computedObjectFit).toBe("cover");

    // 2. Visual Choices Three Pure (432 x 484)
    await loadLayout("visual_choices_three_pure", 3);
    const pureSlots = await measureLayoutImageSlots(page, {
      layoutId: "visual_choices_three_pure",
      currentPlannedChoiceRatio: resolveQuizLayoutAssetAspectRatio("visual_choices_three_pure", "answer_option"),
    });
    expect(pureSlots[0].imageViewport).toEqual({ width: 432, height: 484 });
    expect(pureSlots[0].mediaBorderBox).toEqual({ width: 452, height: 504 });
    expect(pureSlots[0].computedObjectFit).toBe("cover");

    // 3. Split Versus Two Visual (622 x 342)
    await loadLayout("split_versus_two", 2);
    const svSlots = await measureLayoutImageSlots(page, {
      layoutId: "split_versus_two",
      currentPlannedChoiceRatio: resolveQuizLayoutAssetAspectRatio("split_versus_two", "answer_option"),
    });
    expect(svSlots[0].imageViewport).toEqual({ width: 622, height: 342 });
    expect(svSlots[0].mediaBorderBox).toEqual({ width: 646, height: 366 });
    expect(svSlots[0].computedObjectFit).toBe("cover");
  }, 30000);

  // RED REGRESSION: Locks the defect before pure sizing implementation.
  // Before correction, currentPlannedRatio returns "1:1" for visual_choices_three and split_versus_two.
  it("locks the aspect ratio defect: visual card requires 4:3 and split versus requires 16:9", async () => {
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
    expect(visualCard.imageViewport).toEqual({ width: 432, height: 336 });
    expect(splitVersus.imageViewport).toEqual({ width: 622, height: 342 });

    // EXPECTED RED: Current catalog claims 1:1, but the target policy requires 4:3 and 16:9
    expect(visualCard.currentPlannedRatio).toBe("4:3"); // Fails before correction (is "1:1")
    expect(splitVersus.currentPlannedRatio).toBe("16:9"); // Fails before correction (is "1:1")
  }, 30000);
});

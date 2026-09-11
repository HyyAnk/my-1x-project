import { readFile } from "node:fs/promises";
import { chromium, type Browser, type Page } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SandboxPreviewInputSchema } from "@studio/shared";
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

describe("factTextFit.browser", () => {
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

  async function renderFact(factText: string) {
    const input = SandboxPreviewInputSchema.parse({
      layout_id: "media_left_choices_right",
      aspect_ratio: "16:9",
      phase: "explain",
      mode: "snapshot",
      choices: ["Choice A", "Choice B", "Choice C"],
      question_format: "multiple_choice",
      correct_choice_index: 0,
      question_text: "Which planet has the most visible rings?",
      fact_card_text: factText,
      channel_brand_name: "SPACE",
      thinking_bar_style: "star_slider",
      question_box_style: "candy_pop",
      counter_style: "hanging_woodsign",
      mascot_enabled: false,
    });
    const composition = buildSandboxComposition(input);
    const inlined = await inlineFonts(composition.html);
    await page.setContent(inlined, { waitUntil: "load" });
  }

  it("fits short fact at 38px", async () => {
    await renderFact("Saturn has rings made of ice.");
    await page.waitForFunction(() => document.documentElement.dataset.fontsReady === "true", undefined, { timeout: 15000 });

    const fitResult = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>(".fact-card");
      return {
        status: card?.dataset.factFitStatus,
        fontSize: card?.dataset.factFitFontSize,
      };
    });

    expect(fitResult.status).toBe("fit");
    expect(Number(fitResult.fontSize)).toBe(38);
  });

  it("fits moderate fact at valid font size between 33px and 38px", async () => {
    await renderFact("Saturn is the sixth planet from the Sun and the second-largest in the Solar System, after Jupiter.");
    await page.waitForFunction(() => document.documentElement.dataset.fontsReady === "true", undefined, { timeout: 15000 });

    const fitResult = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>(".fact-card");
      return {
        status: card?.dataset.factFitStatus,
        fontSize: Number(card?.dataset.factFitFontSize),
      };
    });

    expect(fitResult.status).toBe("fit");
    expect(fitResult.fontSize).toBeGreaterThanOrEqual(33);
    expect(fitResult.fontSize).toBeLessThanOrEqual(38);
  });

  it("fits 3-line fact at smallest size down to 32px", async () => {
    await renderFact(
      "Saturn is surrounded by a ring system consisting of nine continuous main rings and three discontinuous arcs composed of ice and rock particles.",
    );
    await page.waitForFunction(() => document.documentElement.dataset.fontsReady === "true", undefined, { timeout: 15000 });

    const fitResult = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>(".fact-card");
      return {
        status: card?.dataset.factFitStatus,
        fontSize: Number(card?.dataset.factFitFontSize),
      };
    });

    expect(fitResult.status).toBe("fit");
    expect(fitResult.fontSize).toBeGreaterThanOrEqual(32);
    expect(fitResult.fontSize).toBeLessThanOrEqual(38);
  });

  it("reports QUIZ_FACT_TEXT_OVERFLOW for oversized fact text", async () => {
    const hugeText =
      "Saturn is the sixth planet from the Sun and the second-largest in the Solar System, after Jupiter. " +
      "It is a gas giant with an average radius of about nine and a half times that of Earth. " +
      "It only has one-eighth the average density of Earth; however, with its larger volume, Saturn is over 95 times more massive. " +
      "The interior of Saturn is most likely composed of a rocky core, surrounded by a deep layer of metallic hydrogen. " +
      "This enormous text cannot possibly fit within three lines of text even at minimum 32px font size!";

    await renderFact(hugeText);
    await page.waitForFunction(() => document.documentElement.dataset.fontsError === "true", undefined, { timeout: 15000 });

    const errorStatus = await page.evaluate(() => {
      const win = window as unknown as {
        __fontStatus?: { state: string; message: string };
      };
      return win.__fontStatus;
    });

    expect(errorStatus?.state).toBe("error");
    expect(errorStatus?.message).toContain("QUIZ_FACT_TEXT_OVERFLOW");
  });

  it("preserves fixed Fact Card anchor bounds regardless of fact text length", async () => {
    await renderFact("Short fact.");
    await page.waitForFunction(() => document.documentElement.dataset.fontsReady === "true", undefined, { timeout: 15000 });

    const anchorRect = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[data-quiz-fixed="fact"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });

    expect(anchorRect).not.toBeNull();
    expect(Math.abs(anchorRect!.x - LANDSCAPE_FRAME.fact.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(anchorRect!.y - LANDSCAPE_FRAME.fact.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(anchorRect!.width - LANDSCAPE_FRAME.fact.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(anchorRect!.height - LANDSCAPE_FRAME.fact.height)).toBeLessThanOrEqual(1);
  });
});

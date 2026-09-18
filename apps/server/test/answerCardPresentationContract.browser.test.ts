import { readFile } from "node:fs/promises";
import { chromium, type Browser, type Page } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ALL_ANSWER_CARD_STYLES, SandboxPreviewInputSchema } from "@studio/shared";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { resolveCandyArcadeFonts } from "../src/quiz/render/candyArcade/candyArcadeFonts.js";
import { DETACHED_ANSWER_CARD_PRESENTATION_CONTRACT } from "../src/quiz/visual/elements/answerCard/presentationContract.js";

const DETACHED_BADGE_CASES = [
  { layoutId: "media_left_choices_right", choiceCount: 2 },
  { layoutId: "media_left_choices_right", choiceCount: 3 },
  { layoutId: "visual_choices_three", choiceCount: 3 },
  { layoutId: "full_stack_list", choiceCount: 2 },
  { layoutId: "full_stack_list", choiceCount: 3 },
] as const;

const PRESENTATION_MATRIX = DETACHED_BADGE_CASES.flatMap((layoutCase) =>
  ALL_ANSWER_CARD_STYLES.map((skinId) => ({ ...layoutCase, skinId })),
);

type FontReplacement = { url: string; dataUrl: string };

describe("answerCardPresentationContract.browser", () => {
  let browser: Browser;
  let page: Page;
  let fontReplacements: FontReplacement[];

  beforeAll(async () => {
    fontReplacements = await Promise.all(
      resolveCandyArcadeFonts().map(async (font) => ({
        url: `/api/quiz/fonts/${font.id}?v=${font.sha256.slice(0, 16)}`,
        dataUrl: `data:${font.mimeType};base64,${(await readFile(font.absolutePath)).toString("base64")}`,
      })),
    );
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.route(/^https?:/, (route) => route.abort());
  }, 60000);

  afterAll(async () => {
    await browser?.close();
  }, 60000);

  async function loadAnswerCard(layoutId: string, choiceCount: number, skinId: string): Promise<void> {
    const input = SandboxPreviewInputSchema.parse({
      layout_id: layoutId,
      aspect_ratio: "16:9",
      phase: "thinking",
      mode: "snapshot",
      choices: Array.from({ length: choiceCount }, (_, index) => `Choice ${String.fromCharCode(65 + index)}`),
      question_format: "multiple_choice",
      correct_choice_index: 0,
      question_text: "Which planet has the most visible rings?",
      fact_card_text: "Saturn has rings made mostly of ice and rock.",
      answer_card_style: skinId,
      mascot_enabled: false,
    });
    const composition = buildSandboxComposition(input);
    const html = fontReplacements.reduce(
      (result, replacement) => result.replaceAll(replacement.url, replacement.dataUrl),
      composition.html,
    );

    await page.setContent(html, { waitUntil: "load" });
    await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; }" });
    await page.waitForFunction(() => document.documentElement.dataset.fontsReady === "true", undefined, { timeout: 15000 });
  }

  it.each(PRESENTATION_MATRIX)(
    "preserves the detached-badge primitive for $layoutId/$choiceCount with $skinId",
    async ({ layoutId, choiceCount, skinId }) => {
      await loadAnswerCard(layoutId, choiceCount, skinId);
      const measured = await page.evaluate(() => {
        const card = document.querySelector<HTMLElement>('.choice-card[data-choice-variant="detached_badge"]');
        const assembly = card?.classList.contains("choice-card-text") ? card : card?.querySelector<HTMLElement>(".visual-answer-assembly");
        const badge = assembly?.querySelector<HTMLElement>(":scope > .choice-label");
        const surface = assembly?.querySelector<HTMLElement>(":scope > .choice-card-surface");
        const answerText = surface?.querySelector<HTMLElement>(".choice-text");
        if (!assembly || !badge || !surface || !answerText) throw new Error("Detached answer parts are missing");

        const offsetWithin = (element: HTMLElement, ancestor: HTMLElement): number => {
          let offset = 0;
          let current: HTMLElement | null = element;
          while (current && current !== ancestor) {
            offset += current.offsetLeft;
            current = current.offsetParent as HTMLElement | null;
          }
          if (current !== ancestor) throw new Error("Answer part is outside its assembly");
          return offset;
        };

        const badgeLeft = offsetWithin(badge, assembly);
        const surfaceLeft = offsetWithin(surface, assembly);
        const textLeft = offsetWithin(answerText, assembly);
        return {
          badgeWidth: badge.offsetWidth,
          badgeHeight: badge.offsetHeight,
          surfaceHeight: surface.offsetHeight,
          overlap: badgeLeft + badge.offsetWidth - surfaceLeft,
          textClearance: textLeft - (badgeLeft + badge.offsetWidth),
          badgeZIndex: Number(getComputedStyle(badge).zIndex),
          surfaceZIndex: Number(getComputedStyle(surface).zIndex),
        };
      });
      const contract = DETACHED_ANSWER_CARD_PRESENTATION_CONTRACT;

      expect(measured.badgeWidth).toBe(measured.badgeHeight);
      expect(measured.badgeHeight - measured.surfaceHeight).toBeGreaterThanOrEqual(contract.minimumBadgeHeightDeltaPx);
      expect(measured.overlap / measured.badgeWidth).toBeGreaterThanOrEqual(contract.minimumOverlapRatio);
      expect(measured.textClearance).toBeGreaterThanOrEqual(contract.minimumTextClearancePx);
      expect(measured.badgeZIndex).toBe(contract.badgeZIndex);
      expect(measured.surfaceZIndex).toBe(contract.surfaceZIndex);
    },
  );
});

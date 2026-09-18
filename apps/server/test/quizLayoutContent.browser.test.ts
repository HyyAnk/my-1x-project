import { readFile } from "node:fs/promises";
import { chromium, type Browser, type Page } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { QUIZ_LANDSCAPE_LAYOUT_IDS, QUIZ_LAYOUT_GEOMETRY, SandboxPreviewInputSchema } from "@studio/shared";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { resolveCandyArcadeFonts } from "../src/quiz/render/candyArcade/candyArcadeFonts.js";
import { LAYOUT_CONTENT_GEOMETRY } from "../src/quiz/render/layouts/layoutContentGeometry.js";

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

describe("quizLayoutContent.browser", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.route(/^https?:/, (route) => route.abort());
  }, 60000);

  afterAll(async () => {
    await browser?.close();
  }, 60000);

  async function loadSnapshot(layout: (typeof QUIZ_LANDSCAPE_LAYOUT_IDS)[number], choiceCount: number) {
    const choices = Array.from({ length: choiceCount }, (_, i) => `Choice ${String.fromCharCode(65 + i)}`);
    const input = SandboxPreviewInputSchema.parse({
      layout_id: layout,
      aspect_ratio: "16:9",
      phase: "thinking",
      mode: "snapshot",
      choices,
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
    await page.addStyleTag({
      content: `*, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }`,
    });
    await page.waitForFunction(() => document.documentElement.dataset.fontsReady === "true", undefined, { timeout: 15000 });
  }

  const TEST_CASES = QUIZ_LANDSCAPE_LAYOUT_IDS.flatMap((layoutId) => {
    const geometry = LAYOUT_CONTENT_GEOMETRY[layoutId];
    const counts = Object.keys(geometry.answers).map(Number) as (0 | 1 | 2 | 3)[];
    return counts.map((choiceCount) => ({ layoutId, choiceCount }));
  });

  const DETACHED_BADGE_CASES = [
    { layoutId: "media_left_choices_right", choiceCount: 2 },
    { layoutId: "media_left_choices_right", choiceCount: 3 },
    { layoutId: "visual_choices_three", choiceCount: 3 },
    { layoutId: "full_stack_list", choiceCount: 2 },
    { layoutId: "full_stack_list", choiceCount: 3 },
  ] as const;

  it.each(TEST_CASES)("measures expected bounds for $layoutId with $choiceCount choices", async ({ layoutId, choiceCount }) => {
    const geometry = LAYOUT_CONTENT_GEOMETRY[layoutId];
    await loadSnapshot(layoutId, choiceCount);

    const measured = await page.evaluate((layout) => {
      let heroBox = null;
      if (layout === "media_left_choices_right" || layout === "verdict_true_false") {
        const heroEl = document.querySelector<HTMLElement>(".hero-image");
        if (heroEl) {
          const r = heroEl.getBoundingClientRect();
          heroBox = { x: r.x, y: r.y, width: r.width, height: r.height };
        }
      } else if (layout === "mystery_reveal") {
        const heroEl = document.querySelector<HTMLElement>(".mystery-stage-wrapper");
        if (heroEl) {
          const r = heroEl.getBoundingClientRect();
          heroBox = { x: r.x, y: r.y, width: r.width, height: r.height };
        }
      }

      let selector = ".choice-card";
      if (layout === "visual_choices_three") {
        selector = ".visual-answer-assembly";
      } else if (layout === "visual_choices_three_pure") {
        selector = ".choice-media";
      } else if (layout === "split_versus_two") {
        selector = ".choice-card-surface";
      }
      const cards = Array.from(document.querySelectorAll<HTMLElement>(selector)).map((card) => {
        const r = card.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });

      let versusBadge = null;
      if (layout === "split_versus_two") {
        const vsEl = document.querySelector<HTMLElement>(".vs-badge") ?? document.querySelector<HTMLElement>(".answer-grid");
        if (vsEl) {
          const r = vsEl.getBoundingClientRect();
          versusBadge = { x: r.x, y: r.y, width: r.width, height: r.height };
        }
      }

      return { heroBox, cards, versusBadge };
    }, layoutId);

    if (geometry.hero) {
      expect(measured.heroBox).not.toBeNull();
      expect(Math.abs(measured.heroBox!.x - geometry.hero.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(measured.heroBox!.y - geometry.hero.y)).toBeLessThanOrEqual(2);
      expect(Math.abs(measured.heroBox!.width - geometry.hero.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(measured.heroBox!.height - geometry.hero.height)).toBeLessThanOrEqual(2);
    }

    const expectedCards = geometry.answers[choiceCount];
    expect(expectedCards).toBeDefined();
    expect(measured.cards).toHaveLength(expectedCards!.length);

    for (let i = 0; i < expectedCards!.length; i++) {
      const expected = expectedCards![i];
      const actual = measured.cards[i];
      expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(2);
      expect(Math.abs(actual.width - expected.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(actual.height - expected.height)).toBeLessThanOrEqual(2);
    }
  });

  it.each(DETACHED_BADGE_CASES)(
    "keeps the badge fused above the answer surface for $layoutId with $choiceCount choices",
    async ({ layoutId, choiceCount }) => {
      await loadSnapshot(layoutId, choiceCount);
      const measured = await page.evaluate(() => {
        const badge = document.querySelector<HTMLElement>(".choice-label");
        const surface = document.querySelector<HTMLElement>(".choice-card-surface");
        if (!badge || !surface) throw new Error("Detached answer parts are missing");
        const badgeRect = badge.getBoundingClientRect();
        const surfaceRect = surface.getBoundingClientRect();
        return {
          badge: { x: badgeRect.x, y: badgeRect.y, width: badgeRect.width, height: badgeRect.height },
          surface: { x: surfaceRect.x, y: surfaceRect.y, width: surfaceRect.width, height: surfaceRect.height },
          textX: document.querySelector<HTMLElement>(".choice-text")?.getBoundingClientRect().x ?? 0,
          badgeZ: Number(getComputedStyle(badge).zIndex),
          surfaceZ: Number(getComputedStyle(surface).zIndex),
        };
      });
      const expected = QUIZ_LAYOUT_GEOMETRY[layoutId].answerVariants[choiceCount]!;
      const expectedBadge = expected.badge[0];
      const expectedSurface = expected.text[0];
      const actualOverlap = measured.badge.x + measured.badge.width - measured.surface.x;

      for (const key of ["x", "y", "width", "height"] as const) {
        expect(Math.abs(measured.badge[key] - expectedBadge[key])).toBeLessThanOrEqual(2);
        expect(Math.abs(measured.surface[key] - expectedSurface[key])).toBeLessThanOrEqual(2);
      }
      expect(Math.abs(actualOverlap - expected.overlap!)).toBeLessThanOrEqual(2);
      expect(actualOverlap / measured.badge.width).toBeGreaterThanOrEqual(0.27);
      expect(measured.textX - (measured.badge.x + measured.badge.width)).toBeGreaterThanOrEqual(12);
      expect(measured.badgeZ).toBeGreaterThan(measured.surfaceZ);
    },
  );
});

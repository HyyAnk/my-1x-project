import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { SandboxPreviewInputSchema } from "../../../packages/shared/src/index.js";
import { buildSandboxComposition } from "../../../apps/server/src/quiz/render/sandboxComposition.js";
import { resolveCandyArcadeFonts } from "../../../apps/server/src/quiz/render/candyArcade/candyArcadeFonts.js";

const FIXTURES_PATH = path.resolve("docs/quiz-layout-upgrade-v2/data/baseline-fixtures.json");
const OUTPUT_DIR = path.resolve("docs/quiz-layout-upgrade-v2/evidence/baseline-frames");

async function inlineFonts(html) {
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

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const rawFixtures = await readFile(FIXTURES_PATH, "utf8");
  const { fixtures } = JSON.parse(rawFixtures);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await page.route(/^https?:/, (route) => route.abort());

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error(`[BROWSER ERROR] ${msg.text()}`);
    }
  });

  const results = [];

  for (const fixture of fixtures) {
    const inputPayload = {
      layout_id: fixture.layoutId,
      aspect_ratio: "16:9",
      phase: "thinking",
      mode: "snapshot",
      choices: fixture.choices,
      question_format: fixture.questionFormat,
      archetype: fixture.archetype,
      correct_choice_index: fixture.correctChoiceIndex,
      question_text: fixture.questionText,
      fact_card_title: fixture.factCardTitle,
      fact_card_text: fixture.factCardText,
      channel_brand_name: fixture.channelBrandName,
      thinking_bar_style: "star_slider",
      question_box_style: "candy_pop",
      counter_style: "hanging_woodsign",
      mascot_enabled: false,
    };

    let composition;
    try {
      const parsed = SandboxPreviewInputSchema.parse(inputPayload);
      composition = buildSandboxComposition(parsed);
    } catch (err) {
      console.warn(`[WARN] Skipping/marking fixture ${fixture.id}:`, err.message);
      results.push({
        fixtureId: fixture.id,
        layoutId: fixture.layoutId,
        status: "schema_rejected_baseline",
        error: err.message,
      });
      continue;
    }

    const inlined = await inlineFonts(composition.html);
    await page.setContent(inlined, { waitUntil: "load" });
    await page.addStyleTag({
      content: `*, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }`,
    });

    try {
      await page.waitForFunction(
        () => document.documentElement.dataset.fontsReady === "true" || document.documentElement.dataset.fontsError === "true",
        undefined,
        { timeout: 15000 },
      );
    } catch (err) {
      console.error(`[TIMEOUT] Font readiness timeout for ${fixture.id}`);
      const fontStatus = await page.evaluate(() => window.__fontStatus);
      console.error(`[FONT STATUS]`, fontStatus);
      results.push({
        fixtureId: fixture.id,
        layoutId: fixture.layoutId,
        status: "font_timeout",
        error: err.message,
        fontStatus,
      });
      continue;
    }

    const screenshotPath = path.join(OUTPUT_DIR, `${fixture.id}.png`);
    await page.screenshot({ path: screenshotPath });

    const measurements = await page.evaluate(() => {
      function rect(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x * 100) / 100,
          y: Math.round(r.y * 100) / 100,
          width: Math.round(r.width * 100) / 100,
          height: Math.round(r.height * 100) / 100,
        };
      }

      const question = rect(document.querySelector(".question-box"));
      const fact = rect(document.querySelector(".fact-card"));
      const timer = rect(document.querySelector(".thinking-bar-container") || document.querySelector(".thinking-bar"));
      const hero = rect(document.querySelector(".hero-media-wrapper") || document.querySelector(".mystery-reveal-stage") || document.querySelector(".hero-media"));

      const choices = Array.from(document.querySelectorAll(".choice-card")).map((el) => {
        const card = rect(el);
        const label = rect(el.querySelector(".choice-label"));
        const media = rect(el.querySelector(".choice-media"));
        const text = rect(el.querySelector(".choice-text") || el.querySelector(".choice-card-text"));
        return { card, label, media, text };
      });

      return { question, fact, timer, hero, choices };
    });

    results.push({
      fixtureId: fixture.id,
      layoutId: fixture.layoutId,
      status: "captured",
      screenshotPath,
      measurements,
    });
    console.log(`[OK] Captured ${fixture.id}`);
  }

  await browser.close();

  const reportPath = path.resolve("docs/quiz-layout-upgrade-v2/evidence/baseline-measurements.json");
  await writeFile(reportPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`[DONE] Baseline measurements written to ${reportPath}`);
}

main().catch((err) => {
  console.error("[ERROR]", err);
  process.exit(1);
});

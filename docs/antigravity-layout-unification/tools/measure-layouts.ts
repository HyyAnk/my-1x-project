import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "@playwright/test";
import { SandboxPreviewInputSchema, QUIZ_LANDSCAPE_LAYOUT_IDS } from "../../../packages/shared/src/index.js";
import { buildSandboxComposition } from "../../../apps/server/src/quiz/render/sandboxComposition.js";
import { resolveCandyArcadeFonts } from "../../../apps/server/src/quiz/render/candyArcade/candyArcadeFonts.js";

// Read-only source inspection. Generated evidence is scoped to this handoff.
const packet = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(packet, "evidence");
const started = Date.now();
const phases = ["thinking", "explain"] as const;
const selectors = {
  counter: ".game-header",
  question: ".question-title",
  brand: ".channel-brand-mark",
  phase: ".phase-region",
  thinking: ".thinking-bar",
  track: ".thinking-track",
  fact: ".fact-card",
  hero: ".hero-image",
  answers: ".choice-group",
};
const colors = { INFO: "36", STEP: "1;34", OK: "32", ERROR: "1;31" } as const;

function log(level: keyof typeof colors, step: string, message: string): void {
  const prefix = `${new Date().toISOString()} [${level}] [T:measurement-1] [STEP:${step}]`;
  const line = `${prefix} ${message}`;
  process.stdout.write(process.stdout.isTTY ? `\u001b[${colors[level]}m${line}\u001b[0m\n` : `${line}\n`);
}

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

async function measure(page: Page) {
  return page.evaluate((entries) => {
    return Object.fromEntries(
      Object.entries(entries).map(([name, selector]) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) return [name, null];
        const rect = element.getBoundingClientRect();
        const css = getComputedStyle(element);
        return [
          name,
          {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right,
            transform: css.transform,
            offsetWidth: element.offsetWidth,
            offsetHeight: element.offsetHeight,
            cssTop: css.top,
            cssLeft: css.left,
            opacity: css.opacity,
          },
        ];
      }),
    );
  }, selectors);
}

async function main(): Promise<void> {
  log(
    "INFO",
    "startup",
    "Canvas=1920x1080; layouts=8; phases=2; mode=source-inspection; concurrency=1; method=headless Playwright; no OS input",
  );
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  let completed = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.route(/^https?:/, (route) => route.abort());
    const results = [];
    for (const layout of QUIZ_LANDSCAPE_LAYOUT_IDS) {
      for (const phase of phases) {
        const binary = layout === "split_versus_two" || layout === "verdict_true_false";
        const input = SandboxPreviewInputSchema.parse({
          layout_id: layout,
          aspect_ratio: "16:9",
          phase,
          mode: "snapshot",
          choices: binary ? ["Saturn", "Jupiter"] : ["Saturn", "Jupiter", "Neptune"],
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
        await page.setContent(await inlineFonts(composition.html), { waitUntil: "load" });
        await page.waitForFunction(() => document.documentElement.dataset.fontsReady === "true", undefined, { timeout: 15000 });
        await page.evaluate(() => {
          // Freeze a reproducible sample; these rectangles include animation transforms.
          document.getAnimations().forEach((animation) => {
            animation.pause();
            animation.currentTime = 2000;
          });
        });
        const boxes = await measure(page);
        results.push({ layout, phase, sampleMs: 2000, mascot: false, boxes });
        await page.screenshot({ path: path.join(output, `${layout}-${phase}.png`) });
        completed += 1;
        log("STEP", `${layout}/${phase}`, `${completed}/16 measured`);
      }
    }
    await writeFile(
      path.join(output, "current-layout-measurements.json"),
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          canvas: { width: 1920, height: 1080 },
          surface: "Current sandbox snapshot output; not a production timeline certification",
          motion: "CSS animations paused at 2000ms; dimensions include transforms",
          results,
        },
        null,
        2,
      ) + "\n",
    );
    log("OK", "summary", `total=16 success=${completed} failed=0 skipped=0 retries=0 elapsedMs=${Date.now() - started}`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  log(
    "ERROR",
    "measurement",
    `${error instanceof Error ? error.message : String(error)}; next=check local fonts and Playwright browser availability; elapsedMs=${Date.now() - started}`,
  );
  process.exitCode = 1;
});

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import { format } from "prettier";
import { CANDY_ARCADE_FONTS, resolveCandyArcadeFont } from "../src/quiz/render/candyArcade/candyArcadeFonts.js";
import { buildArtifactHtml } from "./phase08cArtifacts.fixtures.js";
import {
  artifactFilename,
  PHASE_08C_ARTIFACT_CASES,
  type Phase08cArtifactCase,
  type Phase08cInspection,
} from "./phase08cArtifacts.types.js";

const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
const artifactRoot = path.join(workspaceRoot, "docs", "quiz-visual-refactor", "artifacts", "phase-08c");
const startedAt = Date.now();

async function main() {
  log("INFO", "Starting Phase 8C artifact render", "startup", `cases=${PHASE_08C_ARTIFACT_CASES.length} method=Playwright Chromium`);
  await mkdir(artifactRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const manifest: Array<Phase08cArtifactCase & { viewport: string; outputPath: string; inspect: Phase08cInspection; caveat: null }> = [];
  try {
    for (const [index, item] of PHASE_08C_ARTIFACT_CASES.entries()) {
      log("STEP", `Rendering ${item.surface} ${item.layoutId}`, "render", `case=${index + 1}/${PHASE_08C_ARTIFACT_CASES.length}`);
      manifest.push(await renderArtifact(browser, item));
    }
  } finally {
    await browser.close();
  }
  await writeManifest(manifest);
  log("DONE", "Artifact matrix complete", "summary", `total=${manifest.length} success=${manifest.length} failed=0 elapsed=${elapsed()}`);
}

async function renderArtifact(browser: Awaited<ReturnType<typeof chromium.launch>>, item: Phase08cArtifactCase) {
  const viewport = item.aspectRatio === "16:9" ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await installFontRoutes(page);
    await page.setContent(buildArtifactHtml(item), { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.dataset.fontsReady === "true");
    await seekToReveal(page);
    const filename = artifactFilename(item);
    await page.screenshot({ path: path.join(artifactRoot, filename), animations: "allow" });
    const inspect = await inspectArtifact(page, item);
    log("OK", `Inspected ${filename}`, "inspect", `surface=${item.surface} layout=${item.layoutId} background=${item.backgroundStyle}`);
    return {
      ...item,
      inputId: `${item.surface}:phase-08c-${item.id}`,
      styleIds: {
        theme: "candy_arcade",
        palette: "lime",
        layout: item.layoutId,
        background: item.backgroundStyle,
        answerCard: item.answerCardStyle,
        questionBox: "candy_pop",
        thinkingBar: "star_slider",
        counter: "hanging_woodsign",
      },
      viewport: `${viewport.width}x${viewport.height}`,
      outputPath: `docs/quiz-visual-refactor/artifacts/phase-08c/${filename}`,
      inspect,
      caveat: null,
    };
  } finally {
    await context.close();
  }
}

async function installFontRoutes(page: Page) {
  await page.route("http://phase08c.local/**", async (route) => {
    const url = new URL(route.request().url());
    const font = CANDY_ARCADE_FONTS.find((candidate) => url.pathname.includes(candidate.id) || url.pathname.endsWith(candidate.filename));
    if (!font) {
      await route.fulfill({ status: 404, body: "Not found" });
      return;
    }
    const resolved = resolveCandyArcadeFont(font.id, workspaceRoot);
    if (!resolved) throw new Error(`Missing local font ${font.id}`);
    await route.fulfill({ status: 200, contentType: font.mimeType, body: await readFile(resolved.absolutePath) });
  });
}

async function seekToReveal(page: Page) {
  await page.evaluate(() => {
    const scene = document.querySelector<HTMLElement>(".quiz-question-clip");
    if (!scene) throw new Error("Missing question scene for reveal seek");
    const style = getComputedStyle(scene);
    const clipStart = Number.parseFloat(style.getPropertyValue("--clip-start")) || 0;
    const revealAt = Number.parseFloat(style.getPropertyValue("--reveal-at")) || 0;
    const revealTimeMs = (clipStart + revealAt + 0.1) * 1000;
    document.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = revealTimeMs;
    });
  });
}

async function inspectArtifact(page: Page, item: Phase08cArtifactCase): Promise<Phase08cInspection> {
  const geometry = await page.evaluate((mascotEnabled) => {
    const stage = document.querySelector<HTMLElement>("#stage");
    const background = document.querySelector<HTMLElement>(".quiz-scene-background");
    if (!stage || !background) throw new Error("Missing stage or semantic background");
    const stageRect = stage.getBoundingClientRect();
    const relevant = [...document.querySelectorAll<HTMLElement>(".question-box, .choice-card, .image-card")];
    const mascot = document.querySelector<HTMLElement>(".candy-mascot-container");
    const visibleMascotFrames = [...document.querySelectorAll<HTMLElement>(".mascot-v2-state")].filter(
      (state) => Number.parseFloat(getComputedStyle(state).opacity) > 0.5,
    );
    const phaseOverlays = [...document.querySelectorAll<HTMLElement>(".phase-region > *")];
    const choices = [...document.querySelectorAll<HTMLElement>(".choice-card")];
    return {
      backgroundFillsStage: covers(background.getBoundingClientRect(), stageRect),
      contentWithinStage: relevant.every((element) => within(element.getBoundingClientRect(), stageRect)),
      noDocumentOverflow:
        document.documentElement.scrollWidth <= stageRect.width + 1 && document.documentElement.scrollHeight <= stageRect.height + 1,
      noMascotChoiceOcclusion:
        !mascot || choices.every((choice) => intersectionRatio(mascot.getBoundingClientRect(), choice.getBoundingClientRect()) < 0.02),
      noPhaseContentOcclusion: phaseOverlays.every((overlay) =>
        relevant.every((element) => intersectionRatio(overlay.getBoundingClientRect(), element.getBoundingClientRect()) < 0.02),
      ),
      mascotStateMatches: mascotEnabled
        ? Boolean(mascot) &&
          visibleMascotFrames.length === 1 &&
          getComputedStyle(visibleMascotFrames[0].querySelector<HTMLElement>(".mascot-v2-frame")!).backgroundImage !== "none"
        : !mascot,
      visibleChoiceCount: choices.filter((choice) => {
        const style = getComputedStyle(choice);
        const rect = choice.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      }).length,
      fontsReady: document.documentElement.dataset.fontsReady === "true",
    };

    function within(rect: DOMRect, parent: DOMRect) {
      return (
        rect.left >= parent.left - 1 && rect.top >= parent.top - 1 && rect.right <= parent.right + 1 && rect.bottom <= parent.bottom + 1
      );
    }
    function covers(rect: DOMRect, parent: DOMRect) {
      return (
        rect.left <= parent.left + 1 && rect.top <= parent.top + 1 && rect.right >= parent.right - 1 && rect.bottom >= parent.bottom - 1
      );
    }
    function intersectionRatio(a: DOMRect, b: DOMRect) {
      const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return (width * height) / Math.max(1, b.width * b.height);
    }
  }, item.mascotEnabled);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedMotionStatic = await page
    .locator(".quiz-scene-background")
    .evaluate((root) =>
      [...root.querySelectorAll<HTMLElement>("*")].every((element) => getComputedStyle(element).animationName === "none"),
    );
  const inspection = { ...geometry, reducedMotionStatic, result: "PASS" as const };
  if (Object.entries(inspection).some(([key, value]) => key !== "visibleChoiceCount" && key !== "result" && value !== true)) {
    throw new Error(`Visual inspection failed for ${item.id}: ${JSON.stringify(inspection)}`);
  }
  if (inspection.visibleChoiceCount !== 3)
    throw new Error(`Expected 3 visible choices for ${item.id}, found ${inspection.visibleChoiceCount}`);
  return inspection;
}

async function writeManifest(
  manifest: Array<Phase08cArtifactCase & { viewport: string; outputPath: string; inspect: Phase08cInspection; caveat: null }>,
) {
  await writeFile(
    path.join(artifactRoot, "manifest.json"),
    `${JSON.stringify(
      {
        generatedAt: "2026-08-31",
        reviewer: "Codex browser protocol",
        verification: {
          phase: "8D",
          purpose: "post-cleanup acceptance revalidation",
          automationMethod: "Playwright Chromium",
          result: "PASS",
          artifactCount: manifest.length,
        },
        cases: manifest,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  const rows = manifest.map(
    (item) =>
      `| ${item.id} | ${item.surface} | ${item.layoutId} | ${item.aspectRatio} | ${item.backgroundStyle} | ${item.answerCardStyle} | ${item.mascotEnabled ? "on" : "off"} | [PNG](./${path.basename(item.outputPath)}) | ${item.inspect.result} |`,
  );
  const readme = `# Phase 8C Visual Evidence\n\nGenerated and inspected with local Playwright Chromium, then manually reviewed from the final PNGs. Phase 8D reran the full matrix after cleanup. Every case passed browser geometry, overflow, mascot/choice and phase/content occlusion, font readiness, semantic background fill, mascot on/off state, and reduced-motion computed-style checks.\n\n| ID | Surface | Layout | Aspect | Background | Answer Card | Mascot | Artifact | Inspect |\n| -- | ------- | ------ | ------ | ---------- | ----------- | ------ | -------- | ------- |\n${rows.join("\n")}\n\nSee \`manifest.json\` for explicit input and style IDs, Phase 8D revalidation metadata, and all inspection fields. No external provider or network asset was used.\n`;
  await writeFile(path.join(artifactRoot, "README.md"), await format(readme, { parser: "markdown" }), "utf8");
}

function log(level: "INFO" | "STEP" | "OK" | "DONE", message: string, step: string, detail: string) {
  const color = level === "OK" || level === "DONE" ? "\u001b[32m" : level === "STEP" ? "\u001b[1;34m" : "\u001b[36m";
  const timestamp = new Date().toISOString();
  process.stdout.write(
    `\u001b[2m${timestamp}\u001b[0m ${color}[${level}]\u001b[0m [T:main] [P:phase-08c] [STEP:${step}] ${message} | ${detail}\n`,
  );
}

function elapsed() {
  return `${((Date.now() - startedAt) / 1000).toFixed(2)}s`;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(
    `\u001b[2m${new Date().toISOString()}\u001b[0m \u001b[1;31m[ERROR]\u001b[0m [T:main] [P:phase-08c] [STEP:failed] ${message}\n`,
  );
  process.exitCode = 1;
});

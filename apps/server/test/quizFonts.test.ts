import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import {
  CANDY_ARCADE_FONTS,
  candyArcadeFontFaceCss,
  candyArcadeFontReadinessScript,
  copyCandyArcadeFonts,
  resolveCandyArcadeFonts,
} from "../src/quiz/render/candyArcade/candyArcadeFonts.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { evaluateBrowserScript } from "./helpers/browserScript.js";

type FontReadinessWindowStub = {
  parent?: FontReadinessWindowStub;
  __renderReady: boolean;
  __playerReady: boolean;
  __fontReadyPromise?: Promise<unknown>;
  __fontStatus?: unknown;
  __choiceFitStatus?: unknown;
};

const temporaryRoots: string[] = [];
const projectRoot = path.resolve(import.meta.dirname, "..", "..", "..");
const FONT_ROUTE_INTEGRATION_TIMEOUT_MS = 20_000;

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })));
});

describe("quiz font parity", () => {
  it("builds preview and render font faces from one manifest without machine-local fallbacks", () => {
    const previewCss = candyArcadeFontFaceCss("preview", projectRoot);
    const renderCss = candyArcadeFontFaceCss("render", projectRoot);

    for (const font of CANDY_ARCADE_FONTS) {
      expect(previewCss).toContain(`font-family: "${font.family}"`);
      expect(previewCss).toContain(`/api/quiz/fonts/${font.id}?v=`);
      expect(renderCss).toContain(font.filename);
    }
    expect(previewCss).not.toContain("local(");
    expect(renderCss).not.toContain("local(");
  });

  it("copies every render font and verifies byte-identical hashes", async () => {
    const renderRoot = await createTemporaryRoot("quiz-font-copy-");
    await copyCandyArcadeFonts(renderRoot, projectRoot);
    const sourceFonts = resolveCandyArcadeFonts(projectRoot);

    for (const font of sourceFonts) {
      const copied = await readFile(path.join(renderRoot, "fonts", font.filename));
      expect(createHash("sha256").update(copied).digest("hex")).toBe(font.sha256);
    }
  });

  it("fails closed when the controlled font bundle is incomplete", () => {
    const isolatedRoot = path.join(os.tmpdir(), `quiz-font-missing-${process.pid}-${Date.now()}`);
    expect(() => resolveCandyArcadeFonts(isolatedRoot)).toThrow("CANDY_ARCADE_FONT_MISSING");
  });

  it("gates readiness on every font with Vietnamese glyphs", () => {
    const script = candyArcadeFontReadinessScript();
    expect(script).toContain("document.fonts.load");
    expect(script).toContain("document.fonts.check");
    expect(script).toContain("Hành tinh kỳ thú");
    expect(script).toContain("window.__renderReady=false");
    expect(script).toContain("window.__renderReady=true");
    expect(buildSandboxComposition({}).html).toContain("__fontReadyPromise");
  });

  it("fits answer groups after fonts settle and before render readiness is released", () => {
    const script = candyArcadeFontReadinessScript();
    const fontsReadyIndex = script.indexOf("await document.fonts.ready");
    const fitIndex = script.indexOf("window.__choiceFitStatus=fitChoiceGroups()", fontsReadyIndex);
    const renderReadyIndex = script.indexOf("window.__renderReady=true", fitIndex);

    expect(script).toContain("function fitChoiceGroups()");
    expect(fontsReadyIndex).toBeGreaterThan(-1);
    expect(fitIndex).toBeGreaterThan(fontsReadyIndex);
    expect(renderReadyIndex).toBeGreaterThan(fitIndex);
  });

  it("fails closed instead of releasing render readiness when DOM fitting fails", async () => {
    const properties = new Map([
      ["--choice-fitted-font-size", "51px"],
      ["--choice-fitted-line-height", "1.08"],
    ]);
    const attributes = new Map([
      ["data-choice-fit-lines", "2"],
      ["data-choice-fit-font-size", "51"],
    ]);
    const group = {
      style: {
        setProperty: (name: string, value: string) => properties.set(name, value),
        removeProperty: (name: string) => properties.delete(name),
      },
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
    };
    const documentStub = {
      documentElement: { dataset: {} as Record<string, string> },
      fonts: { load: () => Promise.resolve([{}]), check: () => true, ready: Promise.resolve() },
      querySelectorAll: (selector: string) => (selector.includes("choice-group") ? [group] : []),
    };
    const windowStub: FontReadinessWindowStub = { __renderReady: false, __playerReady: false };
    windowStub.parent = windowStub;

    evaluateBrowserScript<void>(candyArcadeFontReadinessScript(), {
      window: windowStub,
      document: documentStub,
      getComputedStyle: () => {
        throw new Error("measurement failed");
      },
    });
    if (!windowStub.__fontReadyPromise) throw new Error("Font readiness script did not expose its completion promise");
    await expect(windowStub.__fontReadyPromise).rejects.toThrow("measurement failed");

    expect(windowStub.__fontStatus).toEqual({
      state: "error",
      message: "measurement failed",
      families: CANDY_ARCADE_FONTS.map((font) => font.family),
    });
    expect(windowStub.__choiceFitStatus).toEqual({
      groups: 1,
      overflowGroups: 0,
      fallback: true,
      message: "measurement failed",
    });
    expect(windowStub.__playerReady).toBe(false);
    expect(windowStub.__renderReady).toBe(false);
    expect(documentStub.documentElement.dataset.fontsError).toBe("true");
    expect(documentStub.documentElement.dataset.fontsReady).toBeUndefined();
    expect(properties.size).toBe(0);
    expect(attributes.get("data-choice-fit-lines")).toBe("1");
    expect(attributes.get("data-choice-fit-status")).toBe("fallback");
    expect(attributes.has("data-choice-fit-font-size")).toBe(false);
  });

  it(
    "serves immutable font bytes with the declared MIME type and hash",
    async () => {
      const root = await createAppRootWithFonts();
      const app = await buildApp(root);
      try {
        for (const definition of CANDY_ARCADE_FONTS) {
          const response = await app.server.inject({ method: "GET", url: `/api/quiz/fonts/${definition.id}` });
          expect(response.statusCode).toBe(200);
          expect(response.headers["content-type"]).toContain(definition.mimeType);
          expect(response.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
          const source = await readFile(path.join(root, "assets", "fonts", definition.filename));
          expect(response.rawPayload).toEqual(source);
          expect(response.headers.etag).toBe(`"${createHash("sha256").update(source).digest("hex")}"`);
        }
        expect((await app.server.inject({ method: "GET", url: "/api/quiz/fonts/not-a-font" })).statusCode).toBe(404);
      } finally {
        await app.close();
      }
    },
    FONT_ROUTE_INTEGRATION_TIMEOUT_MS,
  );
});

async function createTemporaryRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

async function createAppRootWithFonts(): Promise<string> {
  const root = await createTemporaryRoot("quiz-font-route-");
  await mkdir(path.join(root, "templates"), { recursive: true });
  await mkdir(path.join(root, "assets", "fonts"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  for (const font of CANDY_ARCADE_FONTS) {
    const source = await readFile(path.join(projectRoot, "assets", "fonts", font.filename));
    await writeFile(path.join(root, "assets", "fonts", font.filename), source);
  }
  return root;
}

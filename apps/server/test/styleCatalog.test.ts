import { describe, expect, it } from "vitest";
import {
  ALL_ANSWER_CARD_STYLES,
  ALL_BACKGROUND_STYLES,
  ALL_QUESTION_BOX_STYLES,
  ALL_QUESTION_COUNTER_STYLES,
  ALL_THINKING_BAR_STYLES,
} from "@studio/shared";
import {
  getAnswerCardSkinsCss,
  getBackgroundStylesCss,
  getCounterBadgesCss,
  getQuestionBoxesCss,
  getThinkingBarsCss,
} from "../src/quiz/visual/elements/index.js";
import { energyLaserVariant } from "../src/quiz/visual/elements/thinkingBar/variants/energyLaser.js";
import { THINKING_BAR_VARIANTS } from "../src/quiz/visual/elements/thinkingBar/registry.js";
import {
  BUILT_IN_STYLE_MODULES,
  createStyleCatalog,
  getStyleCatalogEntry,
  getStyleCatalogSnapshot,
} from "../src/quiz/visual/styleModules/catalog.js";
import { renderValidatedModuleCss } from "../src/quiz/visual/styleModules/namespaceCss.js";
import type { SlotScopedStyleModule } from "../src/quiz/visual/styleModules/types.js";

describe("runtime visual style catalog", () => {
  it("contains every built-in style exactly once with complete metadata", () => {
    const snapshot = getStyleCatalogSnapshot();
    const expectedIds = [
      ...ALL_THINKING_BAR_STYLES,
      ...ALL_QUESTION_BOX_STYLES,
      ...ALL_ANSWER_CARD_STYLES,
      ...ALL_QUESTION_COUNTER_STYLES,
      ...ALL_BACKGROUND_STYLES,
    ];
    const ids = snapshot.entries.map((entry) => entry.id);

    expect(ids).toHaveLength(expectedIds.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(expectedIds.sort());
    for (const entry of snapshot.entries) {
      expect(entry.displayName.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.namespace.length).toBeGreaterThan(0);
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(entry.available).toBe(true);
    }
  });

  it("resolves the legacy energy_laser ID to the existing renderer object", () => {
    const entry = getStyleCatalogEntry("thinking-bar", "energy_laser");

    expect(entry?.id).toBe("energy_laser");
    expect(THINKING_BAR_VARIANTS.energy_laser).toBe(energyLaserVariant);
  });

  it("aggregates CSS from every catalog module without dropping a slot", () => {
    expect(getThinkingBarsCss()).toContain(".thinking-bar-energy-laser");
    expect(getQuestionBoxesCss()).toContain(".qb-candy-pop");
    expect(getAnswerCardSkinsCss()).toContain(".ac-glossy-arcade");
    expect(getCounterBadgesCss()).toContain(".cb-hanging-woodsign");
    expect(getBackgroundStylesCss()).toContain(".bg-candy-rays");
  });

  it("adds a slot-local module through the catalog factory", () => {
    const fixture: SlotScopedStyleModule = {
      manifest: {
        id: "fixture.thinking-bar.local",
        slot: "thinking-bar",
        version: "1.0.0",
        displayName: "Fixture Timer",
        description: "A test-only timer module",
        namespace: "fixture-thinking-bar-local",
        assetPaths: [],
        cssSelectors: [".fixture-thinking-bar-local__root"],
      },
      renderer: {
        renderHtml: () => '<div class="fixture-thinking-bar-local__root"></div>',
        renderCss: () => ".fixture-thinking-bar-local__root { color: red; }",
      },
    };
    const catalog = createStyleCatalog([...BUILT_IN_STYLE_MODULES, fixture]);

    expect(catalog.getStyleCatalogEntry("thinking-bar", "fixture.thinking-bar.local")).toMatchObject({
      id: "fixture.thinking-bar.local",
      slot: "thinking-bar",
      displayName: "Fixture Timer",
    });
    expect(catalog.getStyleCatalogSnapshot().entries).toContainEqual(expect.objectContaining({ id: "fixture.thinking-bar.local" }));
  });

  it("rejects emitted CSS selectors that escape the module namespace", () => {
    const fixture: SlotScopedStyleModule = {
      manifest: {
        id: "fixture.thinking-bar.unsafe",
        slot: "thinking-bar",
        version: "1.0.0",
        displayName: "Unsafe Timer",
        description: "A test-only timer module",
        namespace: "fixture-thinking-bar-unsafe",
        assetPaths: [],
        cssSelectors: [".fixture-thinking-bar-unsafe__root"],
      },
      renderer: {
        renderHtml: () => '<div class="fixture-thinking-bar-unsafe__root"></div>',
        renderCss: () => ".global-reset { color: red; }",
      },
    };

    expect(() => renderValidatedModuleCss(fixture)).toThrow(/scoped beneath/i);
  });

  it("rejects emitted global keyframes from custom modules", () => {
    const fixture: SlotScopedStyleModule = {
      manifest: {
        id: "fixture.thinking-bar.keyframes",
        slot: "thinking-bar",
        version: "1.0.0",
        displayName: "Keyframe Timer",
        description: "A test-only timer module",
        namespace: "fixture-thinking-bar-keyframes",
        assetPaths: [],
        cssSelectors: [".fixture-thinking-bar-keyframes__root"],
      },
      renderer: {
        renderHtml: () => '<div class="fixture-thinking-bar-keyframes__root"></div>',
        renderCss: () => `
          .fixture-thinking-bar-keyframes__root { animation: pulse 1s; }
          @keyframes pulse { from { opacity: 0; } to { opacity: 1; } }
        `,
      },
    };

    expect(() => renderValidatedModuleCss(fixture)).toThrow(/keyframe/i);
  });

  it("keeps built-in legacy CSS renderable while validating its module manifest", () => {
    const glossyArcade = BUILT_IN_STYLE_MODULES.find((module) => module.manifest.id === "glossy_arcade");
    const candyRays = BUILT_IN_STYLE_MODULES.find((module) => module.manifest.id === "candy_rays");

    expect(glossyArcade).toBeDefined();
    expect(candyRays).toBeDefined();
    expect(renderValidatedModuleCss(glossyArcade!)).toContain(".answer-card::before");
    expect(renderValidatedModuleCss(glossyArcade!)).not.toContain("@scope");
    expect(renderValidatedModuleCss(candyRays!)).toContain(".bg-gradient {");
  });

  it("derives a deterministic revision from module metadata and CSS content", () => {
    const createFixture = (version: string, color: string): SlotScopedStyleModule => ({
      manifest: {
        id: "fixture.thinking-bar.revision",
        slot: "thinking-bar",
        version,
        displayName: "Revision Timer",
        description: "A test-only timer module",
        namespace: "fixture-thinking-bar-revision",
        assetPaths: [],
        cssSelectors: [".fixture-thinking-bar-revision__root"],
      },
      renderer: {
        renderHtml: () => '<div class="fixture-thinking-bar-revision__root"></div>',
        renderCss: () => `.fixture-thinking-bar-revision__root { color: ${color}; }`,
      },
    });

    const first = createStyleCatalog([createFixture("1.0.0", "red")]).getStyleCatalogSnapshot().revision;
    const same = createStyleCatalog([createFixture("1.0.0", "red")]).getStyleCatalogSnapshot().revision;
    const changed = createStyleCatalog([createFixture("1.0.1", "blue")]).getStyleCatalogSnapshot().revision;

    expect(first).toBe(same);
    expect(changed).not.toBe(first);
  });

  it("protects catalog snapshots and entries from runtime mutation", () => {
    const catalog = createStyleCatalog(BUILT_IN_STYLE_MODULES);
    const snapshot = catalog.getStyleCatalogSnapshot();
    const entry = catalog.getStyleCatalogEntry("thinking-bar", "energy_laser");

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.entries)).toBe(true);
    expect(Object.isFrozen(entry)).toBe(true);

    expect(Reflect.set(snapshot.entries[0] as object, "id", "mutated")).toBe(false);
    expect(Reflect.set(entry as object, "id", "mutated")).toBe(false);

    expect(catalog.getStyleCatalogEntry("thinking-bar", "energy_laser")?.id).toBe("energy_laser");
  });
});

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
});

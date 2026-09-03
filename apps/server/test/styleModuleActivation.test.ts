import { describe, expect, it } from "vitest";
import { StyleActivationManager } from "../src/quiz/visual/styleModules/activation.js";
import type { SlotScopedStyleModule } from "../src/quiz/visual/styleModules/types.js";

function module(id: string, css = ".fixture-thinking-bar__root { color: red; }"): SlotScopedStyleModule {
  return {
    manifest: {
      id,
      slot: "thinking-bar",
      version: "1.0.0",
      displayName: id,
      description: "Fixture module",
      namespace: "fixture-thinking-bar",
      assetPaths: [],
      cssSelectors: [".fixture-thinking-bar__root"],
    },
    renderer: { renderHtml: () => '<div class="fixture-thinking-bar__root"></div>', renderCss: () => css },
  };
}

describe("style activation", () => {
  it("keeps the active snapshot unchanged when validation fails", () => {
    const manager = new StyleActivationManager();
    const before = manager.getActiveSnapshot();
    manager.createDraft(module("fixture.thinking-bar.bad", "body { color: red; }"));
    expect(() => manager.activateDraft("thinking-bar", "fixture.thinking-bar.bad")).toThrow(/scoped|selector/i);
    expect(manager.getActiveSnapshot().revision).toBe(before.revision);
  });

  it("activates one module independently and pins earlier revisions", () => {
    const manager = new StyleActivationManager();
    const first = manager.stageAndActivate(module("fixture.thinking-bar.one"));
    const second = manager.stageAndActivate(module("fixture.thinking-bar.two", ".fixture-thinking-bar__root { color: blue; }"));
    expect(second.revision).not.toBe(first.revision);
    expect(manager.getSnapshot(first.revision)?.catalog.entries.some((entry) => entry.id === "fixture.thinking-bar.two")).toBe(false);
    expect(manager.resolveModule("thinking-bar", "fixture.thinking-bar.one", first.revision)?.manifest.id).toBe("fixture.thinking-bar.one");
  });

  it("keeps the active pointer correct when a prior revision is restored", () => {
    const manager = new StyleActivationManager();
    const first = manager.stageAndActivate(module("fixture.thinking-bar.restore", ".fixture-thinking-bar__root { color: red; }"));
    manager.stageAndActivate(module("fixture.thinking-bar.restore", ".fixture-thinking-bar__root { color: blue; }"));
    const restored = manager.stageAndActivate(module("fixture.thinking-bar.restore", ".fixture-thinking-bar__root { color: red; }"));
    expect(restored.revision).toBe(first.revision);
    expect(manager.getActiveSnapshot().revision).toBe(first.revision);
  });
});

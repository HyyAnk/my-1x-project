import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { StyleActivationManager, styleActivationManager } from "../src/quiz/visual/styleModules/activation.js";
import type { SlotScopedStyleModule } from "../src/quiz/visual/styleModules/types.js";
import { resolveQuizSceneElementStyles } from "../src/quiz/render/scene/quizSceneStyles.js";

function module(id: string, css = ".fixture-thinking-bar__root { color: red; }"): SlotScopedStyleModule {
  const namespace = `fixture-${id.split(".").at(-1)}-thinking-bar`;
  const scopedCss = css.replaceAll(".fixture-thinking-bar", `.${namespace}`);
  return {
    manifest: {
      id,
      slot: "thinking-bar",
      version: "1.0.0",
      displayName: id,
      description: "Fixture module",
      namespace,
      assetPaths: [],
      cssSelectors: [`.${namespace}__root`],
    },
    renderer: {
      id: id as never,
      displayName: id,
      description: "Fixture module",
      renderHtml: () => `<div class="${namespace}__root"></div>`,
      renderCss: () => scopedCss,
    },
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

  it("persists active modules and historical revisions across manager restarts", () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "style-manager-"));
    const statePath = path.join(directory, "state.json");
    try {
      const firstManager = new StyleActivationManager(false, statePath);
      const first = firstManager.stageAndActivate(module("fixture.thinking-bar.persist", ".fixture-thinking-bar__root { color: red; }"));
      firstManager.stageAndActivate(module("fixture.thinking-bar.persist", ".fixture-thinking-bar__root { color: blue; }"));

      const restarted = new StyleActivationManager(false, statePath);
      expect(restarted.resolveModule("thinking-bar", "fixture.thinking-bar.persist")?.renderer.renderCss()).toContain("blue");
      expect(restarted.resolveModule("thinking-bar", "fixture.thinking-bar.persist", first.revision)?.renderer.renderCss()).toContain("red");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("stages a validated draft without activating it", () => {
    const manager = new StyleActivationManager();
    const before = manager.getActiveSnapshot().revision;
    const draft = manager.stageDraft(module("fixture.thinking-bar.staged"));
    expect(draft.state).toBe("validated");
    expect(manager.getActiveSnapshot().revision).toBe(before);
    expect(() => manager.activateDraft("thinking-bar", "fixture.thinking-bar.staged")).not.toThrow();
  });

  it("changes revision when HTML or assets change", () => {
    const manager = new StyleActivationManager();
    const base = manager.stageAndActivate(module("fixture.thinking-bar.payload"));
    const htmlChanged = manager.stageAndActivate({
      ...module("fixture.thinking-bar.payload"),
      renderer: { renderHtml: () => '<div class="fixture-payload-thinking-bar__root">changed</div>', renderCss: () => ".fixture-payload-thinking-bar__root { color: red; }" },
    });
    expect(htmlChanged.revision).not.toBe(base.revision);
  });

  it("resolves a namespaced custom module through the scene style resolver", () => {
    const custom = module("fixture.thinking-bar.scene");
    styleActivationManager.stageAndActivate(custom);
    const resolved = resolveQuizSceneElementStyles({ thinkingBar: custom.manifest.id as never });
    expect(resolved.thinkingBar).toBe(custom.manifest.id);
  });
});

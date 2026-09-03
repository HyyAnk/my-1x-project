import { describe, expect, it } from "vitest";
import {
  StyleModuleManifestSchema,
  type StyleModuleManifest,
  type StyleSlot,
} from "../src/quiz/visual/styleModules/manifestSchema.js";
import type {
  StyleModuleRenderer,
  ThinkingBarStyleModule,
} from "../src/quiz/visual/styleModules/types.js";

const validManifest: StyleModuleManifest = {
  id: "studio.thinking-bar.countdown",
  slot: "thinking-bar",
  version: "1.0.0",
  displayName: "Countdown",
  description: "A compact countdown bar",
  namespace: "studio-thinking-bar-countdown",
  assetPaths: ["styles/countdown.css", "preview/countdown.png"],
  cssSelectors: [".studio-thinking-bar-countdown__root"],
};

describe("StyleModuleManifestSchema", () => {
  it("rejects an unknown slot", () => {
    const result = StyleModuleManifestSchema.safeParse({ ...validManifest, slot: "header" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid namespaced id", () => {
    const result = StyleModuleManifestSchema.safeParse({ ...validManifest, id: "studio.thinking-bar" });
    expect(result.success).toBe(false);
  });

  it("rejects an unsafe asset path", () => {
    const result = StyleModuleManifestSchema.safeParse({
      ...validManifest,
      assetPaths: ["styles/../global.css"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a manifest without a version", () => {
    const manifest = { ...validManifest } as Record<string, unknown>;
    delete manifest.version;
    const result = StyleModuleManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it("rejects metadata that declares a global CSS selector", () => {
    const result = StyleModuleManifestSchema.safeParse({
      ...validManifest,
      cssSelectors: ["body", ".studio-thinking-bar-countdown__root"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid namespaced manifest and legacy built-in ID", () => {
    expect(StyleModuleManifestSchema.safeParse(validManifest).success).toBe(true);
    expect(StyleModuleManifestSchema.safeParse({ ...validManifest, id: "energy_laser" }).success).toBe(true);
  });
});

describe("slot-scoped renderer contracts", () => {
  it("passes Thinking Bar timing values through unchanged", () => {
    let received: { clipStart: number; revealStart: number; thinkingStart: number; duration: number } | undefined;
    const renderer: StyleModuleRenderer<{
      clipStart: number;
      revealStart: number;
      thinkingStart: number;
      duration: number;
    }> = {
      renderHtml: (context) => {
        received = context;
        return "<div></div>";
      },
      renderCss: () => ".studio-thinking-bar-countdown__root {}",
    };
    const module: ThinkingBarStyleModule = {
      manifest: validManifest,
      renderer,
    };

    module.renderer.renderHtml({
      clipStart: 1.25,
      revealStart: 8.5,
      thinkingStart: 3.75,
      duration: 7.25,
    });

    expect(received).toEqual({
      clipStart: 1.25,
      revealStart: 8.5,
      thinkingStart: 3.75,
      duration: 7.25,
    });
  });

  it("keeps the slot type explicit", () => {
    const slot: StyleSlot = "thinking-bar";
    expect(slot).toBe("thinking-bar");
  });
});

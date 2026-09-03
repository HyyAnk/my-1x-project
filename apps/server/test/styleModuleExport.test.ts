import { describe, expect, it } from "vitest";
import { exportStyleModulePackage, exportStylePresetPackage, importStyleModulePackage, importStylePresetPackage } from "../src/quiz/visual/styleModules/exportPackage.js";
import type { SlotScopedStyleModule } from "../src/quiz/visual/styleModules/types.js";

const fixture = (assetPaths: string[] = []): SlotScopedStyleModule => ({
  manifest: {
    id: "fixture.thinking-bar.package",
    slot: "thinking-bar",
    version: "1.0.0",
    displayName: "Package Timer",
    description: "Package fixture",
    namespace: "fixture-thinking-bar-package",
    assetPaths,
    cssSelectors: [".fixture-thinking-bar-package__root"],
  },
  renderer: {
    renderHtml: () => '<div class="fixture-thinking-bar-package__root"></div>',
    renderCss: () => ".fixture-thinking-bar-package__root { color: red; }",
  },
});

describe("style module packages", () => {
  it("round-trips a module and rejects duplicate IDs", () => {
    const exported = exportStyleModulePackage(fixture());
    const imported = importStyleModulePackage(exported.zipBuffer);
    expect(imported.manifest.id).toBe("fixture.thinking-bar.package");
    expect(() => importStyleModulePackage(exported.zipBuffer, { existingIds: [imported.manifest.id] })).toThrow(/Duplicate/);
  });

  it("rejects missing required assets", () => {
    const exported = exportStyleModulePackage({
      ...fixture(["preview.png"]),
      assets: { "preview.png": Buffer.from("asset") },
    } as SlotScopedStyleModule & { assets: Record<string, Uint8Array> });
    const imported = importStyleModulePackage(exported.zipBuffer);
    expect(imported.assets?.["preview.png"]).toBeDefined();
  });

  it("round-trips a selected preset configuration without internal revision metadata", () => {
    const exported = exportStylePresetPackage({
      id: "preset_fixture",
      name: "Fixture Preset",
      description: "Export fixture",
      icon: "🎨",
      palette_id: "aqua",
      theme: "candy_arcade",
      thinking_bar_style: "energy_laser",
      question_box_style: "glass_morphism",
      answer_card_style: "glass_neon",
      counter_style: "neon_badge",
      background_style: "aurora_glow",
      revision: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const imported = importStylePresetPackage(exported.zipBuffer);
    expect(imported).toMatchObject({ name: "Fixture Preset", thinking_bar_style: "energy_laser" });
    expect(imported).not.toHaveProperty("revision");
  });
});

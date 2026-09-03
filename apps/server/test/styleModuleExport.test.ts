import { describe, expect, it } from "vitest";
import {
  exportStyleModulePackage,
  exportStylePresetPackage,
  importStyleModulePackage,
  importStylePresetPackage,
} from "../src/quiz/visual/styleModules/exportPackage.js";
import { createZipArchive } from "../src/quiz/zipHelper.js";
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
    expect(imported.renderer.id).toBe(imported.manifest.id);
    expect(imported.renderer.displayName).toBe(imported.manifest.displayName);
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

  it("rejects duplicate and unsafe preset package entries", () => {
    const packageJson = JSON.stringify({ packageVersion: 1, kind: "preset" });
    const presetJson = JSON.stringify({
      name: "Fixture",
      palette_id: "aqua",
      theme: "candy_arcade",
      thinking_bar_style: "energy_laser",
      question_box_style: "glass_morphism",
      answer_card_style: "glass_neon",
      counter_style: "neon_badge",
      background_style: "aurora_glow",
    });
    const duplicate = createZipArchive([
      { filename: "package.json", data: Buffer.from(packageJson) },
      { filename: "preset.json", data: Buffer.from(presetJson) },
      { filename: "preset.json", data: Buffer.from(presetJson) },
    ]);
    expect(() => importStylePresetPackage(duplicate)).toThrow(/Duplicate/);

    const unsafe = createZipArchive([
      { filename: "package.json", data: Buffer.from(packageJson) },
      { filename: "../preset.json", data: Buffer.from(presetJson) },
    ]);
    expect(() => importStylePresetPackage(unsafe)).toThrow(/Unsafe/);
  });

  it("preserves context-aware Thinking Bar templates through export/import", () => {
    const source = {
      ...fixture(),
      renderer: {
        ...fixture().renderer,
        renderTemplate: '<div class="fixture-thinking-bar-package__root" data-duration="{{duration}}" data-start="{{clipStart}}"></div>',
        renderHtml: (context: { duration?: number; clipStart?: number }) =>
          `<div class="fixture-thinking-bar-package__root" data-duration="${context.duration ?? ""}" data-start="${context.clipStart ?? ""}"></div>`,
      },
    } as SlotScopedStyleModule;
    const imported = importStyleModulePackage(exportStyleModulePackage(source).zipBuffer);
    expect(imported.renderer.renderHtml({ duration: 8.5, clipStart: 1.25 } as never)).toContain('data-duration="8.5"');
    expect(imported.renderer.renderHtml({ duration: 8.5, clipStart: 1.25 } as never)).toContain('data-start="1.25"');
  });

  it("rejects context-dependent renderers without a portable template", () => {
    const dynamic = {
      ...fixture(),
      renderer: {
        ...fixture().renderer,
        renderHtml: (context: { question?: string }) => `<div>${context.question ?? ""}</div>`,
      },
    } as SlotScopedStyleModule;
    expect(() => exportStyleModulePackage(dynamic)).toThrow(/portable renderTemplate/i);
  });

  it("rejects visual-opportunity-dependent Question Box renderers without a portable template", () => {
    const dynamic = {
      manifest: {
        ...fixture().manifest,
        id: "fixture.question-box.visual-opportunity",
        slot: "question-box",
        namespace: "fixture-question-box-visual-opportunity",
        cssSelectors: [".fixture-question-box-visual-opportunity__root"],
      },
      renderer: {
        renderHtml: (context: { visualOpportunity?: string }) =>
          `<div class="fixture-question-box-visual-opportunity__root">${context.visualOpportunity ?? ""}</div>`,
        renderCss: () => ".fixture-question-box-visual-opportunity__root { color: red; }",
      },
    } as SlotScopedStyleModule;

    expect(() => exportStyleModulePackage(dynamic)).toThrow(/portable renderTemplate/i);
  });

  it("round-trips escaped nested palette values in a Background render template", () => {
    const source = {
      manifest: {
        ...fixture().manifest,
        id: "fixture.background.palette-template",
        slot: "background",
        namespace: "fixture-background-palette-template",
        cssSelectors: [".fixture-background-palette-template__root"],
      },
      renderer: {
        renderTemplate:
          '<div class="fixture-background-palette-template__root" data-palette="{{palette.id}}" data-primary="{{palette.backgroundPrimary}}" data-secondary="{{palette.backgroundSecondary}}" data-accent="{{palette.accent}}" data-surface-accent="{{palette.surfaceAccent}}" data-on-accent="{{palette.onAccent}}" data-answer-badge="{{palette.answerBadge}}" data-correct="{{palette.correct}}" data-incorrect="{{palette.incorrect}}" data-surface="{{palette.surface}}" data-text="{{palette.text}}" data-muted="{{palette.muted}}"></div>',
        renderHtml: () => '<div class="fixture-background-palette-template__root"></div>',
        renderCss: () => ".fixture-background-palette-template__root { color: red; }",
      },
    } as SlotScopedStyleModule;

    const imported = importStyleModulePackage(exportStyleModulePackage(source).zipBuffer);
    const rendered = imported.renderer.renderHtml({
      palette: {
        id: "aqua",
        backgroundPrimary: "#111111",
        backgroundSecondary: "#222222",
        accent: "#333333",
        surfaceAccent: "#444444",
        onAccent: "#555555",
        answerBadge: "#666666",
        correct: "#777777",
        incorrect: "#888888",
        surface: "#999999",
        text: "Ada's <ink>",
        muted: "#AAAAAA",
      },
    } as never);

    expect(rendered).toContain('data-palette="aqua"');
    expect(rendered).toContain('data-primary="#111111"');
    expect(rendered).toContain('data-secondary="#222222"');
    expect(rendered).toContain('data-accent="#333333"');
    expect(rendered).toContain('data-surface-accent="#444444"');
    expect(rendered).toContain('data-on-accent="#555555"');
    expect(rendered).toContain('data-answer-badge="#666666"');
    expect(rendered).toContain('data-correct="#777777"');
    expect(rendered).toContain('data-incorrect="#888888"');
    expect(rendered).toContain('data-surface="#999999"');
    expect(rendered).toContain('data-text="Ada&#39;s &lt;ink&gt;"');
    expect(rendered).toContain('data-muted="#AAAAAA"');
  });

  it("preserves trusted highlighted markup and escapes apostrophes in template values", () => {
    const source = {
      ...fixture(),
      renderer: {
        ...fixture().renderer,
        renderTemplate: '<div data-question="{{question}}">{{highlightedHtml}}</div>',
        renderHtml: (context: { question?: string; highlightedHtml?: string }) =>
          `<div data-question="${context.question ?? ""}">${context.highlightedHtml ?? ""}</div>`,
      },
    } as SlotScopedStyleModule;
    const imported = importStyleModulePackage(exportStyleModulePackage(source).zipBuffer);
    const rendered = imported.renderer.renderHtml({
      question: "Ada's quiz",
      highlightedHtml: '<strong class="keyword-highlight">Ada</strong>',
    } as never);
    expect(rendered).toContain("Ada&#39;s quiz");
    expect(rendered).toContain('<strong class="keyword-highlight">Ada</strong>');
  });

  it("rejects unsupported template tokens on import", () => {
    const packageJson = JSON.stringify({ packageVersion: 1, kind: "module" });
    const manifest = JSON.stringify(fixture().manifest);
    const archive = createZipArchive([
      { filename: "package.json", data: Buffer.from(packageJson) },
      { filename: "manifest.json", data: Buffer.from(manifest) },
      { filename: "style.css", data: Buffer.from(".fixture-thinking-bar-package__root { color: red; }") },
      { filename: "module.html", data: Buffer.from("<div>{{notAllowed}}</div>") },
    ]);
    expect(() => importStyleModulePackage(archive)).toThrow(/Unsupported style template field/i);
  });
});

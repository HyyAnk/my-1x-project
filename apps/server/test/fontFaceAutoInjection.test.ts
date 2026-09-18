import { describe, expect, it } from "vitest";
import {
  autoInjectFontFaces,
  candyArcadeSystemFontFaceCss,
  extractDeclaredFontFaceFamilies,
  extractUsedFontFamilies,
  formatSystemFontFace,
  injectFontFacesIntoHtml,
  KNOWN_SYSTEM_FONTS,
} from "../src/quiz/render/candyArcade/candyArcadeFontFaceInjection.js";

describe("HyperFrames font-face declaration auto-injection", () => {
  it("formats system font-face with canonical and normalized lowercase declarations", () => {
    const css = formatSystemFontFace("Titan One");
    expect(css).toContain('font-family: "Titan One"');
    expect(css).toContain('font-family: "titan one"');
    expect(css).toContain('src: local("Titan One")');
    expect(css).toContain("font-display: swap");
  });

  it("extracts declared font-face families case-insensitively", () => {
    const sampleCss = `
      @font-face {
        font-family: "Fredoka";
        src: url("./fonts/Fredoka.ttf");
      }
      @font-face {
        font-family: 'SVN-Hello Headline';
        src: url("./fonts/SVN-Hello.otf");
      }
    `;
    const declared = extractDeclaredFontFaceFamilies(sampleCss);
    expect(declared.has("fredoka")).toBe(true);
    expect(declared.has("svn-hello headline")).toBe(true);
    expect(declared.has("titan one")).toBe(false);
  });

  it("extracts undeclared font families while ignoring generic CSS keywords and var fallbacks", () => {
    const css = `
      .title { font-family: "Titan One", cursive, sans-serif; }
      .badge { font-family: var(--font-display, "Comic Sans MS", "Bangers", sans-serif); }
      .code { font-family: monospace; }
      .custom { font-family: "Quicksand", inherit; }
    `;
    const used = extractUsedFontFamilies(css);
    expect(used).toContain("Titan One");
    expect(used).toContain("Comic Sans MS");
    expect(used).toContain("Bangers");
    expect(used).toContain("Quicksand");
    expect(used).not.toContain("cursive");
    expect(used).not.toContain("sans-serif");
    expect(used).not.toContain("monospace");
    expect(used).not.toContain("inherit");
  });

  it("generates system font-face declarations for all known system fonts", () => {
    const systemCss = candyArcadeSystemFontFaceCss();
    for (const font of KNOWN_SYSTEM_FONTS) {
      expect(systemCss).toContain(`font-family: "${font.family}"`);
      expect(systemCss).toContain(`src: local("${font.localName}")`);
    }
  });

  it("auto-injects missing font-faces into CSS without duplicating existing declarations", () => {
    const baseCss = `
      @font-face {
        font-family: "Titan One";
        src: local("Titan One");
      }
      .card { font-family: "Titan One", "Impact", sans-serif; }
    `;
    const injected = autoInjectFontFaces(baseCss);
    expect(injected).toContain('font-family: "Impact"');
    // Titan One was already declared in baseCss, so autoInjectFontFaces shouldn't duplicate its @font-face
    const fontFaceCountTitanOne = (injected.match(/@font-face\s*\{[^}]*Titan One/g) || []).length;
    expect(fontFaceCountTitanOne).toBe(1);
  });

  it("injects font-face declarations into HTML style block", () => {
    const html = `<!doctype html><html><head><style>.btn { font-family: "Bangers", cursive; }</style></head><body></body></html>`;
    const updatedHtml = injectFontFacesIntoHtml(html);
    expect(updatedHtml).toContain("@font-face");
    expect(updatedHtml).toContain('font-family: "Bangers"');
    expect(updatedHtml).toContain('src: local("Bangers")');
  });

  it("injects a style block into head if no style block is present in HTML", () => {
    const html = `<!doctype html><html><head><title>Test</title></head><body></body></html>`;
    const updatedHtml = injectFontFacesIntoHtml(html);
    expect(updatedHtml).toContain("<style>");
    expect(updatedHtml).toContain('font-family: "Titan One"');
    expect(updatedHtml).toContain("</style>");
  });
});

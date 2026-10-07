import { describe, expect, it } from "vitest";
import {
  buildOfflineMotionBundle,
  generateBadgePath,
  generateMotionCssVariables,
  generateStarPath,
  interpolatePolygonPoints,
  lerpPoint,
  pointsToSvgPath,
  scopeMotionMarkup,
} from "../src/quiz/render/motion/index.js";

describe("Motion Bundler - SVG Morph & Geometric Paths", () => {
  it("interpolates 2D points accurately", () => {
    const p1 = { x: 0, y: 10 };
    const p2 = { x: 100, y: 50 };
    const mid = lerpPoint(p1, p2, 0.5);
    expect(mid.x).toBe(50);
    expect(mid.y).toBe(30);
  });

  it("generates closed SVG star paths with expected structure", () => {
    const star = generateStarPath(100, 100, 5, 50, 25);
    expect(star.startsWith("M")).toBe(true);
    expect(star.endsWith("Z")).toBe(true);
    expect(star).toContain("L");
  });

  it("generates closed SVG badge paths with expected sides", () => {
    const hex = generateBadgePath(50, 50, 30, 6);
    expect(hex.startsWith("M")).toBe(true);
    expect(hex.endsWith("Z")).toBe(true);
    const lineCount = (hex.match(/L/g) || []).length;
    expect(lineCount).toBe(5); // 1 M point + 5 L points = 6 vertices
  });

  it("morphs polygon point arrays smoothly", () => {
    const shapeA = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const shapeB = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
    ];
    const morphed = interpolatePolygonPoints(shapeA, shapeB, 0.5);
    expect(morphed[1].x).toBe(15);
    expect(morphed[2].y).toBe(15);

    const pathString = pointsToSvgPath(morphed);
    expect(pathString).toBe("M 0.00 0.00 L 15.00 0.00 L 15.00 15.00 Z");
  });
});

describe("Motion Bundler - Asset Isolation & Theming", () => {
  it("generates theme CSS variables with computed RGB glow", () => {
    const css = generateMotionCssVariables({
      primaryColor: "#FF0000",
      accentColor: "#00FF00",
    });
    expect(css).toContain("--motion-primary: #FF0000;");
    expect(css).toContain("--motion-accent: #00FF00;");
    expect(css).toContain("rgba(0, 255, 0, 0.45)");
  });

  it("scopes IDs and internal URL references cleanly", () => {
    const input = `<svg><defs><linearGradient id="grad1"></linearGradient></defs><rect fill="url(#grad1)"/></svg>`;
    const scoped = scopeMotionMarkup(input, "clipA");
    expect(scoped).toContain('id="clipA-grad1"');
    expect(scoped).toContain('fill="url(#clipA-grad1)"');
  });
});

describe("Motion Bundler - Offline Bundle Generation", () => {
  it("creates a self-contained bundle with zero external network dependencies", () => {
    const bundle = buildOfflineMotionBundle({
      theme: { accentColor: "#00E5FF" },
      extraStyles: ".custom-class { opacity: 0.9; }",
    });

    expect(bundle.styles).toContain("--motion-accent: #00E5FF;");
    expect(bundle.styles).toContain(".custom-class");
    expect(bundle.script).toContain("window.__motionSeek");
    expect(bundle.svgDefs).toContain("motion-grad-primary");

    // Must not contain external http/https CDN references
    expect(bundle.styles).not.toContain("http://");
    expect(bundle.styles).not.toContain("https://");
    expect(bundle.script).not.toContain("http://");
    expect(bundle.script).not.toContain("https://");
  });
});

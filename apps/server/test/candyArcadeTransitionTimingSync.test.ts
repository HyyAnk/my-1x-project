import { describe, expect, it } from "vitest";
import { candyArcadeBrandLogoStingerStylesCss } from "../src/quiz/render/candyArcade/styles/candyArcadeBrandLogoStingerStyles.js";
import { candyArcadeEnergyWhipStylesCss } from "../src/quiz/render/candyArcade/styles/candyArcadeEnergyWhipStyles.js";
import { candyArcadeStageCss } from "../src/quiz/render/candyArcade/styles/candyArcadeStageStyles.js";

describe("Phase 1: Transition CSS Timing & Synchronization Verification", () => {
  describe("Brand Logo Stinger CSS Keyframe Delays", () => {
    const css = candyArcadeBrandLogoStingerStylesCss();

    it("binds var(--clip-start, 0s) delay and both fill-mode to all primary velocity slashes", () => {
      expect(css).toMatch(
        /\.brand-stinger-slash\.slash-primary[\s\S]*?animation:\s*stinger-slash-primary[^;]*var\(--clip-start,\s*0s\)[^;]*both;/,
      );
      expect(css).toMatch(
        /\.brand-stinger-slash\.slash-secondary[\s\S]*?animation:\s*stinger-slash-secondary[^;]*calc\(var\(--clip-start,\s*0s\)\s*\+\s*0\.02s\)[^;]*both;/,
      );
      expect(css).toMatch(
        /\.brand-stinger-slash\.slash-accent[\s\S]*?animation:\s*stinger-slash-accent[^;]*calc\(var\(--clip-start,\s*0s\)\s*\+\s*0\.04s\)[^;]*both;/,
      );
    });

    it("binds var(--clip-start, 0s) delay and both fill-mode to flash burst, logo content, and shimmer", () => {
      expect(css).toMatch(
        /\.brand-stinger-flash[\s\S]*?animation:\s*stinger-flash-burst[^;]*var\(--clip-start,\s*0s\)[^;]*both;/,
      );
      expect(css).toMatch(
        /\.brand-stinger-content[\s\S]*?animation:\s*stinger-content-stage[^;]*var\(--clip-start,\s*0s\)[^;]*both;/,
      );
      expect(css).toMatch(
        /\.brand-stinger-shimmer[\s\S]*?animation:\s*stinger-shimmer-sweep[^;]*var\(--clip-start,\s*0s\)[^;]*both;/,
      );
      expect(css).toMatch(
        /\.brand-stinger-sparkle[\s\S]*?animation:\s*stinger-sparkle-spin[^;]*var\(--clip-start,\s*0s\)[^;]*both;/,
      );
    });

    it("ensures stinger glow pulse has clip-start delay", () => {
      expect(css).toMatch(
        /\.brand-badge-ring\.brand-badge-glow[\s\S]*?animation:\s*stinger-glow-pulse[^;]*var\(--clip-start,\s*0s\)/,
      );
    });
  });

  describe("Arcade Energy Whip CSS Keyframe Delays", () => {
    const css = candyArcadeEnergyWhipStylesCss();

    it("binds var(--clip-start, 0s) delay and both fill-mode to whip slashes and flash burst", () => {
      expect(css).toMatch(
        /\.energy-whip-slash\.slash-primary[\s\S]*?animation:\s*whip-slash-primary[^;]*var\(--clip-start,\s*0s\)[^;]*both;/,
      );
      expect(css).toMatch(
        /\.energy-whip-slash\.slash-secondary[\s\S]*?animation:\s*whip-slash-secondary[^;]*var\(--clip-start,\s*0s\)[^;]*both;/,
      );
      expect(css).toMatch(
        /\.energy-whip-slash\.slash-accent[\s\S]*?animation:\s*whip-slash-accent[^;]*var\(--clip-start,\s*0s\)[^;]*both;/,
      );
      expect(css).toMatch(
        /\.energy-whip-flash[\s\S]*?animation:\s*whip-flash-burst[^;]*var\(--clip-start,\s*0s\)[^;]*both;/,
      );
    });

    it("binds clip-start staggered delays to horizontal speed lines and spark pops", () => {
      expect(css).toMatch(/\.whip-line\.wl-1[\s\S]*?calc\(var\(--clip-start,\s*0s\)\s*\+\s*0\.05s\)/);
      expect(css).toMatch(/\.whip-spark\.ws-1[\s\S]*?calc\(var\(--clip-start,\s*0s\)\s*\+\s*0\.35s\)/);
    });
  });

  describe("Subcomposition Mount Stacking Context Safeguard", () => {
    it("declares .sub-composition.candy-transition with z-index: 900 and pointer-events: none in stage styles", () => {
      const stageCss = candyArcadeStageCss();
      expect(stageCss).toContain(".sub-composition.candy-transition { position: absolute; inset: 0; pointer-events: none; z-index: 900; }");
    });
  });
});

describe("Phase 2: Visual Geometry & Multi-Ribbon Kinetic Easing Overhaul Verification", () => {
  describe("Energy Whip Geometric Ribbon Hierarchy", () => {
    const css = candyArcadeEnergyWhipStylesCss();

    it("ensures primary slash acts as full curtain while secondary and accent act as distinct ribbons", () => {
      expect(css).toMatch(/\.energy-whip-slash\.slash-primary[\s\S]*?inset:\s*-60%;/);
      expect(css).toMatch(/\.energy-whip-slash\.slash-secondary[\s\S]*?width:\s*380px;/);
      expect(css).toMatch(/\.energy-whip-slash\.slash-accent[\s\S]*?width:\s*220px;/);
    });

    it("verifies per-keyframe easing decoupling in whip-slash-primary", () => {
      expect(css).toContain("animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);");
      expect(css).toContain("animation-timing-function: cubic-bezier(0.35, 0, 0.15, 1);");
    });

    it("ensures apex flash burst is balanced with max opacity <= 0.75", () => {
      expect(css).toMatch(/@keyframes whip-flash-burst[\s\S]*?47%\s*\{\s*opacity:\s*0\.72;/);
    });
  });

  describe("Brand Logo Stinger Geometric Ribbon Hierarchy", () => {
    const css = candyArcadeBrandLogoStingerStylesCss();

    it("ensures stinger primary curtain and multi-tier ribbon widths", () => {
      expect(css).toMatch(/\.brand-stinger-slash\.slash-primary[\s\S]*?inset:\s*-60%;/);
      expect(css).toMatch(/\.brand-stinger-slash\.slash-secondary[\s\S]*?width:\s*440px;/);
      expect(css).toMatch(/\.brand-stinger-slash\.slash-accent[\s\S]*?width:\s*240px;/);
    });

    it("verifies stinger slashes use linear top-level animation to honor per-keyframe easing", () => {
      expect(css).toMatch(/animation:\s*stinger-slash-primary\s+var\(--trans-dur,\s*1\.3s\)\s+linear\s+var\(--clip-start,\s*0s\)\s+both;/);
      expect(css).toMatch(/animation:\s*stinger-slash-secondary\s+var\(--trans-dur,\s*1\.3s\)\s+linear\s+calc\(var\(--clip-start,\s*0s\)\s*\+\s*0\.02s\)\s+both;/);
      expect(css).toMatch(/animation:\s*stinger-slash-accent\s+var\(--trans-dur,\s*1\.3s\)\s+linear\s+calc\(var\(--clip-start,\s*0s\)\s*\+\s*0\.04s\)\s+both;/);
    });
  });
});


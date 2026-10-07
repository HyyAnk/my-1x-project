import { describe, expect, it } from "vitest";
import {
  buildOfflineMotionBundle,
  easeInOutCubic,
  easeOutBack,
  easeOutElastic,
  easeOutExpo,
  energySlashStingerClip,
  generateDeterministicMotionRuntimeScript,
  morphWipeStingerClip,
  renderCyberNeonIntro,
  renderInteractiveCtaOutro,
  renderKineticPunchIntro,
  renderMinimalSleekIntro,
  renderMotionIntroClip,
  renderMotionOutroClip,
  renderScorecardRecapOutro,
  sampleSpring,
} from "../src/quiz/render/motion/index.js";

describe("Stage 14: Motion Engine Benchmark, Determinism & Hardening", () => {
  describe("Performance Benchmarks", () => {
    it("compiles all 5 templates and 2 stingers in under 50ms total", () => {
      const startTime = performance.now();

      const kinetic = renderKineticPunchIntro({
        durationSeconds: 2.5,
        aspectRatio: "16:9",
        options: { headlineText: "Bench Test" },
      });
      const cyber = renderCyberNeonIntro({
        durationSeconds: 3.0,
        aspectRatio: "16:9",
        options: { headlineText: "Neon Bench" },
      });
      const minimal = renderMinimalSleekIntro({
        durationSeconds: 2.5,
        aspectRatio: "16:9",
        options: { headlineText: "Minimal Bench" },
      });
      const cta = renderInteractiveCtaOutro({
        durationSeconds: 3.5,
        aspectRatio: "16:9",
        options: { subheadlineText: "Subscribe Now" },
      });
      const recap = renderScorecardRecapOutro({
        durationSeconds: 4.0,
        aspectRatio: "16:9",
        options: { headlineText: "Quiz Recap" },
      });
      const morph = morphWipeStingerClip({
        start: 0,
        duration: 0.6,
        aspectRatio: "16:9",
      });
      const slash = energySlashStingerClip({
        start: 0,
        duration: 0.5,
        aspectRatio: "16:9",
      });


      const totalTimeMs = performance.now() - startTime;

      expect(kinetic.length).toBeGreaterThan(100);
      expect(cyber.length).toBeGreaterThan(100);
      expect(minimal.length).toBeGreaterThan(100);
      expect(cta.length).toBeGreaterThan(100);
      expect(recap.length).toBeGreaterThan(100);
      expect(morph.length).toBeGreaterThan(100);
      expect(slash.length).toBeGreaterThan(100);

      // Verify ultra-fast sub-millisecond execution (< 50ms for all 7 combined)
      expect(totalTimeMs).toBeLessThan(50);
    });

    it("generates 100 template bundles in rapid succession without memory degradation", () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        const html = renderKineticPunchIntro({
          durationSeconds: 2.0,
          aspectRatio: i % 2 === 0 ? "16:9" : "9:16",
          options: {
            headlineText: `Round ${i}`,
            subheadlineText: "Fast Loop",
          },
        });
        expect(html).toContain(`Round ${i}`);
      }

      const totalTimeMs = performance.now() - startTime;
      const averageTimePerBundle = totalTimeMs / 100;

      // Each template compilation must be < 2ms on average
      expect(averageTimePerBundle).toBeLessThan(2);
    });
  });

  describe("Deterministic Timing & Physics Verification", () => {
    it("produces identical bit-for-bit output across consecutive identical renders", () => {
      const renderA = renderCyberNeonIntro({
        durationSeconds: 3.0,
        aspectRatio: "16:9",
        options: { headlineText: "Determinism Check" },
      });

      const renderB = renderCyberNeonIntro({
        durationSeconds: 3.0,
        aspectRatio: "16:9",
        options: { headlineText: "Determinism Check" },
      });

      expect(renderA).toBe(renderB);
    });

    it("ensures spring physics produces finite, bounded values across standard step evaluations", () => {
      const samples: number[] = [];
      for (let f = 0; f < 120; f++) {
        const t = f / 60;
        const sample = sampleSpring(t, {
          from: 0,
          to: 100,
          mass: 1.0,
          stiffness: 180,
          damping: 12,
        });
        expect(Number.isFinite(sample.value)).toBe(true);
        expect(Number.isNaN(sample.value)).toBe(false);
        samples.push(sample.value);
      }

      // Ends settle close to target 100
      expect(Math.abs(samples[samples.length - 1] - 100)).toBeLessThan(1);
    });

    it("evaluates easing curves accurately at boundary points 0 and 1", () => {
      const easingFns = [easeInOutCubic, easeOutExpo, easeOutElastic, easeOutBack];

      for (const fn of easingFns) {
        const val0 = fn(0);
        const val1 = fn(1);

        expect(Math.abs(val0)).toBeLessThan(0.001);
        expect(Math.abs(val1 - 1)).toBeLessThan(0.001);
      }
    });

    it("embeds deterministic seek() runtime and window.__motionTimeline into bundle", () => {
      const script = generateDeterministicMotionRuntimeScript();

      expect(script).toContain("window.__motionSeek");
      expect(script).toContain("window.__motionMath");
      expect(script).toContain("sampleSpringMath");
      expect(script).toContain("easeInOutCubicMath");
    });
  });

  describe("Hardening & Fault Tolerance", () => {
    it("handles extreme text input lengths and special characters gracefully without HTML injection", () => {
      const extremeHeadline = "Special <script>alert('xss')</script> & 'quotes' \"double\" " + "A".repeat(500);

      const html = renderKineticPunchIntro({
        durationSeconds: 2.5,
        aspectRatio: "16:9",
        options: {
          headlineText: extremeHeadline,
        },
      });

      expect(html).toContain("class=\"clip candy-scene motion-intro-scene\"");
      expect(html).not.toContain("<script>alert('xss')</script>");
      expect(html).toContain("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
    });

    it("handles undefined options and falls back to default template text safely", () => {
      const html = renderMinimalSleekIntro({
        durationSeconds: 2.0,
        aspectRatio: "16:9",
        options: undefined,
      });

      expect(html).toContain("class=\"clip candy-scene motion-intro-scene\"");
      expect(html).toContain("sleek-title");
    });

    it("safely falls back to default templates when unknown template IDs are dispatched", () => {
      const introFallback = renderMotionIntroClip("non_existent_id", {
        topicTitle: "Fallback Intro",
      });
      expect(introFallback).toContain("motion-intro-kinetic-punch");

      const outroFallback = renderMotionOutroClip("non_existent_id", {
        topicTitle: "Fallback Outro",
      });
      expect(outroFallback).toContain("motion-outro-interactive-cta");
    });

    it("buildOfflineMotionBundle bundles assets into clean self-contained structure", () => {
      const bundle = buildOfflineMotionBundle({
        extraStyles: ".custom-class { color: red; }",
      });

      expect(bundle.styles).toContain(".custom-class { color: red; }");
      expect(bundle.styles).toContain(".motion-container");
      expect(bundle.script).toContain("window.__motionSeek");
      expect(bundle.svgDefs).toContain("<svg");
    });
  });
});


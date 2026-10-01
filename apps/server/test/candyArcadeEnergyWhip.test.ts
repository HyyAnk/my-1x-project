import { describe, it, expect } from "vitest";
import { energyWhipStingerClip } from "../src/quiz/render/candyArcade/transitions/energyWhipStingerClip.js";
import { candyArcadeEnergyWhipStylesCss } from "../src/quiz/render/candyArcade/styles/candyArcadeEnergyWhipStyles.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import { compileIntroStage } from "../src/quiz/timeline/compilers/introCompiler.js";
import { TimelineContext } from "../src/quiz/timeline/compilers/timelineContext.js";
import { timingPolicyForAgeBand } from "@studio/shared";

describe("Arcade Energy Whip Stinger Transition (Bridge CTA -> Question 1)", () => {
  describe("energyWhipStingerClip", () => {
    it("renders valid HTML markup with slashes, speed lines, flash, and 1.2s duration", () => {
      const html = energyWhipStingerClip({
        start: 11.2,
        duration: 1.2,
        aspectRatio: "16:9",
      });

      expect(html).toContain('class="clip candy-transition transition-energy-whip"');
      expect(html).toContain('data-start="11.200"');
      expect(html).toContain('data-duration="1.200"');
      expect(html).toContain('data-track-index="1"');
      expect(html).toContain('data-aspect-ratio="16:9"');
      expect(html).toContain("--whip-dur:1.200s;");
      expect(html).toContain("energy-whip-backdrop");
      expect(html).toContain("energy-whip-slash slash-primary");
      expect(html).toContain("energy-whip-slash slash-secondary");
      expect(html).toContain("energy-whip-slash slash-accent");
      expect(html).toContain("energy-whip-speed-lines");
      expect(html).toContain("energy-whip-flash");
      expect(html).toContain("energy-whip-spark-burst");
    });

    it("supports custom instance ID and theme palette overrides", () => {
      const html = energyWhipStingerClip({
        start: 5.0,
        duration: 1.2,
        instanceId: "custom_whip_test",
        fromColor: "#6366F1",
        toColor: "#F43F5E",
        accentColor: "#F59E0B",
      });

      expect(html).toContain('id="custom_whip_test"');
      expect(html).toContain("--whip-from:#6366F1");
      expect(html).toContain("--whip-to:#F43F5E");
      expect(html).toContain("--whip-accent:#F59E0B");
    });

    it("renders with 9:16 aspect ratio attribute when specified", () => {
      const html = energyWhipStingerClip({
        start: 8.0,
        duration: 1.2,
        aspectRatio: "9:16",
      });

      expect(html).toContain('data-aspect-ratio="9:16"');
    });
  });

  describe("candyArcadeEnergyWhipStylesCss", () => {
    it("generates CSS with required selectors and kinetic keyframes", () => {
      const css = candyArcadeEnergyWhipStylesCss();

      expect(css).toContain(".transition-energy-whip");
      expect(css).toContain(".energy-whip-slash.slash-primary");
      expect(css).toContain(".energy-whip-slash.slash-secondary");
      expect(css).toContain(".energy-whip-slash.slash-accent");
      expect(css).toContain(".energy-whip-speed-lines");
      expect(css).toContain(".energy-whip-flash");
      expect(css).toContain("@keyframes whip-slash-primary");
      expect(css).toContain("@keyframes whip-slash-secondary");
      expect(css).toContain("@keyframes whip-slash-accent");
      expect(css).toContain("@keyframes whip-flash-burst");
      expect(css).toContain("@keyframes whip-speed-line");
      expect(css).toContain("@keyframes whip-spark-pop");
    });

    it("is properly integrated into full candyArcadeCss output", () => {
      const fullCss = candyArcadeCss({ aspectRatio: "16:9" });

      expect(fullCss).toContain(".transition-energy-whip");
      expect(fullCss).toContain("whip-slash-primary");
      expect(fullCss).toContain("whip-flash-burst");
    });
  });

  describe("timeline integration", () => {
    it("schedules bridge_cta_to_question transition and SFX beats when CTA scene completes", () => {
      const ctx = new TimelineContext(timingPolicyForAgeBand("6-8"), {
        intro_cta: 3.0,
      });

      const director = { archetype_family: "arcade_classic", beats: [] } as any;
      const voicePlan = {
        segments: [
          { segment_id: "intro_cta", role: "intro_cta", text: "Subscribe for more!" },
        ],
      } as any;

      compileIntroStage(ctx, director, voicePlan, 0, {
        bridgeConfig: { enabled: true, enableCtaScene: true },
        questionCount: 2,
        channelName: "Test Channel",
      });

      const transitionEvent = ctx.events.find(
        (e) => e.type === "transition.start" && e.payload?.instance_id === "bridge_cta_to_question",
      );

      expect(transitionEvent).toBeDefined();
      expect(transitionEvent?.at_seconds).toBe(3.5);
      expect(transitionEvent?.duration_seconds).toBe(1.2);
      expect(transitionEvent?.payload?.transition_id).toBe("energy_whip");

      const sfxWhoosh = ctx.events.find(
        (e) => e.type === "sfx.play" && e.payload?.name === "energy_whip_whoosh",
      );
      expect(sfxWhoosh).toBeDefined();

      const sfxImpact = ctx.events.find(
        (e) => e.type === "sfx.play" && e.payload?.name === "energy_whip_impact",
      );
      expect(sfxImpact).toBeDefined();
    });
  });
});

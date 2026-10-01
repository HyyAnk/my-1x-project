import { describe, it, expect } from "vitest";
import { bridgeSubscribeCtaClip } from "../src/quiz/render/candyArcade/bridgeSubscribeCtaClip.js";
import { candyArcadeBridgeCtaStylesCss } from "../src/quiz/render/candyArcade/styles/candyArcadeBridgeCtaStyles.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";

describe("Stage 6: CandyArcade Bridge Scene 2 (Subscribe CTA)", () => {
  describe("bridgeSubscribeCtaClip", () => {
    it("renders valid hero action markup with centered Subscribe and Bell widgets", () => {
      const html = bridgeSubscribeCtaClip({
        start: 7.75,
        duration: 3.8,
        channelName: "Felix Gaming",
        ctaMode: "hero_action",
      });

      expect(html).toContain('class="clip candy-scene bridge-cta-scene"');
      expect(html).toContain('data-start="7.750"');
      expect(html).toContain('data-duration="3.800"');
      expect(html).toContain("Felix Gaming");
      expect(html).toContain("bridge-cta-hero-container");
      expect(html).toContain("SUBSCRIBE");
      expect(html).toContain("SUBSCRIBED");
      expect(html).toContain("bridge-cta-bell-icon");
      expect(html).toContain("🔔");
      expect(html).toContain("bridge-cta-cursor");
      expect(html).toContain("bridge-cta-burst");
      expect(html).toContain("bridge-cta-shockwave");
      expect(html).toContain("bridge-cta-bubbles");
      expect(html).toContain("bridge-cta-confetti");
      // Decluttered: No mascot and no distracting card box in hero mode
      expect(html).not.toContain("mascot-cheer");
      expect(html).not.toContain("bridge-cta-card");
    });

    it("renders classic card layout with avatar, badge, and mascot when requested", () => {
      const html = bridgeSubscribeCtaClip({
        start: 5.0,
        duration: 3.0,
        channelName: "Quiz Master",
        badgeText: "JOIN THE SQUAD",
        headlineText: "Don't forget to follow Quiz Master!",
        promptText: "Hit that subscribe button right now!",
        ctaMode: "classic",
      });

      expect(html).toContain("bridge-cta-card");
      expect(html).toContain("bridge-cta-channel-avatar");
      expect(html).toContain(">Q<");
      expect(html).toContain("JOIN THE SQUAD");
      expect(html).toContain("Don&#39;t forget to follow Quiz Master!");
      expect(html).toContain("Hit that subscribe button right now!");
      expect(html).toContain("mascot-cheer");
    });

    it("renders hero action mode and minimal branding classes", () => {
      const html = bridgeSubscribeCtaClip({
        start: 2.0,
        duration: 3.5,
        channelName: "Arcade Master",
        ctaMode: "hero_action",
        minimalBranding: true,
      });

      expect(html).toContain("bridge-cta-mode-hero_action");
      expect(html).toContain("bridge-cta-minimal-branding");
      expect(html).toContain("bridge-cta-ambient-sparkles");
      expect(html).toContain("bridge-cta-bubbles");
    });

    it("renders successfully for 9:16 aspect ratio", () => {
      const html = bridgeSubscribeCtaClip({
        start: 0,
        duration: 3.0,
        channelName: "Shorts Channel",
        aspectRatio: "9:16",
      });

      expect(html).toContain("bridge-cta-scene");
      expect(html).toContain("Shorts Channel");
      expect(html).toContain("bridge-cta-hero-container");
    });
  });

  describe("candyArcadeBridgeCtaStylesCss", () => {
    it("generates CSS with required selectors and interactive keyframes", () => {
      const css = candyArcadeBridgeCtaStylesCss();

      expect(css).toContain(".bridge-cta-scene");
      expect(css).toContain(".bridge-cta-hero-container");
      expect(css).toContain(".bridge-cta-card");
      expect(css).toContain(".bridge-cta-subscribe-button");
      expect(css).toContain(".bridge-cta-bell-button");
      expect(css).toContain(".bridge-cta-cursor");
      expect(css).toContain(".bridge-cta-shockwave");
      expect(css).toContain(".bridge-cta-bubbles");
      expect(css).toContain("@keyframes cta-button-interaction");
      expect(css).toContain("@keyframes cta-label-normal");
      expect(css).toContain("@keyframes cta-label-active");
      expect(css).toContain("@keyframes bell-ring");
      expect(css).toContain("@keyframes cursor-glide-click");
      expect(css).toContain("@keyframes cta-burst-pulse");
      expect(css).toContain("@keyframes shockwave-expand");
      expect(css).toContain("@media (max-aspect-ratio: 1/1)");
    });

    it("is properly integrated into full candyArcadeCss output", () => {
      const fullCss = candyArcadeCss({ aspectRatio: "16:9" });

      expect(fullCss).toContain(".bridge-cta-scene");
      expect(fullCss).toContain("cta-button-interaction");
      expect(fullCss).toContain("bell-ring");
    });

    it("includes minimal branding and mobile 9:16 responsive rules in CSS", () => {
      const css = candyArcadeBridgeCtaStylesCss();
      expect(css).toContain(".bridge-cta-card.bridge-cta-minimal-branding");
      expect(css).toContain("@media (max-aspect-ratio: 1/1)");
      expect(css).toContain("max-width: 94vw");
    });
  });
});

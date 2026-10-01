import { describe, expect, it } from "vitest";
import { brandLogoStingerClip } from "../src/quiz/render/candyArcade/candyArcadeClips.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import { candyArcadeBrandLogoStingerStylesCss } from "../src/quiz/render/candyArcade/styles/index.js";

describe("Phase 3: Brand Logo Stinger Visual Design & Motion Graphics", () => {
  describe("candyArcadeBrandLogoStingerStylesCss", () => {
    it("generates comprehensive GPU-accelerated CSS with all required keyframes", () => {
      const css = candyArcadeBrandLogoStingerStylesCss();

      // CSS Classes
      expect(css).toContain(".transition-brand-logo-stinger");
      expect(css).toContain(".brand-stinger-backdrop");
      expect(css).toContain(".brand-stinger-slash.slash-primary");
      expect(css).toContain(".brand-stinger-slash.slash-secondary");
      expect(css).toContain(".brand-stinger-slash.slash-accent");
      expect(css).toContain(".brand-stinger-flash");
      expect(css).toContain(".brand-stinger-content");
      expect(css).toContain(".brand-stinger-hero-badge");
      expect(css).toContain(".brand-badge-ring.brand-badge-glow");
      expect(css).toContain(".brand-stinger-shockwave-ring");
      expect(css).toContain(".brand-stinger-shimmer");
      expect(css).toContain(".brand-stinger-channel-pill");

      // Keyframes
      expect(css).toContain("@keyframes stinger-slash-primary");
      expect(css).toContain("@keyframes stinger-slash-secondary");
      expect(css).toContain("@keyframes stinger-slash-accent");
      expect(css).toContain("@keyframes stinger-content-stage");
      expect(css).toContain("@keyframes stinger-shockwave-expand");
      expect(css).toContain("@keyframes stinger-flash-burst");
      expect(css).toContain("@keyframes stinger-shimmer-sweep");
      expect(css).toContain("@keyframes stinger-sparkle-spin");
      expect(css).toContain("@keyframes stinger-glow-pulse");

      // Responsive 9:16 selector
      expect(css).toContain('.transition-brand-logo-stinger[data-aspect-ratio="9:16"]');
    });

    it("is automatically included in candyArcadeCss() master stylesheet", () => {
      const fullCss = candyArcadeCss();
      expect(fullCss).toContain(".transition-brand-logo-stinger");
      expect(fullCss).toContain("@keyframes stinger-slash-primary");
      expect(fullCss).toContain("@keyframes stinger-shimmer-sweep");
    });
  });

  describe("brandLogoStingerClip", () => {
    it("renders stinger transition clip with custom logo on track 1", () => {
      const html = brandLogoStingerClip({
        start: 3.5,
        duration: 1.0,
        channelName: "Space Academy",
        hasCustomLogo: true,
        logoUrl: "./brand/space_logo.png",
        fallbackInitial: "S",
        aspectRatio: "16:9",
        fromColor: "#6366F1",
        toColor: "#EC4899",
        accentColor: "#F59E0B",
        showChannelName: true,
      });

      expect(html).toContain('id="bridge-stinger-3500"');
      expect(html).toContain('class="clip candy-transition transition-brand-logo-stinger"');
      expect(html).toContain('data-start="3.500"');
      expect(html).toContain('data-duration="1.000"');
      expect(html).toContain('data-track-index="1"');
      expect(html).toContain('data-aspect-ratio="16:9"');
      expect(html).toContain("--trans-from:#6366F1");
      expect(html).toContain("--trans-to:#EC4899");
      expect(html).toContain("--trans-accent:#F59E0B");

      // Backdrop slashes and shockwaves
      expect(html).toContain("brand-stinger-slash slash-primary");
      expect(html).toContain("brand-stinger-slash slash-secondary");
      expect(html).toContain("brand-stinger-slash slash-accent");
      expect(html).toContain("brand-stinger-shockwave-ring ring-1");
      expect(html).toContain("brand-stinger-shockwave-ring ring-2");
      expect(html).toContain("brand-stinger-flash");

      // Custom logo image
      expect(html).toContain('src="./brand/space_logo.png"');
      expect(html).toContain('alt="Space Academy"');
      expect(html).toContain("brand-stinger-shimmer");

      // Channel pill
      expect(html).toContain("brand-stinger-channel-name");
      expect(html).toContain("Space Academy");
      expect(html).toContain("brand-stinger-sub");
    });

    it("renders stinger transition clip with 3D lettermark fallback badge when hasCustomLogo is false", () => {
      const html = brandLogoStingerClip({
        start: 5.0,
        duration: 1.0,
        channelName: "Galaxy Quiz",
        hasCustomLogo: false,
        fallbackInitial: "G",
        aspectRatio: "9:16",
      });

      expect(html).toContain('data-aspect-ratio="9:16"');
      expect(html).toContain("brand-stinger-fallback-badge");
      expect(html).toContain("brand-lettermark-text");
      expect(html).toContain(">G<");
      expect(html).not.toContain("<img");
      expect(html).toContain("Galaxy Quiz");
    });

    it("escapes special HTML characters in channel name and attributes", () => {
      const html = brandLogoStingerClip({
        start: 0,
        duration: 1.0,
        channelName: 'Channel <Danger> & "Quotes"',
        hasCustomLogo: false,
        fallbackInitial: "C",
      });

      expect(html).not.toContain("<Danger>");
      expect(html).toContain("&lt;Danger&gt;");
      expect(html).toContain("&amp;");
    });

    it("renders clean logo badge without redundant channel name pill by default", () => {
      const html = brandLogoStingerClip({
        start: 3.5,
        duration: 1.3,
        channelName: "Space Academy",
        hasCustomLogo: true,
        logoUrl: "./brand/space_logo.png",
        fallbackInitial: "S",
      });

      expect(html).toContain('src="./brand/space_logo.png"');
      expect(html).not.toContain("brand-stinger-channel-pill");
      expect(html).not.toContain("brand-stinger-channel-name");
    });
  });
});

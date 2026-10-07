import { describe, expect, it } from "vitest";
import { renderCyberNeonIntro } from "../src/quiz/render/motion/index.js";
import { toSubComposition } from "../src/quiz/render/candyArcade/subCompositionParser.js";

describe("Cyber Neon Motion Intro Template", () => {
  it("renders valid clip markup matching Hyperframes subcomposition contract", () => {
    const markup = renderCyberNeonIntro({
      topicTitle: "Retro Gaming Quiz",
      channelName: "Arcade Master",
      durationSeconds: 3.0,
      aspectRatio: "16:9",
    });

    expect(markup.startsWith("<section id=\"motion-intro-cyber-neon\"")).toBe(true);
    expect(markup.endsWith("</section>")).toBe(true);
    expect(markup).toContain('data-start="0"');
    expect(markup).toContain('data-duration="3.000"');
    expect(markup).toContain('data-track-index="0"');
    expect(markup).toContain("Retro Gaming Quiz");
    expect(markup).toContain("Arcade Master");
    expect(markup).toContain("cyber-grid-floor");
    expect(markup).toContain("cyber-scanlines");

    // Subcomposition parse verification
    const subComp = toSubComposition(markup, "16:9");
    expect(subComp.id).toBe("motion-intro-cyber-neon");
    expect(subComp.duration).toBe("3.000");
  });

  it("applies neon colors and custom arcade badges", () => {
    const markup = renderCyberNeonIntro({
      topicTitle: "Level 99 Boss",
      options: {
        accentColor: "#E000FF",
        headlineText: "PLAYER 1 READY",
        showMascot: true,
        customParameters: { primaryColor: "#00FF66" },
      },
      mascotHtml: '<div class="pixel-mascot">Pixel</div>',
    });

    expect(markup).toContain("--neon-cyan: #00FF66;");
    expect(markup).toContain("--neon-magenta: #E000FF;");
    expect(markup).toContain("PLAYER 1 READY");
    expect(markup).toContain("Level 99 Boss");
    expect(markup).toContain("cyber-mascot-slot");
    expect(markup).toContain('<div class="pixel-mascot">Pixel</div>');
  });

  it("handles 9:16 vertical reel aspect ratio cleanly", () => {
    const markup = renderCyberNeonIntro({
      topicTitle: "Vertical Arcade",
      aspectRatio: "9:16",
    });

    const subComp = toSubComposition(markup, "9:16");
    expect(subComp.html).toContain('data-aspect-ratio="9:16"');
    expect(subComp.html).toContain('data-width="1080"');
    expect(subComp.html).toContain('data-height="1920"');
  });
});

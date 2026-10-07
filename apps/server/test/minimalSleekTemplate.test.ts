import { describe, expect, it } from "vitest";
import { renderMinimalSleekIntro } from "../src/quiz/render/motion/index.js";
import { toSubComposition } from "../src/quiz/render/candyArcade/subCompositionParser.js";

describe("Minimal Sleek Motion Intro Template", () => {
  it("renders valid clip markup matching Hyperframes subcomposition contract", () => {
    const markup = renderMinimalSleekIntro({
      topicTitle: "Modern Architecture Quiz",
      channelName: "Design Daily",
      durationSeconds: 2.5,
      aspectRatio: "16:9",
    });

    expect(markup.startsWith("<section id=\"motion-intro-minimal-sleek\"")).toBe(true);
    expect(markup.endsWith("</section>")).toBe(true);
    expect(markup).toContain('data-start="0"');
    expect(markup).toContain('data-duration="2.500"');
    expect(markup).toContain('data-track-index="0"');
    expect(markup).toContain("Modern Architecture Quiz");
    expect(markup).toContain("Design Daily");
    expect(markup).toContain("sleek-card-container");
    expect(markup).toContain("sleek-ambient-glow");

    // Subcomposition parse verification
    const subComp = toSubComposition(markup, "16:9");
    expect(subComp.id).toBe("motion-intro-minimal-sleek");
    expect(subComp.duration).toBe("2.500");
  });

  it("applies elegant custom accent colors and handles mascot slots", () => {
    const markup = renderMinimalSleekIntro({
      topicTitle: "Product Design",
      options: {
        accentColor: "#10B981",
        headlineText: "WEEKLY SPOTLIGHT",
        showMascot: true,
      },
      mascotHtml: '<div class="sleek-mascot">Mascot</div>',
    });

    expect(markup).toContain("--sleek-accent: #10B981;");
    expect(markup).toContain("WEEKLY SPOTLIGHT");
    expect(markup).toContain("Product Design");
    expect(markup).toContain("sleek-mascot-slot");
    expect(markup).toContain('<div class="sleek-mascot">Mascot</div>');
  });

  it("handles 9:16 vertical aspect ratio cleanly", () => {
    const markup = renderMinimalSleekIntro({
      topicTitle: "Minimal Shorts",
      aspectRatio: "9:16",
    });

    const subComp = toSubComposition(markup, "9:16");
    expect(subComp.html).toContain('data-aspect-ratio="9:16"');
    expect(subComp.html).toContain('data-width="1080"');
    expect(subComp.html).toContain('data-height="1920"');
  });
});

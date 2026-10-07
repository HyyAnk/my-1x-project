import { describe, expect, it } from "vitest";
import { renderKineticPunchIntro } from "../src/quiz/render/motion/index.js";
import { toSubComposition } from "../src/quiz/render/candyArcade/subCompositionParser.js";

describe("Kinetic Punch Motion Intro Template", () => {
  it("renders valid clip markup matching Hyperframes subcomposition contract", () => {
    const markup = renderKineticPunchIntro({
      topicTitle: "World Geography Challenge",
      channelName: "Trivia Quest",
      durationSeconds: 2.6,
      aspectRatio: "16:9",
    });

    expect(markup.startsWith("<section id=\"motion-intro-kinetic-punch\"")).toBe(true);
    expect(markup.endsWith("</section>")).toBe(true);
    expect(markup).toContain('data-start="0"');
    expect(markup).toContain('data-duration="2.600"');
    expect(markup).toContain('data-track-index="0"');
    expect(markup).toContain("World Geography Challenge");
    expect(markup).toContain("Trivia Quest");

    // Must be parsable by Candy Arcade's subcomposition converter
    const subComp = toSubComposition(markup, "16:9");
    expect(subComp.id).toBe("motion-intro-kinetic-punch");
    expect(subComp.duration).toBe("2.600");
  });

  it("respects custom options and escapes unsafe characters", () => {
    const markup = renderKineticPunchIntro({
      topicTitle: "Science & <Nature> \"Quiz\"",
      options: {
        accentColor: "#00E5FF",
        headlineText: "TOP SPEED",
        showMascot: true,
      },
      mascotHtml: '<div class="mascot-actor">Mascot</div>',
    });

    expect(markup).toContain("Science &amp; &lt;Nature&gt; &quot;Quiz&quot;");
    expect(markup).toContain("TOP SPEED");
    expect(markup).toContain("--punch-accent: #00E5FF;");
    expect(markup).toContain("punch-mascot-slot");
    expect(markup).toContain('<div class="mascot-actor">Mascot</div>');
  });

  it("handles 9:16 vertical reel aspect ratio seamlessly", () => {
    const markup = renderKineticPunchIntro({
      topicTitle: "Shorts Trivia",
      aspectRatio: "9:16",
    });

    const subComp = toSubComposition(markup, "9:16");
    expect(subComp.html).toContain('data-aspect-ratio="9:16"');
    expect(subComp.html).toContain('data-width="1080"');
    expect(subComp.html).toContain('data-height="1920"');
  });
});

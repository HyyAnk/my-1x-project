import { describe, expect, it } from "vitest";
import { renderInteractiveCtaOutro } from "../src/quiz/render/motion/index.js";
import { toSubComposition } from "../src/quiz/render/candyArcade/subCompositionParser.js";

describe("Interactive CTA Motion Outro Template", () => {
  it("renders valid clip markup matching Hyperframes subcomposition contract", () => {
    const markup = renderInteractiveCtaOutro({
      topicTitle: "World Geography Challenge",
      channelName: "Trivia Quest",
      durationSeconds: 3.5,
      aspectRatio: "16:9",
    });

    expect(markup.startsWith("<section id=\"motion-outro-interactive-cta\"")).toBe(true);
    expect(markup.endsWith("</section>")).toBe(true);
    expect(markup).toContain('data-start="0"');
    expect(markup).toContain('data-duration="3.500"');
    expect(markup).toContain('data-track-index="0"');
    expect(markup).toContain("Trivia Quest");
    expect(markup).toContain("cta-speech-bubble");
    expect(markup).toContain("cta-button");
    expect(markup).toContain("cta-progress-track");

    // Subcomposition parse verification
    const subComp = toSubComposition(markup, "16:9");
    expect(subComp.id).toBe("motion-outro-interactive-cta");
    expect(subComp.duration).toBe("3.500");
  });

  it("applies custom CTA buttons and handles mascot farewell slots", () => {
    const markup = renderInteractiveCtaOutro({
      options: {
        accentColor: "#E11D48",
        headlineText: "DID YOU BEAT THE SCORE?",
        subheadlineText: "FOLLOW FOR PART 2",
        showMascot: true,
      },
      mascotHtml: '<div class="waving-mascot">Waving</div>',
    });

    expect(markup).toContain("--cta-accent: #E11D48;");
    expect(markup).toContain("DID YOU BEAT THE SCORE?");
    expect(markup).toContain("FOLLOW FOR PART 2");
    expect(markup).toContain("cta-mascot-slot");
    expect(markup).toContain('<div class="waving-mascot">Waving</div>');
  });

  it("handles 9:16 vertical reel aspect ratio cleanly", () => {
    const markup = renderInteractiveCtaOutro({
      aspectRatio: "9:16",
    });

    const subComp = toSubComposition(markup, "9:16");
    expect(subComp.html).toContain('data-aspect-ratio="9:16"');
    expect(subComp.html).toContain('data-width="1080"');
    expect(subComp.html).toContain('data-height="1920"');
  });
});

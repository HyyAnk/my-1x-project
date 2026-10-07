import { describe, expect, it } from "vitest";
import { renderScorecardRecapOutro } from "../src/quiz/render/motion/index.js";
import { toSubComposition } from "../src/quiz/render/candyArcade/subCompositionParser.js";

describe("Scorecard Recap Motion Outro Template", () => {
  it("renders valid clip markup matching Hyperframes subcomposition contract", () => {
    const markup = renderScorecardRecapOutro({
      topicTitle: "World Geography Challenge",
      channelName: "Trivia Quest",
      durationSeconds: 4.0,
      aspectRatio: "16:9",
    });

    expect(markup.startsWith("<section id=\"motion-outro-scorecard-recap\"")).toBe(true);
    expect(markup.endsWith("</section>")).toBe(true);
    expect(markup).toContain('data-start="0"');
    expect(markup).toContain('data-duration="4.000"');
    expect(markup).toContain('data-track-index="0"');
    expect(markup).toContain("Trivia Quest");
    expect(markup).toContain("scorecard-trophy-badge");
    expect(markup).toContain("scorecard-board");
    expect(markup).toContain("scorecard-confetti-layer");

    // Subcomposition parse verification
    const subComp = toSubComposition(markup, "16:9");
    expect(subComp.id).toBe("motion-outro-scorecard-recap");
    expect(subComp.duration).toBe("4.000");
  });

  it("applies custom gold/accent colors and handles mascot celebration slots", () => {
    const markup = renderScorecardRecapOutro({
      options: {
        accentColor: "#F59E0B",
        headlineText: "PERFECT SCORE?",
        subheadlineText: "DROP YOUR ANSWER IN THE CHAT",
        showMascot: true,
      },
      mascotHtml: '<div class="celebrate-mascot">Celebrate</div>',
    });

    expect(markup).toContain("--score-gold: #F59E0B;");
    expect(markup).toContain("PERFECT SCORE?");
    expect(markup).toContain("DROP YOUR ANSWER IN THE CHAT");
    expect(markup).toContain("scorecard-mascot-slot");
    expect(markup).toContain('<div class="celebrate-mascot">Celebrate</div>');
  });

  it("handles 9:16 vertical reel aspect ratio cleanly", () => {
    const markup = renderScorecardRecapOutro({
      aspectRatio: "9:16",
    });

    const subComp = toSubComposition(markup, "9:16");
    expect(subComp.html).toContain('data-aspect-ratio="9:16"');
    expect(subComp.html).toContain('data-width="1080"');
    expect(subComp.html).toContain('data-height="1920"');
  });
});

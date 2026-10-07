import { describe, expect, it } from "vitest";
import { energySlashStingerClip, morphWipeStingerClip } from "../src/quiz/render/motion/index.js";
import { toSubComposition } from "../src/quiz/render/candyArcade/subCompositionParser.js";

describe("Dynamic Motion Transitions - Server Stinger Clips", () => {
  it("renders valid Morph Wipe stinger clip matching subcomposition contract", () => {
    const markup = morphWipeStingerClip({
      start: 2.6,
      duration: 0.6,
      fromColor: "#6366F1",
      toColor: "#EC4899",
      aspectRatio: "16:9",
      instanceId: "custom-morph-stinger",
    });

    expect(markup.startsWith("<section id=\"custom-morph-stinger\"")).toBe(true);
    expect(markup.endsWith("</section>")).toBe(true);
    expect(markup).toContain('data-start="2.600"');
    expect(markup).toContain('data-duration="0.600"');
    expect(markup).toContain('data-track-index="1"');
    expect(markup).toContain("morph-wipe-aperture");
    expect(markup).toContain("--trans-from-color:#6366F1");

    const subComp = toSubComposition(markup, "16:9");
    expect(subComp.id).toBe("custom-morph-stinger");
    expect(subComp.duration).toBe("0.600");
  });

  it("renders valid Energy Slash stinger clip with chromatic aberration layers", () => {
    const markup = energySlashStingerClip({
      start: 3.0,
      duration: 0.55,
      fromColor: "#EC4899",
      toColor: "#00FFFF",
      aspectRatio: "9:16",
    });

    expect(markup.startsWith("<section id=\"energy-slash-3000\"")).toBe(true);
    expect(markup.endsWith("</section>")).toBe(true);
    expect(markup).toContain('data-start="3.000"');
    expect(markup).toContain('data-duration="0.550"');
    expect(markup).toContain('data-track-index="1"');
    expect(markup).toContain("blade-cyan");
    expect(markup).toContain("blade-magenta");

    const subComp = toSubComposition(markup, "9:16");
    expect(subComp.id).toBe("energy-slash-3000");
    expect(subComp.duration).toBe("0.550");
  });
});

import { describe, expect, it } from "vitest";
import { assembleCreativeTimeline } from "../src/introOutroScripts/creativeTimeline.js";

const choreography = {
  primary_action: "react",
  expression: "delighted",
  secondary_motion: "natural_follow_through",
  end_pose: "relaxed",
};
const groups = () => Array.from({ length: 3 }, () => ({ action: "An authored playful reaction", ...choreography }));

describe("creative timeline provider normalization", () => {
  it.each(["intro", "outro"] as const)("accepts flat choreography in all three %s groups without mutating input", (kind) => {
    const raw = groups();
    const original = structuredClone(raw);
    const result = assembleCreativeTimeline(raw, 8, kind);
    expect(result).toHaveLength(3);
    for (const beat of result) {
      expect(beat.choreography).toEqual(choreography);
      expect(beat.action).toBe(raw[0].action);
      expect(beat).not.toHaveProperty("primary_action");
    }
    expect(raw).toEqual(original);
  });

  it("preserves canonical nested metadata and omitted metadata", () => {
    const raw = groups().map(({ action }) => ({ action, choreography }));
    const canonical = assembleCreativeTimeline(raw, 8, "intro");
    expect(assembleCreativeTimeline(canonical, 8, "intro")).toEqual(canonical);
    expect(
      assembleCreativeTimeline(
        raw.map(({ action }) => ({ action })),
        8,
        "intro",
      )[0].choreography,
    ).toBeUndefined();
  });

  it("merges complementary fields and accepts identical duplicates", () => {
    const raw = groups().map(({ expression, ...group }) => ({ ...group, choreography: { expression, end_pose: group.end_pose } }));
    expect(assembleCreativeTimeline(raw, 8, "intro")[0].choreography).toEqual(choreography);
  });

  it("preserves both authored descriptions instead of blocking generation", () => {
    const raw = groups().map((group) => ({ ...group, choreography: { expression: "worried" } }));
    expect(assembleCreativeTimeline(raw, 8, "intro")[0].choreography?.expression).toBe("worried; delighted");
  });

  it.each([
    { primary_action: 123 },
    { unexpected_field: "unknown" },
    { choreography: null },
    { choreography: { unexpected_field: "unknown" } },
  ])("still rejects malformed metadata: %j", (invalid) => {
    expect(() =>
      assembleCreativeTimeline(
        groups().map((group) => ({ ...group, ...invalid })),
        8,
        "intro",
      ),
    ).toThrow();
  });
});
